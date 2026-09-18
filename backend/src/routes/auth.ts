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
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { getOrCreateMerchantByWallet } from '../services/merchantService';

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

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function getJwtSecret(): string | undefined {
  return process.env.JWT_SECRET;
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