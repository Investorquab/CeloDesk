'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {api,Invoice,money,shortAddress} from '../lib/api';
import AppNav from './AppNav';
import {userFacingError} from '../lib/userFacingError';
import {Activity as ActivityIcon,ArrowLeft,Check,Clock,Alert,Receipt,Wallet} from './Icons';

type EventItem={id:string;kind:'created'|'sent'|'viewed'|'paid'|'pending'|'failed';title:string;subtitle:string;amount?:string;time:string;status?:string;href?:string;};
function buildEvents(invoices:Invoice[],returnTo:string):EventItem[]{
 const out:EventItem[]=[];
 for(const i of invoices){
  out.push({id:`${i.id}-created`,kind:'created',title:'Invoice created',subtitle:`${i.clientName} · ${i.publicSlug.slice(0,8).toUpperCase()}`,amount:money(i.amount,i.tokenSymbol),time:i.createdAt,href:`/invoice/${i.publicSlug}?returnTo=${encodeURIComponent(returnTo)}`});
  const payments=[...(i.payments||[])].sort((a,b)=>+new Date(b.verifiedAt||b.detectedAt||i.updatedAt||i.createdAt)-+new Date(a.verifiedAt||a.detectedAt||i.updatedAt||i.createdAt));
  for(const p of payments){
   const href=`/invoice/${i.publicSlug}?returnTo=${encodeURIComponent(returnTo)}`;
   if(p.status==='VERIFIED') out.push({id:`${i.id}-payment-${p.id}`,kind:'paid',title:'Payment received',subtitle:p.fromAddress?`Verified from ${shortAddress(p.fromAddress)}`:'Verified on Celo',amount:`+${money(p.amount,p.tokenSymbol||i.tokenSymbol)}`,time:p.verifiedAt||p.detectedAt||i.updatedAt||i.createdAt,status:'Verified',href});
   else if(p.status==='REJECTED') out.push({id:`${i.id}-payment-${p.id}`,kind:'failed',title:'Payment rejected',subtitle:p.rejectionReason||'Payment did not match this invoice',amount:money(p.amount,p.tokenSymbol||i.tokenSymbol),time:p.detectedAt||i.updatedAt||i.createdAt,status:'Failed',href});
   else if(p.status==='DETECTED'||p.status==='VERIFYING') out.push({id:`${i.id}-payment-${p.id}`,kind:'pending',title:'Payment pending',subtitle:'Waiting for payment verification',amount:money(p.amount,i.tokenSymbol),time:p.detectedAt||i.updatedAt||i.createdAt,status:'Pending',href});
  }
 }
 return out.sort((a,b)=>+new Date(b.time)-+new Date(a.time));
}
function EventIcon({kind}:{kind:EventItem['kind']}){if(kind==='paid')return <Check size={17}/>;if(kind==='pending')return <Clock size={17}/>;if(kind==='failed')return <Alert size={17}/>;if(kind==='created')return <Receipt size={17}/>;if(kind==='sent')return <Wallet size={17}/>;return <ActivityIcon size={17}/>}
export default function ActivityClient({merchantId}:{merchantId:string}){
 const [invoices,setInvoices]=useState<Invoice[]>([]),[loading,setLoading]=useState(true),[err,setErr]=useState(''),[filter,setFilter]=useState('All');
 useEffect(()=>{setLoading(true);api.listInvoices(merchantId).then(x=>setInvoices(x)).catch(e=>setErr(userFacingError(e,'Could not load activity.'))).finally(()=>setLoading(false))},[merchantId]);
 const events=useMemo(()=>buildEvents(invoices,`/dashboard/activity?merchantId=${merchantId}`),[invoices,merchantId]);
 const filtered=events.filter(e=>filter==='All'||(filter==='Payments'&&['paid','pending','failed'].includes(e.kind))||(filter==='Invoices'&&['created','sent','viewed'].includes(e.kind))||(filter===e.status));
 return <div className="appShell"><div className="topbar"><div className="topbarInner"><Link href={`/dashboard?merchantId=${merchantId}`} className="brand"><span className="brandMark"/>CeloDesk</Link><Link href={`/dashboard?merchantId=${merchantId}`} className="btn btnGhost"><ArrowLeft size={16}/>Back</Link></div></div><div className="appPage"><div className="container appGrid"><AppNav merchantId={merchantId}/><main className="main">
  <div className="pageTitleRow"><div><div className="muted" style={{fontSize:11}}>ACCOUNT ACTIVITY</div><h1>Activity</h1><p className="muted">Every invoice and payment event in one place.</p></div><div className="activityCount">{events.length} events</div></div>
  <div className="filterBar">{['All','Payments','Invoices','Pending','Verified','Failed'].map(x=><button key={x} className={filter===x?'filterActive':''} onClick={()=>setFilter(x)}>{x}</button>)}</div>
  <section className="panel activityPanel">{loading?<div className="activityEmpty">Loading your activity…</div>:err?<div className="activityEmpty errorText"><strong>{err}</strong><div className="activityErrorActions"><button className="btn btnBrand" onClick={()=>{setErr('');setLoading(true);api.listInvoices(merchantId).then(x=>setInvoices(x)).catch(e=>setErr(userFacingError(e,'Could not load activity.'))).finally(()=>setLoading(false))}}>Try again</button><button className="btn btnSoft" onClick={()=>setErr('')}>Cancel</button></div></div>:filtered.length?filtered.map(e=><Link className="activityRow" key={e.id} href={e.href||'#'}><span className={`activityIcon ${e.kind}`}><EventIcon kind={e.kind}/></span><span className="activityCopy"><strong>{e.title}</strong><small>{e.subtitle}</small></span><span className="activityAmount"><strong className={e.kind==='paid'?'positive':''}>{e.amount||''}</strong><small>{new Date(e.time).toLocaleString()}</small></span><span className="activityArrow">›</span></Link>):<div className="activityEmpty">No activity matches this filter.</div>}</section>
 </main></div></div></div>
}
