# CeloDesk

> **The stablecoin payment desk that works like an agent.**
> Ask for payment in plain language. Get paid directly on Celo. Know it's paid — because it was verified on-chain.

CeloDesk is an AI-native payments agent for freelancers, small businesses and creators on **Celo**. A merchant works with CeloDesk from **the web, Telegram, or any MCP client (e.g. Claude)** to create an invoice, share a pay-by-link page, receive a direct wallet payment, **verify that payment on-chain**, and track who still owes them — in US-dollar stablecoins, in **Ripio wFIAT local currencies** (wBRL, wARS…), or over the **x402 / USA₮** corridor. It also pays many people at once with **Batch Pay**, a single on-chain payout to independent wallets.

CeloDesk is non-custodial: it never holds a customer's funds or keys.

---

## Try it in 60 seconds

| | Link | What to do |
|---|---|---|
| 🌐 **Live app** | **https://celodesk.xyz** | Create an invoice, share it, open the customer pay page |
| 💬 **Telegram** | **https://t.me/celoagentbot** | *"Create an invoice for Moji for 0.01 USDT"* · *"Who owes me?"* · *"Create a batch pay"* |
| 🤖 **MCP endpoint** | **https://mcp.celodesk.xyz/mcp** | Connect from Claude / any MCP client and work with real invoices and batches |
| 🪪 **ERC-8004 agent card** | **https://celodesk.xyz/.well-known/agent-card.json** | The agent's on-chain identity document |
| 📦 **Source** | **https://github.com/Investorquab/CeloDesk** | Full monorepo (frontend, backend, agent, mcp) |
| ⛓️ **On-chain proof** | **[docs/PROOF.md](docs/PROOF.md)** | Every claim below, with Celoscan tx hashes |

> **A judge can verify the whole story from the links above:** open the agent card, follow the tx hashes in [docs/PROOF.md](docs/PROOF.md) on Celoscan, and decode the attribution tag with `npm run verify-tag -- <txHash>`.

---

## The problem

Getting paid in crypto is still a mess of loose parts: sharing raw wallet addresses, assembling a payment request, chasing whether someone actually paid, reconciling the on-chain transfer to the right invoice, and tracking who still owes you — across several disconnected tools. And when the people on either side don't price their work in US dollars, every invoice adds a layer of mental FX and double conversion spread.

**CeloDesk collapses that into one agent:** `Create → Share → Pay → Verify → Track`, in the currency that actually fits the user — reachable from the web, a Telegram chat, or an AI assistant, all backed by the same verified payment ledger.

---

## What we built

### 🧾 AI-native invoicing
Tell CeloDesk what you want in natural language — *"Invoice David 5 USDT for website design"* or *"invoice 500 reais to João"* — and it creates a real invoice and delivers it to the client by email (and optionally Telegram). The merchant never has to forward a link themselves.

### 💳 Direct, non-custodial wallet payments
Customers pay straight to the merchant's receiving wallet from a public checkout with a direct-payment QR. CeloDesk never touches the funds.

### ⛓️ On-chain payment verification
CeloDesk does not trust a screenshot or an "I paid" message. The backend checks the actual Celo transaction — success, correct network, expected token, merchant wallet, required amount, confirmation, and duplicate-payment protection — before an invoice is marked **PAID**. The AI can *read* that status but can never *declare* it.

### 👥 Batch Pay — pay many independent people in one transaction
An organizer creates a Batch, shares one link, and each payee submits **their own** wallet, amount and token (so they are genuinely independent parties). The organizer approves the legitimate ones — and can reject one with a reason that is **emailed to the payee so they can fix and resubmit** — then pays everyone at once in a **single tagged `disperseToken` transaction** via the verified Disperse contract on Celo mainnet. Available in the web app, Telegram and MCP.

