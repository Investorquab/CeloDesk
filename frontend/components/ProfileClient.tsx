'use client';
import {useEffect,useState} from 'react';
import {api,Merchant} from '../lib/api';
import AppHeaderV2 from './AppHeaderV2';
import {Check,LogOut} from './Icons';
import WalletConnect from './WalletConnect';
import {userFacingError} from '../lib/userFacingError';
import s from './AppShell.module.css';

export default function ProfileClient({merchantId}:{merchantId:string}){
 const [m,setM]=useState<Merchant|null>(null),[name,setName]=useState(''),[tag,setTag]=useState(''),[username,setUsername]=useState(''),[saving,setSaving]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState(''),[copied,setCopied]=useState(false);
 useEffect(()=>{api.getMerchant(merchantId).then(x=>{setM(x);setName(x.profile?.businessName||'');setTag(x.profile?.tagline||'');setUsername(x.profile?.slug||'')}).catch(e=>setErr(userFacingError(e,'Could not load your profile.')))},[merchantId]);
 async function save(){setSaving(true);setErr('');try{await api.updateMerchant(merchantId,{businessName:name,tagline:tag,username:username.trim()||undefined});setMsg('Profile saved');setTimeout(()=>setMsg(''),2200)}catch(e:any){setErr(userFacingError(e,'Could not save your profile.'))}finally{setSaving(false)}}
 function logout(){api.clearStoredSession();window.dispatchEvent(new Event('celodesk-session'));window.location.href='/'}
 return <div className={s.app}>
  <AppHeaderV2 merchantId={merchantId} businessName={m?.profile?.businessName}/>
  <div className={s.wrap}>
   <div className={s.profHero}>
    <span className={s.pav}>{(name||'Y').slice(0,1).toUpperCase()}</span>
    <div><div className={s.pk}>BUSINESS PROFILE</div><h1>{name||'Your business'}</h1><div className={s.pt}>{tag||'Add a tagline for your invoices'}</div></div>
    <div className={s.pw}><WalletConnect compact/></div>
   </div>
   <div className={s.panel} style={{padding:24}}>
    <div className={s.form}>
     <div className={`${s.f} ${s.full}`}><label>Business name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Bello Designs"/></div>
     <div className={`${s.f} ${s.full}`}><label>Tagline</label><input value={tag} onChange={e=>setTag(e.target.value)} placeholder="Freelance · UI/UX · Web Development"/></div>
     <div className={s.two}>
      <div className={s.f}><label>Username</label><input value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,30))} placeholder="your-unique-username"/><div className={s.hint}>Unique public username.</div></div>
      <div className={s.f}><label>Wallet</label><input className={s.ro} value={m?.walletAddress||''} readOnly/><div className={s.hint}>Your connected wallet is your account identity.</div></div>
     </div>
     {m?.profile?.slug&&<div className={`${s.f} ${s.full}`}><label>Payment link</label><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><input className={s.ro} readOnly value={`${typeof window!=='undefined'?window.location.origin:''}/pay/${m.profile.slug}`} style={{flex:1,minWidth:200}}/><button type="button" className={`${s.btn} ${s.btnLine}`} onClick={async()=>{try{await navigator.clipboard?.writeText(`${window.location.origin}/pay/${m!.profile!.slug}`);setCopied(true);setTimeout(()=>setCopied(false),1500)}catch{}}}>{copied?'Copied':'Copy'}</button></div><div className={s.hint}>Share this one link to get paid any amount. Every payment shows up in your invoices.</div></div>}
     <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
      <button className={`${s.btn} ${s.btnDark}`} onClick={save} disabled={saving||!name}>{saving?'Saving...':<><Check size={16}/>Save changes</>}</button>
      {msg&&<span className={s.toast}><Check size={14}/>{msg}</span>}
     </div>
     {err&&<div className={s.err} style={{marginTop:14}}>{err}</div>}
    </div>
    <div className={s.accountDanger}>
     <div><strong>Session</strong><p>Disconnect this wallet from CeloDesk on this device.</p></div>
     <button className={s.iconDanger} onClick={logout} title="Disconnect and log out" aria-label="Disconnect and log out"><LogOut size={17}/></button>
    </div>
   </div>
   <div style={{height:40}}/>
  </div>
 </div>;
}
