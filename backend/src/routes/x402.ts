/**
 * Track 2: x402 "pay this invoice in USA₮" lane.
 *
 * Flow (x402 v1, direct facilitator integration):
 *   1. Client GETs /api/x402/invoices/:id/requirements (or hits /pay with no
 *      payment and gets 402) to learn what to pay: payTo, USA₮ asset, amount.
 *   2. Client signs an EIP-3009 transferWithAuthorization for USA₮ and POSTs
 *      the x402 PaymentPayload to /api/x402/invoices/:id/pay.
 *   3. We call the facilitator /verify, then /settle (facilitator submits
 *      on-chain and pays gas). On success we record the Payment and mark the
 *      invoice paid.
 *
 * x402 settlements cannot carry our attribution tag; the merchant PayTo
 * wallet is what the organisers record for this lane.
 */
import { Router } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { getToken } from '../celo/tokens';
import {
  X402_VERSION,
  X402_NETWORK,
  X402_SETTLEMENT_SYMBOL,
  buildUsatRequirements,
  verifyPayment as x402Verify,
  settlePayment as x402Settle,
  PaymentPayload,
} from '../x402/facilitator';

const prisma = new PrismaClient();
export const router = Router();

function requirementsForInvoice(invoice: { id: string; amount: any; receivingWallet: string }, baseUrl: string) {
  return buildUsatRequirements({
    payTo: invoice.receivingWallet,
    amount: invoice.amount.toString(),
    resource: `${baseUrl}/api/x402/invoices/${invoice.id}/pay`,
    description: `CeloDesk invoice ${invoice.id} settled in USA₮`,
  });
}

function baseUrlOf(req: any): string {
  return process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
}

type InvoiceRow = NonNullable<Awaited<ReturnType<typeof prisma.invoice.findUnique>>>;
type LoadResult = { ok: true; invoice: InvoiceRow } | { ok: false; error: string; code: number };

async function loadUsatInvoice(id: string): Promise<LoadResult> {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { ok: false, error: 'Invoice not found', code: 404 };
  if (invoice.tokenSymbol !== X402_SETTLEMENT_SYMBOL) {
    return {
      ok: false,
      error: `The x402 lane settles ${X402_SETTLEMENT_SYMBOL} (USA₮). This invoice is in ${invoice.tokenSymbol}.`,
      code: 400,
    };
  }
  if (['PAID', 'OVERPAID', 'CANCELLED', 'EXPIRED'].includes(invoice.status)) {
    return { ok: false, error: `This invoice is ${invoice.status.toLowerCase()} and cannot accept a new payment.`, code: 409 };
  }
  return { ok: true, invoice };
}

// GET requirements — what an x402 client needs to build its payment.
router.get('/invoices/:id/requirements', async (req, res) => {
  const loaded = await loadUsatInvoice(req.params.id);
  if (!loaded.ok) return res.status(loaded.code).json({ error: loaded.error });
  const accepts = requirementsForInvoice(loaded.invoice, baseUrlOf(req));
  res.json({ x402Version: X402_VERSION, accepts: [accepts] });
});

const payLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

const authorizationSchema = z.object({
  from: z.string(),
  to: z.string(),
  value: z.string(),
  validAfter: z.string(),
  validBefore: z.string(),
  nonce: z.string(),
});
const payloadSchema = z.object({
  x402Version: z.number(),
  scheme: z.literal('exact'),
  network: z.string(),
  payload: z.object({ signature: z.string(), authorization: authorizationSchema }),
});
const paySchema = z.object({ paymentPayload: payloadSchema });

