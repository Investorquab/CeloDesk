# CeloDesk — Claude 1 Telegram Handoff

## Purpose

Bring the existing Telegram agent into the same CeloDesk product architecture without redesigning the web product or replacing working backend/payment logic.

## Locked product identity

- Product: **CeloDesk**
- Dashboard assistant: **CeloDesk AI**
- Telegram interface: **CeloDesk Telegram agent**
- Do not introduce QuabAgent, Quab Assistant, or CeloPay branding.

## Locked architecture

- `frontend/` — preserve the existing visual baseline. Only fix functionality/responsiveness that has been explicitly requested.
- `backend/` — source of truth for merchants, invoices, payments, Celo token configuration, authentication and verification.
- `agent/` — Telegram AI layer. It may call backend tools but must not implement financial state or move funds.
- Root `.env` — shared configuration. Never put server secrets into frontend code.

## Groq

Use the existing Groq integration and shared variables:

- `GROQ_API_KEY`
- `GROQ_MODEL` (currently `openai/gpt-oss-120b`)

The Telegram agent should keep using Groq tool/function calling.

## Backend tools / capabilities

The backend web agent already exposes:

- `create_invoice`
- `list_outstanding_invoices`
- `get_invoice`
- `get_invoice_status`
- `get_payment_summary`
- `list_recent_activity`
- `get_merchant_profile`
- `help`

The Telegram agent may add equivalent wrappers where useful, but the backend remains the source of truth.

## Invoice creation behavior

Do not invent missing invoice fields.

If the merchant says:

> Create an invoice

ask for the missing information conversationally, for example:

1. Who is the invoice for?
2. How much?
3. What is it for?
4. Token only when needed; otherwise use the merchant preferred token/default.

If the merchant provides all required information in one message, create it directly.

## Responses

Keep Telegram responses short, plain English and useful.

For outstanding invoices, include:

- client name
- amount + token
- description
- status
- due date when available

Do not expose raw JSON/tool arguments.

## Payment safety

Never:

- move funds
- sign a transaction
- request a private key
- mark an invoice paid based only on chat text

Payment verification belongs to the backend.

## Session/auth

The Telegram agent should authenticate backend calls with its issued JWT/session token. Do not trust a merchant ID supplied by a Telegram user without authentication.

## Shared environment

The root `.env` is the single local configuration source.

Do not create another `.env` inside `agent/` or `backend/`.

## What Claude 1 should NOT do

- Do not redesign the dashboard.
- Do not replace CeloDesk AI with another UI concept.
- Do not duplicate invoice/payment logic in Telegram.
- Do not create a second database model just for Telegram.
- Do not rename the product again.
- Do not add autonomous money movement.

## Goal

Web and Telegram should feel like two interfaces to the same CeloDesk system:

`CeloDesk UI → CeloDesk backend ← CeloDesk Telegram`

Both should use the same merchant data, invoice state, payment state and Groq-driven intent/tool architecture.
