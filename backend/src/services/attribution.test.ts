import { describe, it, expect } from 'vitest';
import {
  HACKATHON_ATTRIBUTION_TAG,
  EXPECTED_DATA_SUFFIX,
  getAttributionSuffix,
  appendAttribution,
  assertAttributionIntegrity,
} from './attribution';

// The attribution tag is how every CeloDesk transaction is credited. If it
// ever drifts from the Loops-issued value, or the SDK stops encoding it the
// same way, transactions go uncredited and cannot be backfilled. These tests
// freeze that contract so a regression fails CI, not production.
describe('attribution tag', () => {
  it('is exactly the Loops-issued value', () => {
    expect(HACKATHON_ATTRIBUTION_TAG).toBe('celo_3fce81a170fc');
  });

  it('encodes to the expected on-chain data suffix', () => {
    expect(getAttributionSuffix().toLowerCase()).toBe(
      EXPECTED_DATA_SUFFIX.toLowerCase(),
    );
  });

  it('appends the suffix to calldata without altering the original data', () => {
    const data = '0xa9059cbb' as `0x${string}`; // ERC-20 transfer selector
    const tagged = appendAttribution(data);
    expect(tagged.startsWith(data)).toBe(true);
    expect(tagged.endsWith(EXPECTED_DATA_SUFFIX.slice(2).toLowerCase())).toBe(
      true,
    );
    expect(tagged.length).toBe(data.length + EXPECTED_DATA_SUFFIX.length - 2);
  });

  it('passes the startup integrity assertion', () => {
    expect(() => assertAttributionIntegrity()).not.toThrow();
  });
});
