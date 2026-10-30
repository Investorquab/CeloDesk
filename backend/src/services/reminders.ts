/**
 * Unpaid-invoice reminders (V2-6, email + Telegram).
 *
 * Email reminders are sent here (the backend owns Brevo). Telegram reminders
 * are sent by the BOT process (it holds the Telegraf instance); the bot polls
 * the internal endpoint in routes/internal.ts, which reads getDueTelegramReminders
 * and reports back via markReminderSent. A single throttle (lastReminderAt +
 * reminderCount) is shared across channels so a client is never double-nagged.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { sendInvoiceEmail } from './email';

const prisma = new PrismaClient();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://celo-desk.vercel.app').replace(/\/$/, '');
export const REMINDER_MAX = process.env.REMINDER_MAX ? Number(process.env.REMINDER_MAX) : 3;
export const REMINDER_COOLDOWN_MS = process.env.REMINDER_COOLDOWN_MS ? Number(process.env.REMINDER_COOLDOWN_MS) : 3 * 24 * 60 * 60 * 1000;
// For invoices with no due date, start reminding this long after creation.
export const REMINDER_GRACE_MS = process.env.REMINDER_GRACE_MS ? Number(process.env.REMINDER_GRACE_MS) : 2 * 24 * 60 * 60 * 1000;

const UNPAID = ['SENT', 'VIEWED', 'PENDING', 'PARTIALLY_PAID', 'OVERDUE'] as const;

function merchantDisplayName(merchant: any): string {
  return (
    merchant?.profile?.businessName ||
    (merchant?.walletAddress ? `${merchant.walletAddress.slice(0, 6)}...${merchant.walletAddress.slice(-4)}` : 'A CeloDesk merchant')
  );
}

// Shared eligibility: unpaid one-off invoice (never the recurring anchor),
// under the nudge cap, past its cooldown, and actually overdue.
function baseWhere(now: Date): Prisma.InvoiceWhereInput {
  const cooldownBefore = new Date(now.getTime() - REMINDER_COOLDOWN_MS);
  const graceBefore = new Date(now.getTime() - REMINDER_GRACE_MS);
  return {
    status: { in: UNPAID as unknown as string[] as any },
    recurrence: 'NONE',
    reminderCount: { lt: REMINDER_MAX },
    OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: cooldownBefore } }],
    AND: [{ OR: [{ dueDate: { lt: now } }, { AND: [{ dueDate: null }, { createdAt: { lt: graceBefore } }] }] }],
  };
}

export async function markReminderSent(invoiceId: string, channel: 'email' | 'telegram', now: Date = new Date()) {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { lastReminderAt: now, reminderCount: { increment: 1 } },
  });
  await prisma.reminder.create({ data: { invoiceId, channel } });
}

export async function runEmailReminders(now: Date = new Date()): Promise<{ due: number; sent: number; errors: number }> {
  const out = { due: 0, sent: 0, errors: 0 };
  const invoices = await prisma.invoice.findMany({
    where: { ...baseWhere(now), deliverEmail: true, clientEmail: { not: null } },
    include: { merchant: { include: { profile: true } } },
    take: 100,
  });
  out.due = invoices.length;
  for (const inv of invoices) {
    try {
      const r = await sendInvoiceEmail({
        merchantName: merchantDisplayName(inv.merchant),
        clientName: inv.clientName,
        clientEmail: inv.clientEmail!,
        amount: inv.amount.toString(),
        tokenSymbol: inv.tokenSymbol,
        description: inv.description,
        dueDate: inv.dueDate,
        payUrl: `${FRONTEND_URL}/invoice/${inv.publicSlug}`,
        reminder: true,
      });
      if (r.ok) {
        await markReminderSent(inv.id, 'email', now);
        out.sent++;
      } else if (!r.skipped) {
        out.errors++;
        console.warn('[reminders] email failed:', r.error);
      }
    } catch (e: any) {
      out.errors++;
      console.warn('[reminders] email error:', e?.message || e);
    }
  }
  if (out.due) console.log(`[reminders] email due=${out.due} sent=${out.sent} errors=${out.errors}`);
  return out;
}

export interface TelegramReminder {
  id: string;
  publicSlug: string;
  chatId: string;
  merchantName: string;
  clientName: string;
  amount: string;
  tokenSymbol: string;
  description: string | null;
  payUrl: string;
}

export async function getDueTelegramReminders(now: Date = new Date()): Promise<TelegramReminder[]> {
  const invoices = await prisma.invoice.findMany({
    where: { ...baseWhere(now), clientTelegramChatId: { not: null } },
    include: { merchant: { include: { profile: true } } },
    take: 100,
  });
  return invoices.map((inv) => ({
    id: inv.id,
    publicSlug: inv.publicSlug,
    chatId: inv.clientTelegramChatId!,
    merchantName: merchantDisplayName(inv.merchant),
    clientName: inv.clientName,
    amount: inv.amount.toString(),
    tokenSymbol: inv.tokenSymbol,
    description: inv.description,
    payUrl: `${FRONTEND_URL}/invoice/${inv.publicSlug}`,
  }));
}
