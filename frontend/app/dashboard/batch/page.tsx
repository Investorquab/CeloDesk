'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {api,Collection,Token} from '../../../lib/api';
import AppHeaderV2 from '../../../components/AppHeaderV2';
import {Plus,Users,Check,ArrowRight} from '../../../components/Icons';
import {userFacingError} from '../../../lib/userFacingError';
import s from '../../../components/AppShell.module.css';

export default function Page({searchParams}:{searchParams:{merchantId?:string}}){
 const merchantId=searchParams.merchantId||'';
 const router=useRouter();
 const [items,setItems]=useState<Collection[]>([]);
 const [name,setName]=useState<string>();
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [creating,setCreating]=useState(false);
 const [tokens,setTokens]=useState<Token[]>([]);
 const [title,setTitle]=useState(''),[desc,setDesc]=useState(''),[allowed,setAllowed]=useState<string[]>([]),[saving,setSaving]=useState(false);

 function load(){api.listCollections().then(setItems).catch(e=>setError(userFacingError(e,'Could not load your batches.')));}
 useEffect(()=>{if(!merchantId)return;load();api.getMerchant(merchantId).then(m=>setName(m?.profile?.businessName)).catch(()=>{});api.getTokens().then(setTokens).catch(()=>{});},[merchantId]);

 function toggleToken(sym:string){setAllowed(a=>a.includes(sym)?a.filter(x=>x!==sym):[...a,sym]);}
 async function create(){if(!title.trim())return;setSaving(true);setError('');try{const c=await api.createCollection({title:title.trim(),description:desc.trim()||undefined,allowedTokens:allowed.length?allowed:undefined});setCreating(false);setTitle('');setDesc('');setAllowed([]);router.push(`/dashboard/batch/${encodeURIComponent(c.id)}?merchantId=${encodeURIComponent(merchantId)}`);}catch(e:any){setError(userFacingError(e,'Could not create the batch.'));}finally{setSaving(false);}}

 return <div className={s.app}>
  <AppHeaderV2 merchantId={merchantId} businessName={name}/>
  <div className={s.wrap}>
   {error&&<div className={s.err} style={{marginTop:18}}>{error}</div>}
   {notice&&<div className={s.toast} style={{marginTop:18}}><Check size={15}/>{notice}</div>}
   <div className={s.ph}>
    <div><div className={s.kick}>Batch Pay</div><h1>Pay many people at once</h1></div>
    <button className={`${s.btn} ${s.btnDark}`} onClick={()=>setCreating(true)}><Plus size={16}/>New batch</button>
   </div>
   {items.length?<div className={s.panel}>
    <div className={s.tableWrap}><table className={s.tbl}>
     <thead><tr><th>Batch</th><th>Submissions</th><th>Accepted</th><th>Status</th><th>Created</th><th/></tr></thead>
     <tbody>{items.map(c=><tr key={c.id} onClick={()=>router.push(`/dashboard/batch/${encodeURIComponent(c.id)}?merchantId=${encodeURIComponent(merchantId)}`)}>
      <td><div className={s.cl}><span className={s.cd}><Users size={15}/></span><span className={s.clName}>{c.title}</span></div></td>
      <td className={s.mono}>{c.counts.total}</td>
      <td className={s.mono}>{c.counts.accepted}</td>
      <td><span className={`${s.tag} ${c.status==='PAID'?s.tagPaid:c.status==='OPEN'?s.tagSent:s.tagPending}`}>{c.status}</span></td>
      <td className={s.via}>{new Date(c.createdAt).toLocaleDateString()}</td>
      <td className={s.rowActions}><ArrowRight size={16}/></td>
     </tr>)}</tbody>
    </table></div>
   </div>:<div className={s.panel}><div className={s.empty}><div className={s.h}>No batches yet</div><p>Create a batch, share one link, and collect payout requests from many people. Approve the real ones, then pay everyone at once.</p><button className={`${s.btn} ${s.btnDark}`} onClick={()=>setCreating(true)}><Plus size={16}/>Create your first batch</button></div></div>}
   <div style={{height:40}}/>
  </div>
  {creating&&<div className={s.modalBackdrop} role="dialog" aria-modal="true" onClick={()=>setCreating(false)}><div className={s.modal} onClick={e=>e.stopPropagation()}>
   <div className={s.modalIcon}><Users size={18}/></div>
   <h2>New batch</h2>
   <p>Name the batch, then share its link so people can submit who to pay.</p>
   <div className={s.form} style={{textAlign:'left',marginTop:6}}>
    <div className={s.f}><label>Batch name</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Hackathon prizes - Nov 2026"/></div>
    <div className={s.f}><label>Description (optional)</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What this batch is for"/></div>
    <div className={s.f}><label>Accepted currencies (optional)</label>
     <div className={s.checks}>{tokens.slice(0,8).map(t=><label key={t.symbol} className={s.check}><input type="checkbox" checked={allowed.includes(t.symbol)} onChange={()=>toggleToken(t.symbol)}/>{t.symbol}</label>)}</div>
     <div className={s.hint}>Leave all unchecked to accept any supported token. Tip: one currency keeps the payout to a single transaction.</div>
    </div>
   </div>
   <div className={s.modalActions}><button className={`${s.btn} ${s.btnSoft}`} onClick={()=>setCreating(false)}>Cancel</button><button className={`${s.btn} ${s.btnDark}`} disabled={saving||!title.trim()} onClick={create}>{saving?'Creating...':'Create batch'}</button></div>
  </div></div>}
 </div>;
}
