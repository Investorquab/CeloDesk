/**
 * Wallet-signature authentication.
 *
 * Flow: frontend/bot asks the user to sign a short message with their
 * wallet. We verify the signature came from that wallet, then issue
 * a short-lived session token.
 *
 * This is non-custodial: CeloDesk never receives or stores private keys.
 */

import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient, Prisma } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { getOrCreateMerchantByWallet } from '../services/merchantService';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const prisma = new PrismaClient();
export const router = Router();

const walletAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: true,
  message: {
    error: 'Too many sign-in attempts. Please wait a few minutes and try again.',
  },
});

const SESSION_TTL = '7d';

// Google "Sign in with Google" verification. The Client ID is public (it
// ships in the frontend); the backend uses it to check that an ID token was
// minted for THIS app. No client secret is needed for ID-token verification.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function signSession(user: { id: string; walletAddress: string | null }, secret: string): string {
  return jwt.sign(
    { merchantId: user.id, walletAddress: user.walletAddress },
    secret,
    { expiresIn: SESSION_TTL },
  );
}

// Verifies a Google ID token (the "credential" from the Sign in with Google
// button) and returns the stable identity fields. Throws on anything invalid
// or unverified.
async function verifyGoogleCredential(credential: string) {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    throw new Error('Google sign-in is not configured on this server.');
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw new Error('Invalid Google credential.');
  }
  if (!payload.email || payload.email_verified !== true) {
    throw new Error('Your Google email address is not verified.');
  }
  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? null,
  };
}

// Verifies that `signature` over `message` was produced by `walletAddress`,
// with the same replay protections as POST /wallet. Returns the checksummed
// address or throws a user-facing error.
function verifyWalletOwnership(walletAddress: string, message: string, signature: string): string {
  if (!ethers.isAddress(walletAddress)) {
    throw new Error('walletAddress is not a valid Ethereum/Celo address.');
  }
  if (!message.includes(walletAddress)) {
    throw new Error('Signed message must include the wallet address.');
  }
  const timestampMatch = message.match(/Timestamp:\s*(\d{4}-\d{2}-\d{2}T[^\n]+)/i);
  if (!timestampMatch) {
    throw new Error('Signed message must include a Timestamp.');
  }
  const signedAt = Date.parse(timestampMatch[1].trim());
  if (!Number.isFinite(signedAt) || Math.abs(Date.now() - signedAt) > 10 * 60 * 1000) {
    throw new Error('Authentication message is expired or not yet valid.');
  }
  let recovered: string;
  try {
    recovered = ethers.verifyMessage(message, signature);
  } catch {
    throw new Error('Invalid signature.');
  }
  if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error('Signature does not match the claimed wallet address.');
  }
  return ethers.getAddress(walletAddress);
}

function getJwtSecret(): string | undefined {
  return process.env.JWT_SECRET;
}

// Merge one CeloDesk account's data into another, then delete the emptied one.
// Moves the dropped account's invoices and (per preference) its business
// profile onto the surviving account. Identity scalar fields (wallet / google
// / email / telegram) are set by the CALLER on the surviving account AFTER this
// runs, because deleting `dropId` is what frees those unique values. Must run
// inside a transaction so a half-finished merge can never be observed.
async function mergeAccounts(
  tx: Prisma.TransactionClient,
  keepId: string,
  dropId: string,
  preferDropProfile: boolean,
): Promise<void> {
  await tx.invoice.updateMany({ where: { merchantId: dropId }, data: { merchantId: keepId } });

  const keepProfile = await tx.profile.findUnique({ where: { userId: keepId } });
  const dropProfile = await tx.profile.findUnique({ where: { userId: dropId } });

  if (preferDropProfile && dropProfile) {
    // Keep the dropped account's profile (e.g. an established wallet user's
    // business name + public pay-link slug) over the new account's default.
    if (keepProfile) await tx.profile.delete({ where: { id: keepProfile.id } });
    await tx.profile.update({ where: { id: dropProfile.id }, data: { userId: keepId } });
  } else if (dropProfile) {
    if (keepProfile) await tx.profile.delete({ where: { id: dropProfile.id } });
    else await tx.profile.update({ where: { id: dropProfile.id }, data: { userId: keepId } });
  }

  await tx.user.delete({ where: { id: dropId } });
}

const walletAuthSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
});

