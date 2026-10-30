/**
 * Recurrence scheduler (V2-6).
 *
 * A recurring invoice is the "anchor": it holds the schedule (recurrence +
 * nextRunAt + recurrenceEndsAt). When nextRunAt is due, we spawn a fresh,
 * one-off child invoice (recurrence NONE, parentInvoiceId = anchor), deliver it
 * by email, and advance the anchor to its next future run. There is NO silent
 * auto-charge: each child is a normal invoice the client pays. If the client
 * already accepted the anchor, the child starts pre-accepted so they do not
 * re-accept every cycle ("accept once, pay each cycle").
 */
import { PrismaClient } from '@prisma/client';
import { computeNextRun } from './invoiceService';
import { sendInvoiceEmail } from './email';
import { runEmailReminders } from './reminders';

const prisma = new PrismaClient();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://celo-desk.vercel.app').replace(/\/$/, '');

function merchantDisplayName(merchant: any): string {
  return (
    merchant?.profile?.businessName ||
    (merchant?.walletAddress ? `${merchant.walletAddress.slice(0, 6)}...${merchant.walletAddress.slice(-4)}` : 'A CeloDesk merchant')
  );
}

// First scheduled occurrence strictly after `now`, so a server that was down
// for several cycles does not fire a backlog of invoices on the next tick.
function nextFutureRun(recurrence: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY', from: Date, now: Date): Date | null {
  let next = computeNextRun(recurrence, from);
  let guard = 0;
  while (next && next <= now && guard++ < 240) next = computeNextRun(recurrence, next);
  return next;
}

export interface RecurrenceRunResult {
  due: number;
  spawned: number;
  emailed: number;
  ended: number;
  errors: number;
}

export async function runRecurrenceCycle(now: Date = new Date()): Promise<RecurrenceRunResult> {
  const result: RecurrenceRunResult = { due: 0, spawned: 0, emailed: 0, ended: 0, errors: 0 };

  const anchors = await prisma.invoice.findMany({
    where: { recurrence: { not: 'NONE' }, nextRunAt: { not: null, lte: now } },
    include: { merchant: { include: { profile: true } } },
  });
  result.due = anchors.length;

  for (const anchor of anchors) {
    try {
      // Past the end date: stop the schedule, spawn nothing more.
      if (anchor.recurrenceEndsAt && anchor.recurrenceEndsAt < now) {
        await prisma.invoice.update({ where: { id: anchor.id }, data: { nextRunAt: null } });
        result.ended++;
        continue;
      }

      const preAccepted = anchor.clientDecision === 'ACCEPTED';
      const child = await prisma.invoice.create({
        data: {
          merchantId: anchor.merchantId,
          clientName: anchor.clientName,
          clientContact: anchor.clientContact,
          clientEmail: anchor.clientEmail,
          clientTelegram: anchor.clientTelegram,
          deliverEmail: anchor.deliverEmail,
          deliverTelegram: anchor.deliverTelegram,
          clientDecision: preAccepted ? 'ACCEPTED' : 'PENDING',
          clientDecisionAt: preAccepted ? now : null,
          amount: anchor.amount,
          tokenSymbol: anchor.tokenSymbol,
          tokenAddress: anchor.tokenAddress,
          chainId: anchor.chainId,
          receivingWallet: anchor.receivingWallet,
          description: anchor.description,
          status: 'SENT',
          recurrence: 'NONE',
          parentInvoiceId: anchor.id,
          attributionTag: anchor.attributionTag,
        },
      });
      result.spawned++;

      if (child.deliverEmail && child.clientEmail) {
        try {
          const r = await sendInvoiceEmail({
            merchantName: merchantDisplayName(anchor.merchant),
            clientName: child.clientName,
            clientEmail: child.clientEmail,
            amount: child.amount.toString(),
            tokenSymbol: child.tokenSymbol,
            description: child.description,
            dueDate: child.dueDate,
            payUrl: `${FRONTEND_URL}/invoice/${child.publicSlug}`,
            recurring: true,
          });
          if (r.ok) result.emailed++;
          else if (!r.skipped) console.warn('[recurrence] email delivery failed:', r.error);
        } catch (e: any) {
          console.warn('[recurrence] email delivery error:', e?.message || e);
        }
      }

      // Advance the anchor to its next future run; stop if that passes the end.
      const next = nextFutureRun(anchor.recurrence as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY', anchor.nextRunAt ?? now, now);
      const stop = next && anchor.recurrenceEndsAt && next > anchor.recurrenceEndsAt;
      await prisma.invoice.update({
        where: { id: anchor.id },
        data: { nextRunAt: stop ? null : next },
      });
      if (stop) result.ended++;
    } catch (err: any) {
      result.errors++;
      console.error('[recurrence] failed to process anchor', anchor.id, err?.message || err);
    }
  }

  if (result.due) {
    console.log(`[recurrence] due=${result.due} spawned=${result.spawned} emailed=${result.emailed} ended=${result.ended} errors=${result.errors}`);
  }
  return result;
}

let running = false;
export function startRecurrenceScheduler() {
  if (process.env.RECURRENCE_DISABLED === '1') {
    console.log('[recurrence] scheduler disabled via RECURRENCE_DISABLED=1');
    return;
  }
  const intervalMs = process.env.RECURRENCE_INTERVAL_MS ? Number(process.env.RECURRENCE_INTERVAL_MS) : 5 * 60 * 1000;
  const tick = async () => {
    if (running) return; // never overlap two cycles
    running = true;
    try {
      await runRecurrenceCycle();
      await runEmailReminders();
    } catch (err: any) {
      console.error('[recurrence] cycle error:', err?.message || err);
    } finally {
      running = false;
    }
  };
  // Small delay after boot so startup work settles, then on an interval.
  setTimeout(tick, 15_000);
  setInterval(tick, intervalMs);
  console.log(`[recurrence] scheduler started (every ${Math.round(intervalMs / 1000)}s)`);
}
