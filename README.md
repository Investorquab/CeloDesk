# CeloDesk

> **Ask for payment. Get paid. Know when it's paid.**

CeloDesk is an AI-powered payment desk for businesses, freelancers, and creators using stablecoins on Celo.

It lets a merchant **create an invoice, share it, receive a direct wallet payment, verify that payment on-chain, and track the result** — from the web, Telegram, or an external AI assistant such as Claude.

## 🚀 Try CeloDesk

### 🌐 Live app

**[Open CeloDesk →](https://celo-desk.vercel.app)**

Create an invoice, share it, and open the customer payment page.

### 💬 Telegram

**[Open CeloDesk on Telegram →](https://t.me/celoagentbot)**

Talk to CeloDesk in plain English.

Try:

> Create an invoice for Moji for 0.01 USDT for a design job.

> Who still owes me?

> Show me my payment summary.

### 🤖 Claude / MCP

**[Open the CeloDesk MCP endpoint →](https://mcp.185-7-81-139.sslip.io/mcp)**

CeloDesk can be connected to a supported MCP client so an AI assistant can work with real CeloDesk invoices and payment data.

### 📦 Source code

**[View the GitHub repository →](https://github.com/Investorquab/CeloDesk)**

---

## 💡 What problem does CeloDesk solve?

Receiving crypto payments can become messy:

- sharing wallet addresses
- creating payment requests
- sending invoice details
- checking whether someone actually paid
- tracking who still owes money
- switching between different tools to manage everything

CeloDesk brings that workflow into one place.

### The simple idea

**Create → Share → Pay → Verify → Track**

A business does not need to become a blockchain expert just to get paid in stablecoins.

---

## ✨ What we built

### 🧾 AI-powered invoicing

A merchant can tell CeloDesk what they want in normal language.

For example:

> “Create an invoice for David for 5 USDT for website design.”

CeloDesk creates the real invoice.

### 💳 Direct wallet payments

Customers pay directly to the merchant's receiving wallet.

The customer checkout includes a **direct payment QR**. Scanning it with a compatible wallet prepares the token payment for the merchant.

**The QR is a payment request — it is not an invoice-website redirect.**

### ⛓️ On-chain payment verification

CeloDesk does not simply trust a screenshot or a message saying “I paid.”

It checks the actual transaction on Celo before recording the payment as verified.

### 🤖 AI access

The same payment desk can be controlled through:

**Web → Telegram → Claude**

These are different interfaces connected to the same CeloDesk backend and payment records.

### 💬 Telegram

A merchant can create invoices and check payment activity directly from Telegram.

### 🌍 Celo

Celo Mainnet is used for payment settlement and verification.

---

## 🔥 The part we actually proved

We tested the important payment loop with a real direct QR payment:

**QR scan → wallet prepares payment → customer confirms → payment reaches merchant wallet → CeloDesk detects the transfer → invoice becomes PAID → Claude reads the updated PAID status.**

Telegram can also read the same payment state.

That means the product is not just three interfaces placed beside each other. The interfaces connect to the same underlying payment system.

---

## 🧩 How it works

Merchant side:

**Merchant → Web / Telegram / Claude → CeloDesk API → Invoice & payment records → Payment verification → Celo Mainnet**

Customer side:

**Public invoice → Direct payment QR / wallet → Celo transaction → CeloDesk verification → PAID → Merchant**

---

## 🔐 Why the payment status can be trusted

The important rule is simple:

> **CeloDesk only treats a payment as PAID after the backend verifies the on-chain payment.**

The verification process checks the relevant transaction details, including:

- successful transaction
- Celo network
- expected token
- merchant receiving wallet
- required amount
- confirmation state
- duplicate-payment protection

For direct QR payments, CeloDesk also reconciles the on-chain token transfer with the appropriate outstanding invoice.

CeloDesk does **not** custody the customer's funds.

---

## 🪙 Supported payment tokens

The current verified invoice/payment flow supports:

- **USDT**
- **USDC**
- **USDm**
- **NGNm**

Payments settle on **Celo Mainnet (chain ID 42220)**.

---

## 🤖 What the AI can do

CeloDesk's AI interfaces can perform real payment-management operations such as:

- 🧾 Create invoices
- 🔎 Check invoice status
- 📋 List invoices
- 💰 View payment summaries
- 👤 View merchant profile
- 🔗 Retrieve invoice/payment information

The AI does not get to simply declare an invoice paid. The payment state comes from the CeloDesk backend and its verification layer.

---

## Track 1: Local currencies for LatAm (Ripio wFIAT)

**Who it serves.** A freelancer in Sao Paulo, a designer in Buenos Aires, a small shop in Bogota. They price their work in reais, pesos or soles, their clients think in those currencies, and their costs are in those currencies. Being paid in a US dollar stablecoin forces everyone to do mental FX on every invoice and absorb conversion spread twice.

**Why local currency matters.** When the invoice, the payment and the record are all in the merchant's own currency, there is nothing to convert and nothing to reconcile against a moving exchange rate. The amount a client sees is the amount the merchant quoted, down to the centavo.

**What CeloDesk does.** Merchants can invoice and settle in **Ripio wFIAT** stablecoins, each pegged to a local currency and issued natively on Celo:

| Token | Currency | Example display |
|-------|----------|-----------------|
| wBRL  | Brazilian real    | R$ 1.500,00 |
| wARS  | Argentine peso     | $ 25.000,00 |
| wMXN  | Mexican peso       | $349.50 |
| wCOP  | Colombian peso     | COP amounts |
| wCLP  | Chilean peso       | CLP amounts |
| wPEN  | Peruvian sol       | S/ amounts |

All six are 18-decimal ERC-20s whose addresses were taken from the [Celo stablecoin contracts reference](https://docs.celo.org/build/tools/contracts/stablecoin-contracts) and verified on-chain before being added to the registry (`backend/src/celo/tokens.ts`).

Local currency is threaded through every surface:

- **Web app** — amounts render in the token's own currency (for example `R$ 1.500,00 wBRL`) on the checkout page, dashboard and activity feed.
- **Telegram** — the invoice card and the assistant speak the local currency; a merchant can say "invoice 500 reais to Joao" and get a wBRL invoice.
- **MCP / Claude** — the same tokens are available to external assistants, validated against the verified registry.
- **"Who owes me" and summaries** are reported per currency and never summed across currencies, because wBRL, wARS and USDC are not interchangeable one-to-one.

---

## Track 2: Open corridors with USA₮ over x402

**Who it serves.** Cross-border settlement between independent parties, including machine-to-machine and agent-to-agent payments, where a US dollar settlement asset is the right unit of account and gas should not be the payer's problem.

**Why USA₮ and x402.** USA₮ (Tether America USD, issued by Anchorage Digital Bank) is a US-regulated dollar stablecoin on Celo, settled through the hosted **x402 facilitator** with the gasless **EIP-3009 `transferWithAuthorization`** scheme: the payer signs an authorization off-chain, the facilitator submits it on-chain and pays the gas, and funds move payer to merchant directly. Nobody custodies the payment, and the payer needs no CELO for gas.

**What CeloDesk does.** A merchant issues a USA₮ invoice; a paying agent can settle it over x402:

1. `GET /api/x402/invoices/:id/requirements` returns the x402 payment requirements (payTo = merchant wallet, asset = USA₮, amount in atomic units).
2. The payer signs an EIP-3009 authorization and POSTs the x402 payload to `/api/x402/invoices/:id/pay`.
3. CeloDesk calls the facilitator `/verify`, then `/settle`, records the payment, and marks the invoice paid.

The buyer side is demonstrated by `backend/scripts/x402-pay.ts` (`npm run x402-pay -- <invoiceId>`), which signs and submits as an independent payer.

The facilitator is `https://api.x402.celo.org` (mainnet), confirmed to settle USA₮ via `GET /supported`. Settlement is gas at cost plus 0.3%, with a free-credit allowance.

**Attribution note.** x402 settlements through the hosted facilitator cannot carry an attribution tag. For this lane the organisers record the merchant **PayTo wallet** (the invoice receiving wallet) instead. CeloDesk's agent-wallet attribution requirement is satisfied separately by a tagged transaction from the agent wallet (see the ERC-8004 section).

---

## 🧪 Current product status

### Working and tested

- ✅ Live web application
- ✅ Invoice creation
- ✅ Public customer checkout
- ✅ Direct payment QR
- ✅ Compatible-wallet payment flow
- ✅ Celo on-chain payment detection
- ✅ Payment reconciliation to PAID
- ✅ Claude / MCP access
- ✅ Telegram agent
- ✅ Shared payment state across interfaces
- ✅ Production backend, agent, and MCP services
- ✅ Production frontend deployment

### Not claimed as complete

- ⏳ MiniPay-specific QR/deep-link testing requires the approved MiniPay developer testing environment.

The current QR is therefore described as a **compatible-wallet payment QR**, not a universal MiniPay QR.

---

## 🔗 Important links

| Resource | Open |
|---|---|
| 🌐 **CeloDesk** | **[Live app](https://celo-desk.vercel.app)** |
| 💬 **Telegram** | **[Open bot](https://t.me/celoagentbot)** |
| 🤖 **MCP** | **[Open endpoint](https://mcp.185-7-81-139.sslip.io/mcp)** |
| 📦 **GitHub** | **[View source](https://github.com/Investorquab/CeloDesk)** |
| ⛓️ **Celo** | **[Celo mainnet explorer](https://celoscan.io/)** |
| 📚 **Demo guide** | **[End-to-end demo](docs/DEMO.md)** |
| 🏗️ **Technical overview** | **[Architecture](docs/ARCHITECTURE.md)** |

---

## 🎥 Recommended demo

The strongest product demonstration is one real payment:

1. Create an invoice.
2. Open the public payment page.
3. Scan the direct payment QR.
4. Confirm the wallet payment.
5. Show the transaction on Celo.
6. Show CeloDesk changing the invoice to **PAID**.
7. Ask Claude to check the invoice.
8. Ask Telegram to show the same payment state.

See **[docs/DEMO.md](docs/DEMO.md)** for the short demonstration guide.

---

## 🛠️ For developers

The repository contains four main application areas:

| Folder | Purpose |
|---|---|
| `frontend/` | Web app, merchant dashboard and customer checkout |
| `backend/` | API, invoice logic and payment verification |
| `agent/` | Telegram agent |
| `mcp/` | Remote MCP server |

The project uses Next.js, React, TypeScript, Node.js, Express, PostgreSQL, Prisma, Celo, Groq, Telegram, and MCP.

Local development requires Node.js, PostgreSQL, a Celo RPC endpoint, and the relevant API/bot credentials.

Never commit real secrets such as database credentials, API keys, Telegram tokens, JWT secrets, or private keys.

---

## 🏁 In one sentence

**CeloDesk turns stablecoin payments into a simple business workflow: create an invoice, get paid directly, verify the payment on Celo, and manage everything from the web, Telegram, or AI.**
