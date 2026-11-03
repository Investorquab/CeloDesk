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

### 1a. Card re-pointed to the celodesk.xyz domain (2026-11-03)

- **What:** second `setAgentURI(9799, <CeloDesk card>)` updating the on-chain card
  to the branded domain — `web https://celodesk.xyz`, `MCP https://mcp.celodesk.xyz/mcp`,
  `A2A https://celodesk.xyz/.well-known/agent-card.json` (was the old
  `celo-desk.vercel.app` / `mcp.185-7-81-139.sslip.io` hosts).
- **Tx hash:** `0x1c6187465f629089cfda100d07ce5aeeeaf44aa097b6b280eb6b912c374173f4`
- **Block:** 81776658 · **Status:** success
- **Explorer:** https://celoscan.io/tx/0x1c6187465f629089cfda100d07ce5aeeeaf44aa097b6b280eb6b912c374173f4
- **Tag verified:** `npm run verify-tag -- 0x1c6187465f629089cfda100d07ce5aeeeaf44aa097b6b280eb6b912c374173f4`
  decodes `celo_3fce81a170fc`. `tokenURI(9799)` now resolves to the celodesk.xyz card.

## 2. Track 1 — Ripio wFIAT payment
_Pending: a real tagged wFIAT invoice payment on mainnet (Stage 8)._

## 3. Track 2 — USA₮ over x402
_Pending: a real USA₮ settlement via the x402 facilitator (Stage 8). Record the
PayTo wallet (merchant receiving wallet) — x402 settlements carry no attribution tag._

## 4. Batch Pay — one-transaction payout to independent parties (2026-11-03)

CeloDesk "Batch Pay" lets an organizer collect payout requests from many people
via one shared link, approve the legitimate ones, and pay everyone at once in a
single tagged transaction through the verified Disperse contract on Celo mainnet
(`0xD152f549545093347A162Dce210e7293f1452150`, `disperseToken`).

- **What:** one `disperseToken` transaction paid **3 independent payee wallets**
  0.02 USDT total (0.006 + 0.007 + 0.007), from the agent wallet.
- **From (payer/organizer):** `0x00d1E86040d88397F4eB187c38dC527F6659e486`
- **To (Disperse contract):** `0xD152f549545093347A162Dce210e7293f1452150`
- **Payees (independent wallets):**
  `0x95b261d1cf925ed330eb0490eb98010d66824238` (0.006 USDT),
  `0xde98e7de50dbf3aff588ec510056bd010cfc37cf` (0.007 USDT),
  `0x28a8d7cf12b924499f121e6359502674443cbff7` (0.007 USDT)
- **Token:** USDT (`0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e`, 6 decimals)
- **Tx hash:** `0x637834a666c64db86c0c0ca18b93d4440d05eeb4dbdfc1d30c433a7c0b2f139f`
- **Block:** 81817617 · **Status:** success · 4 ERC20 Transfer events (total pulled + 3 payouts)
- **Explorer:** https://celoscan.io/tx/0x637834a666c64db86c0c0ca18b93d4440d05eeb4dbdfc1d30c433a7c0b2f139f
- **Tag verified:** `npm run verify-tag -- 0x637834a666c64db86c0c0ca18b93d4440d05eeb4dbdfc1d30c433a7c0b2f139f`
  decodes `celo_3fce81a170fc` from the transaction calldata.
- **Why it matters:** real settlement between independent parties in one on-chain
  transaction — the payees submitted their own wallets via the public link and
  were paid directly, not through the organizer forwarding anything.
