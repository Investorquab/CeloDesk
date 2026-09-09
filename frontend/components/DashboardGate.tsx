'use client';
import {useEffect,useState} from 'react';
import DashboardClient from './DashboardClient';
import WalletConnect from './WalletConnect';
import {api} from '../lib/api';

export default function DashboardGate({initialMerchantId}:{initialMerchantId?:string}){
 const [id,setId]=useState(initialMerchantId||'');
 const [ready,setReady]=useState(!!initialMerchantId);
 useEffect(()=>{
   const sync=()=>{const s=api.getStoredSession(); if(s?.merchantId)setId(s.merchantId); setReady(true)};
   if(!id) sync();
   window.addEventListener('celodesk-session',sync);
   return ()=>window.removeEventListener('celodesk-session',sync);
 },[id]);
 if(!ready)return <div className="gate">Loading your CeloDesk account…</div>;
 if(!id)return <div className="gate"><div className="gateCard"><div className="brand"><span className="brandMark"/>CeloDesk</div><h1>Connect your wallet</h1><p className="muted">Your wallet is your account identity. No merchant ID needed.</p><WalletConnect/><div className="muted gateSmall">Non-custodial · payments settle directly to your wallet</div></div></div>;
 return <DashboardClient merchantId={id}/>;
}
