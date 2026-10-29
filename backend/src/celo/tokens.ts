/**
 * Celo mainnet stablecoin registry.
 *
 * SOURCE OF TRUTH: docs.celo.org/build/tools/contracts/stablecoin-contracts
 * Every address below was ALSO verified on-chain via forno.celo.org
 * (symbol + decimals read directly from each contract) on 2026-10-29.
 * Never add a token here without verifying its address on-chain first.
 *
 * NAMING NOTE: Celo's Mento stablecoins use the "m" suffix — what older
 * docs call "cUSD" is "USDm" (Mento Dollar) on-chain, and "cNGN" maps to
 * "NGNm" (Mento Nigerian Naira).
 *
 * Ripio wFIAT (wARS, wBRL, wMXN, wCOP, wCLP, wPEN) are LatAm local-currency
 * stablecoins (Track 1). They carry fiatCurrency + locale so the UI, the
 * Telegram bot and MCP can show amounts in the merchant's own currency.
 */

export interface TokenInfo {
  symbol: string;
  name: string;
  /** ERC20 token contract address — used for actual transfers */
  address: string;
  /** decimals for this token (NOT all Celo tokens use 18) */
  decimals: number;
  /** verified against docs.celo.org AND on-chain */
  verified: boolean;
  /** ISO 4217 code of the currency this token is pegged to, for display. */
  fiatCurrency?: string;
  /** BCP-47 locale used to format amounts in that currency. */
  locale?: string;
  /** true for Ripio wFIAT LatAm local-currency stablecoins (Track 1). */
  local?: boolean;
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
    fiatCurrency: 'USD',
    locale: 'en-US',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    decimals: 6,
    verified: true,
    fiatCurrency: 'USD',
    locale: 'en-US',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
    decimals: 6,
    verified: true,
    fiatCurrency: 'USD',
    locale: 'en-US',
  },
  // USA₮ (Tether America USD) by Anchorage Digital Bank. 6 decimals.
  // Settlement token for the Track 2 x402 lane (see src/x402/). Payable
  // either by a normal tagged transfer or gaslessly over x402.
  USAT: {
    symbol: 'USAT',
    name: 'USA Tether (USA₮)',
    address: '0xD2ab3C9A02DBBAB236BfEC45D1d755DF4267F771',
    decimals: 6,
    verified: true,
    fiatCurrency: 'USD',
    locale: 'en-US',
  },
  // Mento Nigerian Naira (what the hackathon page calls "cNGN").
  NGNm: {
    symbol: 'NGNm',
    name: 'Mento Nigerian Naira',
    address: '0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71',
    decimals: 18,
    verified: true,
    fiatCurrency: 'NGN',
    locale: 'en-NG',
  },

  // --- Ripio wFIAT: LatAm local-currency stablecoins (Track 1) ---
  // All 18 decimals. Addresses verified on-chain 2026-10-29.
  wBRL: {
    symbol: 'wBRL',
    name: 'Ripio Brazilian Real',
    address: '0xD76f5Faf6888e24D9F04Bf92a0c8B921FE4390e0',
    decimals: 18,
    verified: true,
    fiatCurrency: 'BRL',
    locale: 'pt-BR',
    local: true,
  },
  wARS: {
    symbol: 'wARS',
    name: 'Ripio Argentine Peso',
    address: '0x0DC4F92879B7670e5f4e4e6e3c801D229129D90D',
    decimals: 18,
    verified: true,
    fiatCurrency: 'ARS',
    locale: 'es-AR',
    local: true,
  },
  wMXN: {
    symbol: 'wMXN',
    name: 'Ripio Mexican Peso',
    address: '0x337E7456B420bD3481e7FA61fA9850343d610d34',
    decimals: 18,
    verified: true,
    fiatCurrency: 'MXN',
    locale: 'es-MX',
    local: true,
  },
  wCOP: {
    symbol: 'wCOP',
    name: 'Ripio Colombian Peso',
    address: '0x8a1D45e102e886510e891d2Ec656a708991e2D76',
    decimals: 18,
    verified: true,
    fiatCurrency: 'COP',
    locale: 'es-CO',
    local: true,
  },
  wCLP: {
    symbol: 'wCLP',
    name: 'Ripio Chilean Peso',
    address: '0x61D450a098b6a7f69fC4b98CE68198fe59768651',
    decimals: 18,
    verified: true,
    fiatCurrency: 'CLP',
    locale: 'es-CL',
    local: true,
  },
  wPEN: {
    symbol: 'wPEN',
    name: 'Ripio Peruvian Sol',
    address: '0x4F34c8b3b5FB6D98Da888F0feA543d4d9C9F2eBE',
    decimals: 18,
    verified: true,
    fiatCurrency: 'PEN',
    locale: 'es-PE',
    local: true,
  },
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

/**
 * Formats an amount in a token's own local currency when it has one
 * (e.g. wBRL -> "R$ 1.500,00"), falling back to "<amount> <symbol>".
 * Used by the UI/bot/MCP so a LatAm merchant sees their own currency.
 */
export function formatTokenAmount(symbol: string, amount: string | number): string {
  const token = CELO_TOKENS[symbol];
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (token?.fiatCurrency && token?.locale && Number.isFinite(value)) {
    try {
      return new Intl.NumberFormat(token.locale, {
        style: 'currency',
        currency: token.fiatCurrency,
      }).format(value);
    } catch {
      // fall through to plain formatting
    }
  }
  return `${amount} ${symbol}`;
}
