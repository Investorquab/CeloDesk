import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

/**
 * Resolve a CeloDesk merchant from a wallet address.
 *
 * This is intentionally address-based for account creation/linking flows.
 * Existing-account access must still establish wallet ownership through
 * the appropriate authenticated linking flow.
 */
export async function getOrCreateMerchantByWallet(walletAddress: string) {
  if (!ethers.isAddress(walletAddress)) {
    throw new Error('walletAddress is not a valid Ethereum/Celo address.');
  }

  const normalizedWallet = ethers.getAddress(walletAddress);

  return prisma.user.upsert({
    where: {
      walletAddress: normalizedWallet,
    },
    update: {},
    create: {
      walletAddress: normalizedWallet,
    },
  });
}

export async function getMerchant(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { profile: true },
  });
  return {
    id: user.id,
    walletAddress: user.walletAddress,
    profile: user.profile,
  };
}

export interface UpdateProfileInput {
  businessName?: string;
  tagline?: string;
  logoUrl?: string;
  description?: string;
  websiteUrl?: string;
  socialLinks?: Record<string, string>;
  preferredToken?: string;
  acceptedTokens?: string[];
  username?: string; // maps to Profile.slug — see BACKEND_USERNAME_PATCH.md
}

// Slug is derived from businessName on first creation, kept stable after.
function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const USERNAME_RE = /^[a-z0-9-]{3,30}$/;

export class UsernameTakenError extends Error {
  constructor() {
    super('That username is already taken.');
  }
}

export async function upsertProfile(userId: string, input: UpdateProfileInput) {
  const existing = await prisma.profile.findUnique({ where: { userId } });

  // Explicit username changes go through real validation + a clear
  // conflict error — this is a user-facing identity, not an internal
  // auto-derived slug, so silently suffixing it (like the auto-slugify
  // path below does) would be surprising and wrong.
  let explicitSlug: string | undefined;
  if (input.username !== undefined) {
    const candidate = input.username.toLowerCase().trim();
    if (!USERNAME_RE.test(candidate)) {
      throw new Error('Username must be 3-30 characters: lowercase letters, numbers, and hyphens only.');
    }
    const collision = await prisma.profile.findUnique({ where: { slug: candidate } });
    if (collision && collision.userId !== userId) {
      throw new UsernameTakenError();
    }
    explicitSlug = candidate;
  }

  if (existing) {
    const { username, ...rest } = input;
    return prisma.profile.update({
      where: { userId },
      data: { ...rest, ...(explicitSlug ? { slug: explicitSlug } : {}) },
    });
  }

  if (!input.businessName) {
    throw new Error('businessName is required when creating a profile for the first time.');
  }

  let slug = explicitSlug ?? slugify(input.businessName);
  if (!explicitSlug) {
    // Auto-derived from businessName — collisions here are just
    // incidental naming clashes, so appending a short suffix is fine
    // (unlike an explicitly chosen username, which must fail loudly).
    const collision = await prisma.profile.findUnique({ where: { slug } });
    if (collision) {
      slug = `${slug}-${userId.slice(-4)}`;
    }
  }

  return prisma.profile.create({
    data: {
      userId,
      businessName: input.businessName,
      slug,
      tagline: input.tagline,
      logoUrl: input.logoUrl,
      description: input.description,
      websiteUrl: input.websiteUrl,
      socialLinks: input.socialLinks,
      preferredToken: input.preferredToken ?? 'USDm',
      acceptedTokens: input.acceptedTokens ?? ['USDm', 'USDC'],
    },
  });
}
