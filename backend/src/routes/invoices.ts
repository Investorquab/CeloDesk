import { Router } from 'express';
import { z } from 'zod';
import {
  createInvoice,
  getInvoice,
  getInvoiceBySlug,
  toPublicInvoiceView,
  listOutstandingInvoices,
  getPaymentSummary,
  markInvoiceViewed,
  cancelInvoice,
  createPaymentIntent,
} from '../services/invoiceService';
import { verifyPayment, findVerifiedTokenTransfer } from '../services/paymentVerifier';
import { CELO_TOKENS, getToken } from '../celo/tokens';
import { appendAttribution } from '../services/attribution';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const prisma = new PrismaClient();
export const router = Router();

const ERC20_TRANSFER_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

const createInvoiceSchema = z.object({
  merchantId: z.string(),
  clientName: z.string().min(1),
  clientContact: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/),
  tokenSymbol: z.string(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

// POST /api/invoices — create a draft invoice
// Auth-gated: merchantId is taken from the authenticated wallet's JWT,
// NOT from the request body — a client-supplied merchantId in the body
// is accepted for backward compatibility but ignored for authorization
// (see SECURITY.md's IDOR section). This is what actually decides who
// the invoice belongs to.
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }
  try {
    const invoice = await createInvoice({ ...parsed.data, merchantId: req.merchantId! });
    res.status(201).json({
      id: invoice.id,
      publicUrl: `${process.env.FRONTEND_URL}/invoice/${invoice.publicSlug}`,
      status: invoice.status,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/invoices/:id
// Auth-gated + ownership-checked — this returns full invoice detail
// including payment records, so it's merchant-only, unlike the public
// by-slug lookup below (which returns the same shape but is what
// anonymous payers use).
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const invoice = await getInvoice(req.params.id);
    if (invoice.merchantId !== req.merchantId) {
      return res.status(404).json({ error: 'Invoice not found' }); // 404, not 403 — don't confirm existence to non-owners
    }
    res.json(toPublicInvoiceView(invoice));
  } catch {
    res.status(404).json({ error: 'Invoice not found' });
  }
});

// GET /api/invoices/by-slug/:slug — what the public checkout page (Claude 2)
// actually resolves against. publicSlug is deliberately a different field
// from the internal id (see DATABASE.md) so shareable URLs don't leak the
// internal cuid.
router.get('/by-slug/:slug', async (req, res) => {
  try {
    const invoice = await getInvoiceBySlug(req.params.slug);
    res.json(toPublicInvoiceView(invoice));
  } catch {
    res.status(404).json({ error: 'Invoice not found' });
  }
});

// POST /api/invoices/:id/payment-intent
// Creates a short-lived payment intent binding this invoice to the payer
// wallet before any on-chain transfer is signed. The binding prevents a
// later transaction from being auto-assigned to the wrong invoice merely
// because recipient/token/amount happen to match another invoice.
const paymentIntentSchema = z.object({ payerAddress: z.string() });
router.post('/:id/payment-intent', async (req, res) => {
  const parsed = paymentIntentSchema.safeParse(req.body);
  if (!parsed.success || !ethers.isAddress(parsed.data.payerAddress)) {
    return res.status(400).json({ error: 'A valid payerAddress is required.' });
  }
  try {
    const { intentId, expiresAt, invoice, token, paymentAmount } = await createPaymentIntent(req.params.id, parsed.data.payerAddress);
    const iface = new ethers.Interface(ERC20_TRANSFER_ABI);
    const amountUnits = ethers.parseUnits(paymentAmount, token.decimals);
    const baseData = iface.encodeFunctionData('transfer', [invoice.receivingWallet, amountUnits]) as `0x${string}`;
    const data = appendAttribution(baseData);
    res.json({
      intentId,
      expiresAt,
      payerAddress: parsed.data.payerAddress.toLowerCase(),
      to: token.address,
      data,
      value: '0x0',
      chainId: invoice.chainId,
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Could not create payment intent.' });
  }
});

// GET /api/invoices/:id/payment-intent
// Legacy-compatible form. It now requires payerAddress so every intent is
// bound to the wallet that is about to sign the transfer.
router.get('/:id/payment-intent', async (req, res) => {
  const payerAddress = typeof req.query.payerAddress === 'string' ? req.query.payerAddress : '';
  if (!ethers.isAddress(payerAddress)) return res.status(400).json({ error: 'payerAddress is required to create a payment intent.' });
  try {
    const { intentId, expiresAt, invoice, token, paymentAmount } = await createPaymentIntent(req.params.id, payerAddress);
    const iface = new ethers.Interface(ERC20_TRANSFER_ABI);
    const amountUnits = ethers.parseUnits(paymentAmount, token.decimals);
    const baseData = iface.encodeFunctionData('transfer', [invoice.receivingWallet, amountUnits]) as `0x${string}`;
    res.json({
      intentId,
      expiresAt,
      payerAddress: payerAddress.toLowerCase(),
      to: token.address,
      data: appendAttribution(baseData),
      value: '0x0',
      chainId: invoice.chainId,
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Could not create payment intent.' });
  }
});

// GET /api/invoices/:id/status
router.get('/:id/status', async (req, res) => {
  try {
    const invoice = await getInvoice(req.params.id);
    res.json({ status: invoice.status });
  } catch {
    res.status(404).json({ error: 'Invoice not found' });
  }
});

// GET /api/invoices?merchantId=...&status=outstanding
// Auth-gated: merchantId query param must match the authenticated
// wallet's own merchantId — otherwise anyone could read anyone else's
// invoice list just by changing this parameter (see SECURITY.md).
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const { merchantId, status } = req.query;
  if (!merchantId || typeof merchantId !== 'string') {
    return res.status(400).json({ error: 'merchantId is required' });
  }
  if (merchantId !== req.merchantId) {
    return res.status(403).json({ error: 'You can only list your own invoices.' });
  }
  if (status === 'outstanding') {
    return res.json(await listOutstandingInvoices(merchantId));
  }
  const invoices = await prisma.invoice.findMany({ where: { merchantId }, include: { payments: true } });
  const now = new Date();
  const normalized = invoices.map((invoice) => {
    if (invoice.dueDate && invoice.dueDate < now && ['SENT', 'VIEWED', 'PENDING', 'PARTIALLY_PAID'].includes(invoice.status)) {
      return { ...invoice, status: 'OVERDUE' as const };
    }
    return invoice;
  });
  res.json(normalized);
});

// GET /api/invoices/summary/:merchantId — auth-gated, own-data only.
router.get('/summary/:merchantId', requireAuth, async (req: AuthedRequest, res) => {
  if (req.params.merchantId !== req.merchantId) {
    return res.status(403).json({ error: 'You can only view your own summary.' });
  }
  res.json(await getPaymentSummary(req.params.merchantId));
});

// POST /api/payments/verify — the ONLY way an invoice can become PAID.
// Client-reported "success" is never trusted; this independently checks
// the chain. See SECURITY.md and paymentVerifier.ts.
const verifySchema = z.object({
  invoiceId: z.string(),
  intentId: z.string(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

const verifyPaymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please wait a few minutes and try again.' },
});

router.post('/verify-payment', verifyPaymentLimiter, async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }
  const { invoiceId, intentId, txHash } = parsed.data;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const existing = await prisma.payment.findUnique({ where: { txHash } });
  if (existing) return res.status(409).json({ error: 'This transaction has already been recorded.' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is not set.' });
  let intent: { type: string; invoiceId: string; payerAddress: string };
  try {
    intent = jwt.verify(intentId, secret) as typeof intent;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired payment intent.' });
  }
  if (intent.type !== 'payment_intent' || intent.invoiceId !== invoice.id || !ethers.isAddress(intent.payerAddress)) {
    return res.status(400).json({ error: 'Invalid payment intent for this invoice.' });
  }

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const result = await verifyPayment(provider, {
    txHash,
    invoice: {
      id: invoice.id,
      tokenSymbol: invoice.tokenSymbol,
      tokenAddress: invoice.tokenAddress,
      receivingWallet: invoice.receivingWallet,
      amount: invoice.amount.toString(),
      chainId: invoice.chainId,
    },
  });

  if (!result.ok) {
    // A successful transfer of another verified Celo token to the invoice
    // wallet is real money but does not satisfy this invoice. Record it as
    // a reviewable mismatch rather than pretending it never arrived.
    const mismatch = await findVerifiedTokenTransfer(provider, txHash, invoice.receivingWallet);
    if (mismatch && mismatch.tokenAddress.toLowerCase() !== invoice.tokenAddress.toLowerCase() && mismatch.confirmations >= 12) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          txHash,
          chainId: invoice.chainId,
          fromAddress: mismatch.fromAddress,
          toAddress: invoice.receivingWallet,
          tokenAddress: mismatch.tokenAddress,
          amount: mismatch.amount,
          status: 'REJECTED',
          confirmations: mismatch.confirmations,
          blockNumber: mismatch.blockNumber,
          rejectionReason: `TOKEN_MISMATCH: expected ${invoice.tokenSymbol}, received ${mismatch.tokenSymbol}`,
        },
      });
      return res.status(422).json({
        verified: false,
        status: 'TOKEN_MISMATCH',
        reason: `Payment received in ${mismatch.tokenSymbol}, but this invoice expects ${invoice.tokenSymbol}. Review the payment.`,
        receivedAmount: mismatch.amount,
        receivedToken: mismatch.tokenSymbol,
      });
    }
    return res.status(422).json({ verified: false, reason: result.reason });
  }

  const payerMatches = result.fromAddress.toLowerCase() === intent.payerAddress.toLowerCase();
  if (!payerMatches) {
    return res.status(422).json({
      verified: false,
      status: 'UNMATCHED_PAYMENT',
      reason: 'The transaction sender does not match the wallet that created this payment intent.',
    });
  }

  const decimals = getToken(invoice.tokenSymbol).decimals;
  const expected = ethers.parseUnits(invoice.amount.toString(), decimals);
  const receivedUnits = ethers.parseUnits(result.amount, decimals);

  try {
    // Serializable isolation prevents two simultaneous payment confirmations
    // from both calculating the invoice status from the same stale balance.
    const committed = await prisma.$transaction(async (tx) => {
      const existingVerified = await tx.payment.findMany({
        where: { invoiceId: invoice.id, status: 'VERIFIED' },
        select: { amount: true },
      });

      const priorUnits = existingVerified.reduce(
        (sum, p) => sum + ethers.parseUnits(p.amount.toString(), decimals),
        0n,
      );

      const aggregate = priorUnits + receivedUnits;
      const newStatus =
        aggregate > expected
          ? 'OVERPAID'
          : aggregate === expected
            ? 'PAID'
            : 'PARTIALLY_PAID';

      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          txHash,
          chainId: invoice.chainId,
          fromAddress: result.fromAddress,
          toAddress: invoice.receivingWallet,
          tokenAddress: invoice.tokenAddress,
          amount: result.amount,
          status: 'VERIFIED',
          confirmations: result.confirmations,
          blockNumber: result.blockNumber,
          verifiedAt: new Date(),
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });

      return { newStatus, aggregate };
    }, { isolationLevel: 'Serializable' });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'This transaction or payment intent has already been recorded.',
      });
    }
    if (err.code === 'P2034') {
      return res.status(409).json({
        error: 'Payment verification is being updated at the same time. Please try again.',
      });
    }
    throw err;
  }

  const expectedDisplay = invoice.amount.toString();
  return res.json({
    verified: true,
    invoiceStatus: committed.newStatus,
    paymentAmount: result.amount,
    invoiceAmount: expectedDisplay,
    remainingAmount: committed.aggregate < expected ? ethers.formatUnits(expected - committed.aggregate, decimals) : '0',
    overpaymentAmount: committed.aggregate > expected ? ethers.formatUnits(committed.aggregate - expected, decimals) : '0',
  });
});

