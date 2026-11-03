'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api,Collection,CollectionItem,money} from '../../../../lib/api';
import AppHeaderV2 from '../../../../components/AppHeaderV2';
import {Users,Check,Copy,ArrowLeft,ArrowRight,Clock} from '../../../../components/Icons';
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
 const [rejectId,setRejectId]=useState<string|null>(null),[reason,setReason]=useState('');
 const [paying,setPaying]=useState<string|null>(null),[payNotice,setPayNotice]=useState('');
 const [link,setLink]=useState('');

 function load(){api.getCollection(id).then(setC).catch(e=>setError(userFacingError(e,'Could not load this batch.')));}
 useEffect(()=>{if(!merchantId||!id)return;load();api.getMerchant(merchantId).then(m=>setName(m?.profile?.businessName)).catch(()=>{});},[merchantId,id]);
 useEffect(()=>{if(c&&typeof window!=='undefined')setLink(`${window.location.origin}/collect/${c.publicSlug}`);},[c]);

 async function copyLink(){try{await navigator.clipboard?.writeText(link);setNotice('Share link copied');setTimeout(()=>setNotice(''),1800);}catch{setError('Could not copy the link.');}}
 async function decide(item:CollectionItem,decision:'ACCEPTED'|'REJECTED',note?:string){setBusy(item.id);setError('');try{const r=await api.setCollectionItemDecision(id,item.id,decision,note);setRejectId(null);setReason('');if(decision==='REJECTED'&&note&&item.hasEmail){setNotice(r.emailedPayee?`Rejected and emailed ${item.payeeName}.`:`Rejected. The email to ${item.payeeName} could not be sent.`);setTimeout(()=>setNotice(''),4000);}load();}catch(e:any){setError(userFacingError(e,'Could not update this submission.'));}finally{setBusy(null);}}
 async function toggleOpen(){if(!c)return;setBusy('status');setError('');try{await api.setCollectionStatus(id,c.status==='OPEN'?'CLOSED':'OPEN');load();}catch(e:any){setError(userFacingError(e,'Could not change the status.'));}finally{setBusy(null);}}

 async function waitReceipt(eth:any,hash:string){for(let i=0;i<80;i++){const r=await eth.request({method:'eth_getTransactionReceipt',params:[hash]});if(r){if(r.status!==undefined&&r.status!==null&&Number(r.status)===0)throw new Error('The transaction failed on-chain.');return r;}await new Promise(res=>setTimeout(res,3000));}throw new Error('Timed out waiting for confirmation. Check your wallet, then reload.');}
 async function payToken(token:string){setError('');setPaying(token);try{
  const eth=(window as any).ethereum;
  if(!eth)throw new Error('No wallet detected. Open CeloDesk in a Celo wallet (e.g. MiniPay or MetaMask).');
  const accts=await eth.request({method:'eth_requestAccounts'});const from=accts?.[0];if(!from)throw new Error('No wallet account selected.');
  const target='0xa4ec';const cur=await eth.request({method:'eth_chainId'});
  if(String(cur).toLowerCase()!==target){try{await eth.request({method:'wallet_switchEthereumChain',params:[{chainId:target}]});}catch(se:any){if(se?.code===4902){await eth.request({method:'wallet_addEthereumChain',params:[{chainId:target,chainName:'Celo Mainnet',nativeCurrency:{name:'Celo',symbol:'CELO',decimals:18},rpcUrls:['https://forno.celo.org'],blockExplorerUrls:['https://celoscan.io']}]});}else throw se;}}
  const intent=await api.collectionPayIntent(id,token,from);
  setPayNotice(`Approve ${token} spending in your wallet...`);
  const ah=await eth.request({method:'eth_sendTransaction',params:[{from,to:intent.approve.to,data:intent.approve.data,value:intent.approve.value}]});
  setPayNotice('Waiting for the approval to confirm...');await waitReceipt(eth,ah);
  setPayNotice('Confirm the batch payment in your wallet...');
  const dh=await eth.request({method:'eth_sendTransaction',params:[{from,to:intent.disperse.to,data:intent.disperse.data,value:intent.disperse.value}]});
  setPayNotice('Paying everyone, waiting for Celo confirmation...');await waitReceipt(eth,dh);
  await api.collectionPayConfirm(id,token,dh);
  setPayNotice('');setNotice(`Paid ${token} to everyone. Tx ${dh.slice(0,10)}...`);setTimeout(()=>setNotice(''),5000);load();
 }catch(e:any){setPayNotice('');setError(userFacingError(e,'The payout could not be completed.'));}finally{setPaying(null);}}

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
    <div style={{padding:'16px 22px',borderBottom:'1px solid var(--line)'}}>
     <div style={{fontSize:13,color:'var(--text-2)',fontFamily:'var(--mono, monospace)'}}>Submissions</div>
     <h2 style={{fontSize:18,marginTop:4}}>Review and approve</h2>
    </div>
    {c.items.length?<div className={s.tableWrap}><table className={s.tbl}>
     <thead><tr><th>Payee</th><th>Wallet</th><th>Amount</th><th>Status</th><th/></tr></thead>
     <tbody>{c.items.map(i=><tr key={i.id}>
      <td><div className={s.cl}><span className={s.cd}>{i.payeeName.slice(0,1).toUpperCase()}</span><span className={s.clName}>{i.payeeName}{i.note?<span className={s.via} style={{display:'block'}}>{i.note}</span>:null}{i.status==='REJECTED'&&i.rejectionNote?<span className={s.via} style={{display:'block',color:'var(--neg,#c0392b)'}}>Rejected: {i.rejectionNote}{i.hasEmail?' · payee emailed':''}</span>:null}</span></div></td>
      <td className={s.mono}>{shortAddr(i.payeeWallet)}</td>
      <td className={s.mono}>{money(i.amount,i.tokenSymbol)}</td>
      <td><span className={`${s.tag} ${i.status==='PAID'?s.tagPaid:i.status==='ACCEPTED'?s.tagSent:i.status==='REJECTED'?s.tagOverdue:s.tagPending}`}>{i.status}</span></td>
      <td className={s.rowActions}>
       {rejectId===i.id?<div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
        <input autoFocus value={reason} onChange={e=>setReason(e.target.value)} placeholder={i.hasEmail?'Reason (emailed to payee)':'Reason (optional)'} maxLength={500} style={{padding:'6px 9px',border:'1px solid var(--line)',borderRadius:8,background:'var(--raised)',color:'var(--text)',fontSize:13,minWidth:170}}/>
        <button className={`${s.btn} ${s.btnSoft}`} disabled={busy===i.id} onClick={()=>decide(i,'REJECTED',reason.trim()||undefined)}>{busy===i.id?'...':'Confirm reject'}</button>
        <button className={`${s.btn} ${s.btnLine}`} disabled={busy===i.id} onClick={()=>{setRejectId(null);setReason('');}}>Cancel</button>
       </div>:<>
        {(i.status==='PENDING'||i.status==='REJECTED')&&<button className={`${s.btn} ${s.btnLine}`} disabled={busy===i.id} onClick={()=>decide(i,'ACCEPTED')}>Accept</button>}
        {(i.status==='PENDING'||i.status==='ACCEPTED')&&<button className={`${s.btn} ${s.btnSoft}`} disabled={busy===i.id} onClick={()=>{setRejectId(i.id);setReason('');setError('');}} style={{marginLeft:8}}>Reject</button>}
       </>}
      </td>
     </tr>)}</tbody>
    </table></div>:<div className={s.empty}><div className={s.h}>No submissions yet</div><p>Share the link above. Each person opens it and submits their name, wallet, amount and token.</p></div>}
   </div>

   <div className={s.panel}>
    <div style={{padding:'16px 22px',borderBottom:'1px solid var(--line)'}}>
     <div style={{fontSize:13,color:'var(--text-2)',fontFamily:'var(--mono, monospace)'}}>Payout</div>
     <h2 style={{fontSize:18,marginTop:4}}>Pay accepted</h2>
    </div>
    <div style={{padding:'16px 22px'}}>
     {payNotice&&<div className={s.toast} style={{marginBottom:12}}><Clock size={15}/>{payNotice}</div>}
     {Object.keys(acceptedTotals).length?<>
      <p className={s.hint} style={{marginTop:0,marginBottom:4}}>Each currency is paid to everyone at once in a single transaction. Pay from the wallet you want the funds to come from.</p>
      {Object.keys(acceptedTotals).map(t=>{const n=c.items.filter(i=>i.status==='ACCEPTED'&&i.tokenSymbol===t).length;return(
       <div key={t} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'14px 0 2px',borderTop:'1px solid var(--line)',marginTop:12}}>
        <div><div className={s.mono} style={{fontSize:16}}>{money(String(acceptedTotals[t]),t)}</div><div className={s.via}>to {n} payee{n===1?'':'s'} in {t}</div></div>
        <button className={`${s.btn} ${s.btnDark}`} disabled={!!paying} onClick={()=>payToken(t)}>{paying===t?'Paying...':`Pay ${t}`}</button>
       </div>);})}
     </>:<p className={s.hint} style={{margin:0}}>Accept submissions above to include them in the payout.</p>}
    </div>
   </div>
   <div style={{height:40}}/>
  </div>
 </div>;
}
