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
// CORS is open (all origins) for hackathon dev speed — this already
// answers Claude 2's question 4: yes, browser calls from any origin,
// including the frontend's dev server, are accepted right now. Tighten
// to an explicit allowlist (process.env.APP_URL) before any real deploy
// — see SECURITY.md.
app.use(cors());
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
