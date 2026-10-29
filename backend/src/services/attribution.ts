/**
 * Attribution tag handling for Agents on Open Rails.
 *
 * Uses the OFFICIAL `@celo/attribution-tags` SDK (ERC-8021). The tag is
 * ISSUED BY LOOPS for this event — it is NOT derived from the repo or a
 * hostname, so we never use `codeFromHostname`. The exact value and its
 * expected on-chain data suffix were both read from
 * `loops project get -e agents-on-open-rails`.
 *
 * How it works: a byte-sequence suffix is appended to a transaction's
 * calldata. It does NOT change what the transaction does — indexers read
 * the suffix to attribute the transaction back to our project. An
 * untagged transaction is never credited and cannot be backfilled, so
 * this MUST be applied on every transaction CeloDesk builds.
 *
 * Applied in src/routes/invoices.ts's payment-intent endpoints — the only
 * place real payment calldata is constructed in this app.
 */

import { toDataSuffix, fromDataSuffix } from '@celo/attribution-tags';

/** Issued by Loops for Agents on Open Rails. Do not change. */
export const HACKATHON_ATTRIBUTION_TAG = 'celo_3fce81a170fc';

/**
 * The exact ERC-8021 data suffix for our tag, as reported by Loops
 * (`celo.dataSuffix` in `loops project get`). We assert the SDK still
 * produces this at startup, so a wrong tag or an SDK change can never
 * ship untagged/mis-tagged transactions silently.
 */
export const EXPECTED_DATA_SUFFIX =
  '0x63656c6f5f336663653831613137306663110080218021802180218021802180218021';

/**
 * Returns the ERC-8021 data suffix for our attribution tag. Append the
 * result to a transaction's `data` field (or pass as `dataSuffix` if
 * using a wallet client that supports it natively).
 *
 * Pass extra codes to tag alongside ours, e.g. getAttributionSuffix([ownCode]).
 */
export function getAttributionSuffix(extraCodes: string[] = []): `0x${string}` {
  return toDataSuffix([HACKATHON_ATTRIBUTION_TAG, ...extraCodes]) as `0x${string}`;
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

/**
 * Startup integrity check. Throws if the tag is not exactly the
 * Loops-issued value, or if the SDK no longer produces the expected data
 * suffix for it. Call this before the server starts accepting requests.
 */
export function assertAttributionIntegrity(): void {
  if (HACKATHON_ATTRIBUTION_TAG !== 'celo_3fce81a170fc') {
    throw new Error(
      `Attribution tag mismatch: expected celo_3fce81a170fc, got ${HACKATHON_ATTRIBUTION_TAG}. Refusing to start.`
    );
  }
  const suffix = getAttributionSuffix();
  if (suffix.toLowerCase() !== EXPECTED_DATA_SUFFIX.toLowerCase()) {
    throw new Error(
      `Attribution data suffix mismatch. Expected ${EXPECTED_DATA_SUFFIX}, got ${suffix}. Refusing to start.`
    );
  }
  const decoded = fromDataSuffix(suffix);
  if (!decoded || decoded.codes[0] !== HACKATHON_ATTRIBUTION_TAG) {
    throw new Error('Attribution suffix failed to decode back to the expected tag. Refusing to start.');
  }
}
