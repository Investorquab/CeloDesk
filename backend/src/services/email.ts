/**
 * Transactional email via Brevo (https://www.brevo.com).
 *
 * Free tier, no custom domain required: the sender is a single address
 * verified in the Brevo dashboard. Configure with:
 *   BREVO_API_KEY       - API key (Brevo: SMTP & API > API Keys)
 *   BREVO_SENDER_EMAIL  - the verified sender address
 *   BREVO_SENDER_NAME   - display name, defaults to "CeloDesk"
 *
 * If the key is not set, sending is skipped (and reported), so invoice
 * creation never fails merely because email is not configured yet.
 */

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(args: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'CeloDesk';

  if (!apiKey || !senderEmail) {
    return {
      ok: false,
      skipped: true,
      error: 'Email not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL missing).',
    };
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: args.to, name: args.toName || args.to }],
        subject: args.subject,
        htmlContent: args.html,
        ...(args.text ? { textContent: args.text } : {}),
      }),
    });

    const body = await res.text();
    let data: any = {};
    try {
      data = body ? JSON.parse(body) : {};
    } catch {
      data = { message: body };
    }

    if (res.ok) {
      return { ok: true, messageId: data.messageId };
    }
    return {
      ok: false,
      error: data?.message || data?.code || `Brevo send failed (HTTP ${res.status})`,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Email request failed.' };
  }
}

export interface InvoiceEmailData {
  merchantName: string;
  clientName: string;
  clientEmail: string;
  amount: string;
  tokenSymbol: string;
  description?: string | null;
  dueDate?: Date | null;
  payUrl: string;
  recurring?: boolean;
  reminder?: boolean;
}

export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<SendEmailResult> {
  const subject = data.reminder
    ? `Reminder: unpaid invoice for ${data.amount} ${data.tokenSymbol} from ${data.merchantName}`
    : `${data.merchantName} sent you an invoice for ${data.amount} ${data.tokenSymbol}`;
  const html = renderInvoiceEmail(data);
  const lead = data.reminder
    ? `A quick reminder: your invoice from ${data.merchantName} for ${data.amount} ${data.tokenSymbol} is still unpaid.`
    : `${data.merchantName} sent you an invoice for ${data.amount} ${data.tokenSymbol}.`;
  const text = lead + (data.description ? ` For: ${data.description}.` : '') + ` Review and pay: ${data.payUrl}`;
  return sendEmail({ to: data.clientEmail, toName: data.clientName, subject, html, text });
}

// Inline styles only: email clients ignore <style> blocks and external CSS.
function renderInvoiceEmail(data: InvoiceEmailData): string {
  const merchant = escapeHtml(data.merchantName);
  const description = data.description ? escapeHtml(data.description) : '';
  const amount = escapeHtml(data.amount);
  const symbol = escapeHtml(data.tokenSymbol);
  const payUrl = encodeURI(data.payUrl);
  const due = data.dueDate
    ? new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(data.dueDate)
    : '';

  const row = (label: string, value: string) =>
    `<tr><td style="padding:11px 0;border-top:1px solid #e5eae3;color:#5A6B62;font-size:14px;">${label}</td>` +
    `<td style="padding:11px 0;border-top:1px solid #e5eae3;color:#102019;font-size:14px;text-align:right;">${value}</td></tr>`;

  return `<div style="background:#f1f4f0;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5eae3;border-radius:16px;overflow:hidden;">
    <div style="background:#0A1C14;padding:20px 26px;color:#ffffff;font-size:18px;font-weight:bold;">CeloDesk</div>
    <div style="padding:26px;">
      <p style="margin:0 0 8px;color:#5A6B62;font-size:14px;">${data.reminder ? `Reminder from ${merchant}: this invoice is still unpaid` : `${merchant} sent you an invoice`}</p>
      <div style="font-size:30px;font-weight:bold;color:#102019;">${amount} <span style="font-size:15px;color:#5A6B62;font-weight:normal;">${symbol}</span></div>
      ${description ? `<p style="margin:10px 0 0;color:#5A6B62;font-size:14px;">${description}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-top:18px;">
        ${row('From', merchant)}
        ${due ? row('Due', escapeHtml(due)) : ''}
        ${data.recurring ? row('Repeats', 'Each cycle, after you accept') : ''}
      </table>
      <div style="background:#eafaf2;color:#0C6A45;border-radius:10px;padding:12px 14px;margin:18px 0;font-size:13px;line-height:1.5;">You decide before you pay. Review the invoice, accept if it is right, then pay from your wallet. You will not be charged without your tap.</div>
      <a href="${payUrl}" style="display:block;background:#13915F;color:#ffffff;text-decoration:none;text-align:center;font-weight:bold;padding:14px;border-radius:10px;font-size:15px;">Review and pay</a>
      <p style="margin:16px 0 0;color:#8aa093;font-size:12px;text-align:center;line-height:1.5;">Paid on Celo. CeloDesk verifies the payment on-chain and never holds your funds.</p>
    </div>
  </div>
</div>`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
