# API.md

Base URL: `${APP_URL}/api`
Implemented in: `src/routes/invoices.ts` (Claude 1 owns this file)

All endpoints return JSON. No authentication layer is implemented yet
in this scaffold — see SECURITY.md for what's required before this is
production-safe (merchant-scoped auth is a P1 blocker, not optional).

---

### POST /api/invoices
Create a draft invoice.

**Request**
```json
{
  "merchantId": "usr_abc123",
  "clientName": "David",
  "clientContact": "optional",
  "amount": "150.00",
  "tokenSymbol": "USDm",
  "description": "Website Design",
  "dueDate": "2026-09-05T00:00:00.000Z"
}
```

**Response `201`**
```json
{
  "id": "inv_xyz789",
  "publicUrl": "https://app.example.com/invoice/abc123slug",
  "status": "DRAFT"
}
```

**Errors**: `400` invalid input or unverified/unknown `tokenSymbol`
(see `src/celo/tokens.ts` — only tokens with `verified: true` are
accepted).

**Owner**: Claude 1 (implementation). **Consumers**: Claude 2 (create
invoice form), CeloDesk AI (`create_invoice` tool).

---

### GET /api/invoices/:id
Full invoice record including payment history.

**Owner**: Claude 1. **Consumers**: Claude 2 (invoice page), CeloDesk AI
(`get_invoice` tool).

---

### GET /api/invoices/:id/status
Lightweight polling endpoint — just the status string.

**Response**: `{ "status": "PENDING" }`

**Consumers**: Claude 2 (poll while client is on the payment page).

---

### GET /api/invoices?merchantId=...&status=outstanding
List invoices for a merchant. `status=outstanding` filters to
`SENT | VIEWED | PENDING | PARTIALLY_PAID | OVERDUE`.

**Consumers**: Claude 2 (dashboard), CeloDesk AI (`list_outstanding_invoices`
tool).

---

### GET /api/invoices/summary/:merchantId
Aggregate counts + outstanding total.

**Response**
```json
{ "total": 24, "byStatus": { "PAID": 20, "OVERDUE": 2, "PENDING": 1, "PARTIALLY_PAID": 1 }, "outstandingTotal": 530 }
```

**Consumers**: CeloDesk AI (`get_payment_summary` tool).

---

### POST /api/invoices/verify-payment
**The only path by which an invoice becomes PAID.** Never trust a
client-reported "payment successful" — this endpoint independently
re-checks the chain. See `src/services/paymentVerifier.ts` and
SECURITY.md.

**Request**
```json
{ "invoiceId": "inv_xyz789", "intentId": "...", "txHash": "0x..." }
```

**Response `200` (verified)**
```json
{ "verified": true, "invoiceStatus": "PAID" }
```

**Response `422` (not verified yet — client should retry later)**
```json
{ "verified": false, "reason": "Only 4/12 confirmations so far — not final yet. Retry later." }
```

**Response `409`**: `txHash` already used on another invoice (replay
protection).

**Owner**: Claude 1. **Consumers**: Claude 2 (call this after detecting
a wallet's transaction submission — do NOT flip invoice state in the
frontend directly).

---

## Field/status vocabulary (do not rename without updating this file)
Invoice status: `DRAFT | SENT | VIEWED | PENDING | PAID | PARTIALLY_PAID
| OVERPAID | FAILED | CANCELLED | EXPIRED | OVERDUE`

Token symbols: only `USDm`, `USDC`, `USDT`, `NGNm` are currently
verified (see `src/celo/tokens.ts`). Do not add a token symbol to any
UI dropdown or agent tool schema until it's added there first — or
just call `GET /api/tokens` (below) instead of hardcoding a list.

---

### GET /api/tokens
Verified token registry — always call this instead of hardcoding a
token list, so nothing drifts out of sync with what invoice creation
actually accepts.

**Response**
```json
[{ "symbol": "USDm", "name": "Mento Dollar", "decimals": 18 }, ...]
```

---

### GET /api/invoices/by-slug/:slug
Same shape as `GET /api/invoices/:id`, but looked up by the public
`publicSlug` field (what `publicUrl` actually points to) instead of
the internal id. **Use this on the public checkout page**, not `/:id`.

Response includes `merchantDisplay: { name, logoUrl }` — live-joined
from the merchant's Profile (falls back to a shortened wallet address
if they haven't set one up). Not snapshotted — editing a profile
updates this on past invoices too, since it's display data, not
financial data.

---

### POST /api/invoices/:id/payment-intent
Creates a short-lived payer-bound payment intent and returns ready-to-sign transaction data for this invoice's exact token/amount/
recipient — hand this directly to the wallet's send-transaction call
rather than constructing the ERC-20 transfer yourself.

**Request** `{ "payerAddress": "0x..." }`.

**Response**
```json
{ "intentId": "...", "expiresAt": "...", "payerAddress": "0x...", "to": "0xcebA...", "data": "0xa9059cbb...", "value": "0x0", "chainId": 42220 }
```
The client must send `intentId` with `/api/invoices/verify-payment`; verification requires the on-chain sender to match the intent payer.

---

### POST /api/auth/wallet
Wallet-signature login. Send `{ walletAddress, message, signature }`
(the frontend/bot prompts the wallet to sign `message`, which must
contain the wallet address). Returns `{ token, merchantId }` — a JWT
to send as `Authorization: Bearer <token>` on future requests, once
routes require it (**not yet enforced** — see SECURITY.md).

---

### GET /api/merchants/:id
Public merchant profile.

**Response**
```json
{ "id": "usr_abc123", "walletAddress": "0x...", "profile": { "businessName": "...", "logoUrl": "...", ... } | null }
```

---

### PATCH /api/merchants/:id
Create or update a merchant's profile. `businessName` is required the
first time (creates the profile + derives a `slug`); all fields
optional on subsequent updates.

**Request**
```json
{ "businessName": "Bello Designs", "tagline": "Branding \u2022 UI/UX", "logoUrl": "https://...", "preferredToken": "USDm" }
```

**Not auth-gated yet** — same documented gap as every mutating route
in this scaffold. Anyone can currently edit anyone's profile by id.

---

## Auth requirement (updated)
Every endpoint below marked "merchant-scoped" now requires
`Authorization: Bearer <token>` (from `POST /api/auth/wallet` or
`POST /api/auth/telegram-link`). The authenticated identity — not
any merchantId in the body/query/URL — determines what you can
read/write. See SECURITY.md for the full list and the public
exceptions (payer-facing endpoints stay unauthenticated).

## DELETE /api/invoices/:id
Merchant-scoped. Soft-deletes (sets status to `CANCELLED`) — never
destroys the row or its Payment records. Returns `400` if the
invoice is already `PAID`/`OVERPAID` (a completed payment can't be
hidden this way).

**Response:** `{ "deleted": true }`

## PATCH /api/merchants/:id — `username` field
Now accepts a `username` field (maps to `Profile.slug`). Format:
3-30 chars, lowercase letters/numbers/hyphens only. Returns `409`
with a clear message if taken — this is different from the
auto-derived slug behavior (from `businessName` on first profile
creation), which silently appends a suffix on collision instead of
failing, since that's an internal default rather than a user's
explicit choice.

## GET /api/invoices/summary/:merchantId — response shape update
Now also returns `outstandingByToken: Record<string, number>` — a
correct per-token breakdown. `outstandingTotal` is kept for backward
compatibility but is a naive sum that WILL mix currencies if a
merchant uses more than one token; prefer `outstandingByToken` for
anything user-facing.
