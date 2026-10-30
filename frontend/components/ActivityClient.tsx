'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {api,Invoice,money,shortAddress} from '../lib/api';
import AppHeaderV2 from './AppHeaderV2';
import {userFacingError} from '../lib/userFacingError';
import {Activity as ActivityIcon,Check,Clock,Alert,Receipt} from './Icons';
import s from './AppShell.module.css';

type EventItem={id:string;kind:'created'|'paid'|'pending'|'failed';title:string;subtitle:string;amount?:string;time:string;status?:string;href?:string;};
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
function EventIcon({kind}:{kind:EventItem['kind']}){if(kind==='paid')return <Check size={16}/>;if(kind==='pending')return <Clock size={16}/>;if(kind==='failed')return <Alert size={16}/>;if(kind==='created')return <Receipt size={16}/>;return <ActivityIcon size={16}/>;}

export default function ActivityClient({merchantId}:{merchantId:string}){
 const [invoices,setInvoices]=useState<Invoice[]>([]),[loading,setLoading]=useState(true),[err,setErr]=useState(''),[filter,setFilter]=useState('All'),[name,setName]=useState<string>();
 const load=()=>{setLoading(true);api.listInvoices(merchantId).then(x=>setInvoices(x)).catch(e=>setErr(userFacingError(e,'Could not load activity.'))).finally(()=>setLoading(false))};
 useEffect(()=>{load();api.getMerchant(merchantId).then(m=>setName(m?.profile?.businessName)).catch(()=>{})},[merchantId]);
 const events=useMemo(()=>buildEvents(invoices,`/dashboard/activity?merchantId=${merchantId}`),[invoices,merchantId]);
 const filtered=events.filter(e=>filter==='All'||(filter==='Payments'&&['paid','pending','failed'].includes(e.kind))||(filter==='Invoices'&&e.kind==='created')||(filter===e.status));
 return <div className={s.app}>
  <AppHeaderV2 merchantId={merchantId} businessName={name}/>
  <div className={s.wrap}>
   <div className={s.ph}><div><div className={s.kick}>Account activity</div><h1>Activity</h1></div><div className={s.kick}>{events.length} events</div></div>
   <div className={s.filterBar}>{['All','Payments','Invoices','Pending','Verified','Failed'].map(x=><button key={x} className={filter===x?s.filterOn:''} onClick={()=>setFilter(x)}>{x}</button>)}</div>
   <div className={s.panel}>
    {loading?<div className={s.payEmpty}>Loading your activity...</div>
    :err?<div className={s.empty}><div className={s.h}>{err}</div><button className={`${s.btn} ${s.btnDark}`} style={{marginTop:14}} onClick={()=>{setErr('');load()}}>Try again</button></div>
    :filtered.length?filtered.map(e=><Link key={e.id} className={s.actRow} href={e.href||'#'}>
      <span className={`${s.actIcon} ${s[e.kind]}`}><EventIcon kind={e.kind}/></span>
      <span className={s.actCopy}><strong>{e.title}</strong><small>{e.subtitle}</small></span>
      <span className={s.actAmount}><strong className={e.kind==='paid'?s.pos:''}>{e.amount||''}</strong><small>{new Date(e.time).toLocaleString()}</small></span>
      <span className={s.actArrow}>›</span>
     </Link>):<div className={s.payEmpty}>No activity matches this filter.</div>}
   </div>
   <div style={{height:40}}/>
  </div>
 </div>;
}
