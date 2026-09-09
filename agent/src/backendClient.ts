import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
/**
 * Thin wrapper around the CeloDesk backend REST API. The bot never
 * implements financial logic itself — every action here is a direct
 * pass-through to the backend, per CLAUDE_3_AGENT.md's ownership rule.
 *
 * AUTH: most calls now require an Authorization: Bearer <token> header
 * — the backend derives the true merchantId from that token rather
 * than trusting whatever's passed in the request body/query (see
 * SECURITY.md's IDOR fix). The token comes from telegram-link (see
 * linkTelegramWallet below), same JWT mechanism the web frontend uses.
 */

const BASE_URL = process.env.BACKEND_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request to ${path} failed with status ${res.status}`);
  }
  return body as T;
}

export function linkTelegramWallet(telegramId: string, walletAddress: string) {
  return request<{ merchantId: string; walletAddress: string; token?: string }>(
    '/api/auth/telegram-link',
    undefined,
    { method: 'POST', body: JSON.stringify({ telegramId, walletAddress }) }
  );
}

// Recovers a session after a bot restart, instead of relying only on
// the in-memory session map (which is wiped every restart). Returns
// null if this Telegram user has never linked a wallet. Note: this
// path does NOT return a fresh token (the by-telegram lookup is
// intentionally unauthenticated, just an ID lookup) — callers should
// treat merchantId as recovered but re-prompt for wallet connection
// if a token is later required and missing.
export async function getMerchantByTelegramId(telegramId: string): Promise<string | null> {
  try {
    const result = await request<{ merchantId: string }>(`/api/merchants/by-telegram/${telegramId}`);
    return result.merchantId;
  } catch {
    return null;
  }
}

export function createInvoice(
  token: string,
  input: {
    merchantId: string;
    clientName: string;
    amount: string;
    tokenSymbol: string;
    description?: string;
    dueDate?: string;
  }
) {
  return request<{ id: string; publicUrl: string; status: string }>('/api/invoices', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getInvoice(token: string, id: string) {
  return request<any>(`/api/invoices/${id}`, token);
}

export function listOutstandingInvoices(token: string, merchantId: string) {
  return request<any[]>(`/api/invoices?merchantId=${merchantId}&status=outstanding`, token);
}

export function getPaymentSummary(token: string, merchantId: string) {
  return request<{
    total: number;
    byStatus: Record<string, number>;
    outstandingTotal: number;
    outstandingByToken: Record<string, number>;
  }>(`/api/invoices/summary/${merchantId}`, token);
}

// Public endpoint — no token needed. Called with whatever txHash the
// merchant or client provides; the backend independently re-verifies
// against the chain regardless of who's asking.
export function verifyPayment(invoiceId: string, txHash: string) {
  return request<{ verified: boolean; invoiceStatus?: string; reason?: string }>(
    '/api/invoices/verify-payment',
    undefined,
    { method: 'POST', body: JSON.stringify({ invoiceId, txHash }) }
  );
}

export function sendReminder(token: string, invoiceId: string, channel: string) {
  return request<any>(`/api/invoices/${invoiceId}/remind`, token, {
    method: 'POST',
    body: JSON.stringify({ channel }),
  });
}

export function getReminders(token: string, invoiceId: string) {
  return request<any[]>(`/api/invoices/${invoiceId}/reminders`, token);
}


export function agentChat(token: string, message: string, history: { role: 'user' | 'assistant'; content: string }[] = []) {
  return request<{ reply: string; artifacts?: any[] }>('/api/agent', token, {
    method: 'POST',
    body: JSON.stringify({ message, history: history.slice(-10) }),
  });
}

export function listTokens() {
  return request<{ symbol: string; name: string; decimals: number }[]>('/api/tokens');
}
