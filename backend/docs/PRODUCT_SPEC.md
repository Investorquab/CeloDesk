# PRODUCT_SPEC.md

## Problem
Getting paid as a freelancer/creator/small business requires manually
sharing wallet addresses, screenshots, chasing clients, and reconciling
payments by hand.

## Target users
Freelancers, creators, and small merchants who want to get paid in
stablecoins without crypto-native friction — and their clients, who may
be first-time Celo users.

## Core workflow
**Create → Share → Pay → Verify → Manage**

"David owes me $150 for the website design. Create an invoice." →
branded invoice + shareable link/image → client pays via MiniPay or
wallet → backend independently verifies on-chain → invoice flips to
PAID → merchant notified → "Who still owes me?" answered by the agent.

## Role of each layer
- **Celo**: settlement layer. All value moves here, always verified
  independently by our backend (see SECURITY.md).
- **MiniPay**: primary payment channel for the client side — no wallet
  setup friction for first-time users.
- **Telegram**: primary agent/distribution interface for the merchant
  side.
- **AI (CeloDesk AI)**: natural-language interaction layer. Calls backend
  tools; never implements payment logic itself.
- **MCP**: secondary integration surface so external AI clients can call
  our payment tools too. Kept intentionally small (P7).

## MVP (golden path — P0/P1)
1. Create invoice (API + minimal Telegram command)
2. Public invoice page renders payment details
3. Client pays on Celo (any compatible wallet, mainnet)
4. Backend independently verifies the transaction
5. Invoice flips PAID, merchant notified

## V1 (P2–P6)
- MiniPay-optimized checkout
- Branded invoice image + multi-channel sharing
- Merchant profile (business identity)
- Reminders + reconciliation ("who owes me")

## Explicit non-goals for this hackathon window
- Custodial wallets / private key storage
- AI-initiated fund transfers (all signing is user-controlled)
- Full MCP framework (P7, small surface only)
- Airtime/data/electricity utilities (P8, only if time remains)
- Supporting every Celo stablecoin — only tokens verified against
  docs.celo.org (see src/celo/tokens.ts) are enabled

## Priority order (cut from the bottom if the 10 days run out)
P0 Architecture + contracts (this doc set)
P1 Golden path (create → pay → verify → paid)
P2 Telegram invoice creation
P3 MiniPay/wallet checkout polish
P4 Invoice image + sharing
P5 Profiles + dashboard
P6 Reminders + reconciliation
P7 MCP
P8 Optional utilities

## Track alignment (Celo Agents at Work Hackathon)
Registered under **Track 2: Real World Adoption**. Win condition is
verified real users, returning users (2+ distinct days), distinct
signers — not raw transaction volume. Every invoice/payment must be
tagged with `celo_5ad8f72f8a99` (see src/services/attribution.ts) for
leaderboard credit. No wallet we fund first counts toward adoption
metrics — real, independently-arriving clients only.