### 🪪 A real on-chain agent identity (ERC-8004)
CeloDesk's agent holds **ERC-8004 identity #9799** on Celo's official Identity Registry, pointing at a live agent card (web, MCP and A2A endpoints, `x402Support: true`). See [On-chain proof](#on-chain-proof).

### 🌍 One agent, three surfaces
The web dashboard, the Telegram bot (`@celoagentbot`) and the MCP server are three front-ends over the **same backend and the same payment records** — not three separate demos. A payment made on the web is immediately visible to Claude and Telegram.

---

## On-chain proof

All on **Celo Mainnet (chain 42220)**. Attribution tag: **`celo_3fce81a170fc`**. Agent wallet: **`0x00d1E86040d88397F4eB187c38dC527F6659e486`**.
Full details and explorer links in **[docs/PROOF.md](docs/PROOF.md)**.

| Check | Evidence |
|---|---|
| **ERC-8004 identity** registered from the agent wallet | Identity **#9799** on registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`; card re-pointed to the `celodesk.xyz` domain. Tx [`0x94d27a1…`](https://celoscan.io/tx/0x94d27a1c3bf5531246e853c57c9029d7e7a786c98adbd45ee22941b029be70c4) and [`0x1c61874…`](https://celoscan.io/tx/0x1c6187465f629089cfda100d07ce5aeeeaf44aa097b6b280eb6b912c374173f4) |
| **Tagged transaction from the agent wallet** (in the event window) | Both ERC-8004 txs above carry `celo_3fce81a170fc` in their calldata — satisfied in the same transactions as the identity check |
| **Real settlement between independent parties** | Batch Pay paid **3 independent payee wallets** in one tagged `disperseToken` tx via Disperse `0xD152f549545093347A162Dce210e7293f1452150`: [`0x637834a…`](https://celoscan.io/tx/0x637834a666c64db86c0c0ca18b93d4440d05eeb4dbdfc1d30c433a7c0b2f139f) |

Verify any of them yourself: `npm run verify-tag -- <txHash>` decodes the attribution tag straight from the transaction's calldata.

---

## Track 1 — Local currencies for LatAm (Ripio wFIAT)

**Who it serves.** A freelancer in São Paulo, a designer in Buenos Aires, a shop in Bogotá. They price their work in reais, pesos or soles; their clients and costs are in those currencies. Being paid in a US-dollar stablecoin forces mental FX on every invoice and pays conversion spread twice.

**Why local currency matters.** When the invoice, the payment and the record are all in the merchant's own currency, there is nothing to convert and nothing to reconcile against a moving rate. The amount the client sees is the amount the merchant quoted — down to the centavo.

**What CeloDesk does.** Merchants invoice and settle in **Ripio wFIAT** stablecoins, each pegged to a local currency and issued natively on Celo:

| Token | Currency | Example display |
|-------|----------|-----------------|
| wBRL | Brazilian real | R$ 1.500,00 |
| wARS | Argentine peso | $ 25.000,00 |
| wMXN | Mexican peso | $ 349.50 |
| wCOP | Colombian peso | COP 1.200.000 |
| wCLP | Chilean peso | CLP 90.000 |
| wPEN | Peruvian sol | S/ 350.00 |

Addresses were taken from the [Celo stablecoin contracts reference](https://docs.celo.org/build/tools/contracts/stablecoin-contracts) and verified on-chain before being added to the registry (`backend/src/celo/tokens.ts`). Local currency is threaded through **every** surface: the web checkout/dashboard/activity render each token in its own currency (e.g. `R$ 1.500,00 wBRL`); the Telegram card and assistant speak it; MCP exposes the same tokens; and "who owes me" totals are reported **per currency**, never summed across currencies.

---

## Track 2 — Open corridors with USA₮ over x402

**Who it serves.** Cross-border settlement between independent parties — including machine-to-machine and agent-to-agent payments — where a US-dollar settlement asset is the right unit of account and gas should not be the payer's problem.

**Why USA₮ and x402.** **USA₮** (Tether America USD) is a US-regulated dollar stablecoin on Celo, settled through the hosted **x402 facilitator** using the gasless **EIP-3009 `transferWithAuthorization`** scheme: the payer signs an authorization off-chain, the facilitator submits it and pays gas, funds move payer→merchant directly, and nobody custodies them. The payer needs no CELO.

**What CeloDesk does.** A merchant issues a USA₮ invoice; a paying agent settles it over x402:

1. `GET /api/x402/invoices/:id/requirements` → the x402 payment requirements (payTo = merchant wallet, asset = USA₮, atomic amount).
2. The payer signs an EIP-3009 authorization and POSTs the x402 payload to `/api/x402/invoices/:id/pay`.
3. CeloDesk calls the facilitator `/verify`, then `/settle`, records the payment, and marks the invoice paid.

The buyer side is demonstrated by `backend/scripts/x402-pay.ts` (`npm run x402-pay -- <invoiceId>`), signing as an independent payer. The facilitator is `https://api.x402.celo.org` (mainnet), confirmed to settle USA₮ via `GET /supported`.

**Attribution note.** x402 settlements through the hosted facilitator cannot carry an attribution tag; for this lane the organisers record the merchant **PayTo wallet** (the invoice's receiving wallet) instead. CeloDesk's agent-wallet attribution requirement is met separately by the tagged ERC-8004 transactions above.

---

## Track 2 (extended) — Textile FX corridor  ·  *in progress*

> **Status: planned / in progress — not yet live in the product.** We are honest about this: there is no shipped Textile FX code in this repo yet, and nothing in the UI claims otherwise.

[Textile FX](https://fx-docs.textilecredit.com) is an instant, on-chain FX rail that swaps non-USD stablecoins ↔ USD stablecoins by request-for-quote. On Celo its live corridors include **wARS↔USDT** and **wBRL↔USDT** — a natural fit for CeloDesk, which already handles wBRL/wARS. The planned lane lets a merchant **receive a local-currency (wFIAT) payment and convert it to USDT in a single quoted swap** through Textile's `LimitOrderReactor`, closing the loop between local-currency invoicing (Track 1) and a dollar-settled corridor. We will ship this only if it genuinely settles against a live maker quote, and record the proof in [docs/PROOF.md](docs/PROOF.md).

---

## Supported tokens

The verified registry (`backend/src/celo/tokens.ts`) covers **11 tokens** on **Celo Mainnet (42220)**:

- **US-dollar stablecoins:** USDm, USDC, USDT, **USA₮**
- **Ripio wFIAT (LatAm):** wBRL, wARS, wMXN, wCOP, wCLP, wPEN
- **Mento local:** NGNm

Every token symbol, address and decimal count is validated against this single registry on every surface, so the lists can never drift.

---

## How it works

**Merchant side**
`Merchant → Web / Telegram / MCP (Claude) → CeloDesk API → Invoice & payment records → On-chain verification → Celo Mainnet`

**Customer side**
`Public pay page → Direct QR / wallet (or x402 authorization) → Celo transaction → CeloDesk verification → PAID → Merchant`

**Batch Pay**
`Organizer creates a batch → shares one link → payees self-submit wallet+amount+token → organizer approves/rejects → one tagged disperseToken tx pays everyone`

The important invariant: **a payment is PAID only after the backend verifies it on-chain** — the AI layer can read state but never writes "paid".

---

## Built before vs. during *Agents on Open Rails*

CeloDesk's core invoicing existed before the hackathon kicked off (6 Oct 2026). Everything in this section was built **during** the event, in new, clearly described commits:

**Already existed (before):** core invoice create/share/verify/track, the public checkout, direct-QR payments, and the three interfaces (web, Telegram, MCP) over one backend.

**Built during the hackathon:**
- Migrated attribution to the official `@celo/attribution-tags` SDK and the **`celo_3fce81a170fc`** tag, with a startup integrity assert and a `verify-tag` decoder.
- **Track 1:** Ripio wFIAT (wBRL/wARS/wMXN/wCOP/wCLP/wPEN) across backend, web, Telegram and MCP, with per-currency formatting.
- **Track 2:** the USA₮ / x402 settlement lane (facilitator client, `/api/x402` routes, EIP-3009 buyer demo).
- **ERC-8004:** re-registered the agent identity (#9799) to a real CeloDesk card and re-pointed it to the branded `celodesk.xyz` / `mcp.celodesk.xyz` domains.
- **Batch Pay:** data model, supervisor UI, public submission page, one-transaction Disperse payout, reject-with-reason + payee email, and `create_batch`/`list_batches`/`get_batch` in Telegram and MCP.
- Moved the whole stack onto the branded `celodesk.xyz` domain and deployed backend, frontend, bot and MCP.

---

## For developers

| Folder | Purpose |
|---|---|
| `frontend/` | Next.js web app — merchant dashboard, checkout, Batch Pay |
| `backend/` | Express API — invoice logic, on-chain verification, x402, collections, the agent tool registry |
| `agent/` | Telegram bot (forwards to the backend agent) |
| `mcp/` | Remote MCP server |

Stack: Next.js · React · TypeScript · Node.js · Express · PostgreSQL · Prisma · Celo · Groq · Telegram · MCP.

Local dev needs Node.js 20.19+ (22 recommended), PostgreSQL, a Celo RPC endpoint, and the relevant API/bot credentials. **Never commit secrets** (database URLs, API keys, Telegram tokens, JWT secrets, private keys). See **[docs/DEMO.md](docs/DEMO.md)** for an end-to-end walkthrough and **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the technical overview.

---

## In one sentence

**CeloDesk turns stablecoin payments into a simple business workflow — create an invoice, get paid directly, verify it on Celo, and manage everything from the web, Telegram or an AI assistant — in dollars, in local currency, across corridors, and to many people at once.**
