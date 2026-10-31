'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {QRCodeSVG} from 'qrcode.react';
import {api,Invoice,money,shortAddress} from '../lib/api';
import {ArrowLeft,Check,Copy,Download,Share,Wallet,Qr,Clock,Alert} from './Icons';
import {userFacingError} from '../lib/userFacingError';
import {downloadInvoiceCard,shareInvoiceFile} from '../lib/invoiceCard';
import styles from './CheckoutClient.module.css';

function shareUrl(){return typeof window!=='undefined'?window.location.href:''}
function decimalToAtomic(value:string|number,decimals:number){
 const normalized=String(value).trim();
 if(!/^\d+(\.\d+)?$/.test(normalized))return '0';
 const [whole,fraction='']=normalized.split('.');
 const padded=(fraction+'0'.repeat(decimals)).slice(0,decimals);
 let scale=BigInt(1); for(let i=0;i<decimals;i++)scale*=BigInt(10); return (BigInt(whole)*scale+BigInt(padded||'0')).toString();
}
function paymentQrValue(invoice:Invoice){
 const decimals={USDm:18,USDC:6,USDT:6,NGNm:18}[invoice.tokenSymbol]??6;
 const atomic=decimalToAtomic(invoice.amount,decimals);
 return `ethereum:${invoice.tokenAddress}@${invoice.chainId}/transfer?address=${invoice.receivingWallet}&uint256=${atomic}`;
}

