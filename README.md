# CeloDesk

CeloDesk is an AI-powered payment desk for creating, sharing, tracking and verifying stablecoin invoices on Celo.

## Project structure

- `frontend/` — locked CeloDesk web UI.
- `backend/` — CeloDesk API, Prisma services, invoice/payment verification and the web AI route.
- `agent/` — CeloDesk Telegram agent.
- `.env.example` — shared environment template. The real `.env` stays local and is never committed.

## Local development

From the project root, create `.env` from `.env.example` and fill in the server-side values.

Backend:
```text
cd backend
npm install
npm run prisma:generate
npm run dev
```

Frontend:
```text
cd frontend
npm install
npm run dev
```

Telegram agent:
```text
cd agent
npm install
npm run dev
```

The frontend uses the root `.env` through `next.config.mjs`. Only public `NEXT_PUBLIC_*` values are exposed to the browser. `GROQ_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, and `PRIVATE_KEY` remain server-side.

## Product naming

The product name is **CeloDesk**. The dashboard assistant is **CeloDesk AI**. The Telegram interface is the **CeloDesk Telegram agent**.

The existing frontend and backend behavior is treated as the product baseline. Changes should be additive, corrective, or explicitly requested — not unsolicited redesigns.
