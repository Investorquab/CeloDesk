import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { getToken, CELO_MAINNET_CHAIN_ID, CELO_TOKENS } from '../celo/tokens';
import { HACKATHON_ATTRIBUTION_TAG } from './attribution';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

export interface CreateInvoiceInput {
  merchantId: string;
  clientName: string;
  clientContact?: string;
  amount: string; // decimal string, e.g. "150.00"
  tokenSymbol: string; // must exist + be verified in CELO_TOKENS
  description?: string;
  dueDate?: string; // ISO date
  // Bot/agent-created invoices are immediately shareable — there's no
  // separate "send" step in this product, sharing IS sending. Web
  // dashboard creation (Claude 2) can pass 'DRAFT' explicitly if it
  // adds a real draft/review step later; defaults to SENT so
  // "who owes me" and outstanding totals work correctly out of the box.
  initialStatus?: 'DRAFT' | 'SENT';
}

export async function createInvoice(input: CreateInvoiceInput) {
  const token = getToken(input.tokenSymbol); // throws if unverified/unknown

  const merchant = await prisma.user.findUniqueOrThrow({
    where: { id: input.merchantId },
  });

  const invoice = await prisma.invoice.create({
    data: {
      merchantId: input.merchantId,
      clientName: input.clientName,
      clientContact: input.clientContact,
      amount: input.amount,
      tokenSymbol: token.symbol,
      tokenAddress: token.address,
      chainId: CELO_MAINNET_CHAIN_ID,
      receivingWallet: merchant.walletAddress,
      description: input.description,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      status: input.initialStatus ?? 'SENT',
      attributionTag: HACKATHON_ATTRIBUTION_TAG,
    },
  });

  return invoice;
}

// Shared shape so the checkout page always has enough to answer
// "who am I paying" without a second round-trip.
const invoiceWithMerchantInclude = {
  payments: true,
  merchant: {
    include: { profile: true },
  },
} as const;

export async function getInvoice(id: string) {
  return prisma.invoice.findUniqueOrThrow({
    where: { id },
    include: invoiceWithMerchantInclude,
  });
}

// Public checkout pages resolve by publicSlug, not the internal id —
// these are deliberately different fields (see DATABASE.md) so the
// internal cuid isn't the thing exposed in shareable URLs.
export async function getInvoiceBySlug(publicSlug: string) {
  return prisma.invoice.findUniqueOrThrow({
    where: { publicSlug },
    include: invoiceWithMerchantInclude,
  });
}

// Flattens the merchant/profile join into the display fields the
// checkout page actually needs, with a sane fallback when a merchant
// hasn't set up a Profile yet.
export function toPublicInvoiceView(invoice: Awaited<ReturnType<typeof getInvoice>>) {
  const profile = invoice.merchant.profile;
  return {
    ...invoice,
    payments: invoice.payments.map((payment) => ({
      ...payment,
      tokenSymbol: Object.values(CELO_TOKENS).find(
        (token: any) => token.address.toLowerCase() === payment.tokenAddress.toLowerCase(),
      )?.symbol ?? payment.tokenAddress,
    })),
    merchantDisplay: {
      name: profile?.businessName ?? shortenAddress(invoice.merchant.walletAddress),
      logoUrl: profile?.logoUrl ?? null,
    },
  };
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function listOutstandingInvoices(merchantId: string) {
  await refreshOverdueStatuses(merchantId);
  return prisma.invoice.findMany({
    where: {
      merchantId,
      status: { in: ['SENT', 'VIEWED', 'PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
    },
    orderBy: { dueDate: 'asc' },
  });
}

async function refreshOverdueStatuses(merchantId: string) {
  const now = new Date();
  await prisma.invoice.updateMany({
    where: {
      merchantId,
      dueDate: { lt: now },
      status: { in: ['SENT', 'VIEWED', 'PENDING', 'PARTIALLY_PAID'] },
    },
    data: { status: 'OVERDUE' },
  });
}

export async function getPaymentSummary(merchantId: string) {
  await refreshOverdueStatuses(merchantId);
  const invoices = await prisma.invoice.findMany({
    where: { merchantId },
    include: { payments: true },
  });
  const byStatus = invoices.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.status] = (acc[inv.status] ?? 0) + 1;
    return acc;
  }, {});

  const outstandingStatuses = ['SENT', 'VIEWED', 'PENDING', 'PARTIALLY_PAID', 'OVERDUE'];
  const outstandingInvoices = invoices.filter((i) => outstandingStatuses.includes(i.status));

  const outstandingByToken = outstandingInvoices.reduce<Record<string, number>>((acc, inv) => {
    const decimals = getToken(inv.tokenSymbol).decimals;
    const expected = ethers.parseUnits(inv.amount.toString(), decimals);
    const paid = inv.payments
      .filter((payment) => payment.status === 'VERIFIED')
      .reduce((sum, payment) => sum + ethers.parseUnits(payment.amount.toString(), decimals), 0n);
    const remaining = expected > paid ? expected - paid : 0n;
    const amount = Number(ethers.formatUnits(remaining, decimals));
    if (amount > 0) acc[inv.tokenSymbol] = (acc[inv.tokenSymbol] ?? 0) + amount;
    return acc;
  }, {});

  const outstandingTotal = Object.values(outstandingByToken).reduce((sum, amount) => sum + amount, 0);

  return { total: invoices.length, byStatus, outstandingTotal, outstandingByToken };
}

