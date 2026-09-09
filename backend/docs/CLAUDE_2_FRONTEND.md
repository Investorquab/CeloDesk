# CLAUDE_2_FRONTEND.md — handoff for the frontend agent

## Mission
Build the frontend: landing page, dashboard, profile, invoice
creation UI, public checkout page, wallet connection, invoice
image/card, share UI, QR, receipt display.

## You own
`/frontend` (or wherever the frontend app lives — this scaffold
doesn't include a frontend yet, so you're setting up the initial
structure). Recommend Next.js given the SSR needs of a public
shareable invoice page (OG image tags for WhatsApp/X previews
matter a lot here).

## You do NOT own
- Database (`prisma/schema.prisma`) — read DATABASE.md, don't modify
- Payment verification logic (`src/services/paymentVerifier.ts`)
- Blockchain indexing
- Telegram bot / MCP server (CeloDesk AI's territory)
- Private key management — there is none; don't add any

## Critical rule: you cannot declare an invoice paid
When a client's wallet transaction succeeds client-side, do NOT set
local state to "paid" and stop. Call `POST /api/invoices/verify-payment`
with the `txHash`, then poll `GET /api/invoices/:id/status` (or use
the verify-payment response directly) until the backend confirms
`PAID`. See API.md for exact shapes. This is non-negotiable —
frontend-declared payment state is exactly the failure mode
SECURITY.md exists to prevent.

## Endpoints to consume
See API.md for full detail. Summary:
- `POST /api/invoices` — create
- `GET /api/invoices/:id` — full record
- `GET /api/invoices/:id/status` — polling
- `GET /api/invoices?merchantId=&status=outstanding` — dashboard list
- `GET /api/invoices/summary/:merchantId` — dashboard stats
- `POST /api/invoices/verify-payment` — after client submits a tx

## Data you'll render
Invoice fields: see `prisma/schema.prisma` `Invoice` model. Key ones
for the checkout page: `amount`, `tokenSymbol`, `receivingWallet`,
`chainId` (always 42220, Celo mainnet), `description`, `dueDate`,
`status`.

Token display: only show tokens listed in `src/celo/tokens.ts` with
`verified: true`. Don't hardcode a token list separately — ask
Claude 1 for an endpoint to fetch this dynamically if you need one
(not yet built in this scaffold — flag it if you need it).

## Environment variables (frontend-safe only)
```
NEXT_PUBLIC_API_URL=       # backend base URL
NEXT_PUBLIC_CHAIN_ID=42220 # Celo mainnet
```
Never put `DATABASE_URL`, `RPC_URL` (if it has an API key), or any
private key in frontend env vars — those stay server-side only. See
ENVIRONMENT.md.

## MiniPay integration
**Now researched — see MINIPAY.md** (just added). Short version:
detect `window.ethereum?.isMiniPay`, hide your connect-wallet button
and auto-connect when true, no separate SDK needed. One real
conflict worth reading: MiniPay's own docs say never prompt for a
signature-based login, which affects how/whether our wallet-auth flow
applies to MiniPay users specifically — see MINIPAY.md's flagged
section before wiring auth into the checkout page.

## Current status
- Backend golden path (create → verify-payment): 🟡 implemented,
  UNTESTED end-to-end (no live DB/RPC run yet)
- Frontend: ❌ not started — this is your starting point
- MiniPay flow: ❌ not researched yet

## Local dev
Backend runs on `http://localhost:3001` once set up per
DEVELOPMENT.md. Point your frontend's `NEXT_PUBLIC_API_URL` there
for local development.
