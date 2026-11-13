/**
 * Error visibility for the CeloDesk Telegram agent.
 *
 * The agent is a separate deployable from the backend, so it carries its own
 * small copy of the crash guards rather than importing across build roots.
 * `installProcessGuards()` stops a stray rejection or uncaught exception from
 * killing the bot without a trace: every error is logged as a structured line
 * (captured by `pm2 logs`) and, when ALERT_TELEGRAM_CHAT_ID is set alongside
 * TELEGRAM_BOT_TOKEN, pushed to you as a Telegram message.
 */

const ALERT_COOLDOWN_MS = 60_000;
const lastAlertAt = new Map<string, number>();

async function pushAlert(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ALERT_TELEGRAM_CHAT_ID;
  const webhook = process.env.ERROR_WEBHOOK_URL;
  try {
    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      });
    } else if (webhook) {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, source: 'celodesk-agent' }),
      });
    }
  } catch {
    // Alerting must never throw.
  }
}

function maybeAlert(context: string, message: string): void {
  const now = Date.now();
  if (now - (lastAlertAt.get(context) ?? 0) < ALERT_COOLDOWN_MS) return;
  lastAlertAt.set(context, now);
  void pushAlert(`⚠️ CeloDesk agent error\n[${context}]\n${message}`.slice(0, 900));
}

export function reportError(context: string, err: unknown): void {
  const e = err as { message?: string; stack?: string } | undefined;
  const message = e?.message || String(err);
  console.error(
    `[celodesk:error] ${context}: ${JSON.stringify({
      context,
      message,
      stack: e?.stack,
      at: new Date().toISOString(),
    })}`,
  );
  maybeAlert(context, message);
}

export function installProcessGuards(label = 'agent'): void {
  process.on('unhandledRejection', (reason) => {
    reportError(`${label}:unhandledRejection`, reason);
  });
  process.on('uncaughtException', (err) => {
    reportError(`${label}:uncaughtException`, err);
    setTimeout(() => process.exit(1), 500).unref();
  });
}
