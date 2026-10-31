'use client';
import {useState} from 'react';
import s from './AppShell.module.css';

// Light "cash out" helper. CeloDesk is an invoicing + tracking tool, not a
// payments/banking app: it does NOT move or hold any money here. This simply
// points the seller to independent, licensed Celo off-ramps that convert the
// stablecoin they received into local cash (bank or mobile money). The seller
// does their own KYC and payout directly with the provider.

const PROVIDERS = [
  {name: 'Yellow Card', url: 'https://yellowcard.io', note: 'Bank & mobile money, 20+ African countries (incl. Nigeria)'},
  {name: 'Fonbnk', url: 'https://fonbnk.com', note: 'Mobile money, 17 countries, supports Celo'},
  {name: 'Bitmama', url: 'https://bitmama.io', note: 'Bank & mobile money, Nigeria & Ghana'},
  {name: 'Mt Pelerin', url: 'https://www.mtpelerin.com/sell-crypto', note: 'Bank payout in 160+ countries (USD, EUR and more)'},
];
const CELO_RAMPS = 'https://docs.celo.org/home/ramps';

export default function CashOut({walletAddress}: {walletAddress?: string | null}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!walletAddress) return;
    try {
      await navigator.clipboard?.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <>
      <button type="button" className={`${s.btn} ${s.btnLine}`} onClick={() => setOpen(true)}>
        Cash out
      </button>
      {open && (
        <div className={s.modalBackdrop} onClick={() => setOpen(false)}>
          <div className={s.modal} style={{width: 'min(460px,100%)', textAlign: 'left'}} onClick={(e) => e.stopPropagation()}>
            <h2 style={{textAlign: 'center'}}>Cash out to your bank or mobile money</h2>
            <p>
              Payments arrive as stablecoin in your wallet. These independent, licensed Celo
              services convert that to local cash. CeloDesk does not handle this money or charge a
              fee, and you complete the conversion and ID check with the provider.
            </p>

            {walletAddress && (
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: '1px solid var(--line)', borderRadius: 11, padding: '10px 12px', marginBottom: 16, fontSize: 13}}>
                <span style={{color: 'var(--txt-soft)'}}>Your wallet</span>
                <span style={{fontFamily: 'var(--mono, monospace)'}}>{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>
                <button type="button" className={`${s.btn} ${s.btnSoft}`} style={{padding: '6px 10px', fontSize: 12}} onClick={copy}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}

            <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16}}>
              {PROVIDERS.map((p) => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{display: 'block', border: '1px solid var(--line)', borderRadius: 11, padding: '11px 13px', textDecoration: 'none', color: 'var(--txt)'}}
                >
                  <div style={{fontWeight: 600, fontSize: 14}}>{p.name}</div>
                  <div style={{color: 'var(--txt-soft)', fontSize: 12, marginTop: 2}}>{p.note}</div>
                </a>
              ))}
            </div>

            <p style={{fontSize: 12, margin: '0 0 18px'}}>
              See the full list of Celo off-ramp providers for your country at{' '}
              <a href={CELO_RAMPS} target="_blank" rel="noopener noreferrer">Celo&apos;s ramp directory</a>.
            </p>

            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnDark}`} onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
