# CeloDesk

> **Your AI-powered payment desk on Celo.**
>
> Create, share, track, and verify stablecoin payments from the web, Telegram, or an external AI assistant such as Claude.

[Live App](https://celo-desk.vercel.app) · [MCP Endpoint](https://mcp.185-7-81-139.sslip.io/mcp)

---

## The problem

Getting paid with crypto can still feel surprisingly manual.

A business may need to copy wallet addresses, create payment requests, send screenshots, chase transaction hashes, and manually reconcile who has paid and who still owes money.

CeloDesk turns that workflow into a single payment desk.

## The solution

CeloDesk lets a merchant create a stablecoin invoice, share a payment link, receive payment directly to their wallet, and verify the payment on Celo.

The same merchant payment infrastructure can be operated through multiple interfaces:

- **Web app** — full merchant dashboard and client checkout.
- **Telegram** — conversational invoice creation and payment management.
- **Claude / MCP** — external AI assistants can call CeloDesk tools to create and manage invoices.

The interfaces are different, but the underlying CeloDesk API and payment records are the same.

---

## How it works

```text
                    CeloDesk
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
        Web         Telegram      Claude
          │            │            │
          └────────────┼────────────┘
                       ▼
                 CeloDesk API
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
          Invoices        Payment verification
                                   │
                                   ▼
                             Celo Mainnet
```

### Payment lifecycle

```text
CREATE → SHARE → PAY → VERIFY → TRACK
```

1. A merchant creates an invoice.
2. CeloDesk generates a public payment page.
3. The client opens the page and pays from a Celo-compatible wallet.
4. CeloDesk verifies the transaction on Celo instead of trusting a client-provided screenshot or transaction hash alone.
5. The invoice and merchant activity reflect the verified payment status.

---

## Key features

### AI-powered invoicing

Merchants can describe what they need in natural language instead of filling every field manually.

Examples:

> Create an invoice for Sarah for 50 USDT for logo design.

> Who still owes me money?

> How much am I owed?

The web assistant and Telegram agent use the same CeloDesk business operations and merchant data.

### Stablecoin invoices

CeloDesk supports invoice payments using Celo assets including:

- **USDT**
- **USDC**
- **USDm** (Mento Dollar)
- **NGNm** (Mento Naira)

The invoice stores the selected token and receiving wallet so payment verification can match the payment to the correct request.

### On-chain payment verification

CeloDesk verifies payments against Celo Mainnet and checks the transaction receipt, network, registered token, receiving wallet, amount, confirmation depth, and duplicate-payment conditions before marking an invoice paid.

This makes **PAID** a verified payment state rather than a manually entered status.

### Shareable payment pages

Every invoice can be shared as a public URL. Clients do not need a CeloDesk merchant account to open an invoice and pay it.

### Telegram agent

The CeloDesk Telegram agent provides a conversational interface for:

- Creating invoices
- Sharing invoices
- Checking outstanding invoices
- Viewing payment summaries
- Listing invoices
- Getting help with CeloDesk payments

### Claude / MCP integration

CeloDesk exposes an MCP server so supported AI clients can use CeloDesk as a payment-management tool.

The current MCP toolset includes:

- `create_invoice`
- `get_invoice`
- `get_invoice_status`
- `list_invoices`
- `get_payment_summary`
- `get_merchant_profile`

For example, a connected Claude client can be asked:

> Create an invoice for a client for 5 USDT for an MCP integration test.

Claude can call the CeloDesk integration, which creates the real invoice through the same backend used by the web and Telegram interfaces.

---

## Why Celo?

CeloDesk uses **Celo Mainnet (chain ID 42220)** as the settlement and verification layer for stablecoin payments.

Celo gives the product a low-friction environment for wallet-based payments while keeping payment settlement on-chain and independently verifiable.

CeloDesk does not need to custody a client's funds. The client pays the receiving wallet specified by the invoice, and CeloDesk verifies the resulting on-chain transaction.

---

## Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                       User Interfaces                       │
│                                                            │
│       Web App       Telegram Agent       Claude / MCP       │
└──────────────┬──────────────┬──────────────┬───────────────┘
               │              │              │
               └──────────────┼──────────────┘
                              ▼
                    ┌──────────────────┐
                    │   CeloDesk API   │
                    │   Node / Express │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
          PostgreSQL      Groq AI       Payment verifier
                                             │
                                             ▼
                                       Celo Mainnet
```

### Main components

| Component | Purpose |
|---|---|
| `frontend/` | Next.js merchant dashboard, invoice creation, public checkout and wallet connection |
| `backend/` | Express API, authentication, invoice services, payment verification and AI route |
| `agent/` | Telegram conversational agent |
| `mcp/` | Remote Model Context Protocol server for AI clients |
| `prisma/` | Database schema and migrations |
| `docs/` | Integration and project documentation |

---

## Technology stack

- **Frontend:** Next.js, React, TypeScript
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL + Prisma
- **Blockchain:** Celo Mainnet
- **AI:** Groq
- **Messaging:** Telegram / Telegraf
- **AI interoperability:** Model Context Protocol (MCP)
- **Wallet payments:** Celo-compatible wallets through the public invoice checkout

---

## Security and payment verification

CeloDesk is designed around verification rather than trust.

The backend authenticates merchant operations and verifies blockchain payments before changing an invoice to `PAID`.

Payment verification checks include:

- Successful transaction receipt
- Celo Mainnet network
- Supported token contract
- Invoice token match
- Receiving wallet match
- Required payment amount
- Confirmation depth
- Duplicate transaction protection

Merchants do not need to manually mark an invoice as paid after receiving a transaction hash.

Server-side credentials such as database credentials, JWT secrets, AI API keys, Telegram bot tokens, and private keys are kept out of the frontend.

---

## Invoice states

CeloDesk uses a simple invoice lifecycle:

```text
SENT → VIEWED → PAID
  └────────────→ CANCELLED
```

- **SENT** — invoice has been created/shared and is awaiting payment.
- **VIEWED** — the public invoice has been opened by a client.
- **PAID** — payment has been verified on Celo.
- **CANCELLED** — merchant intentionally cancelled the invoice.

---

## Repository structure

```text
CeloDesk/
├── frontend/              # Web application
├── backend/               # API and payment infrastructure
├── agent/                 # Telegram agent
├── mcp/                   # Remote MCP server
├── prisma/                # Database schema/migrations
├── docs/                  # Integration documentation
├── .env.example           # Shared environment template
├── agent.json             # Agent registration metadata
├── package.json           # Root tooling
└── README.md
```

---

## Local development

### Requirements

- Node.js 20+
- PostgreSQL
- A Celo RPC endpoint
- Groq API key for AI features
- Telegram bot token for the Telegram agent

### 1. Configure environment

Copy `.env.example` to `.env` and fill in the required values.

Never commit the real `.env` file.

### 2. Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Telegram agent

```bash
cd agent
npm install
npm run dev
```

### 5. MCP server

```bash
cd mcp
npm install
npm run build
npm start
```

The MCP server can be connected to supported remote MCP clients through its deployed HTTPS endpoint.

---

## Environment variables

The repository includes a shared `.env.example` template.

Public browser configuration uses `NEXT_PUBLIC_*` variables. Server-only secrets such as `DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`, `TELEGRAM_BOT_TOKEN`, and `PRIVATE_KEY` must never be exposed to the browser or committed to Git.

MCP deployments additionally require the merchant-scoped configuration documented with the MCP server.

---

## Demo

**Live product:** https://celo-desk.vercel.app

**Remote MCP:** https://mcp.185-7-81-139.sslip.io/mcp

A full product demo covering web invoicing, Celo payment verification, Telegram, and Claude/MCP is being prepared for the hackathon submission.

---

## Project naming

The product is **CeloDesk**.

- Web assistant: **CeloDesk AI**
- Telegram interface: **CeloDesk Telegram agent**
- External AI integration: **CeloDesk MCP**

The existing web UI is treated as the product baseline. Product changes should be additive, corrective, or explicitly requested rather than unsolicited redesigns.

---

## Hackathon focus

CeloDesk is built around real-world stablecoin payment adoption: making it easier for businesses and independent workers to request, receive, verify, and track payments using Celo.

The product combines:

**AI + stablecoin payments + on-chain verification + multi-interface access.**

The goal is simple:

> **A business should be able to ask for payment without having to become a blockchain expert.**
