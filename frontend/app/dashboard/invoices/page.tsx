'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {api,Invoice,money} from '../../../lib/api';
import AppHeaderV2 from '../../../components/AppHeaderV2';
import {invoiceDisplay} from '../../../components/StatusBadge';
import {Plus,Search,Trash,Check,MoreVertical,Share} from '../../../components/Icons';
import {userFacingError} from '../../../lib/userFacingError';
import s from '../../../components/AppShell.module.css';

const TAG:Record<string,string>={paid:s.tagPaid,pending:s.tagPending,overdue:s.tagOverdue,sent:s.tagSent,draft:s.tagDraft};
function Tag({i}:{i:Invoice}){const d=invoiceDisplay(i);return <span className={`${s.tag} ${TAG[d.cls]||s.tagSent}`}>{d.label}</span>;}
function via(i:Invoice){const p:string[]=[];if(i.deliverEmail)p.push('Email');if(i.deliverTelegram)p.push('Telegram');return p.length?p.join(' · '):'Link';}
const STATUSES=['DRAFT','SENT','VIEWED','PENDING','PARTIALLY_PAID','PAID','OVERPAID','OVERDUE','FAILED','CANCELLED','EXPIRED'];

export default function Page({searchParams}:{searchParams:{merchantId?:string}}){
 const merchantId=searchParams.merchantId||'';
 const router=useRouter();
 const [items,setItems]=useState<Invoice[]>([]),[q,setQ]=useState(''),[status,setStatus]=useState('All');
 const [name,setName]=useState<string>();
 const [deleting,setDeleting]=useState<string|null>(null),[confirming,setConfirming]=useState<Invoice|null>(null),[menuOpen,setMenuOpen]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{if(!merchantId)return;api.listInvoices(merchantId).then(x=>setItems(x.sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt)))).catch(e=>setError(userFacingError(e,'Could not load invoices.')));api.getMerchant(merchantId).then(m=>setName(m?.profile?.businessName)).catch(()=>{})},[merchantId]);
 const matchStatus=(i:Invoice)=>status==='All'?true:status==='ACCEPTED'?i.clientDecision==='ACCEPTED':status==='DECLINED'?i.clientDecision==='DECLINED':status==='AWAITING'?i.clientDecision==='PENDING'&&['SENT','VIEWED','PENDING'].includes(i.status):i.status===status;
 const filtered=useMemo(()=>items.filter(i=>matchStatus(i)&&(!q||`${i.clientName} ${i.description||''} ${i.tokenSymbol}`.toLowerCase().includes(q.toLowerCase()))),[items,q,status]);
 async function shareInvoice(i:Invoice){const url=typeof window!=='undefined'?`${window.location.origin}/invoice/${i.publicSlug}`:'';try{await navigator.clipboard?.writeText(url);setNotice('Invoice link copied');setTimeout(()=>setNotice(''),1800)}catch{setError('Could not copy the invoice link.')}setMenuOpen(null)}
 async function removeInvoice(i:Invoice){setDeleting(i.id);setError('');try{await api.deleteInvoice(i.id);setItems(prev=>prev.filter(x=>x.id!==i.id));setConfirming(null);setNotice('Invoice deleted');setTimeout(()=>setNotice(''),2000)}catch(e:any){setError(userFacingError(e,'Could not delete this invoice.'));setConfirming(null)}finally{setDeleting(null)}}

 return <div className={s.app}>
  <AppHeaderV2 merchantId={merchantId} businessName={name}/>
  <div className={s.wrap}>
   {error&&<div className={s.err} style={{marginTop:18}}>{error}</div>}
   {notice&&<div className={s.toast} style={{marginTop:18}}><Check size={15}/>{notice}</div>}
   <div className={s.ph}>
    <div><div className={s.kick}>Payment requests</div><h1>Invoices</h1></div>
    <Link href={`/dashboard/create?merchantId=${merchantId}`} className={`${s.btn} ${s.btnDark}`}><Plus size={16}/>New invoice</Link>
   </div>
   <div className={s.panel}>
    <div className={s.toolbar}>
     <label className={s.search}><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search clients or invoices..."/></label>
     <select className={s.selectLine} value={status} onChange={e=>setStatus(e.target.value)}>
      <option value="All">All statuses</option>
      <option value="AWAITING">Awaiting accept</option>
      <option value="ACCEPTED">Accepted</option>
      <option value="DECLINED">Declined</option>
      {STATUSES.map(x=><option key={x} value={x}>{x}</option>)}
     </select>
    </div>
    {filtered.length?<div className={s.tableWrap}><table className={s.tbl}>
     <thead><tr><th>Client</th><th>Amount</th><th>Sent via</th><th>Status</th><th>Updated</th><th/></tr></thead>
     <tbody>{filtered.map(i=><tr key={i.id} onClick={()=>router.push(`/dashboard/invoices/${encodeURIComponent(i.id)}?merchantId=${encodeURIComponent(merchantId)}`)}>
      <td><div className={s.cl}><span className={s.cd}>{i.clientName?.slice(0,1).toUpperCase()}</span><span className={s.clName}>{i.clientName}</span></div></td>
      <td className={s.mono}>{money(i.amount,i.tokenSymbol)}</td>
      <td><span className={s.via}>{via(i)}</span></td>
      <td><Tag i={i}/></td>
      <td className={s.via}>{new Date(i.updatedAt||i.createdAt).toLocaleDateString()}</td>
      <td className={s.rowActions} onClick={e=>e.stopPropagation()}>
       <button className={s.kebab} aria-label={`Actions for ${i.clientName}`} onClick={()=>setMenuOpen(menuOpen===i.id?null:i.id)}><MoreVertical size={16}/></button>
       {menuOpen===i.id&&<div className={s.menu} role="menu">
        <Link href={`/dashboard/invoices/${encodeURIComponent(i.id)}?merchantId=${encodeURIComponent(merchantId)}`} className={s.menuItem} onClick={()=>setMenuOpen(null)}>View details</Link>
        <button className={s.menuItem} onClick={()=>shareInvoice(i)}><Share size={14}/>Copy payment link</button>
        <button className={`${s.menuItem} ${s.danger}`} disabled={i.status==='PAID'} title={i.status==='PAID'?'Paid invoices are kept for history.':'Delete invoice'} onClick={()=>{setMenuOpen(null);setConfirming(i)}}><Trash size={14}/>{i.status==='PAID'?'Paid - kept':'Delete invoice'}</button>
       </div>}
      </td>
     </tr>)}</tbody>
    </table></div>:<div className={s.empty}><div className={s.h}>No invoices found</div><p>Try another search or create a new invoice.</p><Link href={`/dashboard/create?merchantId=${merchantId}`} className={`${s.btn} ${s.btnDark}`}><Plus size={16}/>Create invoice</Link></div>}
   </div>
   <div style={{height:40}}/>
  </div>
  {confirming&&<div className={s.modalBackdrop} role="dialog" aria-modal="true" onClick={()=>setConfirming(null)}><div className={s.modal} onClick={e=>e.stopPropagation()}><div className={s.modalIcon}><Trash size={18}/></div><h2>Delete this invoice?</h2><p>This permanently removes the invoice from your account if the backend allows it. This cannot be undone.</p><div className={s.modalActions}><button className={`${s.btn} ${s.btnSoft}`} onClick={()=>setConfirming(null)}>Keep invoice</button><button className={`${s.btn} ${s.btnDanger}`} disabled={!!deleting} onClick={()=>removeInvoice(confirming)}>{deleting?'Deleting...':'Delete invoice'}</button></div></div></div>}
 </div>;
}
