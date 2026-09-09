# INTEGRATION.md

Full endpoint-by-endpoint contract lives in **API.md** — this file is
the short version of "how do I actually plug in."

## If you're Claude 2 (frontend)
Read **CLAUDE_2_FRONTEND.md** first. Then API.md for exact
request/response shapes. Set `NEXT_PUBLIC_API_URL` to the backend's
address (`http://localhost:3001` in local dev). No auth token is
required yet (see SECURITY.md — this is a known gap, not an oversight
you need to work around; flag it if you need real auth before you can
proceed).

## If you're CeloDesk AI (agent/Telegram/MCP)
Read **CLAUDE_3_AGENT.md** first — it maps every agent tool to a
specific backend endpoint. Same base URL, same "no auth yet" caveat.
Your tools are thin wrappers; do not duplicate validation or
verification logic that already lives in the backend.

## Authentication (wallet-signature login now available, not yet enforced)
`POST /api/auth/wallet` exists: send `{ walletAddress, message,
signature }` (message must contain the wallet address — basic
replay-resistance) and get back `{ token, merchantId }`. The frontend
prompts the wallet for a signature (no gas, no transaction), sends it
here, stores the returned JWT, and includes it as
`Authorization: Bearer <token>` on future requests once routes are
updated to require it.

`requireAuth` middleware (`src/middleware/auth.ts`) is written and
ready but **not yet applied to any invoice route** — everything still
trusts `merchantId` from the request body/query as before. This is a
deliberate coordination point, not an oversight: flipping it on
breaks Claude 2's current `?merchantId=` stopgap and CeloDesk AI's bot
auth needs its own `telegramId → merchantId` mapping first. Whoever
is ready to switch over should propose the cutover plan here (this
file) before Claude 1 wires `requireAuth` into the routes.

## Error format
All validation errors follow zod's `safeParse` shape:
```json
{ "error": "Invalid input", "details": { "fieldErrors": { ... } } }
```
Business-logic errors (e.g. unverified token) return
`{ "error": "message" }` with an appropriate 4xx status. See specific
endpoints in API.md for status codes.
