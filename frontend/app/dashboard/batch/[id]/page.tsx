'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api,Collection,CollectionItem,money} from '../../../../lib/api';
import AppHeaderV2 from '../../../../components/AppHeaderV2';
import {Users,Check,Copy,ArrowLeft,ArrowRight} from '../../../../components/Icons';
import {userFacingError} from '../../../../lib/userFacingError';
import s from '../../../../components/AppShell.module.css';

function shortAddr(a:string){return a.length>12?`${a.slice(0,6)}...${a.slice(-4)}`:a;}

export default function Page({params,searchParams}:{params:{id:string};searchParams:{merchantId?:string}}){
 const merchantId=searchParams.merchantId||'';
 const id=params.id;
 const [c,setC]=useState<Collection|null>(null);
 const [name,setName]=useState<string>();
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [busy,setBusy]=useState<string|null>(null);
 const [link,setLink]=useState('');

 function load(){api.getCollection(id).then(setC).catch(e=>setError(userFacingError(e,'Could not load this batch.')));}
 useEffect(()=>{if(!merchantId||!id)return;load();api.getMerchant(merchantId).then(m=>setName(m?.profile?.businessName)).catch(()=>{});},[merchantId,id]);
 useEffect(()=>{if(c&&typeof window!=='undefined')setLink(`${window.location.origin}/collect/${c.publicSlug}`);},[c]);

 async function copyLink(){try{await navigator.clipboard?.writeText(link);setNotice('Share link copied');setTimeout(()=>setNotice(''),1800);}catch{setError('Could not copy the link.');}}
 async function decide(item:CollectionItem,decision:'ACCEPTED'|'REJECTED'){setBusy(item.id);setError('');try{await api.setCollectionItemDecision(id,item.id,decision);load();}catch(e:any){setError(userFacingError(e,'Could not update this submission.'));}finally{setBusy(null);}}
 async function toggleOpen(){if(!c)return;setBusy('status');setError('');try{await api.setCollectionStatus(id,c.status==='OPEN'?'CLOSED':'OPEN');load();}catch(e:any){setError(userFacingError(e,'Could not change the status.'));}finally{setBusy(null);}}

 if(!c) return <div className={s.app}><AppHeaderV2 merchantId={merchantId} businessName={name}/><div className={s.wrap}>{error?<div className={s.err} style={{marginTop:18}}>{error}</div>:<div className={s.empty} style={{marginTop:40}}><div className={s.h}>Loading batch...</div></div>}</div></div>;

 const acceptedTotals:Record<string,number>={};
 c.items.filter(i=>i.status==='ACCEPTED').forEach(i=>{acceptedTotals[i.tokenSymbol]=(acceptedTotals[i.tokenSymbol]||0)+Number(i.amount);});

 return <div className={s.app}>
  <AppHeaderV2 merchantId={merchantId} businessName={name}/>
  <div className={s.wrap}>
   {error&&<div className={s.err} style={{marginTop:18}}>{error}</div>}
   {notice&&<div className={s.toast} style={{marginTop:18}}><Check size={15}/>{notice}</div>}
   <Link href={`/dashboard/batch?merchantId=${encodeURIComponent(merchantId)}`} className={s.btnLine} style={{marginTop:18,display:'inline-flex',alignItems:'center',gap:6}}><ArrowLeft size={15}/>All batches</Link>
   <div className={s.ph}>
    <div><div className={s.kick}>Batch Pay{c.description?` · ${c.description}`:''}</div><h1>{c.title}</h1></div>
    <button className={`${s.btn} ${s.btnLine}`} disabled={busy==='status'||c.status==='PAID'} onClick={toggleOpen}>{c.status==='OPEN'?'Close submissions':c.status==='CLOSED'?'Reopen':'Paid'}</button>
   </div>

   <div className={s.panel}>
    <div className={s.tl}>Share this link to collect payout requests</div>
    <div style={{display:'flex',gap:10,alignItems:'center',marginTop:8,flexWrap:'wrap'}}>
     <code className={s.mono} style={{flex:1,minWidth:220,padding:'10px 12px',border:'1px solid var(--line)',borderRadius:10,background:'var(--raised)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{link||'...'}</code>
     <button className={`${s.btn} ${s.btnDark}`} onClick={copyLink}><Copy size={15}/>Copy link</button>
    </div>
    {c.status!=='OPEN'&&<div className={s.hint} style={{marginTop:8}}>Submissions are {c.status==='PAID'?'closed (paid)':'closed'}. {c.status==='CLOSED'?'Reopen to accept more.':''}</div>}
   </div>

   <div className={s.tiles}>
    <div className={s.tile}><div className={s.tl}>Submissions</div><div className={`${s.tv} ${s.num}`}>{c.counts.total}</div></div>
    <div className={s.tile}><div className={s.tl}>Awaiting review</div><div className={`${s.tv} ${s.num}`}>{c.counts.pending}</div></div>
    <div className={s.tile}><div className={s.tl}>Accepted</div><div className={`${s.tv} ${s.num}`}>{c.counts.accepted}</div></div>
    <div className={s.tile}><div className={s.tl}>Paid</div><div className={`${s.tv} ${s.num}`}>{c.counts.paid}</div></div>
   </div>

   <div className={s.panel}>
    <div className={s.ph}><div><div className={s.kick}>Submissions</div><h1 style={{fontSize:20}}>Review and approve</h1></div></div>
    {c.items.length?<div className={s.tableWrap}><table className={s.tbl}>
     <thead><tr><th>Payee</th><th>Wallet</th><th>Amount</th><th>Status</th><th/></tr></thead>
     <tbody>{c.items.map(i=><tr key={i.id}>
      <td><div className={s.cl}><span className={s.cd}>{i.payeeName.slice(0,1).toUpperCase()}</span><span className={s.clName}>{i.payeeName}{i.note?<span className={s.via} style={{display:'block'}}>{i.note}</span>:null}</span></div></td>
      <td className={s.mono}>{shortAddr(i.payeeWallet)}</td>
      <td className={s.mono}>{money(i.amount,i.tokenSymbol)}</td>
      <td><span className={`${s.tag} ${i.status==='PAID'?s.tagPaid:i.status==='ACCEPTED'?s.tagSent:i.status==='REJECTED'?s.tagOverdue:s.tagPending}`}>{i.status}</span></td>
      <td className={s.rowActions}>
       {(i.status==='PENDING'||i.status==='REJECTED')&&<button className={`${s.btn} ${s.btnLine}`} disabled={busy===i.id} onClick={()=>decide(i,'ACCEPTED')}>Accept</button>}
       {(i.status==='PENDING'||i.status==='ACCEPTED')&&<button className={`${s.btn} ${s.btnSoft}`} disabled={busy===i.id} onClick={()=>decide(i,'REJECTED')} style={{marginLeft:8}}>Reject</button>}
      </td>
     </tr>)}</tbody>
    </table></div>:<div className={s.empty}><div className={s.h}>No submissions yet</div><p>Share the link above. Each person opens it and submits their name, wallet, amount and token.</p></div>}
   </div>

   <div className={s.panel}>
    <div className={s.tl}>Payout</div>
    {Object.keys(acceptedTotals).length?<p className={s.hint} style={{marginTop:8}}>Accepted so far: {Object.entries(acceptedTotals).map(([t,v])=>`${v} ${t}`).join('  ·  ')}. Everyone in a currency is paid in a single transaction.</p>:<p className={s.hint} style={{marginTop:8}}>Accept submissions above to include them in the payout.</p>}
    <button className={`${s.btn} ${s.btnDark}`} style={{marginTop:10}} disabled title="Arriving in the next step">Pay accepted (coming next)</button>
   </div>
   <div style={{height:40}}/>
  </div>
 </div>;
}
