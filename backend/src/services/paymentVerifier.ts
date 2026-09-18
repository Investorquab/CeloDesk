/**
 * Payment verification engine.
 *
 * This is the single source of truth for whether an invoice is PAID.
 * The frontend, Telegram bot, and MCP layer NEVER get to declare an
 * invoice paid directly — they can only report "a transaction hash was
 * submitted", and this engine independently checks it against the chain.
 *
 * Verification checklist (per SECURITY.md):
 *  1. Transaction exists and succeeded on-chain
 *  2. Transaction is on the correct chain (Celo mainnet, 42220)
 *  3. Transaction is a Transfer of the expected ERC20 token
 *  4. Transfer recipient matches the invoice's receivingWallet
 *  5. Transfer amount matches (or exceeds, for overpayment) the invoice amount
 *  6. Transaction has enough confirmations for finality
 *  7. Transaction hash has not already been used for another invoice
 *     (replay/reuse protection — enforced by the unique constraint on
 *     Payment.txHash in the database)
 */

import { ethers } from 'ethers';
import { CELO_MAINNET_CHAIN_ID, getToken, CELO_TOKENS } from '../celo/tokens';

const ERC20_TRANSFER_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// Minimum confirmations before we treat a payment as final.
// Celo L2 (OP Stack) blocks are fast — 12 confirmations is a
// conservative starting point; revisit based on real finality data.
const MIN_CONFIRMATIONS = 12;

export interface VerifyPaymentInput {
  txHash: string;
  invoice: {
    id: string;
    tokenSymbol: string;
    tokenAddress: string;
    receivingWallet: string;
    amount: string; // decimal string, e.g. "150.00"
    chainId: number;
  };
}

export type VerificationResult =
  | { ok: true; fromAddress: string; amount: string; blockNumber: number; confirmations: number }
  | { ok: false; reason: string };

export async function verifyPayment(
  provider: ethers.JsonRpcProvider,
  input: VerifyPaymentInput
): Promise<VerificationResult> {
  const { txHash, invoice } = input;

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    return { ok: false, reason: 'Transaction not found on chain.' };
  }
  if (receipt.status !== 1) {
    return { ok: false, reason: 'Transaction reverted/failed on chain.' };
  }

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CELO_MAINNET_CHAIN_ID || invoice.chainId !== CELO_MAINNET_CHAIN_ID) {
    return { ok: false, reason: 'Provider is not connected to Celo mainnet.' };
  }

  const token = getToken(invoice.tokenSymbol);
  if (token.address.toLowerCase() !== invoice.tokenAddress.toLowerCase()) {
    return {
      ok: false,
      reason: 'Invoice token address does not match current verified registry.',
    };
  }

  // Find a Transfer log on the expected token contract, to the expected
  // recipient, within this transaction's logs.
  const iface = new ethers.Interface(ERC20_TRANSFER_ABI);
  let matchedTransfer: { from: string; to: string; value: bigint } | null = null;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== token.address.toLowerCase()) continue;
    try {
      const parsed = iface.parseLog(log);
      if (!parsed || parsed.name !== 'Transfer') continue;
      const to = parsed.args.to as string;
      if (to.toLowerCase() !== invoice.receivingWallet.toLowerCase()) continue;
      matchedTransfer = {
        from: parsed.args.from as string,
        to,
        value: parsed.args.value as bigint,
      };
      break;
    } catch {
      continue; // not a Transfer-shaped log, skip
    }
  }

  if (!matchedTransfer) {
    return {
      ok: false,
      reason:
        'No matching Transfer of the invoice token to the invoice wallet found in this transaction.',
    };
  }
 

  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - receipt.blockNumber + 1;
  if (confirmations < MIN_CONFIRMATIONS) {
    return {
      ok: false,
      reason: `Only ${confirmations}/${MIN_CONFIRMATIONS} confirmations so far — not final yet. Retry later.`,
    };
  }

  return {
    ok: true,
    fromAddress: matchedTransfer.from,
    amount: ethers.formatUnits(matchedTransfer.value, token.decimals),
    blockNumber: receipt.blockNumber,
    confirmations,
  };
}


export async function findVerifiedTokenTransfer(
  provider: ethers.JsonRpcProvider,
  txHash: string,
  recipient: string
): Promise<{fromAddress:string; tokenSymbol:string; tokenAddress:string; amount:string; blockNumber:number; confirmations:number}|null> {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) return null;
  const iface = new ethers.Interface(ERC20_TRANSFER_ABI);
  const currentBlock = await provider.getBlockNumber();
  for (const log of receipt.logs) {
    const tokenEntry = Object.values(CELO_TOKENS)
      .find((t:any) => t.address.toLowerCase() === log.address.toLowerCase() && t.verified);
    if (!tokenEntry) continue;
    try {
      const parsed = iface.parseLog(log);
      if (!parsed || parsed.name !== 'Transfer') continue;
      const to = parsed.args.to as string;
      if (to.toLowerCase() !== recipient.toLowerCase()) continue;
      const value = parsed.args.value as bigint;
      return {
        fromAddress: parsed.args.from as string,
        tokenSymbol: tokenEntry.symbol,
        tokenAddress: tokenEntry.address,
        amount: ethers.formatUnits(value, tokenEntry.decimals),
        blockNumber: receipt.blockNumber,
        confirmations: currentBlock - receipt.blockNumber + 1,
      };
    } catch {}
  }
  return null;
}


export async function findRecentDirectTokenPayment(
  provider: ethers.JsonRpcProvider,
  input: {
    tokenAddress: string;
    receivingWallet: string;
    decimals: number;
    minBlock?: number;
  },
): Promise<{
  txHash: string;
  fromAddress: string;
  amount: string;
  blockNumber: number;
  confirmations: number;
  blockTimestamp: number;
} | null> {
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(input.minBlock ?? 0, latestBlock - 10_000);
  const transferTopic = ethers.id('Transfer(address,address,uint256)');
  const recipientTopic = ethers.zeroPadValue(input.receivingWallet, 32);

  const logs = await provider.getLogs({
    address: input.tokenAddress,
    fromBlock,
    toBlock: latestBlock,
    topics: [transferTopic, null, recipientTopic],
  });

  for (const log of [...logs].reverse()) {
    if (!log.transactionHash) continue;

    try {
      const iface = new ethers.Interface(ERC20_TRANSFER_ABI);
      const parsed = iface.parseLog(log);
      if (!parsed || parsed.name !== 'Transfer') continue;

      const block = await provider.getBlock(log.blockNumber);
      if (!block) continue;

      const receipt = await provider.getTransactionReceipt(log.transactionHash);
      if (!receipt || receipt.status !== 1) continue;

      const confirmations = latestBlock - receipt.blockNumber + 1;
      if (confirmations < MIN_CONFIRMATIONS) continue;

      return {
        txHash: log.transactionHash,
        fromAddress: parsed.args.from as string,
        amount: ethers.formatUnits(parsed.args.value as bigint, input.decimals),
        blockNumber: receipt.blockNumber,
        confirmations,
        blockTimestamp: block.timestamp,
      };
    } catch {
      continue;
    }
  }

  return null;
}
