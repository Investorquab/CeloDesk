/**
 * Telegram does not maintain a second tool registry.
 * It forwards authenticated messages to backend/src/routes/agent.ts,
 * which is the single source of truth for CeloDesk AI tools and rules.
 */
export const TOOLS = [];
