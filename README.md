# CeloDesk

> **Ask for payment. Get paid. Know when it's paid.**

CeloDesk is an AI-powered payment desk for businesses, freelancers, and creators using stablecoins on Celo.

It lets a merchant **create an invoice, share it, receive a direct wallet payment, verify that payment on-chain, and track the result** — from the web, Telegram, or an external AI assistant such as Claude.

## 🚀 Try CeloDesk

### 🌐 Live app

**[Open CeloDesk →](https://celo-desk.vercel.app)**

Create an invoice, share it, and open the customer payment page.

### 💬 Telegram

**[Open CeloDesk on Telegram →](https://t.me/celoagentbot)**

Talk to CeloDesk in plain English.

Try:

> Create an invoice for Moji for 0.01 USDT for a design job.

> Who still owes me?

> Show me my payment summary.

### 🤖 Claude / MCP

**[Open the CeloDesk MCP endpoint →](https://mcp.185-7-81-139.sslip.io/mcp)**

CeloDesk can be connected to a supported MCP client so an AI assistant can work with real CeloDesk invoices and payment data.

### 📦 Source code

**[View the GitHub repository →](https://github.com/Investorquab/CeloDesk)**

---

## 💡 What problem does CeloDesk solve?

Receiving crypto payments can become messy:

- sharing wallet addresses
- creating payment requests
- sending invoice details
- checking whether someone actually paid
- tracking who still owes money
- switching between different tools to manage everything

CeloDesk brings that workflow into one place.

### The simple idea

**Create → Share → Pay → Verify → Track**

A business does not need to become a blockchain expert just to get paid in stablecoins.

---

## ✨ What we built

### 🧾 AI-powered invoicing

A merchant can tell CeloDesk what they want in normal language.

For example:

> “Create an invoice for David for 5 USDT for website design.”

CeloDesk creates the real invoice.

### 💳 Direct wallet payments

Customers pay directly to the merchant's receiving wallet.

The customer checkout includes a **direct payment QR**. Scanning it with a compatible wallet prepares the token payment for the merchant.

**The QR is a payment request — it is not an invoice-website redirect.**

### ⛓️ On-chain payment verification

CeloDesk does not simply trust a screenshot or a message saying “I paid.”

It checks the actual transaction on Celo before recording the payment as verified.

### 🤖 AI access

The same payment desk can be controlled through:

**Web → Telegram → Claude**

These are different interfaces connected to the same CeloDesk backend and payment records.

### 💬 Telegram

A merchant can create invoices and check payment activity directly from Telegram.

### 🌍 Celo

Celo Mainnet is used for payment settlement and verification.

---

## 🔥 The part we actually proved

We tested the important payment loop with a real direct QR payment:

**QR scan → wallet prepares payment → customer confirms → payment reaches merchant wallet → CeloDesk detects the transfer → invoice becomes PAID → Claude reads the updated PAID status.**

Telegram can also read the same payment state.

That means the product is not just three interfaces placed beside each other. The interfaces connect to the same underlying payment system.

---

## 🧩 How it works

Merchant side:

**Merchant → Web / Telegram / Claude → CeloDesk API → Invoice & payment records → Payment verification → Celo Mainnet**

Customer side:

**Public invoice → Direct payment QR / wallet → Celo transaction → CeloDesk verification → PAID → Merchant**

---

## 🔐 Why the payment status can be trusted

The important rule is simple:

> **CeloDesk only treats a payment as PAID after the backend verifies the on-chain payment.**

The verification process checks the relevant transaction details, including:

- successful transaction
- Celo network
- expected token
- merchant receiving wallet
- required amount
- confirmation state
- duplicate-payment protection

For direct QR payments, CeloDesk also reconciles the on-chain token transfer with the appropriate outstanding invoice.

CeloDesk does **not** custody the customer's funds.

---

## 🪙 Supported payment tokens

The current verified invoice/payment flow supports:

- **USDT**
- **USDC**
- **USDm**
- **NGNm**

Payments settle on **Celo Mainnet (chain ID 42220)**.

---

## 🤖 What the AI can do

CeloDesk's AI interfaces can perform real payment-management operations such as:

- 🧾 Create invoices
- 🔎 Check invoice status
- 📋 List invoices
- 💰 View payment summaries
- 👤 View merchant profile
- 🔗 Retrieve invoice/payment information

The AI does not get to simply declare an invoice paid. The payment state comes from the CeloDesk backend and its verification layer.

---

## 🧪 Current product status

### Working and tested

- ✅ Live web application
- ✅ Invoice creation
- ✅ Public customer checkout
- ✅ Direct payment QR
- ✅ Compatible-wallet payment flow
- ✅ Celo on-chain payment detection
- ✅ Payment reconciliation to PAID
- ✅ Claude / MCP access
- ✅ Telegram agent
- ✅ Shared payment state across interfaces
- ✅ Production backend, agent, and MCP services
- ✅ Production frontend deployment

### Not claimed as complete

- ⏳ MiniPay-specific QR/deep-link testing requires the approved MiniPay developer testing environment.

The current QR is therefore described as a **compatible-wallet payment QR**, not a universal MiniPay QR.

---

## 🔗 Important links

| Resource | Open |
|---|---|
| 🌐 **CeloDesk** | **[Live app](https://celo-desk.vercel.app)** |
| 💬 **Telegram** | **[Open bot](https://t.me/celoagentbot)** |
| 🤖 **MCP** | **[Open endpoint](https://mcp.185-7-81-139.sslip.io/mcp)** |
| 📦 **GitHub** | **[View source](https://github.com/Investorquab/CeloDesk)** |
| ⛓️ **Celo** | **[Celo mainnet explorer](https://celoscan.io/)** |
| 📚 **Demo guide** | **[End-to-end demo](docs/DEMO.md)** |
| 🏗️ **Technical overview** | **[Architecture](docs/ARCHITECTURE.md)** |

---

## 🎥 Recommended demo

The strongest product demonstration is one real payment:

1. Create an invoice.
2. Open the public payment page.
3. Scan the direct payment QR.
4. Confirm the wallet payment.
5. Show the transaction on Celo.
6. Show CeloDesk changing the invoice to **PAID**.
7. Ask Claude to check the invoice.
8. Ask Telegram to show the same payment state.

See **[docs/DEMO.md](docs/DEMO.md)** for the short demonstration guide.

---

## 🛠️ For developers

The repository contains four main application areas:

| Folder | Purpose |
|---|---|
| `frontend/` | Web app, merchant dashboard and customer checkout |
| `backend/` | API, invoice logic and payment verification |
| `agent/` | Telegram agent |
| `mcp/` | Remote MCP server |

The project uses Next.js, React, TypeScript, Node.js, Express, PostgreSQL, Prisma, Celo, Groq, Telegram, and MCP.

Local development requires Node.js, PostgreSQL, a Celo RPC endpoint, and the relevant API/bot credentials.

Never commit real secrets such as database credentials, API keys, Telegram tokens, JWT secrets, or private keys.

---

## 🏁 In one sentence

**CeloDesk turns stablecoin payments into a simple business workflow: create an invoice, get paid directly, verify the payment on Celo, and manage everything from the web, Telegram, or AI.**
