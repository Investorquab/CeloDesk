'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {QRCodeSVG} from 'qrcode.react';
import {api,Invoice,money,shortAddress} from '../lib/api';
import {ArrowLeft,Check,Copy,Download,Share,Wallet,Qr,Clock,Alert,WhatsApp,Telegram,Gmail,Facebook} from './Icons';
import {TELEGRAM_BOT_URL} from '../lib/telegram';
import {userFacingError} from '../lib/userFacingError';
import {downloadInvoiceCard,shareInvoiceFile,shareInvoiceToGmail} from '../lib/invoiceCard';

function shareUrl(){return typeof window!=='undefined'?window.location.href:''}
export default function CheckoutClient({slug,returnTo}:{slug:string;returnTo?:string}){
 const router=useRouter();
 const [inv,setInv]=useState<Invoice|null>(null),[err,setErr]=useState(''),[copied,setCopied]=useState(false),[payState,setPayState]=useState<'idle'|'signing'|'pending'|'success'|'failed'>('idle'),[showSuccess,setShowSuccess]=useState(false),[tx,setTx]=useState(''),[intentId,setIntentId]=useState(''),[reason,setReason]=useState(''),[sharing,setSharing]=useState(false),[shareNotice,setShareNotice]=useState('');
 const successSoundPlayedRef=useRef(false);
 useEffect(()=>{api.getInvoiceBySlug(slug).then(async x=>{const fresh=x;setInv(fresh);if(fresh.status==='PAID'&&fresh.payments?.some(p=>p.status==='VERIFIED'))setShowSuccess(true);await api.markViewed(slug).catch(()=>{})}).catch(e=>setErr(userFacingError(e,'We could not load this invoice. Please try again.')))},[slug]);
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
 async function shareCard(text:string){if(!inv)return;try{const result=await shareInvoiceFile({businessName:inv.merchantDisplay?.name||'CeloDesk',amount:String(inv.amount),token:inv.tokenSymbol,description:inv.description||'Payment request',client:inv.clientName,due:inv.dueDate?new Date(inv.dueDate).toLocaleDateString():'',url:shareUrl()},text);setShareNotice(result==='shared'?'Invoice card shared.':'Invoice card copied — paste it where you want to share it.');setTimeout(()=>setShareNotice(''),2400)}catch(e:any){setErr(userFacingError(e,'Could not share invoice card.'))}}
 async function pay(){
  if(!inv)return;
  setReason('');
  setPayState('signing');

  try{
    if(!window.ethereum){
      throw new Error('No compatible wallet detected. Open this link in MetaMask, MiniPay or another compatible EVM wallet.');
    }

    const accounts = await window.ethereum.request({
      method:'eth_requestAccounts'
    });

    const from = accounts?.[0];

    if(!from){
      throw new Error('No wallet account selected.');
    }

    const targetChainId = '0x' + Number(inv.chainId).toString(16);
    const currentChainId = await window.ethereum.request({
      method:'eth_chainId'
    });

    if(currentChainId.toLowerCase() !== targetChainId.toLowerCase()){
      try{
        await window.ethereum.request({
          method:'wallet_switchEthereumChain',
          params:[{chainId:targetChainId}]
        });
      }catch(switchError:any){
        if(switchError?.code === 4902){
          await window.ethereum.request({
            method:'wallet_addEthereumChain',
            params:[{
              chainId:'0xa4ec',
              chainName:'Celo Mainnet',
              nativeCurrency:{
                name:'Celo',
                symbol:'CELO',
                decimals:18
              },
              rpcUrls:['https://forno.celo.org'],
              blockExplorerUrls:['https://celoscan.io']
            }]
          });
        }else{
          throw switchError;
        }
      }

      const confirmedChainId = await window.ethereum.request({
        method:'eth_chainId'
      });

      if(confirmedChainId.toLowerCase() !== targetChainId.toLowerCase()){
        throw new Error('Please switch your wallet to Celo Mainnet to continue.');
      }
    }

    const intent = await api.getPaymentIntent(inv.id,from);

    const hash = await window.ethereum.request({
      method:'eth_sendTransaction',
      params:[{
        from,
        to:intent.to,
        data:intent.data,
        value:intent.value
      }]
    });

    setTx(hash);
    setIntentId(intent.intentId);
    setPayState('pending');
    setReason('Payment submitted. Waiting for Celo confirmation...');

  }catch(e:any){
    setReason(e?.message||'Payment failed.');
    setPayState('failed');
  }
}

if(err&&!inv)return <main className="checkout"><div className="checkoutCard"><div style={{textAlign:'center'}}><Alert size={34}/><h2>Invoice unavailable</h2><p className="muted">We couldn't load this invoice right now.</p><div className="checkoutErrorActions"><button className="btn btnBrand" onClick={()=>{setErr('');window.location.reload()}}>Try again</button><button className="btn btnSoft" onClick={()=>router.back()}>Cancel</button></div></div></div></main>;
 if(!inv)return <main className="checkout"><div className="checkoutCard"><div className="muted" style={{textAlign:'center'}}>Loading secure invoice…</div></div></main>;
 const name='CeloDesk';
 const merchantName=inv.merchantDisplay?.name||shortAddress(inv.receivingWallet);
 const u=shareUrl();
 const shareText=`Payment request from ${merchantName}: ${money(inv.amount,inv.tokenSymbol)}${inv.description?` — ${inv.description}`:''}`;
 if(showSuccess){
   const txHash=verified?.txHash||tx;
   const verifiedTime=verified?.verifiedAt?new Date(verified.verifiedAt).toLocaleString():'Confirmed on Celo';
   return <main className="checkout"><div className="checkoutCard successCard"><div className="confetti" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{['--x' as any]:`${20+(i*17)%70}%`,['--dx' as any]:`${(i%2?1:-1)*(25+(i*13)%80)}px`,['--dy' as any]:`${-30-(i*9)%120}px`} as any}/>)}</div><div className="checkoutTop"><div className="successBrandMark"><span className="brandMark"/></div><div className="successOrb"><span className="successCheck">✓</span></div><div className="eyebrow">Verified on Celo</div><h1 className="successTitle">Payment successful! 🎉</h1><div className="checkoutAmount">{money(inv.amount,inv.tokenSymbol)}</div><p className="muted">Invoice · {inv.publicSlug.slice(0,10).toUpperCase()}</p></div><div className="receipt successReceipt"><div className="receiptRow"><span>Merchant</span><strong>{merchantName}</strong></div><div className="receiptRow"><span>Payer</span><strong>{verified?.fromAddress?shortAddress(verified.fromAddress):'Confirmed on chain'}</strong></div><div className="receiptRow"><span>Network</span><strong>Celo Mainnet</strong></div><div className="receiptRow"><span>Verified</span><strong>{verifiedTime}</strong></div><div className="receiptRow txRow"><span>Transaction</span><div className="txValue"><strong>{txHash?shortAddress(txHash):'Awaiting verification'}</strong>{txHash&&<button className="miniAction" onClick={async()=>{await navigator.clipboard?.writeText(txHash);setShareNotice('Transaction hash copied.');setTimeout(()=>setShareNotice(''),1800)}}><Copy size={13}/></button>}</div></div></div>{txHash&&<a className="explorerLink" href={`https://celoscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">View transaction on CeloScan ↗</a>}<div className="successActions"><button className="btn btnBrand" onClick={()=>window.print()}><Download size={16}/>View / print receipt</button><button className="btn btnSoft" onClick={()=>{const target=returnTo&&returnTo.startsWith('/dashboard')?returnTo:window.location.pathname;router.push(target)}}><ArrowLeft size={16}/>Back to invoice</button></div><div className="printReceipt"><div className="printBrand"><span className="brandMark"/>CeloDesk</div><div className="printCheck">✓</div><div className="eyebrow">Payment verified on Celo</div><h1>Payment successful</h1><div className="printAmount">{money(inv.amount,inv.tokenSymbol)}</div><p>{inv.description||'Payment request'}</p><div className="printMeta"><div><span>Invoice</span><strong>{inv.publicSlug}</strong></div><div><span>Merchant</span><strong>{merchantName}</strong></div><div><span>Payer</span><strong>{verified?.fromAddress||'Confirmed on chain'}</strong></div><div><span>Verified</span><strong>{verifiedTime}</strong></div><div><span>Network</span><strong>Celo Mainnet</strong></div><div><span>Transaction</span><strong>{txHash||'—'}</strong></div></div><div className="printFooter">Verified settlement · CeloDesk · Celo</div></div>{shareNotice&&<div className="toastNotice">{shareNotice}</div>}</div></main>;
 }
 return <main className="checkout"><div className="checkoutCard"><div className="checkoutHeader"><button className="iconButton" onClick={()=>{const target=returnTo&&returnTo.startsWith('/dashboard')?returnTo:'/dashboard/invoices';router.push(target)}} aria-label="Back to app"><ArrowLeft size={17}/></button><div className="mockBrand"><span className="brandMark" style={{width:26,height:26,borderRadius:8}}/>{name}</div><button className="iconButton" onClick={copy} aria-label="Copy invoice link"><Copy size={17}/></button></div><div className="checkoutTop" style={{marginTop:20}}><div className="avatar"><span className="brandMark" style={{width:56,height:56,borderRadius:18}}/></div><h1 style={{fontFamily:'Manrope',fontSize:18,margin:'10px 0 4px'}}>{merchantName}</h1><div className="muted" style={{fontSize:11}}>Payment request · {inv.publicSlug.slice(0,9).toUpperCase()}</div><div className="checkoutAmount">{money(inv.amount,inv.tokenSymbol)}</div><p style={{margin:'0 0 5px',fontWeight:700}}>{inv.description||'Payment request'}</p><p className="muted" style={{fontSize:11}}>{inv.dueDate?`Due ${new Date(inv.dueDate).toLocaleDateString()}`:'Pay securely on Celo'}</p></div><div style={{marginTop:22}}>{payState==='pending'&&<div className="paymentState pending"><Clock size={20}/><div><strong>Payment processing</strong><div>Waiting for blockchain confirmation…</div></div></div>}{payState==='failed'&&<div className="paymentState failed"><Alert size={18}/><div><strong>Payment wasn't completed</strong><div>{reason}</div></div></div>}{payState==='signing'&&<div className="paymentState signing"><Clock size={18}/><div><strong>Preparing payment</strong><div>Waiting for your wallet approval…</div></div></div>}<div className="paymentOptionsGrid"><button className="paymentOption recommended" onClick={pay} disabled={payState==='signing'||payState==='pending'}><span className="paymentLeft"><span className="paymentIcon"><span className="miniPayGlyph">●</span></span><span><span className="paymentTitle">Pay with MiniPay</span><span className="paymentSub">Fast & easy · Recommended</span></span></span><span className="paymentArrow">›</span></button><button className="paymentOption" onClick={pay} disabled={payState==='signing'||payState==='pending'}><span className="paymentLeft"><span className="paymentIcon"><Wallet size={18}/></span><span><span className="paymentTitle">Connect Wallet</span><span className="paymentSub">MetaMask, Rabby or compatible</span></span></span><span className="paymentArrow">›</span></button></div><div className="qrBox"><QRCodeSVG value={u} size={170} includeMargin/><div style={{fontWeight:800,fontSize:12,marginTop:10}}>Scan to open invoice</div><div className="muted" style={{fontSize:10,marginTop:4}}>Use your phone camera or wallet to scan</div></div></div><div className="checkoutActions"><button className="btn btnSoft" onClick={()=>setSharing(v=>!v)}><Share size={15}/>{sharing?'Close share':'Share invoice'}</button><button className="btn btnSoft" onClick={copy}><Copy size={15}/>{copied?'Copied!':'Copy link'}</button><button className="btn btnSoft" onClick={async()=>{try{await downloadInvoiceCard({businessName:merchantName,amount:String(inv.amount),token:inv.tokenSymbol,description:inv.description||'Payment request',client:inv.clientName,due:inv.dueDate?new Date(inv.dueDate).toLocaleDateString():'',url:u,qrValue:u})}catch(e:any){setErr(userFacingError(e,'Could not download invoice card.'))}}}><Download size={15}/>Download</button></div>{sharing&&<div className="sharePanel"><div className="sharePanelHead"><div><strong>Share invoice</strong><span>Send the invoice card + secure payment link</span></div><button className="iconButton" onClick={()=>setSharing(false)}>×</button></div><div className="shareGrid"><a className="shareTile" href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${u}`)}`} target="_blank" rel="noreferrer"><WhatsApp size={22}/><span>WhatsApp</span></a><a className="shareTile" href={`https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer"><Telegram size={22}/><span>Telegram</span></a><button className="shareTile" onClick={async()=>{try{const r=await shareInvoiceToGmail({businessName:merchantName,amount:String(inv.amount),token:inv.tokenSymbol,description:inv.description||'Payment request',client:inv.clientName,due:inv.dueDate?new Date(inv.dueDate).toLocaleDateString():'',url:u,qrValue:u},`${shareText}\n${u}`,`Invoice — ${money(inv.amount,inv.tokenSymbol)}`,`Hi ${inv.clientName},\n\nHere is your invoice for ${inv.description||'payment request'}.\n\nAmount: ${money(inv.amount,inv.tokenSymbol)}\n${inv.dueDate?`Due: ${new Date(inv.dueDate).toLocaleDateString()}\n`:''}\nView and pay securely:\n${u}\n\nThank you.`);setShareNotice(r==='gmail-fallback'?'Invoice card copied — paste it into Gmail.':'Invoice card ready to share.');setTimeout(()=>setShareNotice(''),3000)}catch(e:any){setErr(userFacingError(e,'Could not open Gmail sharing.'))}}}><Gmail size={22}/><span>Gmail</span></button><a className="shareTile" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`} target="_blank" rel="noreferrer"><Facebook size={22}/><span>Facebook</span></a><button className="shareTile" onClick={()=>shareCard(`${shareText}\n${u}`)}><Download size={22}/><span>Share card</span></button><button className="shareTile" onClick={copy}><Copy size={22}/><span>{copied?'Copied':'Copy link'}</span></button></div><button className="telegramAssist" onClick={()=>shareCard(`${shareText}\n${u}`)}><Telegram size={16}/> Share invoice card with CeloDesk Telegram</button>{shareNotice&&<div className="shareNotice">{shareNotice}</div>}<a className="telegramAssist" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer"><Telegram size={16}/> Manage invoices with CeloDesk Telegram on Telegram</a></div>}<div className="secureNote">🔒 Secure payment on Celo · Non-custodial</div><div id="invoice-download-qr" className="srOnly"><QRCodeSVG value={u} size={220} includeMargin /></div></div></main>
}





