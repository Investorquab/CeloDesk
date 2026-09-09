import { Router } from 'express';
import { CELO_TOKENS } from '../celo/tokens';

export const router = Router();

// GET /api/tokens — single source of truth for which tokens are safe to
// offer in any dropdown/selector. Frontend (and eventually the Telegram
// bot) should call this instead of hardcoding a token list, so nothing
// can drift out of sync with src/celo/tokens.ts (the actual verified
// registry that invoice creation validates against).
router.get('/', (_req, res) => {
  const tokens = Object.values(CELO_TOKENS).map((t) => ({
    symbol: t.symbol,
    name: t.name,
    decimals: t.decimals,
  }));
  res.json(tokens);
});
