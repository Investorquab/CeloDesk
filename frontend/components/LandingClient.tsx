'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {TELEGRAM_BOT_URL} from '../lib/telegram';
import styles from './Landing.module.css';

const REPO_URL='https://github.com/Investorquab/CeloDesk';
// Map space-separated design tokens to the hashed CSS-module class names, so
// compound selectors from the mockup (e.g. "card span2 dark") keep working.
const cx=(...names:string[])=>names.map(n=>(styles as Record<string,string>)[n]||n).join(' ');
const TYPED='Invoice Joana R$1.500 for brand design, send by email';

export default function LandingClient(){
 const rootRef=useRef<HTMLDivElement>(null);
 const [typed,setTyped]=useState('');
 useEffect(()=>{
  const root=rootRef.current; if(!root) return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealClass=styles.reveal, inClass=styles.in;
  const els=Array.from(root.querySelectorAll<HTMLElement>('.'+revealClass));
  if(reduce){els.forEach(e=>e.classList.add(inClass));setTyped(TYPED);return;}
  // Hero elements are in view on load: reveal them immediately with a stagger.
  const hero=els.filter(e=>e.dataset.hero==='1');
  hero.forEach((e,i)=>{e.style.transitionDelay=(0.08+i*0.1)+'s';});
  requestAnimationFrame(()=>requestAnimationFrame(()=>hero.forEach(e=>e.classList.add(inClass))));
  // Everything else reveals on scroll.
  const io=new IntersectionObserver((entries)=>{entries.forEach(en=>{if(en.isIntersecting){en.target.classList.add(inClass);io.unobserve(en.target);}})},{threshold:0.12,rootMargin:'0px 0px -7% 0px'});
  els.filter(e=>e.dataset.hero!=='1').forEach(e=>io.observe(e));
  // Typewriter for the hero command line.
  let i=0,t:ReturnType<typeof setTimeout>;
  const tick=()=>{setTyped(TYPED.slice(0,i));if(i++<TYPED.length)t=setTimeout(tick,40);};
  const start=setTimeout(tick,900);
  return()=>{io.disconnect();clearTimeout(start);clearTimeout(t!);};
 },[]);

 return <div ref={rootRef} className={styles.page}>
  <section className={styles.hero}><div className={cx('wrap','hero-inner')}>
   <nav className={styles.nav}>
    <div className={styles.brand}><span className={styles.mark}>C</span> CeloDesk</div>
    <div className={styles.links}><a href="#product">Product</a><a href="#cur">Currencies</a><a href="#how">How it works</a><a href={REPO_URL} target="_blank" rel="noreferrer">Developers</a></div>
    <div className={styles.right}><Link href="/dashboard" className={styles.signin}>Sign in</Link><Link href="/dashboard" className={cx('btn','btn-bright')}>Open the desk</Link></div>
   </nav>

   <div className={styles.eyebrow} data-hero="1"><span className={styles.pulse}/> An invoicing agent on Celo</div>
   <h1 data-hero="1">Send an invoice in plain words. Get paid in your <em>own currency.</em></h1>
   <p className={styles.lead} data-hero="1">CeloDesk is a stablecoin invoicing desk for freelancers, shops and cross-border teams. Write what you are owed, send it by email or Telegram, and let your client accept and pay from any wallet. Every payment is settled and verified on Celo, so paid always means paid.</p>
   <div className={styles.cta} data-hero="1">
    <Link href="/dashboard" className={cx('btn','btn-bright')}>Create your first invoice</Link>
    <a href="#how" className={cx('btn','btn-line-light')}>See how it works</a>
   </div>
   <div className={styles.proof} data-hero="1">
    <span><i/> Celo mainnet</span><span><i/> Non-custodial</span><span><i/> Verified on-chain</span><span><i/> MiniPay ready</span>
   </div>

   <div className={styles.window} data-hero="1">
    <div className={styles['win-bar']}>
     <div className={styles['win-dots']}><i/><i/><i/></div>
     <div className={styles['win-url']}>celodesk.app / new invoice</div>
    </div>
    <div className={styles['win-body']}>
     <div className={styles['win-left']}>
      <div className={styles.cmd}><span className={styles.ai}>C</span> <span>{typed}</span><span className={styles.caret}/></div>
      <div className={styles['cmd-hint']}>Type it the way you would say it. CeloDesk fills in the invoice.</div>
      <div className={styles['mini-label']}>Deliver by</div>
      <div className={styles.chips}><span className={cx('chip','on')}>Email</span><span className={cx('chip','on')}>Telegram</span><span className={styles.chip}>Payment link</span></div>
      <div className={styles['mini-label']}>Repeat</div>
      <div className={styles.chips}><span className={styles.chip}>One time</span><span className={cx('chip','on')}>Monthly</span><span className={styles.chip}>Weekly</span></div>
     </div>
     <div className={styles['win-right']}>
      <div className={styles['mini-label']} style={{marginTop:0}}>What your client receives</div>
      <div className={styles.inv}>
       <div className={styles['inv-top']}>
        <div className={styles['inv-m']}><span className={styles['inv-logo']}>A</span><div><b>Ateliê Marina</b><small>São Paulo</small></div></div>
        <span className={cx('tag','wait')}>Awaiting accept</span>
       </div>
       <div className={cx('inv-amt','num')}>R$ 1.500,00<span className={styles.t}>wBRL</span></div>
       <div className={styles['inv-desc']}>Brand identity, first milestone</div>
       <div className={styles['inv-row']}><span>To</span><b>Joana Ribeiro</b></div>
       <div className={styles['inv-row']}><span>Repeats</span><b>Monthly until Mar 2027</b></div>
      </div>
     </div>
    </div>
   </div>
  </div></section>

  <section className={styles.strip}><div className={styles.wrap}>
   <div className={styles.row}>
    <span className={styles.reveal}>Trusted rails. <b>Settled on Celo mainnet.</b></span>
    <span className={styles.reveal}>Your client keeps custody. <b>CeloDesk never holds funds.</b></span>
    <span className={styles.reveal}>Proof, not screenshots. <b>Every payment checked on-chain.</b></span>
   </div>
  </div></section>

  <section className={styles.intro} id="product"><div className={styles.wrap}>
   <div className={cx('kick','reveal')}>What CeloDesk is</div>
   <h2 className={styles.reveal}>One desk for the whole payment, from the ask to the receipt.</h2>
   <p className={styles.reveal}><span className={styles.big}>Getting paid in stablecoins usually means juggling tools:</span> a note for the amount, a wallet address pasted into chat, a QR somewhere, and a lot of asking "did it land yet?". CeloDesk puts the whole flow in one place. You describe the invoice, it goes out by email or Telegram, your client reviews and agrees before anything is charged, pays straight to your wallet, and the invoice turns paid only once Celo confirms the transfer. The same records are there whether you work from the web, Telegram, or an AI assistant.</p>
  </div></section>

  <section className={styles.features} id="features"><div className={styles.wrap}>
   <div className={cx('sec-head','reveal')}>
    <h2>Everything it takes to get paid</h2>
    <p>Built around how small businesses and cross-border teams actually invoice.</p>
   </div>
   <div className={styles.bento}>
    <div className={cx('card','span2','dark','reveal')}>
     <div className={styles.ico}>✦</div><h3>Write invoices the way you speak</h3>
     <p>No forms to learn. Tell CeloDesk what you are owed and it drafts the invoice, picks the currency, and gets it ready to send.</p>
     <div className={styles['demo-line']}>you: <span className={styles.g}>invoice Carlos $25.000 in pesos for the photo shoot, monthly</span></div>
    </div>
    <div className={cx('card','reveal')}><div className={styles.ico}>✉</div><h3>It sends itself by email</h3><p>Add the client&apos;s email and CeloDesk delivers a secure pay link straight to their inbox.</p></div>
    <div className={cx('card','reveal')}><div className={styles.ico}>◈</div><h3>Reaches them on Telegram</h3><p>Add a Telegram username and the client gets a one tap link that opens the invoice in the bot.</p></div>
    <div className={cx('card','reveal')}><div className={styles.ico}>✓</div><h3>Client agrees first</h3><p>Every invoice has an accept and decline step. Nothing is ever charged without the client&apos;s tap, so it can never be used to catch someone out.</p></div>
    <div className={cx('card','reveal')}><div className={styles.ico}>↻</div><h3>Set it to repeat</h3><p>Retainers and subscriptions go out on their own schedule. The client accepts once, then pays each cycle.</p></div>
    <div className={cx('card','span2','dark','reveal')}>
     <div className={styles.ico}>◆</div><h3>Pay from any wallet, built for MiniPay</h3>
     <p>Open the invoice inside MiniPay and it connects on its own, with gas handled for you. MetaMask, other Celo wallets and a scan to pay all work too.</p>
     <div className={styles['wallets-mini']}><span className={cx('wmini','rec')}>◆ MiniPay</span><span className={styles.wmini}>🦊 MetaMask</span><span className={styles.wmini}>▣ Scan to pay</span></div>
    </div>
    <div className={cx('card','reveal')}><div className={styles.ico}>◎</div><h3>Bill in local currency</h3><p>Invoice in reais, pesos or soles with Ripio wFIAT, so the amount the client sees is the amount you quoted.</p></div>
    <div className={cx('card','reveal')}><div className={styles.ico}>$</div><h3>Dollars across borders</h3><p>Settle in USA₮ over x402 between independent parties, with no gas for the payer.</p></div>
    <div className={cx('card','reveal')}><div className={styles.ico}>⛓</div><h3>Proven on-chain</h3><p>CeloDesk checks the real transaction before marking anything paid. No trusting a screenshot.</p></div>
   </div>
  </div></section>

  <section className={styles.how} id="how"><div className={styles.wrap}>
   <div className={cx('sec-head','reveal')}><h2>From the ask to the receipt</h2><p>Five steps, and your client only ever taps and confirms.</p></div>
   <div className={styles.ledger}>
    <div className={cx('lrow','reveal')}><div className={styles.step}>step 01</div><h4>Create</h4><p>Describe the invoice and pick the currency. Add the client&apos;s email or Telegram.</p></div>
    <div className={cx('lrow','reveal')}><div className={styles.step}>step 02</div><h4>Send</h4><p>CeloDesk delivers the pay link by email or Telegram for you.</p></div>
    <div className={cx('lrow','reveal')}><div className={styles.step}>step 03</div><h4>Accept</h4><p>The client reviews and agrees before any payment is possible.</p></div>
    <div className={cx('lrow','reveal')}><div className={styles.step}>step 04</div><h4>Pay</h4><p>They pay from MiniPay or any Celo wallet, straight to you.</p></div>
    <div className={cx('lrow','reveal')}><div className={styles.step}>step 05</div><h4>Verify</h4><p>Celo confirms the transfer and the invoice turns paid, with a receipt for both sides.</p></div>
   </div>
  </div></section>

  <section className={styles.cur} id="cur"><div className={styles.wrap}>
   <div className={cx('sec-head','reveal')}><h2>The currency your client thinks in</h2><p>Local money for local work, dollars when the deal crosses a border.</p></div>
   <div className={styles['cur-grid']}>
    <div className={cx('cur-card','latam','reveal')}>
     <h3>Local currencies for LatAm</h3>
     <p>A designer in São Paulo bills in reais. A shop in Bogotá bills in pesos. With Ripio wFIAT on Celo there is no mental math and no conversion spread on every invoice.</p>
     <div className={styles['tok-row']}>
      <span className={styles.tok}><b>wBRL</b><small>real</small></span><span className={styles.tok}><b>wARS</b><small>peso</small></span><span className={styles.tok}><b>wMXN</b><small>peso</small></span>
      <span className={styles.tok}><b>wCOP</b><small>peso</small></span><span className={styles.tok}><b>wCLP</b><small>peso</small></span><span className={styles.tok}><b>wPEN</b><small>sol</small></span>
     </div>
    </div>
    <div className={cx('cur-card','reveal')}>
     <h3>Dollars across borders</h3>
     <p>When two independent parties settle in US dollars, CeloDesk uses USA₮ over the x402 lane. The payer signs, the facilitator covers the gas, and funds move directly.</p>
     <div className={styles['tok-row']}><span className={styles.tok}><b>USA₮</b><small>cross-border dollar</small></span><span className={styles.tok}><b>USDC</b></span><span className={styles.tok}><b>USDT</b></span></div>
    </div>
   </div>
  </div></section>

  <section><div className={styles.wrap}><div className={styles['cta-band']}><div className={cx('inner','reveal')}>
   <h2>Your work. Your currency. Paid and proven.</h2>
   <p>Create an invoice in under a minute, send it where your client already is, and watch it settle on Celo.</p>
   <div className={styles.cta}><Link href="/dashboard" className={cx('btn','btn-bright')}>Open the desk</Link><a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer" className={cx('btn','btn-line-light')}>Talk to it on Telegram</a></div>
  </div></div></div></section>

  <footer className={styles.foot}><div className={styles.wrap}>
   <div className={styles.row}>
    <span className={styles.brand} style={{fontSize:18}}><span className={styles.mark} style={{width:26,height:26,fontSize:14}}>C</span> CeloDesk</span>
    <span>Built on Celo mainnet. Payments verified on-chain. Non-custodial.</span>
   </div>
  </div></footer>
 </div>;
}
