# CeloDesk Web App

The web application for CeloDesk.

It provides the merchant dashboard, invoice creation, public customer checkout, wallet payment flow, direct payment QR, payment status, activity, and merchant profile.

## Live app

**[Open CeloDesk →](https://celo-desk.vercel.app)**

## What the web app covers

- 🌐 Landing page
- 📊 Merchant dashboard
- 🧾 Invoice creation and management
- 🔗 Shareable public invoices
- 💳 Customer payment checkout
- 📱 Direct payment QR
- 👛 Compatible-wallet payment flow
- ✅ Payment success and receipt
- 👤 Merchant profile
- 🤖 CeloDesk AI access

The frontend displays payment state from the backend. It does not decide that a payment is valid.

## Local development

1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_API_URL` to the CeloDesk backend URL.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

## Payment flow

The customer can pay directly from a compatible Celo wallet.

The QR is a **direct payment request**. It prepares the token transfer to the merchant's receiving wallet rather than redirecting the customer to an invoice website.

After payment, the backend verifies the on-chain transaction and the UI reflects the resulting state.

## Related interfaces

- **[Telegram](https://t.me/celoagentbot)**
- **[Claude / MCP](https://mcp.185-7-81-139.sslip.io/mcp)**

See the root [README](../README.md) for the product overview and [demo guide](../docs/DEMO.md) for the complete payment journey.