// POST /api/auth/wallet
router.post('/wallet', walletAuthLimiter, async (req, res) => {
  const JWT_SECRET = getJwtSecret();

  if (!JWT_SECRET) {
    return res.status(500).json({
      error: 'Server misconfigured: JWT_SECRET is not set.',
    });
  }

  const parsed = walletAuthSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: parsed.error.flatten(),
    });
  }

  const { walletAddress, message, signature } = parsed.data;

  if (!ethers.isAddress(walletAddress)) {
    return res.status(400).json({
      error: 'walletAddress is not a valid Ethereum/Celo address.',
    });
  }

  // Require the wallet address to be part of the signed message.
  if (!message.includes(walletAddress)) {
    return res.status(400).json({
      error: 'Signed message must include the wallet address.',
    });
  }

  // Require a recent timestamp to reduce signature replay risk.
  const timestampMatch = message.match(
    /Timestamp:\s*(\d{4}-\d{2}-\d{2}T[^\n]+)/i,
  );

  if (!timestampMatch) {
    return res.status(400).json({
      error: 'Signed message must include a Timestamp.',
    });
  }

  const signedAt = Date.parse(timestampMatch[1].trim());

  if (
    !Number.isFinite(signedAt) ||
    Math.abs(Date.now() - signedAt) > 10 * 60 * 1000
  ) {
    return res.status(401).json({
      error: 'Authentication message is expired or not yet valid.',
    });
  }

  let recoveredAddress: string;

  try {
    recoveredAddress = ethers.verifyMessage(message, signature);
  } catch {
    return res.status(401).json({
      error: 'Invalid signature.',
    });
  }

  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    return res.status(401).json({
      error: 'Signature does not match the claimed wallet address.',
    });
  }

  const normalizedWallet = ethers.getAddress(walletAddress);

  const user = await prisma.user.upsert({
    where: {
      walletAddress: normalizedWallet,
    },
    update: {},
    create: {
      walletAddress: normalizedWallet,
    },
  });

  const token = jwt.sign(
    {
      merchantId: user.id,
      walletAddress: user.walletAddress,
    },
    JWT_SECRET,
    {
      expiresIn: SESSION_TTL,
    },
  );

  return res.json({
    merchantId: user.id,
    walletAddress: user.walletAddress,
    token,
  });
});

// POST /api/auth/mcp-wallet
// Resolves or creates the wallet-based CeloDesk identity.
// This endpoint is intended for MCP onboarding; existing-account
// access must still be protected by an ownership/linking flow.
router.post('/mcp-wallet', async (req, res) => {
  const internalToken = process.env.CELODESK_MCP_TOKEN;
  const suppliedToken = typeof req.headers['x-celodesk-mcp-token'] === 'string' ? req.headers['x-celodesk-mcp-token'] : '';
  if (!internalToken || suppliedToken.length !== internalToken.length || !crypto.timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(internalToken))) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  const parsed = z.object({
    walletAddress: z.string(),
    message: z.string(),
    typedData: z.string(),
    signature: z.string(),
    clientId: z.string(),
    redirectUri: z.string(),
    state: z.string(),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid input',
    });
  }

  try {
    const { message, typedData, signature } = parsed.data;
    const claimedWallet = parsed.data.walletAddress.trim();

    console.log('[MCP AUTH DEBUG] inbound', {
      claimedWallet,
      messageLength: message.length,
      signatureLength: signature.length,
      messageHash: sha256(message),
      signatureHash: sha256(signature),
    });

    let signedData: any;
    try {
      signedData = JSON.parse(typedData);
    } catch {
      return res.status(401).json({ error: 'Invalid wallet authorization payload.' });
    }

    if (
      !signedData ||
      signedData.primaryType !== 'Authorization' ||
      !signedData.domain ||
      !signedData.message ||
      !signedData.message.wallet
    ) {
      return res.status(401).json({ error: 'Invalid wallet authorization payload.' });
    }

    if (!ethers.isAddress(claimedWallet) || !ethers.isAddress(signedData.message.wallet)) {
      return res.status(401).json({ error: 'Invalid wallet address.' });
    }

    const normalizedWallet = ethers.getAddress(claimedWallet);

    if (signedData.message.wallet.toLowerCase() !== normalizedWallet.toLowerCase()) {
      return res.status(401).json({ error: 'Signed wallet does not match the claimed wallet.' });
    }

    if (signedData.message.clientId !== parsed.data.clientId || signedData.message.redirectUri !== parsed.data.redirectUri || signedData.message.state !== parsed.data.state) {
      return res.status(401).json({ error: 'Signed authorization request does not match the OAuth request.' });
    }

    const timestamp = signedData.message.timestamp;
    const signedAt = Date.parse(timestamp);
    if (!Number.isFinite(signedAt) || Math.abs(Date.now() - signedAt) > 10 * 60 * 1000) {
      return res.status(401).json({ error: 'Authorization signature is expired or not yet valid.' });
    }

    const types = {
      Authorization: [
        { name: 'wallet', type: 'address' },
        { name: 'clientId', type: 'string' },
        { name: 'redirectUri', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'timestamp', type: 'string' },
      ],
    };

    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyTypedData(
        signedData.domain,
        types,
        signedData.message,
        signature,
      );
    } catch {
      return res.status(401).json({ error: 'Invalid wallet signature.' });
    }

    if (recoveredAddress.toLowerCase() !== normalizedWallet.toLowerCase()) {
      console.warn('[MCP AUTH] signature mismatch', {
        claimedWallet: normalizedWallet,
        recoveredAddress,
      });
      return res.status(401).json({ error: 'Signature does not match the claimed wallet address.' });
    }

    const existing = await prisma.user.findUnique({
      where: { walletAddress: normalizedWallet },
    });

    if (existing) {
      return res.json({
        merchantId: existing.id,
        walletAddress: existing.walletAddress,
        created: false,
      });
    }

    const user = await getOrCreateMerchantByWallet(normalizedWallet);

    return res.status(201).json({
      merchantId: user.id,
      walletAddress: user.walletAddress,
      created: true,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: err?.message || 'Unable to create wallet identity.',
    });
  }
});

