import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { getMerchant, upsertProfile, UsernameTakenError } from '../services/merchantService';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const prisma = new PrismaClient();
export const router = Router();

// GET /api/merchants/by-telegram/:telegramId
// Lets the bot recover a merchantId after a restart, instead of only
// keeping the telegramId->merchantId mapping in memory (flagged as a
// gap in CeloDesk agent's README). Placed before /:id in this file
// for readability, though Express route-matching by segment count
// means order doesn't actually matter here (different path shapes).
router.get('/by-telegram/:telegramId', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { telegramId: req.params.telegramId } });
  if (!user) return res.status(404).json({ error: 'No merchant linked to this Telegram account yet.' });
  res.json({ merchantId: user.id, walletAddress: user.walletAddress });
});

// GET /api/merchants/:id — public profile view
router.get('/:id', async (req, res) => {
  try {
    const merchant = await getMerchant(req.params.id);
    res.json(merchant);
  } catch {
    res.status(404).json({ error: 'Merchant not found' });
  }
});

const updateProfileSchema = z.object({
  businessName: z.string().min(1).optional(),
  tagline: z.string().optional(),
  logoUrl: z.string().url().optional(),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  socialLinks: z.record(z.string()).optional(),
  preferredToken: z.string().optional(),
  acceptedTokens: z.array(z.string()).optional(),
  username: z.string().optional(),
});

// PATCH /api/merchants/:id
// Auth-gated + ownership-checked: the authenticated wallet's merchantId
// (from the JWT, see requireAuth) must match the profile being edited.
// merchantId in the URL is no longer trusted on its own; ownership is
// checked against the authenticated merchant session.
router.patch('/:id', requireAuth, async (req: AuthedRequest, res) => {
  if (req.merchantId !== req.params.id) {
    return res.status(403).json({ error: "You can only edit your own profile." });
  }
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }
  try {
    const profile = await upsertProfile(req.params.id, parsed.data);
    res.json(profile);
  } catch (err: any) {
    if (err instanceof UsernameTakenError) {
      return res.status(409).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});
