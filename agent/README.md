# CeloDesk agent

The Telegram AI agent for CeloDesk — natural-language invoicing on
Celo. This is the "CeloDesk AI" piece from the original build plan.

## What it does
A merchant messages the bot in plain English ("create an invoice for
David for $150 USDm for website design", "who still owes me?") and
Claude figures out which backend tool to call and does it. See
`src/agent.ts` for the actual tool-calling loop and `src/tools.ts` for
what the agent can do (and, just as importantly, what it can't —
there's no "mark as paid" or "move funds" tool; those stay strictly
backend-verified).

## Setup

1. `npm install`
2. `cp .env.example .env`
3. Fill in:
   - `TELEGRAM_BOT_TOKEN` — from BotFather (see
     `../CeloDesk backend/docs/CLAUDE_3_AGENT.md` for how)
   - `GROQ_API_KEY` — free at console.groq.com, no credit card
     required. This is what gives the bot real language understanding
     instead of rigid commands — required, not optional, for this bot
     to work as designed. Uses Groq's `openai/gpt-oss-120b` model
     (their own recommendation for reliable tool-calling).
   - `BACKEND_API_URL` — defaults to `http://localhost:3001`, change
     only if your backend runs somewhere else.
4. Make sure `CeloDesk backend` is running first (`npm run dev` in
   that folder) — this bot calls it for everything.
5. `npm run dev`

## Try it
In Telegram, find your bot (the username you gave BotFather) and send
`/start`. It'll ask for your wallet address, then you can try:
- "Create an invoice for David for $150 USDm for website design"
- "Who still owes me?"
- "What's my payment summary?"

## What's NOT done yet
- **Reminder delivery is fake right now — confirmed by live testing,
  not assumed.** `send_payment_reminder` only writes a row to the
  Reminder table; nothing is ever actually sent to the client. We
  don't collect client email/Telegram/phone anywhere in the schema.
  The bot's reply used to falsely say "✅ Reminder sent" — fixed to be
  honest about this in the system prompt, but the underlying feature
  (actual client contact + delivery) still needs to be built. Real
  fix needs: (1) a `clientContact` field actually being populated at
  invoice-creation time (schema already has it, nothing populates it
  yet), (2) an actual send mechanism (email via a service like Resend,
  or a client-facing Telegram bot flow) once contact info exists.
- **Sessions are in-memory** (`Map` in `src/index.ts`) — restarting
  the bot forgets who's linked. Fine for hackathon demo/dev; before
  any real deploy, this needs to look up `telegramId → merchantId`
  against the backend instead (flag to Claude 1 — no
  `GET /api/merchants/by-telegram/:id` exists yet).
- **No MCP server** — per PRODUCT_SPEC.md, this is P7, intentionally
  last.
- **Rate limiting on Claude API calls** — none yet. A chatty user
  could run up API costs; add basic per-user rate limiting before any
  public launch.
- **Attribution tag threading** — this bot only ever creates invoices
  and reads data; it never constructs or sends an on-chain transaction
  itself (the client's own wallet does that, via the frontend). So
  `celo_5ad8f72f8a99` tagging isn't this bot's concern directly — it's
  the frontend's payment-intent flow that matters for attribution.