// POST /api/auth/telegram-link
// Links a Telegram user to an existing/new wallet-based CeloDesk account.
router.post('/telegram-link', async (req, res) => {
  const JWT_SECRET = getJwtSecret();

  if (!JWT_SECRET) {
    return res.status(500).json({
      error: 'Server misconfigured: JWT_SECRET is not set.',
    });
  }

  const telegramLinkSchema = z.object({
    telegramId: z.string(),
    walletAddress: z.string(),
  });

  const parsed = telegramLinkSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: parsed.error.flatten(),
    });
  }

  const { telegramId, walletAddress } = parsed.data;

  if (!ethers.isAddress(walletAddress)) {
    return res.status(400).json({
      error: 'walletAddress is not a valid Ethereum/Celo address.',
    });
  }

  const normalizedWallet = ethers.getAddress(walletAddress);

  // Returning Telegram user.
  const existingByTelegram = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (existingByTelegram) {
    const token = jwt.sign(
      {
        merchantId: existingByTelegram.id,
        walletAddress: existingByTelegram.walletAddress,
      },
      JWT_SECRET,
      {
        expiresIn: SESSION_TTL,
      },
    );

    return res.json({
      merchantId: existingByTelegram.id,
      walletAddress: existingByTelegram.walletAddress,
      token,
    });
  }

  // Existing wallet account or create a new one.
  const user = await prisma.user.upsert({
    where: {
      walletAddress: normalizedWallet,
    },
    update: {
      telegramId,
    },
    create: {
      walletAddress: normalizedWallet,
      telegramId,
    },
  });

  const token = jwt.sign(
    {
      merchantId: user.id,
      walletAddress: user.walletAddress,
    },
    JWT_SECRET,
    {
      expiresIn: SESSION_TTL,
    },
  );

  return res.json({
    merchantId: user.id,
    walletAddress: user.walletAddress,
    token,
  });
});

// POST /api/auth/google
// "Continue with Google": verify the ID token from the Sign in with Google
// button, then find/link/create the account and issue a session, exactly
// like wallet sign-in. Accounts are keyed by the Google "sub"; a matching
// verified email links Google onto an existing account.
router.post('/google', walletAuthLimiter, async (req, res) => {
  const JWT_SECRET = getJwtSecret();
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is not set.' });
  }
  if (!googleClient) {
    return res.status(503).json({ error: 'Google sign-in is not configured on this server.' });
  }

  const parsed = z.object({ credential: z.string().min(10) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  let info;
  try {
    info = await verifyGoogleCredential(parsed.data.credential);
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || 'Google sign-in failed.' });
  }

  // 1) Returning Google user.
  let user = await prisma.user.findUnique({ where: { googleId: info.googleId } });

  // 2) Link Google onto an existing account that already uses this email.
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: info.email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: info.googleId,
          name: byEmail.name ?? info.name,
          emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
        },
      });
    }
  }

  // 3) Brand-new Google-only account (no wallet yet).
  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId: info.googleId,
        email: info.email,
        name: info.name,
        emailVerifiedAt: new Date(),
      },
    });
  }

  return res.json({
    merchantId: user.id,
    walletAddress: user.walletAddress,
    email: user.email,
    name: user.name,
    token: signSession(user, JWT_SECRET),
  });
});

