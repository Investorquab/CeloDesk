// Ripio wFIAT on-ramp helper.
//
// Ripio runs a no-credentials on-ramp for its wFIAT stablecoins: build a URL
// with country/chain/token/amount/address query params and the user lands
// straight in Ripio's buy flow, funds delivered to the wallet we name.
// Docs/pattern from the Stable Agents: LatAm (Ripio) sponsor:
//   https://ramp.ripio.com/?country=AR&chain=42220&token=WARS&amount=10000&address=0x...
// This lets a LatAm payer who holds no local-currency stablecoin top up and
// pay a wFIAT invoice, without the merchant touching any funds.

const RIPIO_RAMP = 'https://ramp.ripio.com/';
const CELO_CHAIN_ID = '42220';

// Ripio wFIAT symbol -> ISO country code for the ramp's `country` param.
const WFIAT: Record<string, { country: string; currency: string }> = {
  wARS: { country: 'AR', currency: 'Argentine pesos' },
  wBRL: { country: 'BR', currency: 'Brazilian reais' },
  wMXN: { country: 'MX', currency: 'Mexican pesos' },
  wCOP: { country: 'CO', currency: 'Colombian pesos' },
  wCLP: { country: 'CL', currency: 'Chilean pesos' },
  wPEN: { country: 'PE', currency: 'Peruvian soles' },
};

export function isRipioWFiat(symbol: string): boolean {
  return !!WFIAT[symbol];
}

export function wfiatCurrencyName(symbol: string): string {
  return WFIAT[symbol]?.currency || symbol;
}

// Build a Ripio on-ramp URL. Any field may be omitted — Ripio then prefills
// the form and lets the user complete it. `amount` is in the local currency.
export function ripioOnrampUrl(opts: { token?: string; amount?: string | number; address?: string }): string {
  const p = new URLSearchParams();
  const meta = opts.token ? WFIAT[opts.token] : undefined;
  if (meta) p.set('country', meta.country);
  p.set('chain', CELO_CHAIN_ID);
  if (opts.token) p.set('token', opts.token.toUpperCase()); // wARS -> WARS
  if (opts.amount != null && String(opts.amount).trim() !== '') {
    // Ripio expects a whole/decimal local-currency amount.
    p.set('amount', String(opts.amount));
  }
  if (opts.address) p.set('address', opts.address);
  return `${RIPIO_RAMP}?${p.toString()}`;
}
