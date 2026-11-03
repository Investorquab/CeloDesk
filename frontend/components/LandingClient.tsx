'use client';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import Link from 'next/link';
import {TELEGRAM_BOT_URL} from '../lib/telegram';
import {useTheme} from '../lib/theme';
import styles from './Landing.module.css';

const REPO_URL = 'https://github.com/Investorquab/CeloDesk';
const MCP_URL = 'https://mcp.celodesk.xyz/mcp';
const AGENT_CARD = 'https://celodesk.xyz/.well-known/agent-card.json';
const AGENT_SCAN = 'https://celoscan.io/address/0x00d1E86040d88397F4eB187c38dC527F6659e486';
const CONTACT = 'mailto:hello@celodesk.xyz';

// Map space-separated design tokens to the hashed CSS-module class names so
// compound selectors from the design (e.g. "card wide") keep matching.
const cx = (...names: Array<string | false | undefined>) =>
  names.filter(Boolean).map((n) => (styles as Record<string, string>)[n as string] || n).join(' ');

function Ic({children, sm}: {children: ReactNode; sm?: boolean}) {
  return (
    <svg viewBox="0 0 24 24" className={cx('i', sm && 'i-16')} aria-hidden="true">
      {children}
    </svg>
  );
}

const Check = <path d="M20 6 9 17l-5-5" />;