export default function CheckoutClient({slug,returnTo}:{slug:string;returnTo?:string}){
 const router=useRouter();
 const [inv,setInv]=useState<Invoice|null>(null);
 const [err,setErr]=useState('');
 const [copied,setCopied]=useState(false);
 const [payState,setPayState]=useState<'idle'|'signing'|'pending'|'success'|'failed'>('idle');
 const [showSuccess,setShowSuccess]=useState(false);
 const [tx,setTx]=useState('');
 const [intentId,setIntentId]=useState('');
 const [reason,setReason]=useState('');
 const [shareNotice,setShareNotice]=useState('');
 const [showQr,setShowQr]=useState(false);
 const [isMiniPay,setIsMiniPay]=useState(false);
 const [decisionBusy,setDecisionBusy]=useState(false);
 const successSoundPlayedRef=useRef(false);

 useEffect(()=>{
  if(typeof window!=='undefined' && (window as any).ethereum?.isMiniPay) setIsMiniPay(true);
 },[]);

 // MiniPay Mini App: the wallet is injected and connects implicitly, so warm
 // the connection on load (no "connect wallet" step). Only in MiniPay, where
 // this is silent; in other wallets requesting accounts on load would prompt.
 useEffect(()=>{
  if(!isMiniPay || typeof window==='undefined' || !window.ethereum) return;
  window.ethereum.request({method:'eth_requestAccounts'}).catch(()=>{});
 },[isMiniPay]);

 useEffect(()=>{api.getInvoiceBySlug(slug).then(async x=>{const fresh=x;setInv(fresh);if((fresh.status==='PAID'||fresh.status==='OVERPAID')&&fresh.payments?.some(p=>p.status==='VERIFIED'))setShowSuccess(true);await api.markViewed(slug).catch(()=>{})}).catch(e=>setErr(userFacingError(e,'We could not load this invoice. Please try again.')))},[slug]);

 useEffect(()=>{if(!inv||payState!=='pending'||!intentId)return;let n=0;const timer=setInterval(async()=>{n++;try{const r=await api.verifyPayment(inv.id,intentId,tx);if(r.verified){setPayState('success');setShowSuccess(true);setInv(await api.getInvoiceBySlug(slug));clearInterval(timer)}else if(n>=12)setReason(r.reason||'Still waiting for confirmation.')}catch(e:any){setReason(userFacingError(e,'Payment verification check failed.'))}},5000);return()=>clearInterval(timer)},[inv,payState,tx,slug]);

 useEffect(()=>{
  if(!showSuccess||successSoundPlayedRef.current)return;
  successSoundPlayedRef.current=true;
  try{
   const AudioContextClass=window.AudioContext||(window as any).webkitAudioContext;
   if(!AudioContextClass)return;
   const ctx=new AudioContextClass();
   const now=ctx.currentTime;
   [523.25,659.25,783.99].forEach((frequency,index)=>{
    const osc=ctx.createOscillator(); const gain=ctx.createGain();
    const start=now+index*0.08;
    osc.type='sine'; osc.frequency.value=frequency;
    gain.gain.setValueAtTime(0.0001,start);
    gain.gain.exponentialRampToValueAtTime(0.08,start+0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001,start+0.18);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(start); osc.stop(start+0.2);
   });
   window.setTimeout(()=>ctx.close().catch(()=>{}),700);
  }catch{}
 },[showSuccess]);

 const verified=inv?.payments?.find(p=>p.status==='VERIFIED');

 async function copy(){const u=shareUrl();try{await navigator.clipboard?.writeText(u);setCopied(true);setTimeout(()=>setCopied(false),1600)}catch{setErr('Could not copy the invoice link. Please try again.')}}

 async function shareCard(text:string){if(!inv)return;try{const result=await shareInvoiceFile({businessName:inv.merchantDisplay?.name||'CeloDesk',amount:String(inv.amount),token:inv.tokenSymbol,description:inv.description||'Payment request',client:inv.clientName,due:inv.dueDate?new Date(inv.dueDate).toLocaleDateString():'',url:shareUrl(),qrValue:paymentQrValue(inv)},text);setShareNotice(result==='shared'?'Invoice card shared.':'Invoice card copied - paste it where you want to share it.');setTimeout(()=>setShareNotice(''),2400)}catch(e:any){setErr(userFacingError(e,'Could not share invoice card.'))}}

 async function decide(choice:'ACCEPTED'|'DECLINED'){
  if(!inv||decisionBusy)return;
  setDecisionBusy(true); setReason('');
  try{
   const r=await api.setDecision(slug,choice);
   setInv(prev=>prev?{...prev,clientDecision:r.clientDecision,status:r.status}:prev);
  }catch(e:any){
   setErr(userFacingError(e,'Could not record your decision. Please try again.'));
  }finally{setDecisionBusy(false)}
 }

 async function pay(){
  if(!inv)return;
  setReason('');
  setPayState('signing');
  try{
    if(!window.ethereum){
      throw new Error('No compatible wallet detected. Open this link in MetaMask, MiniPay or another compatible EVM wallet.');
    }
    const accounts = await window.ethereum.request({method:'eth_requestAccounts'});
    const from = accounts?.[0];
    if(!from){throw new Error('No wallet account selected.');}
    // Inside MiniPay the wallet is always on Celo mainnet and does not support
    // wallet_switchEthereumChain / wallet_addEthereumChain, so skip the network
    // switch there (calling it can reject and block the payment). Other wallets
    // are still switched to Celo as before.
    if(!isMiniPay){
      const targetChainId = '0x' + Number(inv.chainId).toString(16);
      const currentChainId = await window.ethereum.request({method:'eth_chainId'});
      if(currentChainId.toLowerCase() !== targetChainId.toLowerCase()){
        try{
          await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:targetChainId}]});
        }catch(switchError:any){
          if(switchError?.code === 4902){
            await window.ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:'0xa4ec',chainName:'Celo Mainnet',nativeCurrency:{name:'Celo',symbol:'CELO',decimals:18},rpcUrls:['https://forno.celo.org'],blockExplorerUrls:['https://celoscan.io']}]});
          }else{throw switchError;}
        }
        const confirmedChainId = await window.ethereum.request({method:'eth_chainId'});
        if(confirmedChainId.toLowerCase() !== targetChainId.toLowerCase()){
          throw new Error('Please switch your wallet to Celo Mainnet to continue.');
        }
      }
    }
    const intent = await api.getPaymentIntent(inv.id,from);
    const hash = await window.ethereum.request({method:'eth_sendTransaction',params:[{from,to:intent.to,data:intent.data,value:intent.value}]});
    setTx(hash);
    setIntentId(intent.intentId);
    setPayState('pending');
    setReason('Payment submitted. Waiting for Celo confirmation...');
  }catch(e:any){
    setReason(userFacingError(e,'Payment failed.'));
    setPayState('failed');
  }
 }

 // ---- loading / error / closed states ----
 if(err&&!inv)return <main className={styles.page}><div className={styles.centerCard}><Alert size={34}/><h2>Invoice unavailable</h2><p>We could not load this invoice right now.</p><div style={{display:'flex',gap:10,justifyContent:'center'}}><button className={`${styles.btn} ${styles.btnGreen}`} onClick={()=>{setErr('');window.location.reload()}}>Try again</button><button className={`${styles.btn} ${styles.btnLine}`} onClick={()=>router.back()}>Cancel</button></div></div></main>;
 if(!inv)return <main className={styles.page}><div className={styles.centerCard}><p style={{margin:0}}>Loading secure invoice...</p></div></main>;
 if(inv.status==='CANCELLED'||inv.status==='EXPIRED')return <main className={styles.page}><div className={styles.centerCard}><Alert size={34}/><h2>This invoice is no longer available</h2><p>This payment request has expired or was cancelled by the merchant.</p></div></main>;

 const verifiedTotal=(inv.payments||[]).filter(p=>p.status==='VERIFIED').reduce((sum,p)=>sum+Number(p.amount),0);
 const amountDue=Math.max(0,Number(inv.amount)-verifiedTotal);
 const merchantName=inv.merchantDisplay?.name||shortAddress(inv.receivingWallet);
 const initials=(merchantName.trim()[0]||'C').toUpperCase();
 const u=shareUrl();
 const qrValue=paymentQrValue(inv);
 const shareText=`Payment request from ${merchantName}: ${money(inv.amount,inv.tokenSymbol)}${inv.description?` - ${inv.description}`:''}`;
 const recurring=inv.recurrence && inv.recurrence!=='NONE';
 const amtFull=money(amountDue,inv.tokenSymbol);
 const amtNoTok=amtFull.endsWith(inv.tokenSymbol)?amtFull.slice(0,amtFull.length-inv.tokenSymbol.length).trim():amtFull;
 const accepted=inv.clientDecision==='ACCEPTED';
 const declined=inv.clientDecision==='DECLINED';
 const busy=payState==='signing'||payState==='pending';

 // ---- success ----
 if(showSuccess){
   const txHash=verified?.txHash||tx;
   const verifiedTime=verified?.verifiedAt?new Date(verified.verifiedAt).toLocaleString():'Confirmed on Celo';
   return <main className={styles.page}><div className={styles.successWrap}>
     <div className={styles.successCard}>
       <div className={styles.orb}>✓</div>
       <div className={styles.successEyebrow}>Verified on Celo</div>
       <h1 className={styles.successTitle}>Payment successful</h1>
       <div className={`${styles.successAmt} ${styles.num}`}>{money(inv.amount,inv.tokenSymbol)}</div>
       <div className={styles.receipt}>
         <div className={styles.rcRow}><span>Merchant</span><strong>{merchantName}</strong></div>
         <div className={styles.rcRow}><span>Payer</span><strong className={styles.mono}>{verified?.fromAddress?shortAddress(verified.fromAddress):'Confirmed on chain'}</strong></div>
         <div className={styles.rcRow}><span>Network</span><strong>Celo Mainnet</strong></div>
         <div className={styles.rcRow}><span>Verified</span><strong>{verifiedTime}</strong></div>
         <div className={styles.rcRow}><span>Transaction</span><strong className={styles.mono}>{txHash?shortAddress(txHash):'Awaiting verification'}</strong></div>
       </div>
       {txHash&&<a className={styles.explorer} href={`https://celoscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">View transaction on CeloScan</a>}
       <div className={styles.successActions}>
         <button className={`${styles.btn} ${styles.btnGreen}`} onClick={()=>window.print()}><Download size={16}/>Print receipt</button>
         <button className={`${styles.btn} ${styles.btnLine}`} onClick={()=>{const target=returnTo&&returnTo.startsWith('/dashboard')?returnTo:window.location.pathname;router.push(target)}}><ArrowLeft size={16}/>Back</button>
       </div>
     </div>
     <div className={styles.printReceipt}>
       <div className={styles.printBrand}>CeloDesk</div>
       <div className={styles.successEyebrow}>Payment verified on Celo</div>
       <div className={styles.printTitle}>Payment successful</div>
       <div className={styles.printAmt}>{money(inv.amount,inv.tokenSymbol)}</div>
       <p>{inv.description||'Payment request'}</p>
       <div className={styles.printMeta}>
         <div><span>Invoice</span><strong>{inv.publicSlug}</strong></div>
         <div><span>Merchant</span><strong>{merchantName}</strong></div>
         <div><span>Payer</span><strong>{verified?.fromAddress||'Confirmed on chain'}</strong></div>
         <div><span>Verified</span><strong>{verifiedTime}</strong></div>
         <div><span>Network</span><strong>Celo Mainnet</strong></div>
         <div><span>Transaction</span><strong>{txHash||'-'}</strong></div>
       </div>
     </div>
     {shareNotice&&<div className={styles.toast}>{shareNotice}</div>}
   </div></main>;
 }

 // ---- main pay page ----
 return <main className={styles.page}>
   <div className={styles.topband}>
     <div className={styles.topInner}>
       <div className={styles.brand}><span className={styles.mark}>C</span> CeloDesk</div>
       <button className={styles.iconBtn} onClick={copy} aria-label="Copy invoice link"><Copy size={17}/></button>
     </div>
   </div>

   <div className={styles.merchant}>
     <span className={styles.mLogo}>{initials}</span>
     <div><div className={styles.mName}>{merchantName}</div><div className={styles.mSub}>sent you an invoice</div></div>
   </div>

   <div className={styles.cardWrap}>
     <div className={styles.card}>
       <div className={`${styles.amt} ${styles.num}`}>{amtNoTok}<span className={styles.tok}>{inv.tokenSymbol}</span></div>
       <div className={styles.amtLabel}>{verifiedTotal>0?'Amount remaining to pay':'Amount due'}</div>
       <div className={styles.desc}>{inv.description||'Payment request'}</div>
       <div className={styles.row}><span>From</span><b>{merchantName}</b></div>
       <div className={styles.row}><span>Due</span><b>{inv.dueDate?new Date(inv.dueDate).toLocaleDateString():'On receipt'}</b></div>
       <div className={styles.row}><span>Pays to</span><b className={styles.mono}>{shortAddress(inv.receivingWallet)}</b></div>
       {recurring&&<div className={styles.repeatTag}>Repeats {inv.recurrence?.toLowerCase()}, after you accept</div>}
     </div>

     {declined ? (
       <>
         <div className={styles.declined}><strong>You declined this invoice.</strong>The merchant can see your choice. If this was a mistake, you can accept it instead.</div>
         <button className={`${styles.btn} ${styles.btnGreen} ${styles.btnBlock}`} disabled={decisionBusy} onClick={()=>decide('ACCEPTED')}>Accept invoice instead</button>
       </>
     ) : !accepted ? (
       <>
         <div className={styles.note}><Check size={17}/><span>You decide before you pay. Accept to continue, or decline if this is not right. CeloDesk never charges you without your tap.</span></div>
         <div className={styles.decide}>
           <button className={`${styles.btn} ${styles.btnDecline} ${styles.flex1}`} disabled={decisionBusy} onClick={()=>decide('DECLINED')}>Decline</button>
           <button className={`${styles.btn} ${styles.btnPrimary} ${styles.flex2}`} disabled={decisionBusy} onClick={()=>decide('ACCEPTED')}>Accept invoice</button>
         </div>
       </>
     ) : (
       <div className={styles.wsec}>
         {payState==='signing'&&<div className={`${styles.state} ${styles.stateSigning}`}><Clock size={18}/><div><strong>Preparing payment</strong><div>Waiting for your wallet approval...</div></div></div>}
         {payState==='pending'&&<div className={`${styles.state} ${styles.statePending}`}><Clock size={18}/><div><strong>Payment processing</strong><div>Waiting for Celo confirmation...</div></div></div>}
         {payState==='failed'&&<div className={`${styles.state} ${styles.stateFailed}`}><Alert size={18}/><div><strong>Payment was not completed</strong><div>{reason}</div></div></div>}

         <div className={styles.wlabel}>Pay with</div>
         <button className={`${styles.wrow} ${styles.wrowRec}`} onClick={pay} disabled={busy}>
           <span className={styles.wIcon}><span className={styles.miniGlyph}/></span>
           <span>MiniPay<span className={styles.wSub}>Fast, gas handled for you</span></span>
           <span className={styles.wTag}>{isMiniPay?'Detected':'Recommended'}</span>
         </button>
         <button className={styles.wrow} onClick={pay} disabled={busy}>
           <span className={styles.wIcon}><Wallet size={18}/></span>
           <span>Other wallet<span className={styles.wSub}>MetaMask, Rabby or any Celo wallet</span></span>
         </button>
         <button className={styles.wrow} onClick={()=>setShowQr(v=>!v)}>
           <span className={styles.wIcon}><Qr size={18}/></span>
           <span>Scan QR to pay<span className={styles.wSub}>Use a wallet scanner on another device</span></span>
         </button>
         {showQr&&<div className={styles.qrWrap}><QRCodeSVG value={qrValue} size={180} includeMargin/><div className={styles.qrCap}>Scan to prepare payment</div><div className={styles.qrSub}>Use a compatible wallet scanner</div></div>}

         <button className={`${styles.btn} ${styles.btnGreen} ${styles.btnBlock}`} style={{marginTop:14}} onClick={pay} disabled={busy}>Pay {money(amountDue,inv.tokenSymbol)}</button>
         <div className={styles.gasNote}>You pay only the amount shown, direct to the merchant. CeloDesk never holds your funds.</div>
       </div>
     )}

     <div className={styles.actions}>
       <button className={`${styles.btn} ${styles.btnLine} ${styles.flex1}`} onClick={copy}><Copy size={15}/>{copied?'Copied':'Copy link'}</button>
       <button className={`${styles.btn} ${styles.btnLine} ${styles.flex1}`} onClick={()=>shareCard(`${shareText}\n${u}`)}><Share size={15}/>Share</button>
       <button className={`${styles.btn} ${styles.btnLine} ${styles.flex1}`} onClick={async()=>{try{await downloadInvoiceCard({businessName:merchantName,amount:String(inv.amount),token:inv.tokenSymbol,description:inv.description||'Payment request',client:inv.clientName,due:inv.dueDate?new Date(inv.dueDate).toLocaleDateString():'',url:u,qrValue:qrValue})}catch(e:any){setErr(userFacingError(e,'Could not download invoice card.'))}}}><Download size={15}/>Card</button>
     </div>

     <div className={styles.secure}>Secure payment on Celo. Non-custodial.</div>
   </div>
   {shareNotice&&<div className={styles.toast}>{shareNotice}</div>}
 </main>;
}
