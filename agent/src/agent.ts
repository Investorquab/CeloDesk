import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

/**
 * Telegram uses the same authenticated CeloDesk AI endpoint as the web app.
 * This keeps tools, model behavior, financial rules, and replies consistent
 * across the two interfaces instead of maintaining a second AI implementation.
 */

const BASE_URL = process.env.BACKEND_API_URL ?? 'http://localhost:3001';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type AgentResponse = { reply: string; artifacts?: any[] };

export async function handleMessage(
  merchantId: string,
  token: string,
  userMessage: string,
  history: ChatMessage[] = [],
): Promise<AgentResponse> {
  const res = await fetch(`${BASE_URL}/api/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: userMessage,
      history: history.slice(-10),
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? `CeloDesk AI request failed (${res.status}).`);
  }

  return body as AgentResponse;
}
