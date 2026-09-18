import { AsyncLocalStorage } from 'node:async_hooks';
import dotenv from 'dotenv';
import {
  hostHeaderValidation,
  originValidation,
} from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import express from 'express';
import jwt from 'jsonwebtoken';
import * as z from 'zod/v4';
import { authenticateOAuthBearer, mountOAuthRoutes } from './oauth.js';

dotenv.config({
  path: process.env.CELODESK_ENV_FILE || '/root/celodesk/.env',
});

const PORT = Number(process.env.MCP_PORT || 3002);
const BACKEND_API_URL =
  process.env.BACKEND_API_URL || 'http://127.0.0.1:3001';

const JWT_SECRET = process.env.JWT_SECRET;
const MCP_TOKEN = process.env.CELODESK_MCP_TOKEN;
const MERCHANT_ID = process.env.CELODESK_MERCHANT_ID;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in environment');
}

if (!MCP_TOKEN) {
  throw new Error('Missing CELODESK_MCP_TOKEN in environment');
}
const MCP_TOKEN_VALUE = MCP_TOKEN;

if (!MERCHANT_ID) {
  throw new Error('Missing CELODESK_MERCHANT_ID in environment');
}
const MERCHANT_ID_VALUE = MERCHANT_ID;

const merchantContext = new AsyncLocalStorage<string>();

function currentMerchantId(): string {
  return merchantContext.getStore() || MERCHANT_ID_VALUE;
}

