# CeloDesk Architecture

CeloDesk has one core payment system and several ways to access it.

```text
                         CeloDesk
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
            Web         Telegram      Claude / MCP
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                     CeloDesk Backend
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
             Postgres      AI       Payment verifier
                                        │
                                        ▼
                                  Celo Mainnet
                                        │
                                        ▼
                                Merchant wallet
```

## Responsibilities

### Web frontend

Provides the merchant dashboard, invoice creation/sharing, public checkout, wallet connection, direct payment QR, and payment-state display.

The frontend displays payment state. It does not decide that a payment is valid.

### Telegram agent

Telegram is a conversational interface to the same backend. It can create invoices and read invoice/payment information. It does not maintain a separate financial database.

### MCP server

The remote MCP server exposes CeloDesk operations to supported external AI clients.

Current tools:

- `create_invoice`
- `get_invoice`
- `get_invoice_status`
- `list_invoices`
- `get_payment_summary`
- `get_merchant_profile`

The MCP layer forwards operations to the authenticated CeloDesk backend.

### Backend

Owns authentication, invoice records, merchant data, payment records, payment verification, direct QR payment reconciliation, and business rules.

### Database

PostgreSQL stores invoices, payment records, merchants/profiles, and related application data through Prisma.

### Celo

Celo Mainnet is the settlement layer. CeloDesk checks on-chain transaction data before recording a verified payment.

## Payment verification

### Normal checkout

```text
Invoice
  ↓
Payer wallet
  ↓
Payment intent
  ↓
ERC-20 transfer on Celo
  ↓
Backend verification
  ↓
Payment record
  ↓
Invoice status
```

### Direct QR payment

The QR contains a direct ERC-681-style token payment request.

```text
Direct QR
  ↓
Compatible wallet
  ↓
ERC-20 transfer on Celo
  ↓
Direct transfer reconciliation
  ↓
Payment record
  ↓
Invoice status
```

A direct ERC-20 transfer does not contain a CeloDesk invoice ID. Reconciliation therefore matches a verified transfer against outstanding invoices using merchant, token, receiving wallet, amount, and timing information. When a specific invoice is being checked, a valid match to that requested invoice is preferred.

## Source of truth

> **The blockchain is the source of truth for settlement. CeloDesk's backend is the source of truth for verified application state.**

The web UI, Telegram, and MCP should not invent or manually declare a payment as PAID.

## Production services

The deployed system uses:

- Next.js frontend on Vercel
- CeloDesk API
- Telegram agent
- Remote MCP server
- PostgreSQL
- Celo Mainnet RPC

Production Node processes are managed with PM2.

## Further reading

- [Product README](../README.md)
- [End-to-end demo](DEMO.md)
