# CeloDesk Telegram

## Architecture
Telegram is the interface. The authenticated CeloDesk backend is the single source of truth for AI tools, invoice data, payment status, and financial rules. The Telegram bot forwards messages to `POST /api/agent` using the same JWT session mechanism as the web app.

## BotFather
Use the CeloDesk logo asset in `frontend/public/celodesk-logo.png` for the bot profile image. Use the supplied `agent/celodesk-telegram-welcome.png` as the welcome image.

Suggested About:
`AI-powered business payments and invoicing on Celo.`

Suggested Description:
`Welcome to CeloDesk, your AI-powered business payment desk on Telegram. Create and share invoices, receive and verify payments on Celo, track your payments, and manage your business, all through a simple conversation.`

## Local run
1. Start the backend first.
2. From `agent/`, run `npm install`.
3. Run `npm run dev`.

## Notes
Telegram sessions are intentionally kept in memory for the hackathon. A bot restart requires wallet reconnection. No private key is requested or stored by the bot.
