'use client';
import {useEffect,useState} from 'react';
import {api} from '../lib/api';
import {Wallet,Check,LogOut} from './Icons';
import {userFacingError} from '../lib/userFacingError';

declare global { interface Window { ethereum?: { isMiniPay?: boolean; request: (args:{method:string;params?:unknown[]})=>Promise<any>; on?: (event:string,handler:(value:any)=>void)=>void; removeListener?: (event:string,handler:(value:any)=>void)=>void; }; } }

function toHexMessage(message:string){
 return `0x${Array.from(new TextEncoder().encode(message),byte=>byte.toString(16).padStart(2,'0')).join('')}`;
}

export default function WalletConnect({compact=false}:{compact?:boolean}){
 const [address,setAddress]=useState(''); const [busy,setBusy]=useState(false); const [err,setErr]=useState('');
 useEffect(()=>{const sync=()=>{const s=api.getStoredSession();setAddress(s?.walletAddress||'')};sync();window.addEventListener('celodesk-session',sync);const onAccountsChanged=(accounts:any)=>{const next=Array.isArray(accounts)?accounts[0]||'':'';const session=api.getStoredSession();if(session?.walletAddress&&next&&session.walletAddress.toLowerCase()!==String(next).toLowerCase()){api.clearStoredSession();setAddress('');window.dispatchEvent(new Event('celodesk-session'))}};window.ethereum?.on?.('accountsChanged',onAccountsChanged);return()=>{window.removeEventListener('celodesk-session',sync);window.ethereum?.removeListener?.('accountsChanged',onAccountsChanged)}},[]);
 async function connect(){setBusy(true);setErr('');try{if(!window.ethereum)throw new Error('No compatible wallet found. Open CeloDesk in a browser wallet or MiniPay.');const accounts=await window.ethereum.request({method:'eth_requestAccounts'});const wallet=accounts?.[0];if(!wallet)throw new Error('No wallet account selected.');const message=`CeloDesk sign-in\nWallet: ${wallet}\nTimestamp: ${new Date().toISOString()}`;const signature=await window.ethereum.request({method:'personal_sign',params:[toHexMessage(message),wallet]});const existing=api.getStoredSession();if(existing?.token&&!existing.walletAddress){const r=await api.linkWallet({walletAddress:wallet,message,signature});api.setStoredSession({...existing,walletAddress:r.walletAddress})}else{const session=await api.walletAuth({walletAddress:wallet,message,signature});api.setStoredSession({...session,walletAddress:wallet})}setAddress(wallet);window.dispatchEvent(new Event('celodesk-session'))}catch(e:any){setErr(userFacingError(e,'Wallet connection failed.'))}finally{setBusy(false)}}
 function disconnect(){api.clearStoredSession();setAddress('');window.dispatchEvent(new Event('celodesk-session'));window.location.href='/'}
 const css=(
  <style jsx>{`
   .wc{display:inline-flex;align-items:center;gap:7px}
   .chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--ck-line);background:var(--ck-raised);color:var(--ck-text);border-radius:999px;padding:6px 11px;font-size:12.5px;font-weight:500;font-family:var(--ck-mono)}
   .dot{width:20px;height:20px;border-radius:50%;background:var(--ck-pos-soft);color:var(--ck-pos);display:grid;place-items:center}
   .iconBtn{width:34px;height:34px;border:1px solid var(--ck-line);background:transparent;color:var(--ck-muted);border-radius:9px;display:grid;place-items:center;cursor:pointer;transition:color .15s ease,border-color .15s ease}
   .iconBtn:hover{color:var(--ck-neg);border-color:var(--ck-line2)}
   .cbtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:500;font-size:14px;padding:11px 18px;border-radius:10px;cursor:pointer;border:1px solid transparent;font-family:inherit;transition:transform .12s ease,background .15s ease,border-color .15s ease}
   .cbtn:active{transform:scale(.98)}
   .cbtn:disabled{opacity:.6;cursor:not-allowed}
   .soft{background:transparent;border-color:var(--ck-line2);color:var(--ck-text)}
   .soft:hover{border-color:var(--ck-text2)}
   .primary{background:var(--ck-btn-bg);color:var(--ck-btn-text);box-shadow:inset 0 1px 0 var(--ck-btn-hl)}
   .primary:hover{background:var(--ck-btn-hover)}
   .wcErr{display:block;color:var(--ck-neg);font-size:11px;margin-top:6px}
  `}</style>
 );
 if(address)return <div className="wc">{css}<span className="chip"><span className="dot"><Check size={12}/></span>{address.slice(0,6)}…{address.slice(-4)}</span><button className="iconBtn" onClick={disconnect} title="Disconnect wallet" aria-label="Disconnect wallet"><LogOut size={15}/></button></div>;
 return <>{css}<button className={`cbtn ${compact?'soft':'primary'}`} onClick={connect} disabled={busy}><Wallet size={16}/>{busy?'Connecting…':'Connect wallet'}</button>{err&&<span className="wcErr">{err}</span>}</>;
}