// POST /api/invoices/:id/remind
// Auth-gated + ownership-checked.
router.post('/:id/remind', requireAuth, async (req: AuthedRequest, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.merchantId !== req.merchantId) return res.status(404).json({ error: 'Invoice not found' });

  const channel = typeof req.body?.channel === 'string' ? req.body.channel : 'telegram';

  const reminder = await prisma.reminder.create({
    data: { invoiceId: invoice.id, channel },
  });
  res.status(201).json(reminder);
});

// GET /api/invoices/:id/reminders — auth-gated + ownership-checked.
router.get('/:id/reminders', requireAuth, async (req: AuthedRequest, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice || invoice.merchantId !== req.merchantId) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  const reminders = await prisma.reminder.findMany({
    where: { invoiceId: req.params.id },
    orderBy: { sentAt: 'desc' },
  });
  res.json(reminders);
});

// DELETE /api/invoices/:id
// Soft-delete only: sets status to CANCELLED rather than removing the
// row. A PAID invoice's Payment records are financial history — they
// are never destroyed, and a PAID invoice cannot be cancelled at all
// (see cancelInvoice's comment in invoiceService.ts).
router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice || invoice.merchantId !== req.merchantId) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  try {
    await cancelInvoice(req.params.id);
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Loose limiter for view-tracking — this is public and hit by every
// checkout page load, so it needs to be generous (unlike the stricter
// wallet-auth/payment-verify limiters), but still bounded against
// abuse per SECURITY.md's rate-limiting audit item.
const viewLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/invoices/by-slug/:slug/view
// Call this once when the public checkout page first loads. Safe to
// call multiple times — it's a no-op after the first SENT->VIEWED
// transition (see markInvoiceViewed's comment).
router.post('/by-slug/:slug/view', viewLimiter, async (req, res) => {
  try {
    const invoice = await getInvoiceBySlug(req.params.slug);
    const updated = await markInvoiceViewed(invoice.id);
    res.json({ status: updated.status });
  } catch {
    res.status(404).json({ error: 'Invoice not found' });
  }
});
