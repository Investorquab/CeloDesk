import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
import express from 'express';
import cors from 'cors';
import { router as invoiceRouter } from './routes/invoices';
import { router as tokenRouter } from './routes/tokens';
import { router as authRouter } from './routes/auth';
import { router as merchantRouter } from './routes/merchants';
import { router as agentRouter } from './routes/agent';
import { router as x402Router } from './routes/x402';
import { router as internalRouter } from './routes/internal';
import { router as payLinkRouter } from './routes/payLinks';
import { router as collectionRouter } from './routes/collections';
import { assertAttributionIntegrity, HACKATHON_ATTRIBUTION_TAG } from './services/attribution';
import { startRecurrenceScheduler } from './services/recurrence';
import { installProcessGuards, reportError } from './observability';

// Catch stray promise rejections and uncaught exceptions before they can
// take the process down without a trace. Installed first so it covers
// startup too.
installProcessGuards('backend');

// Refuse to start if the attribution tag is wrong or no longer encodes to
// the Loops-issued data suffix. An untagged/mis-tagged deploy would make
// every transaction uncreditable, so this is a hard fail, not a warning.
assertAttributionIntegrity();

const app = express();
const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    'https://celo-desk.vercel.app',
    'http://localhost:3000',
  ].filter((origin): origin is string => Boolean(origin)),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CeloDesk CORS policy.'));
    },
  }),
);
app.use(express.json());

app.use('/api/invoices', invoiceRouter);
app.use('/api/tokens', tokenRouter);
app.use('/api/auth', authRouter);
app.use('/api/merchants', merchantRouter);
app.use('/api/agent', agentRouter);
app.use('/api/x402', x402Router);
app.use('/api/internal', internalRouter);
app.use('/api/pay-links', payLinkRouter);
app.use('/api/collections', collectionRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Anything that did not match a route above.
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Last-resort error handler: log every error that reaches it (including any
// a route forwarded via next(err)) and return a safe message. Without this,
// a thrown route error falls through to Express's default and is never
// recorded. Must be the final `app.use`, and must keep all four arguments.
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    reportError('express', err, { path: req.path, method: req.method });
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Something went wrong on our end.' });
  },
);

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`CeloDesk backend listening on port ${port}`);
  console.log(`Attribution tag active: ${HACKATHON_ATTRIBUTION_TAG}`);
  // Recurring invoices: spawn each due cycle and notify. Safe to run in this
  // single backend process; disable with RECURRENCE_DISABLED=1.
  startRecurrenceScheduler();
});