function authenticateBearer(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const authorization = req.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (token.length !== MCP_TOKEN_VALUE.length) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let valid = true;

  for (let i = 0; i < MCP_TOKEN_VALUE.length; i++) {
    if (token.charCodeAt(i) !== MCP_TOKEN_VALUE.charCodeAt(i)) {
      valid = false;
    }
  }

  if (!valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

function createBackendToken() {
  return jwt.sign(
    {
      merchantId: currentMerchantId(),
      source: 'celodesk-mcp',
    },
    JWT_SECRET!,
    {
      expiresIn: '10m',
    },
  );
}

async function backendFetch(
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const token = createBackendToken();

  const response = await fetch(`${BACKEND_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data: any;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Backend request failed with HTTP ${response.status}`,
    );
  }

  return data;
}


function invoiceStatusEmoji(status: unknown): string {
  switch (String(status || '').toUpperCase()) {
    case 'DRAFT': return '📝';
    case 'SENT': return '📤';
    case 'VIEWED': return '👀';
    case 'PENDING': return '⏳';
    case 'PARTIALLY_PAID': return '🟡';
    case 'PAID': return '✅';
    case 'OVERPAID': return '💚';
    case 'OVERDUE': return '⚠️';
    case 'FAILED': return '❌';
    case 'CANCELLED': return '🚫';
    case 'EXPIRED': return '⌛';
    default: return '•';
  }
}

function formatInvoice(invoice: any, detailed = false): string {
  const lines = [
    `🧾 **${invoice.clientName || 'Invoice'}**`,
    `💰 **Amount:** ${invoice.amount ?? '—'} ${invoice.tokenSymbol ?? ''}`,
    `${invoiceStatusEmoji(invoice.status)} **Status:** ${invoice.status ?? '—'}`,
  ];

  if (invoice.description) lines.push(`📝 **Description:** ${invoice.description}`);
  if (invoice.dueDate) lines.push(`📅 **Due:** ${invoice.dueDate}`);
  if (invoice.id) lines.push(`🆔 **Invoice ID:** ${invoice.id}`);
  if (invoice.publicUrl) lines.push(`🔗 **Payment link:** ${invoice.publicUrl}`);

  if (detailed && Array.isArray(invoice.payments) && invoice.payments.length) {
    lines.push('', '💳 **Payments**');
    for (const payment of invoice.payments) {
      lines.push(
        `• ${payment.amount ?? '—'} ${payment.tokenSymbol ?? ''} · ${payment.status ?? '—'}` +
        (payment.txHash ? ` · ${payment.txHash}` : ''),
      );
    }
  }

  return lines.join('\n');
}

function formatMcpResult(toolName: string, result: any): string {
  if (toolName === 'create_invoice') {
    return [
      '🎉 **Invoice created successfully**',
      '',
      formatInvoice(result, true),
      '',
      '💡 Share the payment link with your client to collect payment.',
    ].join('\n');
  }

  if (toolName === 'get_invoice') {
    return ['📄 **Invoice details**', '', formatInvoice(result, true)].join('\n');
  }

  if (toolName === 'get_invoice_status') {
    const paymentLines = Array.isArray(result?.payments) && result.payments.length
      ? [
          '',
          '💳 **Verified payments**',
          ...result.payments.slice(0, 5).map((payment: any) =>
            `• ${payment.amount ?? '—'} ${payment.tokenSymbol ?? ''} · ${payment.status ?? '—'}${payment.txHash ? ` · ${payment.txHash}` : ''}`,
          ),
        ]
      : [];

    return [
      '🔎 **Invoice status**',
      '',
      `\${invoiceStatusEmoji(result?.status)} **Status:** ${result?.status ?? 'Unknown'}`,
      ...paymentLines,
    ].join('\\n');
  }

  if (toolName === 'list_invoices') {
    const invoices = Array.isArray(result) ? result : [];
    if (!invoices.length) {
      return '📋 **Invoices**\n\n🎉 No invoices found.';
    }

    return [
      `📋 **Invoices** · ${invoices.length} total`,
      '',
      ...invoices.map((invoice: any) => formatInvoice(invoice)),
    ].join('\n\n');
  }

  if (toolName === 'get_payment_summary') {
    const byStatus = result?.byStatus || {};
    const outstandingByToken = result?.outstandingByToken || {};
    const statusLines = Object.entries(byStatus)
      .map(([status, count]) => `${invoiceStatusEmoji(status)} ${status}: ${count}`);
    const outstandingLines = Object.entries(outstandingByToken)
      .map(([token, amount]) => `• ${amount} ${token}`);

    return [
      '📊 **Payment summary**',
      '',
      `🧾 **Total invoices:** ${result?.total ?? 0}`,
      ...(statusLines.length ? ['', ...statusLines] : []),
      '',
      '💸 **Outstanding**',
      ...(outstandingLines.length ? outstandingLines : ['🎉 Nothing outstanding.']),
    ].join('\n');
  }

  if (toolName === 'get_merchant_profile') {
    return [
      '👤 **Merchant profile**',
      '',
      `🏪 **Business:** ${result?.businessName || result?.profile?.businessName || 'Not set'}`,
      `💼 **Wallet:** ${result?.walletAddress || '—'}`,
      ...(result?.tagline ? [`✨ **Tagline:** ${result.tagline}`] : []),
      ...(result?.websiteUrl ? [`🌐 **Website:** ${result.websiteUrl}`] : []),
    ].join('\n');
  }

  return typeof result === 'string'
    ? result
    : JSON.stringify(result, null, 2);
}

function formatMcpError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  return `⚠️ **Something went wrong**\n\n${message}\n\n💡 Please try again shortly.`;
}

