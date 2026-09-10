import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { createInvoice, getInvoice, listOutstandingInvoices, getPaymentSummary } from '../services/invoiceService';
import { getMerchant } from '../services/merchantService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const router = Router();

const agentRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) })).max(6).optional(),
});

const tools = [
  {
    type: 'function',
    function: {
      name: 'create_invoice',
      description: 'Create a CeloDesk payment invoice for the authenticated merchant. Use this when the merchant explicitly asks to create an invoice AND the payment token is known. Never create an invoice without a client name, amount, and explicit token. If the amount is described only as dollars/$/USD and no token is named, ask which supported token the merchant wants: USDm, USDC, or USDT. Do not silently choose a default token for an ambiguous dollar amount.',
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Name of the person or business being billed.' },
          amount: { type: 'string', description: 'Invoice amount as a decimal string, e.g. 405 or 150.50.' },
          tokenSymbol: { type: 'string', enum: ['USDm', 'USDC', 'USDT', 'NGNm'], description: 'Payment token. Must be explicitly known before creating an invoice.' },
          description: { type: 'string', description: 'What the invoice is for.' },
          clientContact: { type: 'string', description: 'Optional client email or contact.' },
          dueDate: { type: 'string', description: 'Optional ISO due date.' },
        },
        required: ['clientName', 'amount', 'tokenSymbol'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_outstanding_invoices',
      description: 'List the authenticated merchant\'s currently outstanding invoices. Use for questions such as who owes me, outstanding invoices, unpaid invoices.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_invoice',
      description: 'Get an invoice and its payment records. Use invoiceId when known, or clientName to find the most recent invoice for a named client.',
      parameters: {
        type: 'object',
        properties: { invoiceId: { type: 'string' }, clientName: { type: 'string' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_invoice_status',
      description: 'Get the current status of an invoice. Use invoiceId when known, or clientName to find the most recent invoice for a named client.',
      parameters: {
        type: 'object',
        properties: { invoiceId: { type: 'string' }, clientName: { type: 'string' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payment_summary',
      description: 'Get the authenticated merchant\'s payment and outstanding summary, including per-token outstanding amounts.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_recent_activity',
      description: 'List the authenticated merchant\'s recent invoices and their statuses. Use for recent activity/history questions.',
      parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 10 } }, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_merchant_profile',
      description: 'Get the authenticated merchant\'s business profile, accepted tokens, and wallet details.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'help',
      description: 'Explain what CeloDesk AI can do.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
] as const;

function json(value: unknown) {
  return JSON.stringify(value, (_key, v) => typeof v === 'bigint' ? v.toString() : v);
}

function normalizeToken(value: string | undefined) {
  if (!value) return '';
  const v = value.toLowerCase().replace(/₮/g, 't').trim();
  if (['usdt', 'tether', 'tether usd', 'usd t'].includes(v)) return 'USDT';
  if (['usdc', 'usd coin'].includes(v)) return 'USDC';
  if (['usdm', 'mento dollar', 'mento usd'].includes(v)) return 'USDm';
  if (['ngnm', 'mento naira', 'mento nigerian naira'].includes(v)) return 'NGNm';
  return value;
}

async function findInvoiceForMerchant(merchantId: string, args: { invoiceId?: string; clientName?: string }) {
  if (args.invoiceId) {
    const invoice = await getInvoice(args.invoiceId);
    if (invoice.merchantId !== merchantId) throw new Error('Invoice not found.');
    return invoice;
  }
  if (args.clientName) {
    const invoice = await prisma.invoice.findFirst({
      where: { merchantId, clientName: { contains: args.clientName, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      include: { payments: true, merchant: { include: { profile: true } } },
    });
    if (!invoice) throw new Error(`I could not find an invoice for ${args.clientName}.`);
    return invoice;
  }
  throw new Error('Please provide an invoice ID or client name.');
}

async function executeTool(name: string, rawArgs: unknown, merchantId: string) {
  const args = (rawArgs ?? {}) as Record<string, any>;
  switch (name) {
    case 'create_invoice': {
      const clientName = String(args.clientName ?? '').trim();
      const amount = String(args.amount ?? '').trim();
      if (!clientName || !amount || !/^\d+(?:\.\d+)?$/.test(amount) || Number(amount) <= 0) throw new Error('A valid positive invoice amount and client name are required.');
      const merchant = await getMerchant(merchantId);
      const tokenSymbol = normalizeToken(args.tokenSymbol);
      if (!tokenSymbol || !['USDm', 'USDC', 'USDT', 'NGNm'].includes(tokenSymbol)) throw new Error('Please choose a supported payment token before creating the invoice.');
      const invoice = await createInvoice({
        merchantId,
        clientName,
        amount,
        tokenSymbol,
        description: String(args.description ?? '').trim() || 'Payment request',
        clientContact: args.clientContact ? String(args.clientContact).trim() : undefined,
        dueDate: args.dueDate ? String(args.dueDate) : undefined,
      });
      return {
        action: 'invoice_created',
        invoice: { id: invoice.id, publicSlug: invoice.publicSlug, clientName: invoice.clientName, amount: invoice.amount.toString(), tokenSymbol: invoice.tokenSymbol, description: invoice.description, status: invoice.status, publicUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoice/${invoice.publicSlug}` },
      };
    }
    case 'list_outstanding_invoices': {
      const rows = await listOutstandingInvoices(merchantId);
      return { action: 'outstanding', invoices: rows.map(i => ({ id: i.id, publicSlug: i.publicSlug, clientName: i.clientName, amount: i.amount.toString(), tokenSymbol: i.tokenSymbol, description: i.description, status: i.status, dueDate: i.dueDate })) };
    }
    case 'get_invoice': {
      const invoice = await findInvoiceForMerchant(merchantId, args);
      return { action: 'invoice_detail', invoice: { id: invoice.id, publicSlug: invoice.publicSlug, clientName: invoice.clientName, amount: invoice.amount.toString(), tokenSymbol: invoice.tokenSymbol, description: invoice.description, status: invoice.status, dueDate: invoice.dueDate, payments: invoice.payments } };
    }
    case 'get_invoice_status': {
      const invoice = await findInvoiceForMerchant(merchantId, args);
      return { action: 'invoice_status', invoice: { id: invoice.id, publicSlug: invoice.publicSlug, clientName: invoice.clientName, amount: invoice.amount.toString(), tokenSymbol: invoice.tokenSymbol, status: invoice.status, description: invoice.description } };
    }
    case 'get_payment_summary': {
      const summary = await getPaymentSummary(merchantId);
      return { action: 'payment_summary', summary };
    }
    case 'list_recent_activity': {
      const limit = Math.min(10, Math.max(1, Number(args.limit) || 6));
      const invoices = await prisma.invoice.findMany({ where: { merchantId }, orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, publicSlug: true, clientName: true, amount: true, tokenSymbol: true, description: true, status: true, createdAt: true, updatedAt: true } });
      return { action: 'recent_activity', invoices };
    }
    case 'get_merchant_profile': {
      const merchant = await getMerchant(merchantId);
      return { action: 'merchant_profile', merchant };
    }
    case 'help':
      return { action: 'help', capabilities: ['Create invoices', 'See who owes you', 'Check invoice/payment status', 'See payment summary', 'Review recent activity', 'View your business profile'] };
    default:
      throw new Error(`Unknown agent tool: ${name}`);
  }
}

const SYSTEM = `You are CeloDesk AI, a concise business payment assistant for the authenticated merchant. CeloDesk helps merchants create, share, track and verify invoices on Celo.

Rules:
- Use tools for any question about the merchant's actual invoices, payments, profile, balances or activity. Never invent financial data.
- Use create_invoice only when the user explicitly asks to create an invoice. Do not create one merely because they are discussing an invoice.
- Never create an invoice until a payment token is explicitly known. If the user gives an amount in dollars, $, or USD but does not name a specific token, ask which token they want: USDm, USDC, or USDT. Do not infer USDm from a dollar amount. NGNm should only be used when explicitly selected/named.
- Understand normal token names including USDT, USD₮, Tether, Tether USD, USDC, USD Coin, USDm, Mento Dollar, Mento USD, NGNm, Mento Naira and Mento Nigerian Naira.
- Never claim an invoice is paid unless backend data says PAID or OVERPAID.
- Never move funds, sign transactions, or ask for a private key.
- If required information is missing for creation, ask only for the missing information, one focused question at a time when practical.
- Keep answers short and useful. When a tool returns invoice rows, summarize the important details and let the UI render interactive rows.
- For 'who still owes me?' call list_outstanding_invoices.
- For 'how much am I owed?' call get_payment_summary; do not add different token balances together as if they were the same currency.
- For 'has David paid?' use get_invoice with clientName when an invoice ID is not provided.
`;

async function groqChat(messages: any[], toolChoice: any = 'auto') {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not configured on the backend.');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b', messages, tools, tool_choice: toolChoice, temperature: 0.1, max_completion_tokens: 700, reasoning_effort: 'low', include_reasoning: false }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) console.error('Groq rate limit:', body?.error?.message || '429');
    throw new Error(response.status === 429 ? 'CeloDesk AI is temporarily busy. Please try again in a few seconds.' : (body?.error?.message || `Groq request failed (${response.status}).`));
  }
  return body;
}

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = agentRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid agent request.', details: parsed.error.flatten() });
  try {
    const messages: any[] = [
      { role: 'system', content: SYSTEM },
      ...(parsed.data.history ?? []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: parsed.data.message },
    ];
    const artifacts: any[] = [];
    for (let step = 0; step < 5; step++) {
      const completion = await groqChat(messages);
      const message = completion.choices?.[0]?.message;
      if (!message) throw new Error('Groq returned an empty response.');
      messages.push(message);
      const calls = message.tool_calls ?? [];
      if (!calls.length) return res.json({ reply: message.content || 'I completed the request.', artifacts });
      for (const call of calls) {
        let args: any = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch { throw new Error(`Invalid arguments returned for ${call.function.name}.`); }
        let result: any;
        try { result = await executeTool(call.function.name, args, req.merchantId!); } catch (err: any) { result = { error: err?.message || 'Tool execution failed.' }; }
        artifacts.push(result);
        messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: json(result) });
      }
    }
    return res.status(500).json({ error: 'The assistant reached its tool-call limit without finishing.' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Assistant request failed.' });
  }
});
