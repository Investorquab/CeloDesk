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

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`CeloDesk backend listening on port ${port}`);
});
