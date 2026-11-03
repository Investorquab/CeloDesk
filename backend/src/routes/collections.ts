/**
 * Collections: batch payouts.
 *
 * A supervisor creates a Collection and shares its public link. Each payee
 * opens the link and submits their own name, wallet, amount and token (so they
 * are genuinely independent parties). The supervisor reviews every submission,
 * accepts the legitimate ones and rejects the rest, then pays all the accepted
 * payees at once with a single Disperse transaction per token (Stage D).
 *
 * Semantics are inverted vs Invoice: here the supervisor PAYS and each payee's
 * wallet RECEIVES, so an item stores the payee's wallet as the destination.
 */

import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { getToken } from '../celo/tokens';

const prisma = new PrismaClient();
export const router = Router();

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
const AMOUNT_RE = /^\d+(\.\d{1,6})?$/;

// Serialize an item for API responses (Decimal -> string).
function itemView(item: any) {
  return {
    id: item.id,
    payeeName: item.payeeName,
    payeeWallet: item.payeeWallet,
    tokenSymbol: item.tokenSymbol,
    tokenAddress: item.tokenAddress,
    amount: item.amount.toString(),
    note: item.note ?? null,
    status: item.status,
    txHash: item.txHash ?? null,
    paidAt: item.paidAt ?? null,
    createdAt: item.createdAt,
  };
}

function collectionView(c: any) {
  const items = (c.items ?? []).map(itemView);
  return {
    id: c.id,
    publicSlug: c.publicSlug,
    title: c.title,
    description: c.description ?? null,
    allowedTokens: c.allowedTokens ?? [],
    status: c.status,
    createdAt: c.createdAt,
    items,
    counts: {
      total: items.length,
      pending: items.filter((i: any) => i.status === 'PENDING').length,
      accepted: items.filter((i: any) => i.status === 'ACCEPTED').length,
      rejected: items.filter((i: any) => i.status === 'REJECTED').length,
      paid: items.filter((i: any) => i.status === 'PAID').length,
    },
  };
}

// ----- Supervisor (authenticated) -----

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  allowedTokens: z.array(z.string().min(2).max(12)).max(30).optional(),
});

// POST /api/collections — create a collection.
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter a title for the collection.', details: parsed.error.flatten() });
  }
  // Validate any allowed tokens up front so a typo never blocks payees later.
  const allowedTokens: string[] = [];
  for (const sym of parsed.data.allowedTokens ?? []) {
    try {
      getToken(sym);
      allowedTokens.push(sym);
    } catch {
      return res.status(400).json({ error: `Unknown or unverified token: ${sym}.` });
    }
  }
  const collection = await prisma.collection.create({
    data: {
      supervisorId: req.merchantId!,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      allowedTokens,
    },
    include: { items: true },
  });
  res.status(201).json(collectionView(collection));
});

// GET /api/collections — list the supervisor's collections (summary only).
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const collections = await prisma.collection.findMany({
    where: { supervisorId: req.merchantId! },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
  res.json(collections.map(collectionView));
});

// GET /api/collections/:id — one collection with all its items.
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const collection = await prisma.collection.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  });
  if (!collection || collection.supervisorId !== req.merchantId) {
    return res.status(404).json({ error: 'Collection not found.' });
  }
  res.json(collectionView(collection));
});

const statusSchema = z.object({ status: z.enum(['OPEN', 'CLOSED']) });

// POST /api/collections/:id/status — open or close submissions.
router.post('/:id/status', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status.' });
  const collection = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!collection || collection.supervisorId !== req.merchantId) {
    return res.status(404).json({ error: 'Collection not found.' });
  }
  if (collection.status === 'PAID') {
    return res.status(400).json({ error: 'This collection has already been paid out.' });
  }
  const updated = await prisma.collection.update({
    where: { id: collection.id },
    data: { status: parsed.data.status },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  });
  res.json(collectionView(updated));
});

const decisionSchema = z.object({ decision: z.enum(['ACCEPTED', 'REJECTED']) });

// POST /api/collections/:id/items/:itemId/decision — accept or reject a payee.
router.post('/:id/items/:itemId/decision', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = decisionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose accept or reject.' });

  const collection = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!collection || collection.supervisorId !== req.merchantId) {
    return res.status(404).json({ error: 'Collection not found.' });
  }
  const item = await prisma.collectionItem.findUnique({ where: { id: req.params.itemId } });
  if (!item || item.collectionId !== collection.id) {
    return res.status(404).json({ error: 'Submission not found.' });
  }
  if (item.status === 'PAID') {
    return res.status(400).json({ error: 'This payee has already been paid and cannot be changed.' });
  }
  const updated = await prisma.collectionItem.update({
    where: { id: item.id },
    data: { status: parsed.data.decision },
  });
  res.json(itemView(updated));
});

// ----- Public payee submission (no auth) -----

// GET /api/collections/by-slug/:slug — public info to render the submit page.
router.get('/by-slug/:slug', async (req, res) => {
  const collection = await prisma.collection.findUnique({
    where: { publicSlug: req.params.slug },
    include: { supervisor: { include: { profile: true } } },
  });
  if (!collection) return res.status(404).json({ error: 'Collection not found.' });
  res.json({
    title: collection.title,
    description: collection.description ?? null,
    allowedTokens: collection.allowedTokens ?? [],
    status: collection.status,
    organizer: collection.supervisor?.profile?.businessName || 'A CeloDesk organizer',
    open: collection.status === 'OPEN',
  });
});

const submitSchema = z.object({
  payeeName: z.string().min(1).max(80),
  payeeWallet: z.string().regex(WALLET_RE, 'Enter a valid Celo wallet address (0x + 40 hex characters).'),
  tokenSymbol: z.string().min(2).max(12),
  amount: z.string().regex(AMOUNT_RE, 'Enter a valid amount.'),
  note: z.string().max(200).optional(),
});

// POST /api/collections/by-slug/:slug/items — a payee submits their request.
router.post('/by-slug/:slug/items', async (req, res) => {
  const collection = await prisma.collection.findUnique({ where: { publicSlug: req.params.slug } });
  if (!collection) return res.status(404).json({ error: 'Collection not found.' });
  if (collection.status !== 'OPEN') {
    return res.status(400).json({ error: 'This collection is no longer accepting submissions.' });
  }

  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please check your details and try again.', details: parsed.error.flatten() });
  }
  if (Number(parsed.data.amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero.' });
  }

  // Resolve + validate the token (throws if unknown/unverified).
  let token;
  try {
    token = getToken(parsed.data.tokenSymbol);
  } catch {
    return res.status(400).json({ error: `Unsupported token: ${parsed.data.tokenSymbol}.` });
  }
  if (collection.allowedTokens.length && !collection.allowedTokens.includes(parsed.data.tokenSymbol)) {
    return res.status(400).json({ error: `This collection only accepts: ${collection.allowedTokens.join(', ')}.` });
  }

  const item = await prisma.collectionItem.create({
    data: {
      collectionId: collection.id,
      payeeName: parsed.data.payeeName.trim(),
      payeeWallet: parsed.data.payeeWallet,
      tokenSymbol: parsed.data.tokenSymbol,
      tokenAddress: token.address,
      amount: parsed.data.amount,
      note: parsed.data.note?.trim() || null,
    },
  });
  res.status(201).json({ ok: true, id: item.id });
});
