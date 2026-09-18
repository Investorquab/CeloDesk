# CeloDesk Telegram Agent

The Telegram interface for CeloDesk.

It lets a merchant manage the same invoices and payment information available in the CeloDesk web app and Claude/MCP.

## What it can do

- 🧾 Create invoices from natural-language messages
- 📋 List invoices
- 🔎 Check invoice/payment status
- 💰 View payment summaries
- 🔗 Share invoice information
- 👤 Work with the merchant's connected Celo wallet/account

The agent sends business operations to the CeloDesk backend. Payment state is determined by the backend's verification system.

## Try it

**[Open CeloDesk on Telegram →](https://t.me/celoagentbot)**

Examples:

> Create an invoice for David for 5 USDT for website design.

> Which invoices are unpaid?

> Check the payment status of my invoices.

## Local development

1. Install Node.js 20+.
2. Install dependencies with `npm install`.
3. Configure the required environment variables.
4. Make sure the CeloDesk backend is running.
5. Start the agent with `npm run dev`.

The agent uses the backend configured by `BACKEND_API_URL`.

## Relationship to the rest of CeloDesk

**Telegram → CeloDesk backend → PostgreSQL / Celo payment verification**

Telegram does not maintain a separate financial source of truth.

See the root [README](../README.md) for the complete product overview and [demo guide](../docs/DEMO.md) for the end-to-end product flow.
