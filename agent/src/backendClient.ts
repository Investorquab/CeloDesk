import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
/**
 * Thin wrapper around the CeloDesk backend REST API. The bot never
 * implements financial logic itself — every action here is a direct
 * pass-through to the backend. Financial and payment logic remains in
 * the backend rather than being duplicated inside the bot.
 *
 * AUTH: protected calls use an Authorization: Bearer <token> header.
 * The backend derives the true merchantId from that token rather than
 * trusting a client-supplied merchantId. The token comes from the
 * Telegram wallet-link flow and uses the same JWT mechanism as the web app.
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

// Public — the client opens an invoice from a Telegram deep link, so there
// is no merchant session. Resolves by publicSlug like the web checkout.
export function getInvoiceBySlug(slug: string) {
  return request<any>(`/api/invoices/by-slug/${encodeURIComponent(slug)}`);
}

// Public — the client accepts or declines before paying (anti-scam consent).
export function setInvoiceDecision(slug: string, decision: 'ACCEPTED' | 'DECLINED') {
  return request<{ clientDecision: string; status: string }>(
    `/api/invoices/by-slug/${encodeURIComponent(slug)}/decision`,
    undefined,
    { method: 'POST', body: JSON.stringify({ decision }) }
  );
}

// Public — record the chat the client opened the invoice from, so we can push
// an unpaid reminder later. Fire-and-forget: failure must not break the open.
export function setClientTelegramChat(slug: string, chatId: number | string) {
  return request<{ ok: boolean }>(
    `/api/invoices/by-slug/${encodeURIComponent(slug)}/telegram-chat`,
    undefined,
    { method: 'POST', body: JSON.stringify({ chatId }) }
  );
}

// ---- Internal (service-to-service), guarded by INTERNAL_API_KEY ----
export interface TelegramReminder {
  id: string; publicSlug: string; chatId: string; merchantName: string;
  clientName: string; amount: string; tokenSymbol: string; description: string | null; payUrl: string;
}
async function internalRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) throw new Error('INTERNAL_API_KEY not set');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-internal-key': key, ...options.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any)?.error ?? `Internal request to ${path} failed (${res.status})`);
  return body as T;
}
export function getDueTelegramReminders() {
  return internalRequest<TelegramReminder[]>('/api/internal/telegram-reminders');
}
export function markTelegramReminderSent(invoiceId: string) {
  return internalRequest<{ ok: boolean }>(`/api/internal/telegram-reminders/${encodeURIComponent(invoiceId)}/sent`, { method: 'POST' });
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
