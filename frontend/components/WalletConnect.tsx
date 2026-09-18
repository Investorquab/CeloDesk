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
 async function connect(){setBusy(true);setErr('');try{if(!window.ethereum)throw new Error('No compatible wallet found. Open CeloDesk in a browser wallet or MiniPay.');const accounts=await window.ethereum.request({method:'eth_requestAccounts'});const wallet=accounts?.[0];if(!wallet)throw new Error('No wallet account selected.');const message=`CeloDesk sign-in\nWallet: ${wallet}\nTimestamp: ${new Date().toISOString()}`;const signature=await window.ethereum.request({method:'personal_sign',params:[toHexMessage(message),wallet]});const session=await api.walletAuth({walletAddress:wallet,message,signature});api.setStoredSession({...session,walletAddress:wallet});setAddress(wallet);window.dispatchEvent(new Event('celodesk-session'))}catch(e:any){setErr(userFacingError(e,'Wallet connection failed.'))}finally{setBusy(false)}}
 function disconnect(){api.clearStoredSession();setAddress('');window.dispatchEvent(new Event('celodesk-session'));window.location.href='/'}
 if(address)return <div className="walletActions"><span className="walletConnected"><span className="walletDot"><Check size={13}/></span>{address.slice(0,6)}…{address.slice(-4)}</span><button className="iconOnly" onClick={disconnect} title="Disconnect wallet" aria-label="Disconnect wallet"><LogOut size={15}/></button></div>;
 return <><button className={`btn ${compact?'btnSoft':'btnPrimary'}`} onClick={connect} disabled={busy}><Wallet size={16}/>{busy?'Connecting…':'Connect wallet'}</button>{err&&<span className="walletError">{err}</span>}</>;
}
