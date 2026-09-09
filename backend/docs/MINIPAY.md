# MINIPAY.md — real integration findings

Researched against docs.celo.org and docs.minipay.xyz (current as of
this build). This replaces the "not yet researched" flag in
CLAUDE_2_FRONTEND.md — read this before building checkout.

## How MiniPay actually works
MiniPay is Opera's Celo wallet, available standalone and inside the
Opera Mini browser. When your site loads **inside MiniPay's in-app
browser**, it injects a standard EIP-1193 provider at `window.ethereum`
— same shape as MetaMask — with one extra flag:

```js
window.ethereum?.isMiniPay === true
```

There is no separate MiniPay SDK to install. Detect it, then treat it
like any injected wallet.

## What to actually build
```js
useEffect(() => {
  if (window.ethereum?.isMiniPay) {
    // Hide any "Connect Wallet" button — MiniPay's connection is
    // implicit, showing a connect prompt is a bad user experience.
    setHideConnectBtn(true);
    connect({ connector: injected({ target: 'metaMask' }) }); // wagmi-style auto-connect
  }
}, []);
```
(Source pattern confirmed against Celo's own MiniPay quickstart docs.)

## ⚠️ Real conflict with our auth design — needs a decision
MiniPay's own best-practices docs explicitly say:

> **"Do not prompt users to sign a message to access your site or to
> authenticate."**

That directly conflicts with `POST /api/auth/wallet` (our
sign-a-message login flow, see SECURITY.md/INTEGRATION.md) — which
isn't wired into any route yet, so nothing breaks *today*, but this
needs a real decision before that auth gets turned on:

**Options:**
1. Skip the signature requirement specifically when `isMiniPay` is
   detected — trust the injected `window.ethereum` connected address
   directly for MiniPay users (lower assurance, but matches the
   wallet's own UX guidance and MiniPay's connection is already
   somewhat implicit/trusted by design).
2. Keep signature-based auth for the web dashboard (desktop merchants)
   and treat MiniPay checkout as a client-side flow that doesn't need
   merchant-level auth at all (clients paying an invoice were never
   going to need an account anyway — only merchants creating invoices
   need auth, and merchants are more likely on desktop/dashboard, not
   paying via MiniPay).

Leaning toward option 2 — it sidesteps the conflict entirely, since
MiniPay in this product is a **client-side payment channel**, not a
merchant login channel. Flagging here for whoever wires auth to
confirm before flipping it on.

## Token/network compatibility — good news, matches what we built
- MiniPay only operates on **Celo mainnet and Celo Sepolia testnet**
  — no other chains. Matches our `chainId: 42220` assumption exactly.
- MiniPay's supported stablecoins are **USDm, USDC, and USDT** — all
  three are already in our verified registry (`src/celo/tokens.ts`).
  `NGNm` is NOT confirmed supported inside MiniPay specifically —
  don't default a MiniPay checkout to NGNm without testing it live.
- MiniPay supports paying gas in an alternate `feeCurrency` (was
  historically cUSD/USDm-only; more may be supported now — verify
  live rather than assuming).

## Testing (can't use an emulator)
1. Run your dev server, tunnel it with `ngrok http 3000` (or whatever
   port).
2. On a real Android or iOS device with MiniPay installed: Settings →
   tap the version number repeatedly to enable Developer Mode →
   Developer Settings → Load Test Page → paste your ngrok URL.
3. Toggle "Use Testnet" in Developer Settings if you want Celo Sepolia
   instead of mainnet for testing.

No emulator path exists — budget for real-device testing time.