export default function LandingClient() {
  const rootRef = useRef<HTMLDivElement>(null);
  const {theme, toggle} = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(root.querySelectorAll<HTMLElement>('.' + styles.reveal));
    if (reduce) {
      els.forEach((e) => e.classList.add(styles.in));
    } else {
      const hero = els.filter((e) => e.dataset.hero === '1');
      hero.forEach((e, i) => { e.style.transitionDelay = (0.06 + i * 0.08) + 's'; });
      requestAnimationFrame(() => requestAnimationFrame(() => hero.forEach((e) => e.classList.add(styles.in))));
      const io = new IntersectionObserver(
        (entries) => entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add(styles.in); io.unobserve(en.target); }
        }),
        {threshold: 0.12, rootMargin: '0px 0px -7% 0px'}
      );
      els.filter((e) => e.dataset.hero !== '1').forEach((e) => io.observe(e));
      const onScroll = () => setScrolled(window.scrollY > 8);
      onScroll();
      window.addEventListener('scroll', onScroll, {passive: true});
      return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
    }
  }, []);

  return (
    <div ref={rootRef} className={styles.page}>
      {/* NAV */}
      <header className={cx('nav') + (scrolled ? ' ' + styles.scrolled : '')}>
        <div className={cx('wrap', 'nav-in')}>
          <div className={styles.brand}><span className={styles.mark}>C</span> CeloDesk</div>
          <nav className={styles['nav-links']}>
            <a href="#product">Product</a>
            <a href="#currencies">Currencies</a>
            <a href="#how">How it works</a>
            <a href="#developers">Developers</a>
          </nav>
          <div className={styles['nav-right']}>
            <button className={styles['theme-toggle']} onClick={toggle} aria-label="Switch between dark and light" type="button">
              {theme === 'dark'
                ? <svg viewBox="0 0 24 24" className={cx('i', 'i-16')} aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                : <svg viewBox="0 0 24 24" className={cx('i', 'i-16')} aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>}
            </button>
            <Link href="/dashboard" className={styles.signin}>Sign in</Link>
            <Link href="/dashboard" className={cx('btn', 'btn-primary')}>Open the desk</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={cx('wrap', 'hero-grid')}>
          <div>
            <div className={cx('eyebrow', 'reveal')} data-hero="1"><span className={styles.dot} /> An invoicing agent on Celo</div>
            <h1 className={styles.reveal} data-hero="1">Invoice in your own currency. <span className={styles.soft}>Get paid on Celo.</span></h1>
            <p className={cx('lead', 'reveal')} data-hero="1">CeloDesk is a stablecoin invoicing desk for freelancers, shops and cross-border teams. Describe what you are owed, send it by email or Telegram, and let your client accept and pay from any wallet. Every payment settles on Celo and is checked on-chain, so paid always means paid.</p>
            <div className={cx('hero-cta', 'reveal')} data-hero="1">
              <Link href="/dashboard" className={cx('btn', 'btn-primary', 'btn-lg')}>Create your first invoice</Link>
              <a href="#how" className={cx('btn', 'btn-line', 'btn-lg')}>See how it works</a>
            </div>
            <div className={cx('proof', 'reveal')} data-hero="1">
              <span><Ic sm>{Check}</Ic> Celo mainnet</span>
              <span><Ic sm>{Check}</Ic> Non-custodial</span>
              <span><Ic sm>{Check}</Ic> Verified on-chain</span>
              <span><Ic sm>{Check}</Ic> MiniPay ready</span>
            </div>
          </div>

          <div className={cx('receipt-stage', 'reveal')} data-hero="1">
            <div className={styles.win}>
              <div className={styles['win-bar']}>
                <div className={styles['win-dots']}><i /><i /><i /></div>
                <div className={styles['win-url']}>celodesk.xyz / invoice / marina</div>
              </div>
              <div className={styles['win-body']}>
                <div className={styles['r-top']}>
                  <div className={styles['r-merchant']}>
                    <div className={styles['r-logo']}>A</div>
                    <div><b>Ateliê Marina</b><small>São Paulo, BR</small></div>
                  </div>
                  <span className={cx('tag', 'tag-paid')}>paid</span>
                </div>
                <div className={cx('r-amt', 'num')}>R$ 1.500,00 <span className={styles.cur}>wBRL</span></div>
                <div className={styles['r-desc']}>Brand identity, first milestone</div>
                <div className={styles['r-rows']}>
                  <div className={styles['r-row']}><span>To</span><b>Joana Ribeiro</b></div>
                  <div className={styles['r-row']}><span>Paid with</span><b>MiniPay</b></div>
                  <div className={styles['r-row']}><span>Settled</span><b>Celo mainnet</b></div>
                </div>
              </div>
            </div>
            <div className={styles.seal}>
              <div className={styles['seal-head']}><Ic sm><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" /><path d="m9 12 2 2 4-4" /></Ic> Verified</div>
              <div className={styles['seal-l']}><b>Celo mainnet</b><br />0x1c61…73f4<br />block 81,776,658</div>
            </div>
          </div>
        </div>
      </section>

      {/* STRIP */}
      <section className={styles.strip}>
        <div className={cx('wrap', 'strip-in')}>
          <div className={styles.reveal}><Ic><path d="M12 2 4 6v6c0 5 3.5 7.5 8 10 4.5-2.5 8-5 8-10V6Z" /></Ic><span>Trusted rails. <b>Settled on Celo mainnet.</b></span></div>
          <div className={styles.reveal}><Ic><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Ic><span>Your client keeps custody. <b>CeloDesk never holds funds.</b></span></div>
          <div className={styles.reveal}><Ic><path d="M12 2 4 6v6c0 5 3.5 7.5 8 10 4.5-2.5 8-5 8-10V6Z" /><path d="m9 12 2 2 4-4" /></Ic><span>Proof, not screenshots. <b>Every payment checked on-chain.</b></span></div>
        </div>
      </section>

      {/* PRODUCT / INTRO */}
      <section className={styles.sec} id="product">
        <div className={styles.wrap}>
          <div className={cx('kick', 'reveal')}>What CeloDesk is</div>
          <h2 className={cx('h2-wide', 'reveal')}>One desk for the whole payment, from the ask to the receipt</h2>
          <p className={cx('intro-body', 'reveal')}><b>Getting paid in stablecoins usually means juggling tools:</b> a note for the amount, a wallet address pasted into chat, a QR somewhere, and a lot of asking whether it landed yet. CeloDesk puts the whole flow in one place. You describe the invoice, it goes out by email or Telegram, your client reviews and agrees before anything is charged, pays straight to your wallet, and the invoice turns paid only once Celo confirms the transfer. The same records are there whether you work from the web, Telegram, or an AI assistant.</p>
        </div>
      </section>

      {/* FEATURES */}
      <section className={cx('sec', 'sec-top0')} id="features">
        <div className={styles.wrap}>
          <div className={cx('sec-head', 'reveal')}>
            <h2>Everything it takes to get paid</h2>
            <p>Built around how small businesses and cross-border teams actually invoice.</p>
          </div>
          <div className={styles.bento}>
            <div className={cx('card', 'wide', 'reveal')}>
              <div className={styles.ico}><Ic><path d="M12 8V4H8" /><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M2 14h2M20 14h2M15 13v2M9 13v2" /></Ic></div>
              <h3>Write invoices the way you speak</h3>
              <p>No forms to learn. Tell CeloDesk what you are owed and it drafts the invoice, picks the currency, and gets it ready to send.</p>
              <div className={styles['demo-line']}>you: <span className={styles.g}>invoice Carlos $25.000 in pesos for the photo shoot, monthly</span></div>
            </div>
            <div className={cx('card', 'reveal')}><div className={styles.ico}><Ic><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></Ic></div><h3>It sends itself by email</h3><p>Add the client&apos;s email and CeloDesk delivers a secure pay link straight to their inbox.</p></div>
            <div className={cx('card', 'reveal')}><div className={styles.ico}><Ic><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></Ic></div><h3>Reaches them on Telegram</h3><p>Add a Telegram username and the client gets a one-tap link that opens the invoice in the bot.</p></div>
            <div className={cx('card', 'reveal')}><div className={styles.ico}><Ic><path d="M12 2 4 6v6c0 5 3.5 7.5 8 10 4.5-2.5 8-5 8-10V6Z" /><path d="m9 12 2 2 4-4" /></Ic></div><h3>Client agrees first</h3><p>Every invoice has an accept and decline step. Nothing is charged without the client&apos;s tap, so it can never catch someone out.</p></div>
            <div className={cx('card', 'reveal')}><div className={styles.ico}><Ic><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></Ic></div><h3>Set it to repeat</h3><p>Retainers and subscriptions go out on their own schedule. The client accepts once, then pays each cycle.</p></div>
            <div className={cx('card', 'wide', 'reveal')}>
              <div className={styles.ico}><Ic><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v2" /><path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></Ic></div>
              <h3>Pay from any wallet, built for MiniPay</h3>
              <p>Open the invoice inside MiniPay and it connects on its own, with gas handled for you. MetaMask, other Celo wallets and a scan to pay all work too.</p>
              <div className={styles.wallets}>
                <span className={cx('wchip', 'rec')}><Ic sm><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v2" /><path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></Ic> MiniPay</span>
                <span className={styles.wchip}><Ic sm><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 12h.01" /></Ic> MetaMask</span>
                <span className={styles.wchip}><Ic sm><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 20h.01M20 14h.01M14 20h.01" /></Ic> Scan to pay</span>
              </div>
            </div>
            <div className={cx('card', 'reveal')}><div className={styles.ico}><Ic><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z" /></Ic></div><h3>Bill in local currency</h3><p>Invoice in reais, pesos or soles with Ripio wFIAT, so the amount the client sees is the amount you quoted.</p></div>
            <div className={cx('card', 'reveal')}><div className={styles.ico}><Ic><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Ic></div><h3>Dollars across borders</h3><p>Settle in USA₮ over x402 between independent parties, with no gas for the payer.</p></div>
            <div className={cx('card', 'reveal')}><div className={styles.ico}><Ic><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></Ic></div><h3>Proven on-chain</h3><p>CeloDesk checks the real transaction before marking anything paid. Never trusting a screenshot.</p></div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className={cx('sec', 'sec-top0')} id="how">
        <div className={styles.wrap}>
          <div className={cx('sec-head', 'reveal')}>
            <h2>From the ask to the receipt</h2>
            <p>Five steps, and your client only ever taps and confirms.</p>
          </div>
          <div className={styles.ledger}>
            <div className={cx('lrow', 'reveal')}><div className={styles.step}>step 01</div><h4>Create</h4><p>Describe the invoice and pick the currency. Add the client&apos;s email or Telegram.</p></div>
            <div className={cx('lrow', 'reveal')}><div className={styles.step}>step 02</div><h4>Send</h4><p>CeloDesk delivers the pay link by email or Telegram for you.</p></div>
            <div className={cx('lrow', 'reveal')}><div className={styles.step}>step 03</div><h4>Accept</h4><p>The client reviews and agrees before any payment is possible.</p></div>
            <div className={cx('lrow', 'reveal')}><div className={styles.step}>step 04</div><h4>Pay</h4><p>They pay from MiniPay or any Celo wallet, straight to you.</p></div>
            <div className={cx('lrow', 'reveal')}><div className={styles.step}>step 05</div><h4>Verify</h4><p>Celo confirms the transfer and the invoice turns paid, with a receipt for both sides.</p></div>
          </div>
        </div>
      </section>

      {/* CURRENCIES */}
      <section className={cx('sec', 'sec-top0')} id="currencies">
        <div className={styles.wrap}>
          <div className={cx('sec-head', 'reveal')}>
            <h2>The currency your client thinks in</h2>
            <p>Local money for local work, dollars when the deal crosses a border.</p>
          </div>
          <div className={styles['cur-grid']}>
            <div className={cx('cur-card', 'latam', 'reveal')}>
              <h3>Local currencies for LatAm</h3>
              <p>A designer in São Paulo bills in reais. A shop in Bogotá bills in pesos. With Ripio wFIAT on Celo there is no mental math and no conversion spread on every invoice.</p>
              <div className={styles['tok-row']}>
                <span className={styles.tok}><b>wBRL</b><small>real</small></span><span className={styles.tok}><b>wARS</b><small>peso</small></span><span className={styles.tok}><b>wMXN</b><small>peso</small></span>
                <span className={styles.tok}><b>wCOP</b><small>peso</small></span><span className={styles.tok}><b>wCLP</b><small>peso</small></span><span className={styles.tok}><b>wPEN</b><small>sol</small></span>
              </div>
            </div>
            <div className={cx('cur-card', 'reveal')}>
              <h3>Dollars across borders</h3>
              <p>When two independent parties settle in US dollars, CeloDesk uses USA₮ over the x402 lane. The payer signs, the facilitator covers the gas, and funds move directly.</p>
              <div className={styles['tok-row']}><span className={styles.tok}><b>USA₮</b><small>cross-border dollar</small></span><span className={styles.tok}><b>USDC</b></span><span className={styles.tok}><b>USDT</b></span></div>
            </div>
          </div>
        </div>
      </section>

      {/* DEVELOPERS */}
      <section className={cx('sec', 'sec-top0')} id="developers">
        <div className={styles.wrap}>
          <div className={styles['cur-grid']}>
            <div className={cx('cur-card', 'reveal')}>
              <div className={styles.kick}>For developers and agents</div>
              <h3>CeloDesk speaks MCP</h3>
              <p>Connect a supported AI assistant to a live CeloDesk account over MCP and it can create, read and verify real invoices. The agent carries its own ERC-8004 identity on Celo, so the desk is as usable by software as it is by a person.</p>
              <div className={styles['tok-row']}>
                <a className={styles.wchip} href={MCP_URL} target="_blank" rel="noreferrer"><Ic sm><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></Ic> MCP endpoint</a>
                <a className={styles.wchip} href={REPO_URL} target="_blank" rel="noreferrer"><Ic sm><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></Ic> GitHub</a>
              </div>
            </div>
            <div className={cx('cur-card', 'center-col', 'reveal')}>
              <div className={styles['dev-rows']}>
                <div className={styles['r-row']}><span>Agent identity</span><b>ERC-8004 #9799</b></div>
                <div className={styles['r-row']}><span>Registry</span><b>0x8004…a432</b></div>
                <div className={styles['r-row']}><span>Attribution</span><b>celo_3fce…81fc</b></div>
                <div className={styles['r-row']}><span>x402 support</span><b>yes</b></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={cx('sec', 'sec-top0')} id="faq">
        <div className={styles.wrap}>
          <div className={cx('sec-head', 'reveal')}><h2>Questions, answered</h2></div>
          <div className={styles['faq-grid']}>
            <div className={cx('faq-item', 'reveal')}><h4>Is CeloDesk custodial?</h4><p>No. Clients pay straight to your wallet and you hold your own keys. CeloDesk never takes custody of funds.</p></div>
            <div className={cx('faq-item', 'reveal')}><h4>What does verified on-chain mean?</h4><p>Before an invoice is marked paid, CeloDesk reads the actual transaction on Celo mainnet and confirms the transfer. Not a screenshot, the chain itself.</p></div>
            <div className={cx('faq-item', 'reveal')}><h4>Which wallets can my client use?</h4><p>MiniPay with gas handled for them, MetaMask, other Celo wallets, or a scan-to-pay QR. No CeloDesk account is required to pay.</p></div>
            <div className={cx('faq-item', 'reveal')}><h4>What does it cost?</h4><p>CeloDesk is free to use. You pay only the normal network cost of a Celo transaction, and MiniPay often covers that for the payer.</p></div>
            <div className={cx('faq-item', 'reveal')}><h4>Which currencies are supported?</h4><p>Ripio wFIAT local currencies (wBRL, wARS, wMXN, wCOP, wCLP, wPEN) and dollar stablecoins including USA₮, USDC and USDT.</p></div>
            <div className={cx('faq-item', 'reveal')}><h4>Do my clients need an account?</h4><p>No. They open the pay link, review the invoice, accept, and pay from their own wallet. That is the whole flow.</p></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={cx('sec', 'sec-top0')}>
        <div className={styles.wrap}>
          <div className={cx('cta-band', 'reveal')}>
            <h2>Your work, your currency, paid and proven</h2>
            <p>Create an invoice in under a minute, send it where your client already is, and watch it settle on Celo.</p>
            <div className={styles['cta-row']}>
              <Link href="/dashboard" className={cx('btn', 'btn-primary', 'btn-lg')}>Open the desk</Link>
              <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer" className={cx('btn', 'btn-line', 'btn-lg')}><Ic sm><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></Ic> Talk to it on Telegram</a>
            </div>
            <div className={styles['contact-line']}>Questions before you start? Email <a href={CONTACT}>hello@celodesk.xyz</a></div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.foot}>
        <div className={styles.wrap}>
          <div className={styles['foot-grid']}>
            <div className={styles['foot-brand']}>
              <div className={styles.brand}><span className={styles.mark}>C</span> CeloDesk</div>
              <p>A stablecoin invoicing desk on Celo. Bill in your own currency, send it where your client already is, and let the chain prove it was paid.</p>
              <div className={styles['foot-contact']}><a href={CONTACT}><Ic sm><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></Ic> hello@celodesk.xyz</a></div>
            </div>
            <div className={styles['foot-col']}>
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#currencies">Currencies</a>
              <a href="#how">How it works</a>
              <a href="#faq">FAQ</a>
              <Link href="/dashboard">Open the desk</Link>
            </div>
            <div className={styles['foot-col']}>
              <h5>Developers</h5>
              <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
              <a href={MCP_URL} target="_blank" rel="noreferrer">MCP endpoint</a>
              <a href={AGENT_CARD} target="_blank" rel="noreferrer">Agent card</a>
              <a href={AGENT_SCAN} target="_blank" rel="noreferrer">Agent on Celoscan</a>
            </div>
            <div className={styles['foot-col']}>
              <h5>Company</h5>
              <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">Telegram bot</a>
              <Link href="/privacy">Privacy</Link>
              <a href={CONTACT}>Contact</a>
              <a href="https://celo.org" target="_blank" rel="noreferrer">Built on Celo</a>
            </div>
          </div>
          <div className={styles['foot-bottom']}>
            <p>© 2026 CeloDesk. Non-custodial. You hold your keys.</p>
            <div className={styles['foot-meta']}>
              <span><Ic sm>{Check}</Ic> Celo mainnet</span>
              <span><Ic sm>{Check}</Ic> Verified on-chain</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
