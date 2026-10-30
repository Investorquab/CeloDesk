'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api,Token,money} from '../lib/api';
import {QRCodeSVG} from 'qrcode.react';
import {downloadInvoiceCard,shareInvoiceFile} from '../lib/invoiceCard';
import AppHeaderV2 from './AppHeaderV2';
import {Plus,Download,Share,Check,Copy,Telegram} from './Icons';
import {TELEGRAM_BOT_URL} from '../lib/telegram';
import {userFacingError} from '../lib/userFacingError';
import s from './AppShell.module.css';

function extractSlug(publicUrl?:string){
 if(!publicUrl)return '';
 try{const u=new URL(publicUrl,typeof window!=='undefined'?window.location.origin:'http://localhost');return u.searchParams.get('slug')||''}catch{return publicUrl.match(/[?&]slug=([^&]+)/)?.[1]||''}
}
function buildInvoiceUrl(publicUrl:string,id:string){const slug=extractSlug(publicUrl);return `${window.location.origin}/invoice/${encodeURIComponent(slug||id)}`}
const RECUR_LABEL:Record<string,string>={WEEKLY:'Weekly',BIWEEKLY:'Every 2 weeks',MONTHLY:'Monthly'};

export default function CreateInvoiceClient({merchantId}:{merchantId:string}){
 const [tokens,setTokens]=useState<Token[]>([]),[tokenLoadErr,setTokenLoadErr]=useState(''),[merchant,setMerchant]=useState<any>(null);
 const [client,setClient]=useState(''),[amount,setAmount]=useState(''),[token,setToken]=useState(''),[desc,setDesc]=useState(''),[due,setDue]=useState('');
 const [clientEmail,setClientEmail]=useState(''),[clientTelegram,setClientTelegram]=useState(''),[deliverEmail,setDeliverEmail]=useState(true),[deliverTelegram,setDeliverTelegram]=useState(false),[recurrence,setRecurrence]=useState('NONE'),[recurEnds,setRecurEnds]=useState('');
 const [busy,setBusy]=useState(false),[err,setErr]=useState(''),[created,setCreated]=useState<any>(null),[copied,setCopied]=useState(false),[tgCopied,setTgCopied]=useState(false);
 useEffect(()=>{let live=true;Promise.all([api.getTokens(),api.getMerchant(merchantId)]).then(([t,m])=>{if(!live)return;setTokens(t);setMerchant(m);if(t[0]&&!token)setToken(t[0].symbol)}).catch(e=>{if(!live)return;setTokenLoadErr(userFacingError(e,'Could not load the invoice setup.'))});return()=>{live=false}},[merchantId]);
 const profile=merchant?.profile; const businessName=profile?.businessName||'CeloDesk';

 async function create(){
  if(!client.trim()||!amount||!token){setErr('Client, amount and token are required.');return}
  setBusy(true);setErr('');
  try{
   const emailOn=deliverEmail&&!!clientEmail.trim();const tgOn=deliverTelegram&&!!clientTelegram.trim();
   const r=await api.createInvoice({merchantId,clientName:client.trim(),amount,tokenSymbol:token,description:desc.trim()||undefined,dueDate:due?new Date(`${due}T00:00:00`).toISOString():undefined,clientEmail:clientEmail.trim()||undefined,clientTelegram:clientTelegram.trim()||undefined,deliverEmail:emailOn,deliverTelegram:tgOn,recurrence:recurrence!=='NONE'?recurrence:undefined,recurrenceEndsAt:recurrence!=='NONE'&&recurEnds?new Date(`${recurEnds}T00:00:00`).toISOString():undefined});
   setCreated(r);
  }catch(e:any){setErr(userFacingError(e,'Invoice creation failed. Please try again.'))}finally{setBusy(false)}
 }

 if(created){
  const invoiceUrl=typeof window!=='undefined'?buildInvoiceUrl(created.publicUrl,created.id):'';
  const shareText=`Invoice from ${businessName}: ${money(amount,token)}${desc?` - ${desc}`:''}`;
  const emailResult=created.delivery?.email;
  const tgOn=deliverTelegram&&!!clientTelegram.trim();
  const tgLink=`${TELEGRAM_BOT_URL}?start=inv_${extractSlug(created.publicUrl)||created.id}`;
  return <div className={s.app}><AppHeaderV2 merchantId={merchantId} businessName={profile?.businessName}/>
   <div className={s.wrap}>
    <div className={s.ph}><div><div className={s.kick}>Invoice generated</div><h1>Your invoice is ready</h1></div><Link href={`/dashboard?merchantId=${merchantId}`} className={`${s.btn} ${s.btnLine}`}>Back to dashboard</Link></div>
    <div style={{maxWidth:560}}>
     {emailResult?.attempted&&<div className={emailResult.ok?s.toast:s.err} style={{marginBottom:14}}>{emailResult.ok?<><Check size={15}/>Emailed to {clientEmail}</>:`Could not email the client${emailResult.error?`: ${emailResult.error}`:''}. Share the link below instead.`}</div>}
     <div className={s.inv}>
      <div className={s.invTop}><div className={s.invM}><span className={s.invLogo}>{businessName.slice(0,1).toUpperCase()}</span><div><b>{businessName}</b><small>Invoice to {client}</small></div></div><span className={`${s.tag} ${s.tagSent}`}>READY</span></div>
      <div className={`${s.invAmt} ${s.num}`}>{money(amount,token)}</div>
      <div className={s.invDesc}>{desc||'Payment request'}</div>
      <div className={s.invRow}><span>To</span><b>{client}</b></div>
      <div className={s.invRow}><span>Due</span><b>{due||'On receipt'}</b></div>
      {recurrence!=='NONE'&&<div className={s.invRow}><span>Repeats</span><b>{RECUR_LABEL[recurrence]}{recurEnds?` until ${recurEnds}`:''}</b></div>}
     </div>
     <div id="invoice-download-qr" style={{position:'absolute',left:-9999,top:-9999}}><QRCodeSVG value={invoiceUrl} size={220} includeMargin/></div>
     <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:16}}>
      <Link href={`/invoice/${extractSlug(created.publicUrl)||created.id}?returnTo=${encodeURIComponent(`/dashboard/create?merchantId=${merchantId}`)}`} className={`${s.btn} ${s.btnDark}`}>View invoice</Link>
      <button className={`${s.btn} ${s.btnLine}`} onClick={async()=>{await navigator.clipboard?.writeText(invoiceUrl);setCopied(true);setTimeout(()=>setCopied(false),1800)}}><Copy size={15}/>{copied?'Copied':'Copy link'}</button>
      <button className={`${s.btn} ${s.btnLine}`} onClick={async()=>{try{await shareInvoiceFile({businessName,amount,token,description:desc,client,due,url:invoiceUrl},`${shareText}\n${invoiceUrl}`)}catch(e:any){setErr(userFacingError(e,'Could not share invoice.'))}}}><Share size={15}/>Share</button>
      <button className={`${s.btn} ${s.btnLine}`} onClick={async()=>{try{await downloadInvoiceCard({businessName,amount,token,description:desc,client,due,url:invoiceUrl,qrValue:invoiceUrl})}catch(e:any){setErr(userFacingError(e,'Could not download invoice card.'))}}}><Download size={15}/>Download</button>
     </div>
     {tgOn&&<div style={{marginTop:14}}>
      <div className={s.hint} style={{marginBottom:8}}>Telegram: send {clientTelegram.trim()} this link. When they tap it, the bot opens the invoice with Accept and Pay.</div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
       <button className={`${s.btn} ${s.btnLine}`} onClick={async()=>{await navigator.clipboard?.writeText(tgLink);setTgCopied(true);setTimeout(()=>setTgCopied(false),1800)}}><Telegram size={15}/>{tgCopied?'Copied':'Copy Telegram link'}</button>
       <a className={`${s.btn} ${s.btnLine}`} href={tgLink} target="_blank" rel="noreferrer"><Telegram size={15}/>Open in Telegram</a>
      </div>
     </div>}
     <div style={{display:'flex',gap:10,marginTop:14}}><button className={`${s.btn} ${s.btnSoft}`} onClick={()=>{setCreated(null);setClient('');setAmount('');setDesc('');setDue('');setClientEmail('');setClientTelegram('');setRecurrence('NONE');setRecurEnds('')}}><Plus size={15}/>Create another</button></div>
     {err&&<div className={s.err} style={{marginTop:14}}>{err}</div>}
    </div>
    <div style={{height:40}}/>
   </div>
  </div>;
 }

 return <div className={s.app}><AppHeaderV2 merchantId={merchantId} businessName={profile?.businessName}/>
  <div className={s.wrap}>
   <div className={s.ph}><div><div className={s.kick}>Payment request</div><h1>New invoice</h1></div></div>
   <div className={s.cg}>
    <div className={s.panel} style={{padding:24}}>
     <div className={s.form}>
      <div className={s.f}><label>Client name</label><input value={client} onChange={e=>setClient(e.target.value)} placeholder="David Johnson"/></div>
      <div className={s.two}>
       <div className={s.f}><label>Client email</label><input type="email" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} placeholder="client@email.com"/><div className={s.hint}>We email a secure pay link.</div></div>
       <div className={s.f}><label>Client Telegram</label><input value={clientTelegram} onChange={e=>setClientTelegram(e.target.value)} placeholder="@username"/><div className={s.hint}>One tap opens it in the bot.</div></div>
      </div>
      <div className={s.two}>
       <div className={s.f}><label>Amount</label><input className={s.num} inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0.00"/></div>
       <div className={s.f}><label>Currency</label><select value={token} onChange={e=>setToken(e.target.value)}>{tokens.length?tokens.map(t=><option key={t.symbol} value={t.symbol}>{t.symbol}{t.name?` - ${t.name}`:''}</option>):<option value="">{tokenLoadErr?'Could not load tokens':'Loading...'}</option>}</select>{tokenLoadErr&&<div className={s.hint}>{tokenLoadErr}</div>}</div>
      </div>
      <div className={s.f}><label>Description</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Website design & development"/></div>
      <div className={s.f}><label>Due date</label><input type="date" value={due} onChange={e=>setDue(e.target.value)}/></div>
      <div className={s.f}><label>Send this invoice by</label>
       <div className={s.checks}>
        <label className={s.check}><input type="checkbox" checked={deliverEmail} onChange={e=>setDeliverEmail(e.target.checked)}/>Email the client</label>
        <label className={s.check}><input type="checkbox" checked={deliverTelegram} onChange={e=>setDeliverTelegram(e.target.checked)}/>Send via Telegram</label>
       </div>
       <div className={s.hint}>Email sends only when a valid client email is set. Telegram gives the client a one tap link.</div>
      </div>
      <div className={s.f}>
       <div className={s.recur}>
        <div className={s.two} style={{marginTop:0}}>
         <div className={s.f} style={{margin:0}}><label>Repeat</label><select value={recurrence} onChange={e=>setRecurrence(e.target.value)}><option value="NONE">One time</option><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every 2 weeks</option><option value="MONTHLY">Monthly</option></select></div>
         {recurrence!=='NONE'&&<div className={s.f} style={{margin:0}}><label>Until (optional)</label><input type="date" value={recurEnds} onChange={e=>setRecurEnds(e.target.value)}/></div>}
        </div>
        {recurrence!=='NONE'&&<div className={s.hint}>The client accepts once. Each cycle we send a fresh invoice to pay. Nothing is auto charged.</div>}
       </div>
      </div>
      {err&&<div className={s.err}>{err}</div>}
      <button className={`${s.btn} ${s.btnDark} ${s.btnBlock}`} onClick={create} disabled={busy||!client||!amount||!token}>{busy?'Creating invoice...':<><Plus size={16}/>Create and send</>}</button>
     </div>
    </div>
    <div>
     <div className={s.previewLabel}>Client preview</div>
     <div className={s.inv}>
      <div className={s.invTop}><div className={s.invM}><span className={s.invLogo}>{businessName.slice(0,1).toUpperCase()}</span><div><b>{businessName}</b><small>Invoice to {client||'client'}</small></div></div><span className={`${s.tag} ${s.tagDraft}`}>New</span></div>
      <div className={`${s.invAmt} ${s.num}`}>{money(amount||'0',token||'TOKEN')}</div>
      <div className={s.invDesc}>{desc||'Payment request'}</div>
      <div className={s.invRow}><span>To</span><b>{client||'Client name'}</b></div>
      <div className={s.invRow}><span>Due</span><b>{due||'On receipt'}</b></div>
      {recurrence!=='NONE'&&<div className={s.invRow}><span>Repeats</span><b>{RECUR_LABEL[recurrence]}{recurEnds?` until ${recurEnds}`:''}</b></div>}
      <div className={s.invRow}><span>Delivery</span><b>{[deliverEmail&&clientEmail&&'Email',deliverTelegram&&clientTelegram&&'Telegram'].filter(Boolean).join(' + ')||'Link only'}</b></div>
     </div>
    </div>
   </div>
  </div>
 </div>;
}
