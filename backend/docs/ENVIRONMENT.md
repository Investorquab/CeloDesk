# ENVIRONMENT.md

## Server-only secrets (NEVER expose to frontend/client code)
```
DATABASE_URL=postgresql://...
RPC_URL=https://forno.celo.org        # or a paid RPC provider's Celo endpoint
PRIVATE_KEY=                          # only if/when a sponsored-gas or
                                       # account-abstraction relay is added
                                       # — NOT needed for the golden path,
                                       # where the client's own wallet signs
TELEGRAM_BOT_TOKEN=                   # CeloDesk AI's territory
MCP_SECRET=                           # if/when MCP server needs one
```

## Server config (not secret, but server-side)
```
APP_URL=http://localhost:3001         # used to build publicUrl in invoice responses
PORT=3001
```

## Frontend-safe (public) variables
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=42220
```

## Rule
If a variable would let someone move funds, access the database, or
impersonate the bot if leaked, it's server-only. When in doubt, don't
prefix it `NEXT_PUBLIC_` — leaking it is a shipped, permanent mistake
(bundled into client JS).
