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
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { getToken } from '../celo/tokens';
import { appendAttribution } from '../services/attribution';
import { sendEmail } from '../services/email';

const prisma = new PrismaClient();
export const router = Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
const AMOUNT_RE = /^\d+(\.\d{1,6})?$/;

// Disperse: batch ERC20 payout contract, verified on Celo mainnet. Lets the
// supervisor pay every accepted payee of one token in a single transaction
// (after a one-time approve). disperseToken(token, recipients[], values[]).
const DISPERSE_ADDRESS = '0xD152f549545093347A162Dce210e7293f1452150';
const CHAIN_ID = 42220;
const ERC20_APPROVE_ABI = ['function approve(address spender, uint256 amount) returns (bool)'];
const DISPERSE_ABI = ['function disperseToken(address token, address[] recipients, uint256[] values)'];

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
    rejectionNote: item.rejectionNote ?? null,
    hasEmail: !!item.payeeEmail,
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

const decisionSchema = z.object({
  decision: z.enum(['ACCEPTED', 'REJECTED']),
  note: z.string().max(500).optional(),
});

// POST /api/collections/:id/items/:itemId/decision — accept or reject a payee.
// On reject you may pass a note; if the payee gave an email, we email it to
// them with the collection link so they can fix their details and resubmit.
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
  const note = parsed.data.decision === 'REJECTED' ? (parsed.data.note?.trim() || null) : null;
  const updated = await prisma.collectionItem.update({
    where: { id: item.id },
    data: { status: parsed.data.decision, rejectionNote: note },
  });

  // Let the payee know why they were rejected, so they can correct and resubmit.
  let emailed = false;
  if (parsed.data.decision === 'REJECTED' && item.payeeEmail && note) {
    const resubmitUrl = `${FRONTEND_URL}/collect/${collection.publicSlug}`;
    const safeNote = note.replace(/</g, '&lt;');
    const html =
      `<p>Hi ${item.payeeName.replace(/</g, '&lt;')},</p>` +
      `<p>Your submission to <b>${collection.title.replace(/</g, '&lt;')}</b> needs a change before it can be paid:</p>` +
      `<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">${safeNote}</blockquote>` +
      `<p>You can submit again with the correct details here:<br><a href="${resubmitUrl}">${resubmitUrl}</a></p>`;
    const r = await sendEmail({
      to: item.payeeEmail,
      toName: item.payeeName,
      subject: `Please update your submission to ${collection.title}`,
      html,
      text: `Hi ${item.payeeName}, your submission to "${collection.title}" needs a change: ${note}\n\nResubmit here: ${resubmitUrl}`,
    }).catch(() => ({ ok: false }));
    emailed = !!r.ok;
  }

  res.json({ ...itemView(updated), emailedPayee: emailed });
});

// POST /api/collections/:id/pay-intent — build the batch payout for one token.
// Returns an (optional) approve transaction and the single disperseToken
// transaction that pays every accepted payee of that token. Both carry the
// attribution tag in their calldata. The wallet signs them; nothing is sent
// here.
const payIntentSchema = z.object({
  tokenSymbol: z.string().min(2).max(12),
  payerAddress: z.string(),
});
router.post('/:id/pay-intent', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = payIntentSchema.safeParse(req.body);
  if (!parsed.success || !ethers.isAddress(parsed.data.payerAddress)) {
    return res.status(400).json({ error: 'A token and a valid payer wallet are required.' });
  }
  const collection = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!collection || collection.supervisorId !== req.merchantId) {
    return res.status(404).json({ error: 'Collection not found.' });
  }

  let token;
  try {
    token = getToken(parsed.data.tokenSymbol);
  } catch {
    return res.status(400).json({ error: `Unsupported token: ${parsed.data.tokenSymbol}.` });
  }

  const items = await prisma.collectionItem.findMany({
    where: { collectionId: collection.id, tokenSymbol: parsed.data.tokenSymbol, status: 'ACCEPTED' },
    orderBy: { createdAt: 'asc' },
  });
  if (!items.length) {
    return res.status(400).json({ error: `No accepted payees in ${parsed.data.tokenSymbol} to pay.` });
  }

  const recipients = items.map((i) => i.payeeWallet);
  const values = items.map((i) => ethers.parseUnits(i.amount.toString(), token!.decimals));
  const total = values.reduce((a, b) => a + b, 0n);

  const approveData = appendAttribution(
    new ethers.Interface(ERC20_APPROVE_ABI).encodeFunctionData('approve', [DISPERSE_ADDRESS, total]) as `0x${string}`,
  );
  const disperseData = appendAttribution(
    new ethers.Interface(DISPERSE_ABI).encodeFunctionData('disperseToken', [token.address, recipients, values]) as `0x${string}`,
  );

  res.json({
    tokenSymbol: parsed.data.tokenSymbol,
    tokenAddress: token.address,
    decimals: token.decimals,
    chainId: CHAIN_ID,
    disperseAddress: DISPERSE_ADDRESS,
    itemIds: items.map((i) => i.id),
    recipients,
    values: values.map((v) => v.toString()),
    total: total.toString(),
    // approve the Disperse contract to move `total` of this token, then call it.
    approve: { to: token.address, data: approveData, value: '0x0', chainId: CHAIN_ID },
    disperse: { to: DISPERSE_ADDRESS, data: disperseData, value: '0x0', chainId: CHAIN_ID },
  });
});

// POST /api/collections/:id/pay/confirm — record a completed batch payout.
// Verifies the transaction really went to Disperse and succeeded, then marks
// every accepted payee of that token as PAID.
const confirmSchema = z.object({
  tokenSymbol: z.string().min(2).max(12),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'A valid transaction hash is required.'),
});
router.post('/:id/pay/confirm', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A token and a valid transaction hash are required.' });

  const collection = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!collection || collection.supervisorId !== req.merchantId) {
    return res.status(404).json({ error: 'Collection not found.' });
  }

  // Confirm the transaction on-chain before marking anyone paid.
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const receipt = await provider.getTransactionReceipt(parsed.data.txHash);
    if (!receipt) return res.status(400).json({ error: 'Transaction not found yet. Wait for it to confirm and try again.' });
    if (receipt.status !== 1) return res.status(400).json({ error: 'That transaction failed on-chain; no one was marked paid.' });
    if ((receipt.to || '').toLowerCase() !== DISPERSE_ADDRESS.toLowerCase()) {
      return res.status(400).json({ error: 'That transaction was not a batch payout to the Disperse contract.' });
    }
  } catch (e: any) {
    return res.status(400).json({ error: 'Could not verify the transaction on-chain. Please try again shortly.' });
  }

  await prisma.collectionItem.updateMany({
    where: { collectionId: collection.id, tokenSymbol: parsed.data.tokenSymbol, status: 'ACCEPTED' },
    data: { status: 'PAID', txHash: parsed.data.txHash, paidAt: new Date() },
  });

  // If nothing accepted remains unpaid, the whole collection is paid out.
  const remaining = await prisma.collectionItem.count({ where: { collectionId: collection.id, status: 'ACCEPTED' } });
  if (remaining === 0) {
    await prisma.collection.update({ where: { id: collection.id }, data: { status: 'PAID' } });
  }

  const updated = await prisma.collection.findUnique({
    where: { id: collection.id },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  });
  res.json(collectionView(updated));
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
  payeeEmail: z.string().email().optional(),
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
