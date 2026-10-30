'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api,Invoice,money,shortAddress} from '../../../../lib/api';
import AppHeaderV2 from '../../../../components/AppHeaderV2';
import {invoiceDisplay} from '../../../../components/StatusBadge';
import {Copy,Receipt,Check} from '../../../../components/Icons';
import {userFacingError} from '../../../../lib/userFacingError';
import s from '../../../../components/AppShell.module.css';

const TAG:Record<string,string>={paid:s.tagPaid,pending:s.tagPending,overdue:s.tagOverdue,sent:s.tagSent,draft:s.tagDraft};

export default function Page({params,searchParams}:{params:{id:string};searchParams:{merchantId?:string}}){
 const merchantId=searchParams.merchantId||'';
 const [invoice,setInvoice]=useState<Invoice|null>(null);
 const [name,setName]=useState<string>();
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 useEffect(()=>{api.getInvoice(params.id).then(setInvoice).catch(e=>setError(userFacingError(e,'Could not load this invoice.')));if(merchantId)api.getMerchant(merchantId).then(m=>setName(m?.profile?.businessName)).catch(()=>{})},[params.id,merchantId]);
 async function copyLink(){if(!invoice)return;const url=`${window.location.origin}/invoice/${invoice.publicSlug}`;try{await navigator.clipboard?.writeText(url);setNotice('Payment link copied');setTimeout(()=>setNotice(''),1800)}catch{setError('Could not copy the payment link.')}}
 const d=invoice?invoiceDisplay(invoice):null;

 return <div className={s.app}>
  <AppHeaderV2 merchantId={merchantId} businessName={name}/>
  <div className={s.wrap}>
   {notice&&<div className={s.toast} style={{marginTop:18}}><Check size={15}/>{notice}</div>}
   {error&&<div className={s.err} style={{marginTop:18}}>{error}</div>}
   <div className={s.ph}>
    <div><div className={s.kick}>Invoice details</div><h1>{invoice?.clientName||'Invoice'}</h1></div>
    <div style={{display:'flex',gap:10}}>
     <Link href={`/dashboard/invoices?merchantId=${merchantId}`} className={`${s.btn} ${s.btnLine}`}>Back to invoices</Link>
     {invoice&&<button className={`${s.btn} ${s.btnDark}`} onClick={copyLink}><Copy size={15}/>Copy link</button>}
    </div>
   </div>

   {invoice?<div className={s.panel}>
    <div className={s.detailHead}>
     <div><div className={s.metaLabel}>Amount due</div><div className={`${s.detailAmt} ${s.num}`}>{money(invoice.amount,invoice.tokenSymbol)}</div></div>
     {d&&<span className={`${s.tag} ${TAG[d.cls]||s.tagSent}`}>{d.label}</span>}
    </div>
    <div className={s.metaGrid}>
     <div className={s.metaItem}><span className={s.metaLabel}>Client</span><strong>{invoice.clientName}</strong></div>
     <div className={s.metaItem}><span className={s.metaLabel}>Created</span><strong>{new Date(invoice.createdAt).toLocaleString()}</strong></div>
     <div className={s.metaItem}><span className={s.metaLabel}>Due date</span><strong>{invoice.dueDate?new Date(invoice.dueDate).toLocaleDateString():'No due date'}</strong></div>
     <div className={s.metaItem}><span className={s.metaLabel}>Receiving wallet</span><strong className={s.mono}>{shortAddress(invoice.receivingWallet)}</strong></div>
     <div className={s.metaItem}><span className={s.metaLabel}>Network</span><strong>Celo Mainnet</strong></div>
     <div className={s.metaItem}><span className={s.metaLabel}>Payment token</span><strong>{invoice.tokenSymbol}</strong></div>
     {invoice.clientDecision&&invoice.clientDecision!=='PENDING'&&<div className={s.metaItem}><span className={s.metaLabel}>Client decision</span><strong>{invoice.clientDecision==='ACCEPTED'?'Accepted':'Declined'}{invoice.clientDecisionAt?` · ${new Date(invoice.clientDecisionAt).toLocaleDateString()}`:''}</strong></div>}
     {invoice.recurrence&&invoice.recurrence!=='NONE'&&<div className={s.metaItem}><span className={s.metaLabel}>Repeats</span><strong>{invoice.recurrence.charAt(0)+invoice.recurrence.slice(1).toLowerCase()}{invoice.recurrenceEndsAt?` until ${new Date(invoice.recurrenceEndsAt).toLocaleDateString()}`:''}</strong></div>}
     {(invoice.clientEmail||invoice.clientTelegram)&&<div className={s.metaItem}><span className={s.metaLabel}>Sent to</span><strong>{[invoice.deliverEmail&&invoice.clientEmail,invoice.deliverTelegram&&invoice.clientTelegram].filter(Boolean).join(' · ')||invoice.clientEmail||invoice.clientTelegram}</strong></div>}
    </div>
    <div className={s.descBox}><span className={s.metaLabel}>Description</span><p>{invoice.description||'Payment request'}</p></div>
    <div className={s.payHd}><h3>Payment history</h3><span className={s.metaLabel}>{invoice.payments?.length||0} recorded payment{invoice.payments?.length===1?'':'s'}</span></div>
    {invoice.payments?.length?invoice.payments.map(p=><div key={p.id} className={s.payItem}>
     <span className={s.payIcon}><Receipt size={15}/></span>
     <div className={s.payMain}><strong>{money(p.amount,p.tokenSymbol||invoice.tokenSymbol)}</strong><small>{shortAddress(p.txHash)}</small></div>
     <span className={s.payStatus}>{p.status}</span>
    </div>):<div className={s.payEmpty}><Receipt size={16}/>No payments recorded yet.</div>}
   </div>:!error&&<div className={s.panel}><div className={s.payEmpty}>Loading invoice...</div></div>}
   <div style={{height:40}}/>
  </div>
 </div>;
}
