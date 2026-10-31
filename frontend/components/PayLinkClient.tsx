'use client';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {api, Token} from '../lib/api';
import {userFacingError} from '../lib/userFacingError';
import styles from './CheckoutClient.module.css';

// Public reusable payment link. A payer lands here (app/pay/<merchant-slug>),
// enters an amount + currency, and we create a one-off invoice to the merchant
// then hand off to the normal checkout page to pay (reusing the tagged payment
// + verification flow).

type Info = Awaited<ReturnType<typeof api.getPayLink>>;

export default function PayLinkClient({slug}: {slug: string}) {
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('');
  const [payer, setPayer] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [loadErr, setLoadErr] = useState('');

  useEffect(() => {
    api.getPayLink(slug)
      .then((x) => {
        setInfo(x);
        setToken(x.preferredToken || 'USDm');
      })
      .catch((e) => setLoadErr(userFacingError(e, 'This payment link could not be found.')));
    api.getTokens().then(setTokens).catch(() => {});
  }, [slug]);

  // Currencies offered: the merchant's accepted list if set, otherwise all.
  const options = (() => {
    const accepted = info?.acceptedTokens || [];
    if (accepted.length && tokens.length) return tokens.filter((t) => accepted.includes(t.symbol));
    if (accepted.length) return accepted.map((s) => ({symbol: s, name: s, decimals: 18} as Token));
    return tokens;
  })();

  async function pay() {
    if (!info) return;
    setErr('');
    if (!amount || Number(amount) <= 0) {
      setErr('Enter an amount greater than zero.');
      return;
    }
    setBusy(true);
    try {
      const r = await api.payLink(slug, {amount, tokenSymbol: token, clientName: payer.trim() || undefined});
      router.push(`/invoice/${r.slug}`);
    } catch (e: any) {
      setErr(userFacingError(e, 'Could not start this payment.'));
      setBusy(false);
    }
  }

  if (loadErr) {
    return (
      <main className={styles.page}>
        <div className={styles.centerCard}>
          <h2>Payment link unavailable</h2>
          <p>{loadErr}</p>
        </div>
      </main>
    );
  }
  if (!info) {
    return (
      <main className={styles.page}>
        <div className={styles.centerCard}><p style={{margin: 0}}>Loading…</p></div>
      </main>
    );
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '12px 13px', borderRadius: 12, border: '1px solid rgba(10,40,30,.14)',
    outline: 'none', fontSize: 15, marginTop: 6, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
  };
  const labelStyle: React.CSSProperties = {display: 'block', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#4a6a5e', marginTop: 14};

  return (
    <main className={styles.page}>
      <div className={styles.centerCard}>
        <h2 style={{marginBottom: 4}}>Pay {info.businessName}</h2>
        {info.tagline && <p style={{marginTop: 0}}>{info.tagline}</p>}

        {!info.hasWallet ? (
          <p style={{marginTop: 16}}>This seller has not finished setting up payments yet. Please check back later.</p>
        ) : (
          <>
            <label style={labelStyle}>Amount
              <input style={fieldStyle} inputMode="decimal" placeholder="0.00" value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
            </label>
            <label style={labelStyle}>Currency
              <select style={fieldStyle} value={token} onChange={(e) => setToken(e.target.value)}>
                {options.map((t) => <option key={t.symbol} value={t.symbol}>{t.symbol}{t.name && t.name !== t.symbol ? ` — ${t.name}` : ''}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Your name (optional)
              <input style={fieldStyle} placeholder="So the seller knows who paid" value={payer}
                onChange={(e) => setPayer(e.target.value)} maxLength={80} />
            </label>

            {err && <p style={{color: 'var(--danger,#c0392b)', fontSize: 13, marginTop: 12, marginBottom: 0}}>{err}</p>}

            <button className={`${styles.btn} ${styles.btnGreen}`} style={{marginTop: 18, width: '100%'}} onClick={pay} disabled={busy}>
              {busy ? 'Starting…' : 'Continue to pay'}
            </button>
            <p style={{fontSize: 11, color: '#6c8a7e', marginTop: 12, marginBottom: 0}}>Settles on Celo directly to the seller. Non-custodial.</p>
          </>
        )}
      </div>
    </main>
  );
}
