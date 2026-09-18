# CeloDesk

> **Ask for payment. Get paid. Know when it's paid.**
>
> CeloDesk is an AI-powered payment desk for businesses, freelancers, and creators using stablecoins on Celo.

[🌐 Open CeloDesk](https://celo-desk.vercel.app) · [💬 Open Telegram](https://t.me/celoagentbot) · [🤖 Connect MCP](https://mcp.185-7-81-139.sslip.io/mcp) · [📦 View source](https://github.com/Investorquab/CeloDesk)

---

## What did we build?

CeloDesk makes crypto invoicing feel more like a normal business payment workflow.

A merchant can:

**Create an invoice → share it → receive a stablecoin payment → have CeloDesk verify the payment → track who has paid and who still owes money.**

And the merchant can manage the same payment desk from **three different places**:

- 🌐 **Web app** — create invoices, share them, view payments, and use the customer checkout.
- 💬 **Telegram** — talk to CeloDesk in plain English to create invoices and check payment activity.
- 🤖 **Claude / MCP** — connect CeloDesk to an external AI assistant and manage real invoices through conversation.

The important part is that these are **not three separate demos**. They connect to the same CeloDesk backend, invoice records, and payment verification system.

---

## 🚀 Try it yourself

### 1. Web app

**[Open the live CeloDesk app →](https://celo-desk.vercel.app)**

Create an invoice, open its payment page, and test the customer checkout.

### 2. Telegram

**[Open the CeloDesk Telegram bot →](https://t.me/celoagentbot)**

Try messages such as:

> Create an invoice for Moji for 0.01 USDT for a design job.

> Which invoices are still unpaid?

> Show me my payment summary.

### 3. Claude / MCP

**[Open the CeloDesk MCP endpoint →](https://mcp.185-7-81-139.sslip.io/mcp)**

Once connected to a supported MCP client, Claude can work with the merchant's real CeloDesk data.

Try:

> Create an invoice for a client for 0.01 USDT for an integration test.

Then:

> Check my invoices and tell me which ones have been paid.

---

## 💳 The payment experience

CeloDesk does **not** take custody of the client's money.

The invoice contains the merchant's receiving wallet and the selected stablecoin. A client can pay directly from a compatible Celo wallet.

The checkout also provides a **direct payment QR request**. Scanning it with a compatible wallet prepares the token transfer to the merchant's wallet.

There is no requirement for the client to send a screenshot or manually tell CeloDesk that they paid.

After the transfer reaches Celo:

**CeloDesk checks the blockchain and records the verified payment.**

### What we have verified

The direct QR flow has been tested with a compatible wallet:

**QR scan → wallet prepares payment → client confirms → payment reaches merchant wallet → CeloDesk detects the transfer → invoice becomes PAID → Claude can read the updated PAID status.**

This is the core payment loop of the product.

> **MiniPay note:** the current QR is intentionally described as a **compatible-wallet payment QR**. MiniPay-specific QR/deep-link behavior is documented separately and is not claimed as verified in the current release.

---

## 🤖 Why the AI matters

The AI is not just a chatbot sitting on top of a static demo.

It can perform real CeloDesk operations.

For example:

> **"Create an invoice for David for 5 USDT for website design."**

CeloDesk can create the actual invoice.

Then:

> **"Who still owes me?"**

CeloDesk reads the merchant's actual invoice/payment data.

And after a client pays:

> **"Check my invoices."**

The AI can see the reconciled payment state from the same backend.

### Available AI operations

- 🧾 Create invoices
- 🔎 Check invoice status
- 📋 List invoices
- 💰 View payment summaries
- 👤 View merchant profile
- 🔗 Retrieve invoice/payment information

---

## 🌍 Why Celo?

CeloDesk uses **Celo Mainnet (chain ID 42220)** as its payment settlement and verification layer.

The product is designed around a simple idea:

> **A business should be able to ask for a stablecoin payment without needing to become a blockchain expert.**

The blockchain remains the source of truth for settlement, while CeloDesk turns that settlement into a usable business workflow.

---

## ✨ What makes CeloDesk different?

### One payment desk, multiple interfaces

A merchant can use the interface that feels natural to them:

**Web → Telegram → Claude**

All three work with the same underlying CeloDesk data.

### Verified payments, not screenshots

CeloDesk does not simply trust a "payment successful" message.

The backend independently checks the transaction on Celo before recording a verified payment.

### Direct wallet payments

Clients pay directly to the merchant's receiving wallet.

CeloDesk does not need to hold customer funds.

### AI + real financial actions

The AI can create and inspect real invoices instead of only answering generic questions about payments.

---

## 🧩 Product flow

```text
                    MERCHANT
                       │
              ┌────────┼────────┐
              │        │        │
              ▼        ▼        ▼
            Web     Telegram   Claude
              │        │        │
              └────────┼────────┘
                       ▼
                 CeloDesk API
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
          Invoices          Payment verifier
                                   │
                                   ▼
                             Celo Mainnet
                                   │
                                   ▼
                              Merchant wallet
```

Customer side:

```text
Invoice page
     │
     ▼
Choose compatible wallet
     │
     ▼
Direct payment QR / wallet flow
     │
     ▼
Celo transaction
     │
     ▼
CeloDesk verifies transfer
     │
     ▼
Invoice → PAID
     │
     ├── Web dashboard
     ├── Telegram
     └── Claude / MCP
```

---

## 🏗️ What is inside the project?

| Part | What it does |
|---|---|
| 🌐 `frontend/` | Web app, merchant dashboard, invoice creation, checkout and payment UI |
| ⚙️ `backend/` | Authentication, invoices, payment verification, merchant data and AI operations |
| 💬 `agent/` | Telegram agent |
| 🤖 `mcp/` | Remote MCP server for external AI clients such as Claude |
| 🗄️ `prisma/` | Database schema and migrations |
| 📚 `docs/` | Architecture, security, integration and submission documentation |

### Technology

- Next.js / React / TypeScript
- Node.js / Express
- PostgreSQL / Prisma
- Celo Mainnet
- Groq
- Telegram / Telegraf
- Model Context Protocol (MCP)
- EVM-compatible wallet payments

---

## 🔐 Payment verification

When a payment is submitted through the normal checkout flow, CeloDesk verifies the transaction independently.

The verification layer checks things including:

- successful transaction
- correct Celo network
- expected token
- merchant receiving wallet
- payment amount
- confirmation depth
- duplicate transaction protection

Direct QR payments are also reconciled by looking for verified token transfers to the invoice's receiving wallet.

Because a direct ERC-20 transfer does not contain a CeloDesk invoice ID, direct-payment reconciliation uses the merchant, token, receiving wallet, amount, timing, and existing payment records to match the transfer to an outstanding invoice.

---

## 📊 Invoice statuses

CeloDesk can represent invoice states including:

```text
DRAFT
  ↓
SENT
  ↓
VIEWED
  ↓
PENDING
  ↓
PAID

PARTIALLY_PAID → PAID
               ↘ OVERPAID

OVERDUE / CANCELLED / FAILED / EXPIRED
```

The important rule is:

> **PAID means CeloDesk has verified a payment.**

---

## 🧪 Current verified status

The current release has been tested across the main product paths:

- ✅ Live web application
- ✅ Invoice creation
- ✅ Public invoice/payment page
- ✅ Direct payment QR with a compatible wallet
- ✅ On-chain payment detection
- ✅ Invoice reconciliation to PAID
- ✅ Claude/MCP invoice access
- ✅ Claude reading reconciled payment status
- ✅ Telegram agent and formatted responses
- ✅ Production backend / agent / MCP services
- ✅ Frontend production build/deployment
- ⏳ MiniPay-specific QR/deep-link testing remains a separate follow-up after approved MiniPay developer access

For the exact final submission procedure, see **[docs/SUBMISSION.md](docs/SUBMISSION.md)**.

---

## 🔗 Important links

| Resource | Link |
|---|---|
| 🌐 **Live CeloDesk** | https://celo-desk.vercel.app |
| 💬 **Telegram bot** | https://t.me/celoagentbot |
| 🤖 **MCP endpoint** | https://mcp.185-7-81-139.sslip.io/mcp |
| 📦 **GitHub repository** | https://github.com/Investorquab/CeloDesk |
| 👛 **CeloDesk agent wallet** | https://celoscan.io/address/0x00d1E86040d88397F4eB187c38dC527F6659e486 |
| 📚 **Submission checklist** | [docs/SUBMISSION.md](docs/SUBMISSION.md) |
| 🛡️ **Security notes** | [backend/docs/SECURITY.md](backend/docs/SECURITY.md) |
| 🏛️ **Architecture** | [backend/docs/ARCHITECTURE.md](backend/docs/ARCHITECTURE.md) |
| 💬 **Telegram integration** | [docs/TELEGRAM.md](docs/TELEGRAM.md) |

---

## 🧑‍💻 For developers

The technical documentation lives under `docs/` and `backend/docs/`.

If you only want to understand the product, **you do not need to read the technical documentation**. Start with the live app and the sections above.

If you want to run the project locally:

### Requirements

- Node.js 20+
- PostgreSQL
- Celo RPC endpoint
- Groq API key
- Telegram bot token for the Telegram agent

### Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Telegram agent

```bash
cd agent
npm install
npm run dev
```

### MCP server

```bash
cd mcp
npm install
npm run build
npm start
```

Never commit real secrets such as database credentials, JWT secrets, API keys, Telegram tokens or private keys.

---

## 📚 Documentation map

**Start here:** [Submission guide](docs/SUBMISSION.md)

Technical documentation:

- [Architecture](backend/docs/ARCHITECTURE.md)
- [API reference](backend/docs/API.md)
- [Security](backend/docs/SECURITY.md)
- [Database](backend/docs/DATABASE.md)
- [Development](backend/docs/DEVELOPMENT.md)
- [Environment](backend/docs/ENVIRONMENT.md)
- [Integration](backend/docs/INTEGRATION.md)
- [MiniPay findings](backend/docs/MINIPAY.md)
- [Telegram](docs/TELEGRAM.md)

---

## 🎯 Hackathon idea in one sentence

**CeloDesk turns stablecoin payments into a simple business workflow that can be controlled from the web, Telegram, or an external AI assistant — while Celo independently verifies what was actually paid.**

---

## Project

**CeloDesk**

AI-powered business payments and invoicing on Celo.

**Web:** CeloDesk  
**Telegram:** CeloDesk Telegram  
**AI integration:** CeloDesk MCP

> **Ask for payment. Get paid. Know when it's paid.**
