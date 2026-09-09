# DEVELOPMENT.md

## Install
```
npm install
```

## Environment
```
cp .env.example .env
```
Fill in `DATABASE_URL` (a local or hosted Postgres instance) and
`RPC_URL` (start with `https://forno.celo.org`, Celo's public mainnet
RPC — consider a paid provider like Chainstack, which the hackathon's
own partner perk covers, if you hit rate limits). See ENVIRONMENT.md
for the full variable list.

## Database setup
```
npx prisma migrate dev --name init
npx prisma generate
```
This creates the tables from `prisma/schema.prisma` in your Postgres
instance and generates the typed Prisma client.

## Development server
```
npm run dev
```
Runs on `http://localhost:3001` (or `$PORT`). Health check:
`GET /health` → `{ "ok": true }`.

## Test the golden path manually (until automated tests are written)
1. Create a `User` row directly via `npx prisma studio` (no signup
   flow exists yet) with a real wallet address you control.
2. `POST /api/invoices` with that `merchantId`.
3. Send yourself the invoice's token amount on Celo mainnet from a
   different wallet, to the `receivingWallet` shown in the invoice.
4. `POST /api/invoices/verify-payment` with the resulting `txHash`.
5. Confirm the invoice flips to `PAID` and a `Payment` row appears.

## Build
```
npm run build
npm start
```

## Tests
```
npm test
```
No test files exist yet in this scaffold (P0 priority was the
architecture + golden path skeleton, per PRODUCT_SPEC.md priority
order) — writing tests against `paymentVerifier.ts` (mocked
provider/receipts) should be one of the first things done on top of
this scaffold, given SECURITY.md's emphasis on this being the most
important component.
