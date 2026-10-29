/**
 * Decode and verify the attribution tag on a Celo mainnet transaction.
 *
 *   npm run verify-tag -- <txHash>
 *
 * Reads RPC_URL from the shared root .env (falls back to Celo's public
 * RPC). Uses the official @celo/attribution-tags `verifyTx`, with a small
 * adapter so ethers v6's provider satisfies the SDK's TxClient shape
 * (ethers exposes calldata as `tx.data`; the SDK expects `{ input }`).
 *
 * Exit codes: 0 = carries our tag, 2 = no tag found, 3 = tagged but not
 * ours, 1 = usage/other error.
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { ethers } from 'ethers';
import { verifyTx } from '@celo/attribution-tags';
import { HACKATHON_ATTRIBUTION_TAG } from '../src/services/attribution';

async function main() {
  const txHash = process.argv[2];
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    console.error('Usage: npm run verify-tag -- <txHash>');
    process.exit(1);
  }

  const rpc = process.env.RPC_URL || 'https://forno.celo.org';
  const provider = new ethers.JsonRpcProvider(rpc);

  const client = {
    getTransaction: async ({ hash }: { hash: `0x${string}` }) => {
      const tx = await provider.getTransaction(hash);
      return tx ? { input: tx.data } : null;
    },
  };

  const decoded = await verifyTx({ client, hash: txHash as `0x${string}` });
  if (!decoded) {
    console.log(`No attribution tag found in ${txHash}`);
    process.exit(2);
  }

  console.log('Transaction :', txHash);
  console.log('Decoded codes:', decoded.codes.join(', '));
  console.log('Schema id   :', decoded.schemaId);

  const ours = decoded.codes.includes(HACKATHON_ATTRIBUTION_TAG);
  if (ours) {
    console.log(`OK - carries our tag ${HACKATHON_ATTRIBUTION_TAG}`);
    process.exit(0);
  }
  console.log(`WARNING - tagged, but not with our tag ${HACKATHON_ATTRIBUTION_TAG}`);
  process.exit(3);
}

main().catch((e) => {
  console.error('verify-tag failed:', e);
  process.exit(1);
});
