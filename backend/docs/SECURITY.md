# SECURITY.md

## Core principle
The backend is the sole source of truth for invoice/payment state.
Neither the frontend nor the AI agent can declare an invoice PAID —
only `POST /api/invoices/verify-payment`, which independently checks
the chain, can do that. See `src/services/paymentVerifier.ts`.

## Payment verification checklist (implemented)
1. Transaction exists and succeeded (`receipt.status === 1`)
2. Correct chain (Celo mainnet, 42220)
3. Correct token contract (matched against `src/celo/tokens.ts`
   verified registry, not user input)
4. Correct recipient (invoice's `receivingWallet`, snapshotted at
   creation — not looked up live)
5. Correct amount (bigint comparison via `ethers.parseUnits`, never
   float math)
6. Sufficient confirmations (12, see `MIN_CONFIRMATIONS` — revisit
   with real finality data)
7. Replay/duplicate protection: `Payment.txHash` has a unique DB
   constraint

## Authentication & authorization (ENFORCED as of this update)
`POST /api/auth/wallet` (web) and `POST /api/auth/telegram-link`
(Telegram) both issue a JWT. Every mutating or merchant-scoped
endpoint now requires it via `Authorization: Bearer <token>`:

- `POST /api/invoices` — merchantId is taken from the token, NOT the
  request body (a body `merchantId` is still accepted for backward
  compat but ignored for authorization)
- `GET /api/invoices` (list), `GET /api/invoices/summary/:merchantId`,
  `GET /api/invoices/:id` — the authenticated merchantId must match
  the resource being requested, or the request is rejected
- `PATCH /api/merchants/:id` — same ownership check
- `DELETE /api/invoices/:id` — same ownership check
- `POST /api/invoices/:id/remind`, `GET /api/invoices/:id/reminders`
  — same ownership check

**Deliberately still public/unauthenticated** (payers never have a
merchant account, so these can't require merchant auth):
`GET /api/invoices/by-slug/:slug`, `POST /api/invoices/by-slug/:slug/view`,
`GET /api/invoices/:id/payment-intent`, `POST /api/invoices/verify-payment`,
`GET /api/invoices/:id/status`.

Unauthenticated requests to protected routes get `401`. Authenticated
requests for someone else's resources get `403` (or `404` for
single-resource lookups, so a non-owner can't even confirm a resource
exists).

## Rate limiting (implemented)
- `POST /api/auth/wallet`: 20/15min per IP
- `POST /api/invoices/verify-payment`: 20/15min per IP (hits the Celo
  RPC on every call — the real cost driver)
- `POST /api/invoices/by-slug/:slug/view`: 60/5min per IP (loose,
  since every real checkout page load hits this)

## Payment-to-invoice association
A standard ERC20 transfer does not carry an invoice identifier. CeloDesk therefore creates a short-lived, HMAC/JWT-signed payment intent bound to the invoice and the payer wallet before the payer signs the transfer. Verification requires the transaction sender to match that bound payer. The transaction hash remains uniquely recorded in the database, preventing duplicate verification. If a real transfer of another verified token reaches the invoice wallet, it is recorded as a rejected/token-mismatch payment for merchant review rather than being silently treated as unpaid.

The signed intent is intentionally short-lived (10 minutes) and contains no private key or secret material. It is not a substitute for a deployed payment-router/reference contract; if the product later deploys one, that can provide stronger on-chain invoice references.

## Known remaining gap
The shipped web frontend's own dashboard computes a "Total earnings"
figure by summing raw invoice amounts across potentially different
tokens (USDC + USDm + NGNm) and mislabeling the result as one
currency. The backend's `getPaymentSummary` now returns
`outstandingByToken` (a correct per-token breakdown) specifically so
callers can avoid this — but the current frontend build doesn't use
it yet. Flagging for whoever owns that frontend next; not fixed here
per this task's "do not redesign the frontend" instruction.

## AI agent authority boundaries
- **Safe/autonomous**: create_invoice, get_invoice, list_invoices,
  check_payment, get_payment_summary — all read-only or purely
  additive, no fund movement.
- **Mutating, needs light guardrails**: send_payment_reminder — rate
  limit, don't let it spam a client.
- **Financially sensitive — NEVER autonomous**: nothing in this
  system yet gives the AI agent authority to move funds. Any future
  feature (e.g. an agent-initiated refund) requires explicit
  user-signed approval, full stop. The private key never touches
  agent code.

## Wallet handling
No private keys, seed phrases, or signing secrets are stored anywhere
in this codebase or database. `walletAddress` (public) is all we
persist. All payments are signed by the payer's own wallet, client-
side (MiniPay or an EVM wallet connector) — our backend never
constructs a signed transaction on a user's behalf.

## Input validation
All API inputs are validated with `zod` schemas (see
`src/routes/invoices.ts`) before touching the database or chain.
`tokenSymbol` is checked against the verified registry
(`src/celo/tokens.ts`) — an invoice cannot be created for an
unverified/unknown token, which also prevents accidentally trusting
an attacker-supplied fake token contract address.

## Prompt injection
Invoice text fields (description, clientName) are merchant- or
client-supplied free text. CeloDesk AI's bot must never interpret this
content as instructions — see CLAUDE_3_AGENT.md.

## Logging / secrets
`.env` is gitignored (see ENVIRONMENT.md). Do not log full request
bodies containing wallet addresses+amounts at INFO level in a way
that ends up in a shared log aggregator without access controls —
fine for local dev, revisit before any real deploy.
