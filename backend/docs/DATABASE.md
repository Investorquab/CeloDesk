# DATABASE.md

Canonical schema lives in `prisma/schema.prisma` — this doc explains
the reasoning, not a duplicate spec. If they ever disagree, the
`.prisma` file wins; update this doc to match.

## Entities

**User** — one row per wallet-holding person (merchant or, later,
a client who becomes a merchant). `walletAddress` is unique and is
the actual identity anchor; `telegramId`/`email` are optional login
surfaces.

**Profile** — the "mini business identity" layered on top of a User.
Split from User because not every wallet needs a public-facing
profile (e.g. a client who only ever pays invoices, never creates
one).

**Invoice** — first-class object, not a derived view. Snapshots
`tokenAddress` and `receivingWallet` at creation time (not a live
join to the merchant's current wallet) so that if a merchant changes
wallets later, old invoices still point at the address the client
actually saw and paid.

**Payment** — one row per verified on-chain transaction. `txHash` has
a **unique constraint** — this is the actual replay-protection
mechanism, not just documentation. A second attempt to record the
same hash against a different invoice fails at the database level,
not just in application logic.

**PaymentEvent** — audit trail (detected → verifying → verified/
rejected). Exists so "why did this fail" is answerable without log
spelunking.

**Reminder** — minimal log of sent reminders, to avoid double-sending
and to support CeloDesk AI's reminder tool.

## Status lifecycle (Invoice)
```
DRAFT → SENT → VIEWED → PENDING → PAID
                              ↘ PARTIALLY_PAID → PAID
                              ↘ OVERPAID
                              ↘ FAILED
DRAFT/SENT → CANCELLED (merchant action)
SENT/PENDING → EXPIRED (past expiresAt, never paid)
PENDING (past dueDate) → OVERDUE
```
Not every transition is implemented in the P0 scaffold — `PENDING →
PAID` (the golden path) is. Build the rest incrementally; don't block
the golden path on full lifecycle coverage.

## Why Decimal, not Float, for amounts
`amount` uses Prisma's `Decimal` type. Never use JS `number`/`Float`
for money — floating point rounding errors are unacceptable for
payment amounts. `verifyPayment()` similarly uses `ethers.parseUnits`/
`formatUnits` (bigint-based) rather than float math.

## Indexes
- `Invoice(merchantId, status)` — supports the dashboard/outstanding
  queries, which always filter by merchant + status.
- `Payment(invoiceId)` — supports "get all payments for this invoice".
- `Payment.txHash` unique — replay protection, see above.

## What's intentionally NOT here
No `PrivateKey`/`Seed` field anywhere in this schema, on any table.
Per SECURITY.md, we never store signing secrets. If a future feature
needs sponsored/account-abstraction transactions, that key lives in
a secrets manager (e.g. environment-injected at deploy time), never
in this database.
