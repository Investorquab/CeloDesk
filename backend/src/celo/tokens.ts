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

  // --- Mento local-currency stable assets ---
  // Celo's native Mento family (the "m" suffix). Every address + decimals
  // below was verified on-chain via forno.celo.org on 2026-10-31 (symbol,
  // name and decimals read from each contract). All 18 decimals.
  // Source list: docs.celo.org/token-addresses. The `local` flag stays
  // reserved for Ripio wFIAT (Track 1); these still display in their own
  // currency via fiatCurrency + locale.
  EURm: {
    symbol: 'EURm',
    name: 'Mento Euro',
    address: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
    decimals: 18,
    verified: true,
    fiatCurrency: 'EUR',
    locale: 'de-DE',
  },
  AUDm: {
    symbol: 'AUDm',
    name: 'Mento Australian Dollar',
    address: '0x7175504C455076F15c04A2F90a8e352281F492F9',
    decimals: 18,
    verified: true,
    fiatCurrency: 'AUD',
    locale: 'en-AU',
  },
  BRLm: {
    symbol: 'BRLm',
    name: 'Mento Brazilian Real',
    address: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
    decimals: 18,
    verified: true,
    fiatCurrency: 'BRL',
    locale: 'pt-BR',
  },
  CADm: {
    symbol: 'CADm',
    name: 'Mento Canadian Dollar',
    address: '0xff4Ab19391af240c311c54200a492233052B6325',
    decimals: 18,
    verified: true,
    fiatCurrency: 'CAD',
    locale: 'en-CA',
  },
  CHFm: {
    symbol: 'CHFm',
    name: 'Mento Swiss Franc',
    address: '0xb55a79F398E759E43C95b979163f30eC87Ee131D',
    decimals: 18,
    verified: true,
    fiatCurrency: 'CHF',
    locale: 'de-CH',
  },
  COPm: {
    symbol: 'COPm',
    name: 'Mento Colombian Peso',
    address: '0x8A567e2aE79CA692Bd748aB832081C45de4041eA',
    decimals: 18,
    verified: true,
    fiatCurrency: 'COP',
    locale: 'es-CO',
  },
  GBPm: {
    symbol: 'GBPm',
    name: 'Mento British Pound',
    address: '0xCCF663b1fF11028f0b19058d0f7B674004a40746',
    decimals: 18,
    verified: true,
    fiatCurrency: 'GBP',
    locale: 'en-GB',
  },
  GHSm: {
    symbol: 'GHSm',
    name: 'Mento Ghanaian Cedi',
    address: '0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313',
    decimals: 18,
    verified: true,
    fiatCurrency: 'GHS',
    locale: 'en-GH',
  },
  JPYm: {
    symbol: 'JPYm',
    name: 'Mento Japanese Yen',
    address: '0xc45eCF20f3CD864B32D9794d6f76814aE8892e20',
    decimals: 18,
    verified: true,
    fiatCurrency: 'JPY',
    locale: 'ja-JP',
  },
  KESm: {
    symbol: 'KESm',
    name: 'Mento Kenyan Shilling',
    address: '0x456a3D042C0DbD3db53D5489e98dFb038553B0d0',
    decimals: 18,
    verified: true,
    fiatCurrency: 'KES',
    locale: 'en-KE',
  },
  PHPm: {
    symbol: 'PHPm',
    name: 'Mento Philippine Peso',
    address: '0x105d4A9306D2E55a71d2Eb95B81553AE1dC20d7B',
    decimals: 18,
    verified: true,
    fiatCurrency: 'PHP',
    locale: 'en-PH',
  },
  XOFm: {
    symbol: 'XOFm',
    name: 'Mento West African CFA Franc',
    address: '0x73F93dcc49cB8A239e2032663e9475dd5ef29A08',
    decimals: 18,
    verified: true,
    fiatCurrency: 'XOF',
    locale: 'fr-SN',
  },
  ZARm: {
    symbol: 'ZARm',
    name: 'Mento South African Rand',
    address: '0x4c35853A3B4e647fD266f4de678dCc8fEC410BF6',
    decimals: 18,
    verified: true,
    fiatCurrency: 'ZAR',
    locale: 'en-ZA',
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
