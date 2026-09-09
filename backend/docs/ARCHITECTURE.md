# ARCHITECTURE.md

## System overview
```
Frontend (Claude 2, not yet built)
   ↓ REST (API.md)
Backend/API — src/routes, src/services  (Claude 1, this scaffold)
   ↓
Database — Postgres via Prisma (prisma/schema.prisma)
   ↓
Payment/Verification Layer — src/services/paymentVerifier.ts
   ↓
Celo mainnet (chain 42220) via RPC (src/celo/tokens.ts for verified assets)
```

```
Telegram (CeloDesk AI, not yet built)
   ↓
AI Agent / tool layer (CLAUDE_3_AGENT.md tool contract)
   ↓ same REST API
Backend/API  ← same source of truth as the frontend
```

```
MCP Client (external AI, P7)
   ↓
MCP Server (CeloDesk AI, small surface, P7 only)
   ↓ same REST API
Backend/API
```

## Ownership boundaries
- **Backend/core (this scaffold)** — source of truth for financial
  state. Owns: database, payment verification, token registry,
  attribution tagging.
- **Frontend (Claude 2)** — displays state, never declares it.
- **Agent/Telegram/MCP (CeloDesk AI)** — requests operations via the
  same REST API everyone else uses. Never re-implements financial
  logic locally.
- **Celo blockchain** — source of truth for actual settlement. Our
  database records what we've *verified* happened on-chain; the chain
  itself is ground truth.

## Why this split
Three parallel agents building against a shared, changing
architecture is how you get incompatible assumptions (e.g. Claude 2
assuming a field that doesn't exist, CeloDesk AI re-implementing
verification badly). The fix is a single written contract (API.md +
DATABASE.md) that only Claude 1 changes, and that Claude 2/3 build
against without re-deriving it themselves.

## Golden path (P0/P1), concretely
```
POST /api/invoices                    → DRAFT invoice created
(merchant shares publicUrl)           → status manually moved to SENT
                                         (not yet automated — flag if needed)
client opens public invoice page      → (Claude 2: mark VIEWED — endpoint TBD)
client pays via wallet                → tx submitted to Celo directly
                                         by client's wallet
POST /api/invoices/verify-payment     → backend independently checks
                                         chain, creates Payment record,
                                         flips invoice to PAID
```
Note: `VIEWED` status transition and `SENT` transition endpoints are
not yet implemented in this scaffold — only `DRAFT` (creation) and
`PAID` (verified payment) are wired end-to-end. This is intentional:
P0 priority is proving the create→verify→paid path works before
filling in every intermediate status.

## What's tested vs. not (be honest — see PRODUCT_SPEC.md rule)
Nothing in this scaffold has been run against a live database or live
Celo RPC yet in this session — no network access was available to
actually execute `npm install`/`prisma migrate`/a live transaction
verification. Treat every file here as **written and internally
consistent, but unexecuted**. Your first action after receiving this
should be `npm install && npm run prisma:migrate` and a real
end-to-end test against Celo mainnet or Sepolia testnet — do not
assume it works until you've seen it work.
