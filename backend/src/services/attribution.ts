/**
 * Attribution tag handling.
 *
 * CONFIRMED WORKING — verified against multiple independent official
 * sources (Base's own Builder Codes docs, Coinbase CDP docs, Privy
 * docs, and the ox library's own source on GitHub), all using this
 * exact `Attribution.toDataSuffix({ codes: [...] })` API from the
 * real, published `ox` npm package. This matches what the hackathon's
 * own FAQ described for `@celo/attribution-tags`.
 *
 * How it works: a byte-sequence suffix is appended to a transaction's
 * calldata. It does NOT change what the transaction does — indexers
 * (including the hackathon's Dune dashboard) read the suffix to
 * attribute the transaction back to our project.
 *
 * Used in src/routes/invoices.ts's /payment-intent endpoint — that is
 * the ONLY place real payment calldata gets constructed in this app,
 * so it's the one place this MUST be applied for real payments to
 * count on the leaderboard.
 */

import { Attribution } from 'ox/erc8021';

export const HACKATHON_ATTRIBUTION_TAG = 'celo_5ad8f72f8a99';

/**
 * Returns the ERC-8021 data suffix for our attribution tag. Append the
 * result to a transaction's `data` field (or pass as `dataSuffix` if
 * using a wallet client that supports it natively, e.g. viem).
 *
 * If you're already tagging with your own project code from a previous
 * hackathon, pass it alongside ours: codes: [ownCode, HACKATHON_ATTRIBUTION_TAG]
 */
export function getAttributionSuffix(extraCodes: string[] = []): `0x${string}` {
  return Attribution.toDataSuffix({
    codes: [HACKATHON_ATTRIBUTION_TAG, ...extraCodes],
  });
}

/**
 * Appends the attribution suffix to raw transaction calldata.
 * Use this when constructing transactions manually with ethers.js
 * (ethers doesn't have a built-in dataSuffix option like viem does).
 */
export function appendAttribution(data: `0x${string}`, extraCodes: string[] = []): `0x${string}` {
  const suffix = getAttributionSuffix(extraCodes);
  return (data + suffix.slice(2)) as `0x${string}`;
}
