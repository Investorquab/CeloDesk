# CeloDesk Demo Guide

This is the short, judge-facing guide for understanding and demonstrating the product.

## The story

CeloDesk solves a simple problem:

> **How can a business ask for a stablecoin payment, know when it was actually paid, and manage that payment without jumping between tools?**

The demo should show one real payment from beginning to end.

## 1. Start with the live product

**[Open CeloDesk](https://celo-desk.vercel.app)**

Create a small invoice.

Example:

> Create an invoice for Moji for 0.01 USDT for a design test.

The invoice should produce a shareable customer payment page.

## 2. Show the customer experience

Open the public invoice.

Point out:

- the amount the customer needs to pay
- the selected stablecoin
- the merchant information
- the wallet payment options
- the direct payment QR

The QR is a **direct payment request**. It prepares the token payment in a compatible wallet; it does not redirect the customer to an invoice website.

## 3. Make the payment

Scan the QR with the tested compatible wallet.

Show:

**QR → wallet prepares payment → customer confirms → transaction submitted**

The customer's funds go directly to the merchant's receiving wallet.

## 4. Show independent verification

Once the transaction is sufficiently confirmed, CeloDesk checks the transaction on Celo.

The invoice changes to:

**PAID**

This is important: the merchant does not manually mark the invoice paid.

## 5. Show the AI connection

Open the connected Claude conversation and ask:

> Check my invoices and tell me their current payment statuses.

Claude should report the same invoice as **Paid**.

This demonstrates that Claude is reading live CeloDesk payment state rather than guessing.

## 6. Show Telegram

Open the CeloDesk Telegram bot:

**[Open Telegram →](https://t.me/celoagentbot)**

Ask for the invoice/payment status.

Telegram should show the same state.

## What the demo proves

**One payment is shared across the whole product:**

**Web → Wallet → Celo → CeloDesk verification → Database → Claude / Telegram**

The three interfaces are connected to the same underlying payment system.

## Suggested 60–90 second narration

> “CeloDesk is an AI-powered payment desk for businesses using stablecoins on Celo.
>
> A merchant creates an invoice and shares the payment page with a customer.
>
> The customer can pay directly from a compatible wallet, including through the direct payment QR.
>
> Once the transaction settles, CeloDesk independently checks the payment on Celo and marks the invoice as paid.
>
> The same verified payment state is then available from the web dashboard, Telegram, and Claude through MCP.
>
> So CeloDesk is not just an invoice generator or an AI chatbot. It connects the request for payment, the actual on-chain payment, verification, and business tracking in one workflow.”

## Important links

- **[🌐 Live CeloDesk](https://celo-desk.vercel.app)**
- **[💬 CeloDesk Telegram](https://t.me/celoagentbot)**
- **[🤖 CeloDesk MCP](https://mcp.185-7-81-139.sslip.io/mcp)**
- **[📦 GitHub repository](https://github.com/Investorquab/CeloDesk)**

## Current limitation

MiniPay-specific QR/deep-link behavior has not been claimed as verified. The current demonstrated QR flow is for compatible wallets.

## Final demo checklist

- [ ] Live app opens
- [ ] Invoice is created
- [ ] Public payment page opens
- [ ] Direct QR prepares the payment in the tested wallet
- [ ] Real Celo transaction is submitted
- [ ] CeloDesk verifies the payment
- [ ] Invoice becomes PAID
- [ ] Claude reads PAID
- [ ] Telegram reads the same payment state
- [ ] All important links are accessible
