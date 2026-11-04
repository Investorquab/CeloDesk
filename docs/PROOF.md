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

## 2. Track 1 — Ripio wFIAT payment (2026-11-04)

Real wFIAT invoices created in CeloDesk and paid on Celo mainnet from a separate
wallet (the payer, not the merchant/agent wallet). Each payment goes through
CeloDesk's checkout, which appends the attribution data suffix to the ERC20
transfer, and CeloDesk verifies it on-chain before marking the invoice PAID.

- **Merchant (receives):** `0x00d1E86040d88397F4eB187c38dC527F6659e486`
- **Payer:** `0x4dcc18870f356a58902EE772df24e2a06eD923ec`

### wBRL
- **Amount:** 2.00 wBRL (R$ 2,00)
- **Token:** wBRL `0xD76f5Faf6888e24D9F04Bf92a0c8B921FE4390e0` (18 decimals)
- **Tx hash:** `0xedd5fa93d67410e036f309ae26c8f77f7b77de905639a4916dfa7e71444a3615`
- **Block:** 81874659 · **Status:** success
- **Explorer:** https://celoscan.io/tx/0xedd5fa93d67410e036f309ae26c8f77f7b77de905639a4916dfa7e71444a3615
- **Tag verified:** `npm run verify-tag -- 0xedd5fa93…` decodes `celo_3fce81a170fc`.

### wARS
- **Amount:** 200 wARS ($ 200)
- **Token:** wARS `0x0DC4F92879B7670e5f4e4e6e3c801D229129D90D` (18 decimals)
- **Tx hash:** `0x28f6854b90abff0aba1760b03a1bc6012e1f0b1663c81ced6eeb9d7e433b11ed`
- **Block:** 81874594 · **Status:** success
- **Explorer:** https://celoscan.io/tx/0x28f6854b90abff0aba1760b03a1bc6012e1f0b1663c81ced6eeb9d7e433b11ed
- **Tag verified:** `npm run verify-tag -- 0x28f6854b…` decodes `celo_3fce81a170fc`.

## 3. Track 2 — USA₮ over x402 (2026-11-04)

A real USA₮ invoice (0.05 USA₮) settled through **Celo's x402 facilitator** on
mainnet. The payer signed an EIP-3009 `transferWithAuthorization` in their wallet
on the CeloDesk `/x402` page; the facilitator submitted it on-chain and paid the
gas, moving USA₮ directly payer → merchant. Gasless for the payer.

- **PayTo wallet (merchant — recorded for this lane):** `0x00d1E86040d88397F4eB187c38dC527F6659e486`
- **Payer:** `0x4dcc18870f356a58902EE772df24e2a06eD923ec`
- **Facilitator submitter (paid the gas):** `0x0d74d5cEfd2E7f24e623330eBe3d8d4cB45FFb48`
- **Amount:** 0.05 USA₮
- **Token:** USA₮ `0xD2ab3C9A02DBBAB236BfEC45D1d755DF4267F771` (6 decimals)
- **Method:** `transferWithAuthorization` (EIP-3009, selector `0xe3ee160e`) — submitted by the facilitator, not the payer
- **Tx hash:** `0xae3582ad04b5195e36efe68029f25fc14a89f7fc4d553bba787528f28fedc767`
- **Block:** 81877512 · **Status:** success
- **Explorer:** https://celoscan.io/tx/0xae3582ad04b5195e36efe68029f25fc14a89f7fc4d553bba787528f28fedc767

**Repeat flow (same counterparty).** A second USA₮ invoice (0.05 USA₮) was settled
over x402 by the same payer, through the same facilitator — demonstrating repeat
payments, not a one-off:
- **Tx hash:** `0x5828e9d5c23c4f09f7881b4b163574d3c4e208d78f41f96d72a670235089481d`
- **Block:** 81879004 · **Status:** success · `transferWithAuthorization`, 0.05 USA₮, `0x4dcc…` → `0x00d1…`
- **Explorer:** https://celoscan.io/tx/0x5828e9d5c23c4f09f7881b4b163574d3c4e208d78f41f96d72a670235089481d

- **Attribution:** x402 settlements through the hosted facilitator carry no tag;
  the merchant PayTo wallet above is what the organisers record for this lane.
  CeloDesk's tagged agent-wallet requirement is satisfied separately (see §1).

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