// POST /api/auth/link/wallet  (authenticated)
// Attaches a wallet to the signed-in account (e.g. a Google user adding the
// payout wallet they will receive invoices into). Requires a fresh signature
// proving wallet ownership.
//
// If that wallet already has its own CeloDesk account (a returning wallet user
// who signed in with Google first), we MERGE: the wallet account's invoices and
// business profile move onto the signed-in account, and the emptied wallet
// account is removed. The signature is what makes this safe — only the true
// wallet owner can trigger it, so no one can claim another account by typing a
// public address. From then on, either sign-in reaches the same data.
router.post('/link/wallet', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = walletAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  let normalizedWallet: string;
  try {
    normalizedWallet = verifyWalletOwnership(parsed.data.walletAddress, parsed.data.message, parsed.data.signature);
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || 'Wallet verification failed.' });
  }

  const current = await prisma.user.findUnique({ where: { id: req.merchantId! } });
  if (!current) {
    return res.status(401).json({ error: 'Your CeloDesk session is no longer valid. Please sign in again.' });
  }

  const owner = await prisma.user.findUnique({ where: { walletAddress: normalizedWallet } });

  if (owner && owner.id !== current.id) {
    // The wallet already has its own account -> merge it into the current one.
    if (owner.googleId && owner.googleId !== current.googleId) {
      return res.status(409).json({
        error: 'That wallet belongs to an account that already uses a different Google sign-in. Please sign in with that wallet instead.',
      });
    }

    const merged = await prisma.$transaction(async (tx) => {
      // Prefer the wallet account's profile (its public pay-link slug/business).
      await mergeAccounts(tx, current.id, owner.id, true);
      return tx.user.update({
        where: { id: current.id },
        data: {
          walletAddress: normalizedWallet,
          telegramId: current.telegramId ?? owner.telegramId ?? undefined,
          email: current.email ?? owner.email ?? undefined,
          name: current.name ?? owner.name ?? undefined,
          emailVerifiedAt: current.emailVerifiedAt ?? owner.emailVerifiedAt ?? undefined,
        },
      });
    });

    return res.json({ merchantId: merged.id, walletAddress: merged.walletAddress, merged: true });
  }

  const user = await prisma.user.update({
    where: { id: current.id },
    data: { walletAddress: normalizedWallet },
  });

  return res.json({ merchantId: user.id, walletAddress: user.walletAddress });
});

// POST /api/auth/link/google  (authenticated)
// Attaches a Google identity to the signed-in account (e.g. a wallet user
// adding "Continue with Google").
//
// If that Google identity (or its email) already has its own CeloDesk account,
// we MERGE it into the signed-in account, mirroring /link/wallet. Google itself
// proves the user controls the email, so this is safe. We refuse only when the
// other account is tied to a different wallet (that account should be reached by
// signing that wallet), or when Google and email point at two different accounts.
router.post('/link/google', requireAuth, async (req: AuthedRequest, res) => {
  if (!googleClient) {
    return res.status(503).json({ error: 'Google sign-in is not configured on this server.' });
  }

  const parsed = z.object({ credential: z.string().min(10) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  let info;
  try {
    info = await verifyGoogleCredential(parsed.data.credential);
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || 'Google verification failed.' });
  }

  const current = await prisma.user.findUnique({ where: { id: req.merchantId! } });
  if (!current) {
    return res.status(401).json({ error: 'Your CeloDesk session is no longer valid. Please sign in again.' });
  }

  const googleOwner = await prisma.user.findUnique({ where: { googleId: info.googleId } });
  const emailOwner = await prisma.user.findUnique({ where: { email: info.email } });

  // Collect any OTHER accounts this Google identity / email already belongs to.
  const others: NonNullable<typeof googleOwner>[] = [];
  if (googleOwner && googleOwner.id !== current.id) others.push(googleOwner);
  if (emailOwner && emailOwner.id !== current.id && emailOwner.id !== googleOwner?.id) others.push(emailOwner);

  if (others.length > 1) {
    return res.status(409).json({
      error: 'This Google account and email belong to two different CeloDesk accounts. Please contact support to merge them.',
    });
  }

  const other = others[0];
  if (other) {
    if (other.walletAddress && other.walletAddress !== current.walletAddress) {
      return res.status(409).json({
        error: 'That Google account is tied to a different wallet account. Please sign in with that wallet instead.',
      });
    }

    const merged = await prisma.$transaction(async (tx) => {
      // Prefer the current (likely wallet) account's profile and slug.
      await mergeAccounts(tx, current.id, other.id, false);
      return tx.user.update({
        where: { id: current.id },
        data: {
          googleId: info.googleId,
          email: info.email,
          name: current.name ?? info.name ?? undefined,
          emailVerifiedAt: new Date(),
          walletAddress: current.walletAddress ?? other.walletAddress ?? undefined,
          telegramId: current.telegramId ?? other.telegramId ?? undefined,
        },
      });
    });

    return res.json({ merchantId: merged.id, email: merged.email, name: merged.name, walletAddress: merged.walletAddress, merged: true });
  }

  const user = await prisma.user.update({
    where: { id: current.id },
    data: {
      googleId: info.googleId,
      email: info.email,
      name: current.name ?? info.name ?? undefined,
      emailVerifiedAt: new Date(),
    },
  });

  return res.json({ merchantId: user.id, email: user.email, name: user.name, walletAddress: user.walletAddress });
});