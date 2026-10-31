'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {api,Invoice,Merchant,Summary,money} from '../lib/api';
import AppHeaderV2 from './AppHeaderV2';
import AssistantBox from './AssistantBox';
import {invoiceDisplay} from './StatusBadge';
import CashOut from './CashOut';
import {Plus,ArrowRight} from './Icons';
import {userFacingError,ACCOUNT_SESSION_ERROR} from '../lib/userFacingError';
import s from './AppShell.module.css';

const TAG:Record<string,string>={paid:s.tagPaid,pending:s.tagPending,overdue:s.tagOverdue,sent:s.tagSent,draft:s.tagDraft};
function Tag({i}:{i:Invoice}){const d=invoiceDisplay(i);return <span className={`${s.tag} ${TAG[d.cls]||s.tagSent}`}>{d.label}</span>;}
function via(i:Invoice){const p:string[]=[];if(i.deliverEmail)p.push('Email');if(i.deliverTelegram)p.push('Telegram');return p.length?p.join(' · '):'Link';}

export default function DashboardClient({merchantId}:{merchantId:string}){
 const router=useRouter();
 const [m,setM]=useState<Merchant|null>(null),[sum,setSum]=useState<Summary|null>(null),[inv,setInv]=useState<Invoice[]>([]),[err,setErr]=useState(''),[greeting,setGreeting]=useState('');
 useEffect(()=>{const h=new Date().getHours();setGreeting(h<12?'Good morning':h<18?'Good afternoon':'Good evening')},[]);
 const refreshDashboard=useCallback(async()=>{try{const [a,b,c]=await Promise.all([api.getMerchant(merchantId),api.getSummary(merchantId),api.listInvoices(merchantId)]);setM(a);setSum(b);setInv(c.sort((x,y)=>+new Date(y.createdAt)-+new Date(x.createdAt)));setErr('')}catch(e:any){setErr(userFacingError(e,'Could not refresh the account.'))}},[merchantId]);
 useEffect(()=>{void refreshDashboard()},[refreshDashboard]);

 const sessionExpired=err===ACCOUNT_SESSION_ERROR;
 const name=m?.profile?.businessName||'Your business';
 const outstandingByToken=sum?.outstandingByToken||{};
 const usdOutstanding=['USDC','USDm','USDT','USAT'].reduce((t,k)=>t+(outstandingByToken[k]||0),0);
 const paid=(sum?.byStatus?.PAID||0)+(sum?.byStatus?.OVERPAID||0);
 const paidByToken=inv.reduce<Record<string,number>>((acc,i)=>{for(const p of i.payments||[]){if(p.status==='VERIFIED')acc[i.tokenSymbol]=(acc[i.tokenSymbol]||0)+Number(p.amount)}return acc},{});
 const paidKeys=Object.keys(paidByToken);
 const awaiting=inv.filter(i=>i.clientDecision==='PENDING'&&['SENT','VIEWED','PENDING'].includes(i.status)).length;
 const openCount=inv.filter(i=>['SENT','VIEWED','PENDING','OVERDUE','PARTIALLY_PAID'].includes(i.status)).length;

 return <div className={s.app}>
  <AppHeaderV2 merchantId={merchantId} businessName={m?.profile?.businessName}/>
  <div className={s.wrap}>
   {err&&<div className={s.err} role="alert" style={{marginTop:18,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><span>{err}{sessionExpired?' Your session may have expired.':''}</span><span style={{display:'flex',gap:8}}><button className={`${s.btn} ${s.btnDark}`} onClick={()=>void refreshDashboard()}>Try again</button>{sessionExpired&&<button className={`${s.btn} ${s.btnLine}`} onClick={()=>{api.clearStoredSession();window.dispatchEvent(new Event('celodesk-session'));window.location.href='/'}}>Reconnect</button>}</span></div>}

   <div className={s.ph}>
    <div><div className={s.kick}>{greeting||'Welcome'}</div><h1>{name}</h1></div>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
     <CashOut walletAddress={m?.walletAddress}/>
     <Link href={`/dashboard/create?merchantId=${merchantId}`} className={`${s.btn} ${s.btnDark}`}><Plus size={16}/>New invoice</Link>
    </div>
   </div>

   <div className={s.tiles}>
    <div className={`${s.tile} ${s.lead}`}>
     <div className={s.tl}>Total earnings</div>
     <div className={`${s.tv} ${s.num}`}>{paidKeys.length===1?money(paidByToken[paidKeys[0]],paidKeys[0]):paidKeys.length?paidKeys.map(k=><span key={k} style={{display:'block'}}>{money(paidByToken[k],k)}</span>):'0'}</div>
     <div className={s.sub}>Across {paid} paid invoice{paid===1?'':'s'}</div>
    </div>
    <div className={s.tile}>
     <div className={s.tl}>Outstanding</div>
     <div className={`${s.tv} ${s.num}`}>{usdOutstanding>0?`≈ $ ${usdOutstanding.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:Object.keys(outstandingByToken).length?money(Object.values(outstandingByToken)[0],Object.keys(outstandingByToken)[0]):'0'}</div>
     <div className={s.sub}>{openCount} open invoice{openCount===1?'':'s'}</div>
    </div>
    <div className={s.tile}>
     <div className={s.tl}>Awaiting client accept</div>
     <div className={`${s.tv} ${s.num}`}>{awaiting}</div>
     <div className={s.sub}>Sent, not yet accepted</div>
    </div>
   </div>

   <AssistantBox merchantId={merchantId} onInvoiceCreated={refreshDashboard}/>

   <div className={s.panel}>
    <div className={s.phd}><h3>Recent invoices</h3><Link href={`/dashboard/invoices?merchantId=${merchantId}`} className={s.flt} style={{display:'inline-flex',alignItems:'center',gap:5}}>View all <ArrowRight size={13}/></Link></div>
    {inv.length?<div className={s.tableWrap}><table className={s.tbl}>
     <thead><tr><th>Client</th><th>Amount</th><th>Sent via</th><th>Status</th><th>Updated</th></tr></thead>
     <tbody>{inv.slice(0,8).map(i=><tr key={i.id} onClick={()=>router.push(`/dashboard/invoices/${encodeURIComponent(i.id)}?merchantId=${encodeURIComponent(merchantId)}`)}>
      <td><div className={s.cl}><span className={s.cd}>{i.clientName?.slice(0,1).toUpperCase()}</span><span className={s.clName}>{i.clientName}</span></div></td>
      <td className={s.mono}>{money(i.amount,i.tokenSymbol)}</td>
      <td><span className={s.via}>{via(i)}</span></td>
      <td><Tag i={i}/></td>
      <td className={s.via}>{new Date(i.updatedAt||i.createdAt).toLocaleDateString()}</td>
     </tr>)}</tbody>
    </table></div>:<div className={s.empty}><div className={s.h}>No invoices yet</div><p>Create your first payment request and send it anywhere.</p><Link href={`/dashboard/create?merchantId=${merchantId}`} className={`${s.btn} ${s.btnDark}`}><Plus size={16}/>Create invoice</Link></div>}
   </div>
   <div style={{height:40}}/>
  </div>
 </div>;
}