function createServer() {
  const server = new McpServer({
    name: 'CeloDesk',
    version: '0.1.0',
  });

  server.registerTool(
    'create_invoice',
    {
      title: 'Create CeloDesk Invoice',
      description:
        'Create a real CeloDesk invoice for the authenticated merchant. Returns the public payment URL and invoice details.',
      inputSchema: z.object({
        clientName: z.string().min(1).max(120),
        clientContact: z.string().max(200).optional(),
        amount: z.union([
          z.number().positive(),
          z.string().regex(/^\d+(\.\d{1,6})?$/),
        ]),
        tokenSymbol: z.enum(['USDT', 'USDC', 'USDm', 'NGNm']),
        description: z.string().min(1).max(500),
        dueDate: z.string().optional(),
      }),
    },
    async ({
      clientName,
      clientContact,
      amount,
      tokenSymbol,
      description,
      dueDate,
    }) => {
      try {
        const result = await backendFetch('/api/invoices', {
          method: 'POST',
          body: JSON.stringify({
            merchantId: currentMerchantId(),
            clientName,
            clientContact: clientContact || undefined,
            amount: String(amount),
            tokenSymbol,
            description,
            dueDate: dueDate || undefined,
          }),
        });

        return {
          content: [
            {
              type: 'text',
              text: formatMcpResult('create_invoice', {
                success: true,
                invoiceId: result.id,
                publicUrl: result.publicUrl,
                status: result.status,
                clientName,
                amount: String(amount),
                tokenSymbol,
                description,
                dueDate: dueDate || null,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: formatMcpError(error, 'Unable to create invoice.'),
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'get_invoice',
    {
      title: 'Get Invoice',
      description: 'Get a specific CeloDesk invoice owned by the merchant.',
      inputSchema: z.object({
        invoiceId: z.string().min(1),
      }),
    },
    async ({ invoiceId }) => {
      try {
        const result = await backendFetch(`/api/invoices/${invoiceId}`);

        return {
          content: [
            {
              type: 'text',
              text: formatMcpResult('get_invoice', result),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: formatMcpError(error, 'Unable to get invoice.'),
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'get_invoice_status',
    {
      title: 'Get Invoice Status',
      description: 'Check the current payment status of a CeloDesk invoice. Preserve the returned emoji and Markdown formatting when presenting the result; do not remove the status icon.',
      inputSchema: z.object({
        invoiceId: z.string().min(1),
      }),
    },
    async ({ invoiceId }) => {
      try {
        const result = await backendFetch(
          `/api/invoices/${invoiceId}/status`,
        );

        return {
          content: [
            {
              type: 'text',
              text: formatMcpResult('get_invoice_status', result),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: formatMcpError(error, 'Unable to get invoice status.'),
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'list_invoices',
    {
      title: 'List CeloDesk Invoices',
      description:
        'List invoices belonging to the authenticated CeloDesk merchant.',
      inputSchema: z.object({
        status: z
          .enum(['outstanding', 'all'])
          .optional()
          .default('all'),
      }),
    },
    async ({ status }) => {
      try {
        const query =
          status === 'outstanding'
            ? `?merchantId=${encodeURIComponent(currentMerchantId())}&status=outstanding`
            : `?merchantId=${encodeURIComponent(currentMerchantId())}`;

        const result = await backendFetch(`/api/invoices${query}`);

        return {
          content: [
            {
              type: 'text',
              text: formatMcpResult('list_invoices', result),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: formatMcpError(error, 'Unable to list invoices.'),
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'get_payment_summary',
    {
      title: 'Get Payment Summary',
      description:
        'Get the authenticated merchant payment summary and outstanding balances.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const result = await backendFetch(
          `/api/invoices/summary/${currentMerchantId()}`,
        );

        return {
          content: [
            {
              type: 'text',
              text: formatMcpResult('get_payment_summary', result),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: formatMcpError(error, 'Unable to get payment summary.'),
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'get_merchant_profile',
    {
      title: 'Get Merchant Profile',
      description: 'Get the CeloDesk merchant profile.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const result = await backendFetch(
          `/api/merchants/${currentMerchantId()}`,
        );

        return {
          content: [
            {
              type: 'text',
              text: formatMcpResult('get_merchant_profile', result),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: formatMcpError(error, 'Unable to get merchant profile.'),
            },
          ],
        };
      }
    },
  );

  return server;
}

const handler = createMcpHandler(() => createServer());

const app = express();


app.use((req, _res, next) => {
  if (req.path === '/authorize' || req.path === '/token' || req.path.startsWith('/.well-known')) {
    console.log('[OAUTH DEBUG]', req.method, req.path, 'origin=', req.headers.origin, 'host=', req.headers.host);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

mountOAuthRoutes(app);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'celodesk-mcp',
  });
});

const nodeHandler = toNodeHandler(handler);

app.use(
  '/mcp',
  hostHeaderValidation([
    'mcp.185-7-81-139.sslip.io',
    '127.0.0.1',
    'localhost',
  ]),
);

app.use(
  '/mcp',
  originValidation([
    'mcp.185-7-81-139.sslip.io',
  ]),
);

app.all('/mcp', authenticateOAuthBearer, (req, res) => {
  const merchantId =
    typeof res.locals.merchantId === 'string'
      ? res.locals.merchantId
      : MERCHANT_ID_VALUE;

  merchantContext.run(merchantId, () => {
    nodeHandler(req, res, req.body);
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`CeloDesk MCP listening on 127.0.0.1:${PORT}`);
  console.log(`Backend API: ${BACKEND_API_URL}`);
  console.log('MCP endpoint: /mcp');
});
