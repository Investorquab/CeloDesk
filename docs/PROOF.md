# CeloDesk — On-chain proof (Agents on Open Rails)

All on Celo Mainnet (chain 42220). Attribution tag: `celo_3fce81a170fc`.
Agent wallet: `0x00d1E86040d88397F4eB187c38dC527F6659e486`.

## 1. ERC-8004 identity + tagged agent-wallet transaction

- **What:** `setAgentURI(9799, <CeloDesk card>)` on the official Celo Identity
  Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, updating agent identity
  **#9799** from a stale placeholder to the real CeloDesk ERC-8004 card
  (web + MCP endpoints, `x402Support: true`).
- **Tx hash:** `0x94d27a1c3bf5531246e853c57c9029d7e7a786c98adbd45ee22941b029be70c4`
- **Block:** 81382759 · **Status:** success
- **Explorer:** https://celoscan.io/tx/0x94d27a1c3bf5531246e853c57c9029d7e7a786c98adbd45ee22941b029be70c4
- **Tag verified:** `npm run verify-tag -- 0x94d27a1c3bf5531246e853c57c9029d7e7a786c98adbd45ee22941b029be70c4`
  decodes `celo_3fce81a170fc` from the transaction calldata.
- **Satisfies:** both the ERC-8004 identity check and the "tagged transaction
  sent from the agent wallet" check, in one transaction.

## 2. Track 1 — Ripio wFIAT payment
_Pending: a real tagged wFIAT invoice payment on mainnet (Stage 8)._

## 3. Track 2 — USA₮ over x402
_Pending: a real USA₮ settlement via the x402 facilitator (Stage 8). Record the
PayTo wallet (merchant receiving wallet) — x402 settlements carry no attribution tag._
