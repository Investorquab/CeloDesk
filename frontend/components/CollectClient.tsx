'use client';
import {useEffect, useState} from 'react';
import {api, Token, CollectionPublic} from '../lib/api';
import {userFacingError} from '../lib/userFacingError';
import styles from './CheckoutClient.module.css';

// Public batch-pay submission page (app/collect/<slug>). A payee opens the
// organizer's link and submits their own name, wallet, amount and token. The
// organizer then reviews and pays everyone at once. No auth: anyone with the
// link can submit.

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export default function CollectClient({slug}: {slug: string}) {
  const [info, setInfo] = useState<CollectionPublic | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState('');
  const [wallet, setWallet] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.getCollectionPublic(slug)
      .then((x) => {
        setInfo(x);
        if (x.allowedTokens?.length) setToken(x.allowedTokens[0]);
      })
      .catch((e) => setLoadErr(userFacingError(e, 'This collection could not be found.')));
    api.getTokens().then(setTokens).catch(() => {});
  }, [slug]);

  const options = (() => {
    const allowed = info?.allowedTokens || [];
    if (allowed.length && tokens.length) return tokens.filter((t) => allowed.includes(t.symbol));
    if (allowed.length) return allowed.map((s) => ({symbol: s, name: s, decimals: 18} as Token));
    return tokens;
  })();

  async function submit() {
    if (!info) return;
    setErr('');
    if (!name.trim()) return setErr('Enter your name.');
    if (!WALLET_RE.test(wallet.trim())) return setErr('Enter a valid Celo wallet address (0x followed by 40 characters).');
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr('Enter a valid email address, or leave it blank.');
    if (!token) return setErr('Choose a currency.');
    if (!amount || Number(amount) <= 0) return setErr('Enter an amount greater than zero.');
    setBusy(true);
    try {
      await api.submitCollectionItem(slug, {payeeName: name.trim(), payeeWallet: wallet.trim(), tokenSymbol: token, amount, note: note.trim() || undefined, payeeEmail: email.trim() || undefined});
      setDone(true);
    } catch (e: any) {
      setErr(userFacingError(e, 'Could not submit. Please try again.'));
      setBusy(false);
    }
  }

  if (loadErr) {
    return <main className={styles.page}><div className={styles.centerCard}><h2>Collection unavailable</h2><p>{loadErr}</p></div></main>;
  }
  if (!info) {
    return <main className={styles.page}><div className={styles.centerCard}><p style={{margin: 0}}>Loading…</p></div></main>;
  }
  if (done) {
    return (
      <main className={styles.page}>
        <div className={styles.centerCard}>
          <div className={styles.orb} aria-hidden="true">✓</div>
          <h2 style={{marginBottom: 4}}>Submitted</h2>
          <p style={{marginTop: 0}}>Thanks, {name.trim()}. {info.organizer} will review your request and pay you on Celo. You can close this page.</p>
        </div>
      </main>
    );
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '12px 13px', borderRadius: 10, border: '1px solid var(--line)',
    outline: 'none', fontSize: 15, marginTop: 6, boxSizing: 'border-box', fontFamily: 'inherit',
    background: 'var(--raised)', color: 'var(--text)',
  };
  const labelStyle: React.CSSProperties = {display: 'block', textAlign: 'left', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginTop: 14};

  return (
    <main className={styles.page}>
      <div className={styles.centerCard}>
        <div style={{fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)'}}>{info.organizer}</div>
        <h2 style={{marginBottom: 4, marginTop: 6}}>{info.title}</h2>
        {info.description && <p style={{marginTop: 0}}>{info.description}</p>}

        {!info.open ? (
          <p style={{marginTop: 16}}>This collection is closed and no longer accepting submissions.</p>
        ) : (
          <>
            <label style={labelStyle}>Your name
              <input style={fieldStyle} placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </label>
            <label style={labelStyle}>Your Celo wallet address
              <input style={fieldStyle} placeholder="0x..." value={wallet} onChange={(e) => setWallet(e.target.value)} spellCheck={false} />
            </label>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
              <label style={labelStyle}>Amount
                <input style={fieldStyle} inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
              </label>
              <label style={labelStyle}>Currency
                <select style={fieldStyle} value={token} onChange={(e) => setToken(e.target.value)}>
                  {options.length ? options.map((t) => <option key={t.symbol} value={t.symbol}>{t.symbol}{t.name && t.name !== t.symbol ? ` — ${t.name}` : ''}</option>) : <option value="">Loading…</option>}
                </select>
              </label>
            </div>
            <label style={labelStyle}>Email (optional)
              <input style={fieldStyle} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} spellCheck={false} />
            </label>
            <p style={{fontSize: 11, color: 'var(--text-2)', marginTop: 6, marginBottom: 0, textAlign: 'left'}}>Only used to reach you if your details need a fix before payout.</p>
            <label style={labelStyle}>Note (optional)
              <input style={fieldStyle} placeholder="What this is for" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            </label>

            {err && <p style={{color: 'var(--neg,#c0392b)', fontSize: 13, marginTop: 12, marginBottom: 0}}>{err}</p>}

            <button className={`${styles.btn} ${styles.btnGreen}`} style={{marginTop: 18, width: '100%'}} onClick={submit} disabled={busy}>
              {busy ? 'Submitting…' : 'Submit request'}
            </button>
            <p style={{fontSize: 11, color: 'var(--text-2)', marginTop: 12, marginBottom: 0}}>Your wallet is where you will be paid, on Celo. Double-check it is correct.</p>
          </>
        )}
      </div>
    </main>
  );
}