// Marks an invoice VIEWED the first time a client opens the public
// checkout page. Intentionally one-directional and narrow: only
// SENT -> VIEWED. Never downgrades PENDING/PAID/etc back to VIEWED
// (a client re-opening a paid invoice shouldn't un-pay it), and does
// nothing if the invoice is still DRAFT (shouldn't be publicly
// viewable yet anyway).
export async function markInvoiceViewed(id: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id } });
  if (invoice.status !== 'SENT') {
    return invoice; // no-op for any other status — this is intentional, not a bug
  }
  return prisma.invoice.update({
    where: { id },
    data: { status: 'VIEWED' },
  });
}

// Soft-delete: sets status to CANCELLED. Never physically deletes the
// row, and NEVER touches Payment records — those are financial audit
// history and must survive regardless of invoice lifecycle changes.
// A PAID (or OVERPAID) invoice cannot be cancelled through this path —
// that would let a merchant hide a completed payment from their own
// records, which is exactly the kind of "quietly editable financial
// history" this product's SECURITY.md argues against.
export async function cancelInvoice(id: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id } });
  if (invoice.status === 'PAID' || invoice.status === 'OVERPAID') {
    throw new Error('A paid invoice cannot be deleted — it is part of your payment history.');
  }
  return prisma.invoice.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
}


export async function createPaymentIntent(invoiceId: string, payerAddress: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (['PAID','OVERPAID','CANCELLED','EXPIRED'].includes(invoice.status)) {
    throw new Error(`This invoice is ${invoice.status.toLowerCase()} and cannot accept a new payment intent.`);
  }
  const token = getToken(invoice.tokenSymbol);
  const verifiedPayments = await prisma.payment.findMany({
    where: { invoiceId, status: 'VERIFIED' },
    select: { amount: true },
  });
  const expectedUnits = ethers.parseUnits(invoice.amount.toString(), token.decimals);
  const paidUnits = verifiedPayments.reduce(
    (sum, payment) => sum + ethers.parseUnits(payment.amount.toString(), token.decimals),
    0n,
  );
  const remainingUnits = expectedUnits > paidUnits ? expectedUnits - paidUnits : 0n;
  if (remainingUnits <= 0n) {
    throw new Error('This invoice has already been fully paid.');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Server misconfigured: JWT_SECRET is not set.');
  const expiresIn = 10 * 60;
  const intentId = jwt.sign(
    { type: 'payment_intent', invoiceId, payerAddress: payerAddress.toLowerCase() },
    secret,
    { expiresIn }
  );
  return {
    intentId,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    invoice,
    token,
    paymentAmount: ethers.formatUnits(remainingUnits, token.decimals),
  };
}
