/**
 * Error visibility for CeloDesk.
 *
 * Production reliability starts with *knowing* when something breaks. This
 * module gives the backend (and the Telegram agent) three things:
 *
 *   1. `reportError()`  - a single, structured way to record an error. It
 *      always writes a JSON line to stderr (so `pm2 logs` captures it) and,
 *      when an alert channel is configured, pushes a short message to it.
 *   2. `installProcessGuards()` - catches `unhandledRejection` and
 *      `uncaughtException` so an un-awaited promise can no longer take the
 *      whole process down silently. Uncaught exceptions leave the process in
 *      an unknown state, so we report, then exit and let pm2 restart cleanly.
 *   3. An alert channel that reuses infrastructure you already run: the
 *      Telegram bot. Set ALERT_TELEGRAM_CHAT_ID (with the existing
 *      TELEGRAM_BOT_TOKEN) to get a DM when production throws. Optional:
 *      ERROR_WEBHOOK_URL posts the same payload as JSON to any URL.
 *
 * No new dependency and no new third-party account. If nothing is
 * configured, errors are still logged - you just do not get the push.
 */

type Extra = Record<string, unknown>;

/** Seconds to wait before re-alerting the same error context, to avoid a
 *  flood when one broken thing fires repeatedly. Logs are never throttled. */
const ALERT_COOLDOWN_MS = 60_000;
const lastAlertAt = new Map<string, number>();

function alertEnabled(): boolean {
  return Boolean(
    (process.env.TELEGRAM_BOT_TOKEN && process.env.ALERT_TELEGRAM_CHAT_ID) ||
      process.env.ERROR_WEBHOOK_URL,
  );
}

async function pushAlert(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ALERT_TELEGRAM_CHAT_ID;
  const webhook = process.env.ERROR_WEBHOOK_URL;
  try {
    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      });
    } else if (webhook) {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, source: 'celodesk' }),
      });
    }
  } catch {
    // Alerting must never throw - a failed alert cannot be allowed to
    // cascade into the very error path it is trying to report.
  }
}

function maybeAlert(context: string, message: string): void {
  if (!alertEnabled()) return;
  const now = Date.now();
  const previous = lastAlertAt.get(context) ?? 0;
  if (now - previous < ALERT_COOLDOWN_MS) return;
  lastAlertAt.set(context, now);
  const env = process.env.NODE_ENV || 'production';
  void pushAlert(`⚠️ CeloDesk ${env} error\n[${context}]\n${message}`.slice(0, 900));
}

/**
 * Record an error. Always logs; alerts when a channel is configured.
 * `context` is a short, stable label (e.g. "express", "recurrence") so
 * alerts for the same source can be throttled together.
 */
export function reportError(context: string, err: unknown, extra?: Extra): void {
  const e = err as { message?: string; stack?: string } | undefined;
  const message = e?.message || String(err);
  const payload = {
    level: 'error',
    context,
    message,
    stack: e?.stack,
    ...extra,
    at: new Date().toISOString(),
  };
  // One structured line per error - greppable in `pm2 logs`.
  console.error(`[celodesk:error] ${context}: ${JSON.stringify(payload)}`);
  maybeAlert(context, message);
}

/**
 * Install last-resort handlers so a stray rejection or exception can no
 * longer crash the process without a trace. Call once, as early as
 * possible, in each long-running process (backend server, Telegram agent).
 */
export function installProcessGuards(label = 'process'): void {
  process.on('unhandledRejection', (reason) => {
    // A rejected promise nobody awaited. Log it and keep serving - one bad
    // request should not take the whole server down.
    reportError(`${label}:unhandledRejection`, reason);
  });
  process.on('uncaughtException', (err) => {
    // The process is now in an undefined state. Report, give the log/alert
    // a moment to flush, then exit so the process manager restarts it clean.
    reportError(`${label}:uncaughtException`, err);
    setTimeout(() => process.exit(1), 500).unref();
  });
}
