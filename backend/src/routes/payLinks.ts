/**
 * Reusable payment links.
 *
 * A merchant shares one link (keyed by their profile slug/username). A payer
 * opens it, enters an amount + currency, and we spin up a one-off invoice to
 * that merchant, reusing the existing tagged-payment + verification flow. Every
 * payment therefore shows up in the merchant's dashboard like any invoice, so
 * tracking stays unified. No auth: this is a public "pay me" surface.
 */

import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createInvoice } from '../services/invoiceService';

const prisma = new PrismaClient();
export const router = Router();

async function resolveBySlug(slug: string) {
  return prisma.profile.findUnique({
    where: { slug: slug.toLowerCase() },
    include: { user: true },
  });
}

// GET /api/pay-links/:slug — public info to render the pay-link page.
router.get('/:slug', async (req, res) => {
  const profile = await resolveBySlug(req.params.slug);
  if (!profile) return res.status(404).json({ error: 'Payment link not found.' });
  res.json({
    slug: profile.slug,
    businessName: profile.businessName,
    logoUrl: profile.logoUrl,
    tagline: profile.tagline,
    preferredToken: profile.preferredToken,
    acceptedTokens: profile.acceptedTokens,
    hasWallet: !!profile.user.walletAddress,
  });
});

const paySchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,18})?$/, 'Enter a valid amount.'),
  tokenSymbol: z.string().min(2),
  clientName: z.string().max(80).optional(),
});

// POST /api/pay-links/:slug — a payer starts a payment. Creates a one-off
// invoice and returns its public checkout slug to redirect to.
router.post('/:slug', async (req, res) => {
  const profile = await resolveBySlug(req.params.slug);
  if (!profile) return res.status(404).json({ error: 'Payment link not found.' });

  const parsed = paySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter a valid amount and currency.', details: parsed.error.flatten() });
  }
  if (Number(parsed.data.amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero.' });
  }

  try {
    const invoice = await createInvoice({
      merchantId: profile.userId,
      clientName: parsed.data.clientName?.trim() || 'Payment link',
      amount: parsed.data.amount,
      tokenSymbol: parsed.data.tokenSymbol,
      description: `Payment to ${profile.businessName}`,
      initialStatus: 'SENT',
    });
    return res.status(201).json({ slug: invoice.publicSlug });
  } catch (err: any) {
    // createInvoice throws if the token is unknown or the merchant has no
    // payout wallet yet — surface that as a clean client error.
    return res.status(400).json({ error: err?.message || 'Could not start this payment.' });
  }
});
