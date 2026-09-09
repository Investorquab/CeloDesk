# CeloDesk Frontend Rebuild

Premium mobile-first Next.js frontend for the existing CeloDesk Telegram backend. This rebuild follows the locked CeloDesk reference mockup: landing, dashboard, create invoice, invoice-ready, share, public checkout, QR, wallet/MiniPay flow, processing, success/receipt, and profile.

## Run

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_API_URL=http://localhost:3001` (or your deployed backend URL).
3. Install Node.js 20+.
4. `npm install`
5. `npm run dev`
6. Open `http://localhost:3000`.

For merchant-specific app routes use `http://localhost:3000/dashboard?merchantId=YOUR_REAL_MERCHANT_ID`.

## Backend

This frontend uses the existing endpoints documented in `celodesk-backend/docs/API.md`. It does not store private keys and never marks an invoice paid locally; it calls the backend payment-intent and verification endpoints.

## Important

The backend currently exposes merchant mutation routes without auth and has a known invoice/profile error path that should be retested. Do not treat this hackathon build as production-secure until those documented backend gaps are resolved.


## V3 hotfix
- Fixed session helpers exposed by `lib/api.ts`.
- Added wallet authentication client method.
- Dashboard/Create/Profile gates now react immediately after wallet connection.

## Telegram

CeloDesk's Telegram command center is linked throughout the frontend:

https://t.me/celoagentbot

Use the `Open Telegram` / `CeloDesk Telegram` links to launch the bot.


## V5 polish in this package
- Payment success receipt now has an explicit animated check, visible transaction hash, copy action, CeloScan link, and a print-optimized receipt layout.
- Back to invoice is an in-page state transition instead of relying on browser history.
- Invoice cards include a real payment QR code.
- Gmail sharing uses the native file-share path when supported; desktop fallback copies the invoice card and opens Gmail with the message prefilled.
- X sharing was removed.
- Profile logo URL was removed so CeloDesk's own product mark is used consistently.
- CeloDesk AI now attempts to create the invoice itself through the canonical API instead of only navigating to the form.
- Disconnect is icon-only.


## V6 notes
- The distribution ZIP contains one project root only: `celodesk-frontend/`.
- Landing navigation no longer includes Pricing, Developers, or Blog, and the fake trust avatars/claim are removed.
- Invoice list includes a professional delete confirmation UI. It calls `DELETE /api/invoices/:id`; if the current backend does not expose that route, the UI will report the backend limitation rather than pretending the invoice was deleted.
