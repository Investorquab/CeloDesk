/**
 * Celo x402 facilitator client (Track 2: USA₮ settlement lane).
 *
 * Talks to the hosted facilitator documented at docs.celo.org x402 and
 * confirmed live via GET /supported + /api/config on 2026-10-29:
 *   base   https://api.x402.celo.org   (NOT x402.celo.org — that's the dashboard)
 *   POST /verify   open   — off-chain signature + simulation check
 *   POST /settle   needs X-API-Key — submits EIP-3009 transferWithAuthorization
 *                  on-chain, facilitator pays gas, funds move payer -> payTo
 *
 * We use x402 protocol v1 (network "celo"), the simplest documented shape.
 * USA₮ settles via EIP-3009 with EIP-712 domain { name:"Tether America USD",
 * version:"1" } — these must match exactly or verification fails.
 *
 * NOTE: x402 settlements through the hosted facilitator CANNOT carry our
 * attribution tag. We record the merchant PayTo wallet for the organisers
 * instead (see README Track 2).
 */

import { getToken } from '../celo/tokens';

export const X402_VERSION = 1;
export const X402_NETWORK = 'celo';
export const X402_FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || 'https://api.x402.celo.org';

/** The settlement token for the x402 lane. */
export const X402_SETTLEMENT_SYMBOL = 'USAT';

// EIP-3009 EIP-712 domain fields for USA₮, as the facilitator reports them.
const USAT_EXTRA = { name: 'Tether America USD', version: '1' } as const;

export interface PaymentRequirements {
  scheme: 'exact';
  network: string;
  maxAmountRequired: string; // atomic units, string
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: { name: string; version: string };
}

export interface X402Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: 'exact';
  network: string;
  payload: { signature: string; authorization: X402Authorization };
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
}

export interface SettleResponse {
  success: boolean;
  errorReason?: string;
  payer?: string;
  transaction?: string;
  network?: string;
}

/**
 * Build the x402 PaymentRequirements for settling a USA₮ invoice.
 * `amount` is a human decimal string (e.g. "12.50"); it is converted to
 * USA₮ atomic units (6 decimals) here.
 */
export function buildUsatRequirements(args: {
  payTo: string;
  amount: string;
  resource: string;
  description: string;
  maxTimeoutSeconds?: number;
}): PaymentRequirements {
  const token = getToken(X402_SETTLEMENT_SYMBOL); // throws if registry drifts
  const atomic = toAtomicUnits(args.amount, token.decimals);
  return {
    scheme: 'exact',
    network: X402_NETWORK,
    maxAmountRequired: atomic,
    resource: args.resource,
    description: args.description,
    mimeType: 'application/json',
    payTo: args.payTo,
    maxTimeoutSeconds: args.maxTimeoutSeconds ?? 120,
    asset: token.address,
    extra: { ...USAT_EXTRA },
  };
}

/** Converts a decimal string to atomic units without floating point. */
export function toAtomicUnits(amount: string, decimals: number): string {
  const [whole, frac = ''] = String(amount).trim().split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const digits = `${whole}${fracPadded}`.replace(/^0+(?=\d)/, '');
  if (!/^\d+$/.test(digits)) throw new Error(`Invalid amount: ${amount}`);
  return digits;
}

// The facilitator returns its structured verify/settle result WITH a non-2xx
// status (e.g. 400 for isValid:false, 402 for out-of-credits), so we must read
// the JSON body rather than treating the status alone as a transport error.
async function rawPost(path: string, body: unknown, apiKey?: string): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  const res = await fetch(`${X402_FACILITATOR_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  return { status: res.status, data };
}

/** POST /verify — open endpoint, off-chain check. */
export async function verifyPayment(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  const { status, data } = await rawPost('/verify', {
    x402Version: X402_VERSION,
    paymentPayload,
    paymentRequirements,
  });
  if (data && typeof data.isValid === 'boolean') return data as VerifyResponse;
  throw new Error(data?.error || data?.message || `x402 /verify failed (HTTP ${status})`);
}

/** POST /settle — requires the seller API key. */
export async function settlePayment(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
  const apiKey = process.env.X402_API_KEY;
  if (!apiKey) {
    throw new Error(
      'X402_API_KEY is not configured. Create a seller key at x402.celo.org and set it in .env before settling.'
    );
  }
  const { status, data } = await rawPost(
    '/settle',
    { x402Version: X402_VERSION, paymentPayload, paymentRequirements },
    apiKey
  );
  if (status === 401) throw new Error('x402 /settle unauthorized: missing or invalid X402_API_KEY.');
  if (status === 402) throw new Error('x402 /settle out of credits or balance.');
  if (data && typeof data.success === 'boolean') return data as SettleResponse;
  throw new Error(data?.error || data?.message || `x402 /settle failed (HTTP ${status})`);
}
