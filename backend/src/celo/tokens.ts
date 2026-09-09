/**
 * Celo mainnet stablecoin registry.
 *
 * SOURCE OF TRUTH: docs.celo.org/tooling/contracts/fee-currencies
 * (fetched and verified 2026-09-01 — re-check before mainnet launch,
 * addresses can change if Celo governance updates the allowlist).
 *
 * IMPORTANT NAMING NOTE: Celo has renamed its Mento stablecoins.
 * What older docs/hackathon materials call "cUSD" is now "USDm"
 * (Mento Dollar) on-chain. What the hackathon page calls "cNGN" is
 * "NGNm" (Mento Nigerian Naira) in Celo's current contract registry —
 * same underlying Mento-issued asset family, new ticker convention.
 * Confirm this mapping with Celo/hackathon organizers before relying
 * on it for the "Best Stablecoin Adoption" sub-track scoring.
 */

export interface TokenInfo {
  symbol: string;
  name: string;
  /** ERC20 token contract address — used for actual transfers */
  address: string;
  /** decimals for this token (NOT all Celo tokens use 18) */
  decimals: number;
  /** verified against docs.celo.org on 2026-09-01 */
  verified: boolean;
}

export const CELO_MAINNET_CHAIN_ID = 42220;

export const CELO_TOKENS: Record<string, TokenInfo> = {
  // Mento Dollar — formerly branded "cUSD". Our default settlement asset.
  USDm: {
    symbol: 'USDm',
    name: 'Mento Dollar',
    address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    decimals: 18,
    verified: true,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    decimals: 6,
    verified: true,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
    decimals: 6,
    verified: true,
  },
  // Mento Nigerian Naira — this is the asset the hackathon page refers to
  // as "cNGN" for the Best Stablecoin Adoption sub-track. CONFIRM before
  // relying on this for judging — see naming note above.
  NGNm: {
    symbol: 'NGNm',
    name: 'Mento Nigerian Naira',
    address: '0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71',
    decimals: 18,
    verified: true,
  },
  // NOT YET VERIFIED against an authoritative source:
  // - Ripio wFIAT stablecoins (address unknown — need Ripio/Celo docs)
  // - USDA (address unknown — need issuer's official contract listing)
  // Do NOT enable these in production until a real address is confirmed.
  // Placeholder entries intentionally omitted rather than guessed.
};

export function getToken(symbol: string): TokenInfo {
  const token = CELO_TOKENS[symbol];
  if (!token) {
    throw new Error(
      `Unknown or unverified token symbol: ${symbol}. Only tokens with ` +
        `verified: true in CELO_TOKENS are safe to use for real invoices.`
    );
  }
  if (!token.verified) {
    throw new Error(
      `Token ${symbol} has not been verified against an authoritative ` +
        `source. Refusing to use it for a real invoice.`
    );
  }
  return token;
}