// POST pay — verify + settle a USA₮ payment for this invoice.
router.post('/invoices/:id/pay', payLimiter, async (req, res) => {
  const loaded = await loadUsatInvoice(req.params.id);
  if (!loaded.ok) {
    return res.status(loaded.code).json({ error: loaded.error });
  }
  const invoice = loaded.invoice;

  const parsed = paySchema.safeParse(req.body);
  if (!parsed.success) {
    const accepts = requirementsForInvoice(invoice, baseUrlOf(req));
    return res.status(402).json({ x402Version: X402_VERSION, error: 'Payment required', accepts: [accepts] });
  }

  const requirements = requirementsForInvoice(invoice, baseUrlOf(req));
  const { paymentPayload } = parsed.data;
  const auth = paymentPayload.payload.authorization;

  // Bind the signed authorization to THIS invoice before spending a settle credit.
  if (auth.to.toLowerCase() !== invoice.receivingWallet.toLowerCase()) {
    return res.status(400).json({ error: 'Authorization recipient does not match the invoice receiving wallet.' });
  }
  if (auth.value !== requirements.maxAmountRequired) {
    return res.status(400).json({ error: 'Authorization amount does not match the invoice amount.' });
  }
  if (auth.from.toLowerCase() === invoice.receivingWallet.toLowerCase()) {
    return res.status(400).json({ error: 'Payer and recipient must be different wallets.' });
  }
  if (paymentPayload.network !== X402_NETWORK) {
    return res.status(400).json({ error: `Unsupported network ${paymentPayload.network}; expected ${X402_NETWORK}.` });
  }

  // Verify off-chain first (open endpoint, no credit spent).
  let verifyResult;
  try {
    verifyResult = await x402Verify(paymentPayload as PaymentPayload, requirements);
  } catch (err: any) {
    return res.status(502).json({ error: `Facilitator verify failed: ${err?.message || 'unknown error'}` });
  }
  if (!verifyResult.isValid) {
    return res.status(422).json({ verified: false, reason: verifyResult.invalidReason || 'Payment authorization is not valid.' });
  }

  // Settle on-chain (spends a credit; needs X402_API_KEY).
  let settleResult;
  try {
    settleResult = await x402Settle(paymentPayload as PaymentPayload, requirements);
  } catch (err: any) {
    return res.status(502).json({ error: `Facilitator settle failed: ${err?.message || 'unknown error'}` });
  }
  if (!settleResult.success || !settleResult.transaction) {
    return res.status(422).json({ settled: false, reason: settleResult.errorReason || 'Settlement failed.' });
  }

  const txHash = settleResult.transaction;
  const payer = settleResult.payer || auth.from;
  const token = getToken(X402_SETTLEMENT_SYMBOL);

  // Idempotency: a settled tx can only be recorded once.
  const existing = await prisma.payment.findUnique({ where: { txHash } });
  if (existing) {
    return res.json({ settled: true, invoiceStatus: invoice.status, transaction: txHash, note: 'Already recorded.' });
  }

  const decimals = token.decimals;
  const prior = await prisma.payment.findMany({ where: { invoiceId: invoice.id, status: 'VERIFIED' }, select: { amount: true } });
  const expected = ethers.parseUnits(invoice.amount.toString(), decimals);
  const received = ethers.parseUnits(invoice.amount.toString(), decimals); // exact-scheme pays the full requirement
  const priorUnits = prior.reduce((s, p) => s + ethers.parseUnits(p.amount.toString(), decimals), 0n);
  const aggregate = priorUnits + received;
  const newStatus = aggregate > expected ? 'OVERPAID' : aggregate === expected ? 'PAID' : 'PARTIALLY_PAID';

  try {
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          txHash,
          chainId: invoice.chainId,
          fromAddress: payer,
          toAddress: invoice.receivingWallet,
          tokenAddress: token.address,
          amount: invoice.amount.toString(),
          status: 'VERIFIED',
          confirmations: 0,
          verifiedAt: new Date(),
        },
      }),
      prisma.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } }),
    ]);
  } catch (err: any) {
    if (err.code === 'P2002') return res.json({ settled: true, invoiceStatus: newStatus, transaction: txHash, note: 'Already recorded.' });
    throw err;
  }

  res.json({
    settled: true,
    invoiceStatus: newStatus,
    transaction: txHash,
    network: settleResult.network || X402_NETWORK,
    payer,
    explorerUrl: `https://celoscan.io/tx/${txHash}`,
  });
});
