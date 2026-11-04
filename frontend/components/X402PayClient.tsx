'use client';
import {useEffect, useState} from 'react';
import {api} from '../lib/api';
import {userFacingError} from '../lib/userFacingError';
import styles from './CheckoutClient.module.css';

// Public x402 pay page (app/x402/<invoiceId>). A payer settles a USA₮ invoice
// gaslessly over Celo's x402 facilitator: they sign an EIP-3009
// transferWithAuthorization in their wallet, CeloDesk verifies + settles
// through the facilitator (which submits on-chain and pays the gas), and the
// funds move payer -> merchant directly. No CELO needed by the payer.

const CELO_HEX = '0xa4ec'; // 42220

function randomNonce(): string {
  const bytes = new Uint8Array(32);
  (globalThis.crypto || (window as any).crypto).getRandomValues(bytes);
  return '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function X402PayClient({invoiceId}: {invoiceId: string}) {
  const [req, setReq] = useState<any | null>(null);
  const [version, setVersion] = useState<number>(1);
  const [loadErr, setLoadErr] = useState('');
  const [err, setErr] = useState('');
  const [status, setStatus] = useState<'idle' | 'signing' | 'settling' | 'done'>('idle');
  const [result, setResult] = useState<{tx: string; explorerUrl?: string} | null>(null);

  useEffect(() => {
    api.getX402Requirements(invoiceId)
      .then((x) => {
        const r = x.accepts?.[0];
        if (!r) throw new Error('No x402 payment requirements for this invoice.');
        setReq(r);
        setVersion(x.x402Version || 1);
      })
      .catch((e) => setLoadErr(userFacingError(e, 'This USA₮ invoice could not be loaded for x402 payment.')));
  }, [invoiceId]);

  const amountHuman = req ? (Number(req.maxAmountRequired) / 1e6).toLocaleString(undefined, {maximumFractionDigits: 6}) : '';

  async function pay() {
    if (!req) return;
    setErr('');
    try {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error('No wallet detected. Open this page in a Celo wallet (MiniPay, MetaMask, Rabby).');
      const accts = await eth.request({method: 'eth_requestAccounts'});
      const from = accts?.[0];
      if (!from) throw new Error('No wallet account selected.');
      if (from.toLowerCase() === String(req.payTo).toLowerCase()) throw new Error('Payer and merchant must be different wallets.');

      // Be on Celo so the wallet shows the right context (signature is chain-bound anyway).
      const cur = await eth.request({method: 'eth_chainId'});
      if (String(cur).toLowerCase() !== CELO_HEX) {
        try { await eth.request({method: 'wallet_switchEthereumChain', params: [{chainId: CELO_HEX}]}); }
        catch (se: any) { if (se?.code === 4902) await eth.request({method: 'wallet_addEthereumChain', params: [{chainId: CELO_HEX, chainName: 'Celo Mainnet', nativeCurrency: {name: 'Celo', symbol: 'CELO', decimals: 18}, rpcUrls: ['https://forno.celo.org'], blockExplorerUrls: ['https://celoscan.io']}]}); }
      }

      const now = Math.floor(Date.now() / 1000);
      const authorization = {
        from,
        to: req.payTo,
        value: String(req.maxAmountRequired),
        validAfter: '0',
        validBefore: String(now + (req.maxTimeoutSeconds ?? 120)),
        nonce: randomNonce(),
      };
      const typedData = {
        types: {
          EIP712Domain: [
            {name: 'name', type: 'string'},
            {name: 'version', type: 'string'},
            {name: 'chainId', type: 'uint256'},
            {name: 'verifyingContract', type: 'address'},
          ],
          TransferWithAuthorization: [
            {name: 'from', type: 'address'},
            {name: 'to', type: 'address'},
            {name: 'value', type: 'uint256'},
            {name: 'validAfter', type: 'uint256'},
            {name: 'validBefore', type: 'uint256'},
            {name: 'nonce', type: 'bytes32'},
          ],
        },
        domain: {name: req.extra.name, version: req.extra.version, chainId: 42220, verifyingContract: req.asset},
        primaryType: 'TransferWithAuthorization',
        message: authorization,
      };

      setStatus('signing');
      const signature = await eth.request({method: 'eth_signTypedData_v4', params: [from, JSON.stringify(typedData)]});

      setStatus('settling');
      const payment = {x402Version: version, scheme: 'exact', network: req.network, payload: {signature, authorization}};
      const res = await api.payX402(invoiceId, payment);
      if (!res.settled || !res.transaction) throw new Error(res.reason || 'The facilitator did not settle this payment.');
      setResult({tx: res.transaction, explorerUrl: res.explorerUrl});
      setStatus('done');
    } catch (e: any) {
      setStatus('idle');
      setErr(userFacingError(e, 'The x402 payment could not be completed.'));
    }
  }

  if (loadErr) return <main className={styles.page}><div className={styles.centerCard}><h2>Unavailable</h2><p>{loadErr}</p></div></main>;
  if (!req) return <main className={styles.page}><div className={styles.centerCard}><p style={{margin: 0}}>Loading…</p></div></main>;

  if (status === 'done' && result) {
    return (
      <main className={styles.page}>
        <div className={styles.centerCard}>
          <div className={styles.orb} aria-hidden="true">✓</div>
          <h2 style={{marginBottom: 4}}>Paid over x402</h2>
          <p style={{marginTop: 0}}>{amountHuman} USA₮ settled gaslessly through Celo&apos;s x402 facilitator.</p>
          <a href={result.explorerUrl || `https://celoscan.io/tx/${result.tx}`} target="_blank" rel="noopener noreferrer"
             style={{display: 'block', marginTop: 10, fontSize: 12.5, fontWeight: 600, color: 'var(--brandDeep,#0b7d5a)', wordBreak: 'break-all'}}>
            View transaction &rarr;
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.centerCard}>
        <div style={{fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2,#667)'}}>x402 · USA₮</div>
        <h2 style={{marginTop: 6, marginBottom: 4}}>Pay {amountHuman} USA₮</h2>
        <p style={{marginTop: 0, fontSize: 13}}>Gasless settlement over Celo&apos;s x402 facilitator. You sign an authorization in your wallet; the facilitator submits it and pays the gas. Funds go straight to the merchant — CeloDesk never holds them.</p>
        <div style={{fontSize: 12, color: 'var(--text-2,#667)', margin: '10px 0', wordBreak: 'break-all'}}>To: {req.payTo}</div>
        {err && <p style={{color: 'var(--neg,#c0392b)', fontSize: 13, marginTop: 10, marginBottom: 0}}>{err}</p>}
        <button className={`${styles.btn} ${styles.btnGreen}`} style={{marginTop: 16, width: '100%'}} onClick={pay} disabled={status !== 'idle'}>
          {status === 'signing' ? 'Approve in your wallet…' : status === 'settling' ? 'Settling over x402…' : 'Pay with x402'}
        </button>
        <p style={{fontSize: 11, color: 'var(--text-2,#667)', marginTop: 12, marginBottom: 0}}>You need USA₮ in your wallet — but no CELO for gas.</p>
      </div>
    </main>
  );
}
