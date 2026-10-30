/**
 * Internal, service-to-service endpoints (not for the public web app).
 * Used by the Telegram bot to send unpaid reminders it cannot compute itself:
 * the backend decides who is due, the bot delivers via Telegram, then reports
 * back so the shared throttle advances. Guarded by a shared secret the backend
 * and bot both read from INTERNAL_API_KEY; if it is unset, every route is 503.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { getDueTelegramReminders, markReminderSent } from '../services/reminders';

const router = Router();

function requireInternalKey(req: Request, res: Response, next: NextFunction) {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) return res.status(503).json({ error: 'Internal API disabled (INTERNAL_API_KEY not set).' });
  if (req.header('x-internal-key') !== key) return res.status(401).json({ error: 'Unauthorized.' });
  next();
}
router.use(requireInternalKey);

// GET /api/internal/telegram-reminders — invoices due for a Telegram nudge.
router.get('/telegram-reminders', async (_req, res) => {
  try {
    res.json(await getDueTelegramReminders());
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Could not load reminders.' });
  }
});

// POST /api/internal/telegram-reminders/:id/sent — bot confirms it delivered.
router.post('/telegram-reminders/:id/sent', async (req, res) => {
  try {
    await markReminderSent(req.params.id, 'telegram');
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Could not record the reminder.' });
  }
});

export { router };
