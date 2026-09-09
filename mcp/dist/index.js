import dotenv from 'dotenv';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import express from 'express';
import jwt from 'jsonwebtoken';
import * as z from 'zod/v4';
dotenv.config({
    path: process.env.CELODESK_ENV_FILE || '/root/celodesk/.env',
});
const PORT = Number(process.env.MCP_PORT || 3002);
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:3001';
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
function authenticateBearer(req, res, next) {
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
    return jwt.sign({
        merchantId: MERCHANT_ID,
        source: 'celodesk-mcp',
    }, JWT_SECRET, {
        expiresIn: '10m',
    });
}
async function backendFetch(path, options = {}) {
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
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    }
    catch {
        data = { message: text };
    }
    if (!response.ok) {
        throw new Error(data?.message ||
            data?.error ||
            `Backend request failed with HTTP ${response.status}`);
    }
    return data;
}
function createServer() {
    const server = new McpServer({
        name: 'CeloDesk',
        version: '0.1.0',
    });
    server.registerTool('create_invoice', {
        title: 'Create CeloDesk Invoice',
        description: 'Create a real CeloDesk invoice for the authenticated merchant. Returns the public payment URL and invoice details.',
        inputSchema: z.object({
            clientName: z.string().min(1).max(120),
            clientContact: z.string().max(200).optional(),
            amount: z.number().positive(),
            tokenSymbol: z.enum(['USDT', 'USDC', 'USDm', 'NGNm']),
            description: z.string().min(1).max(500),
            dueDate: z.string().optional(),
        }),
    }, async ({ clientName, clientContact, amount, tokenSymbol, description, dueDate, }) => {
        try {
            const result = await backendFetch('/api/invoices', {
                method: 'POST',
                body: JSON.stringify({
                    merchantId: MERCHANT_ID,
                    clientName,
                    clientContact: clientContact || null,
                    amount,
                    tokenSymbol,
                    description,
                    dueDate: dueDate || null,
                }),
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'Invoice created successfully.',
                            invoiceId: result.id,
                            publicUrl: result.publicUrl,
                            status: result.status,
                            clientName,
                            amount,
                            tokenSymbol,
                            description,
                            dueDate: dueDate || null,
                        }),
                    },
                ],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: error instanceof Error
                            ? error.message
                            : 'Unable to create invoice.',
                    },
                ],
            };
        }
    });
    server.registerTool('get_invoice', {
        title: 'Get Invoice',
        description: 'Get a specific CeloDesk invoice owned by the merchant.',
        inputSchema: z.object({
            invoiceId: z.string().min(1),
        }),
    }, async ({ invoiceId }) => {
        try {
            const result = await backendFetch(`/api/invoices/${invoiceId}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: error instanceof Error
                            ? error.message
                            : 'Unable to get invoice.',
                    },
                ],
            };
        }
    });
    server.registerTool('get_invoice_status', {
        title: 'Get Invoice Status',
        description: 'Check the current payment status of a CeloDesk invoice.',
        inputSchema: z.object({
            invoiceId: z.string().min(1),
        }),
    }, async ({ invoiceId }) => {
        try {
            const result = await backendFetch(`/api/invoices/${invoiceId}/status`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: error instanceof Error
                            ? error.message
                            : 'Unable to get invoice status.',
                    },
                ],
            };
        }
    });
    server.registerTool('list_invoices', {
        title: 'List CeloDesk Invoices',
        description: 'List invoices belonging to the authenticated CeloDesk merchant.',
        inputSchema: z.object({
            status: z
                .enum(['outstanding', 'all'])
                .optional()
                .default('all'),
        }),
    }, async ({ status }) => {
        try {
            const query = status === 'outstanding'
                ? `?merchantId=${encodeURIComponent(MERCHANT_ID_VALUE)}&status=outstanding`
                : `?merchantId=${encodeURIComponent(MERCHANT_ID_VALUE)}`;
            const result = await backendFetch(`/api/invoices${query}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: error instanceof Error
                            ? error.message
                            : 'Unable to list invoices.',
                    },
                ],
            };
        }
    });
    server.registerTool('get_payment_summary', {
        title: 'Get Payment Summary',
        description: 'Get the authenticated merchant payment summary and outstanding balances.',
        inputSchema: z.object({}),
    }, async () => {
        try {
            const result = await backendFetch(`/api/invoices/summary/${MERCHANT_ID}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: error instanceof Error
                            ? error.message
                            : 'Unable to get payment summary.',
                    },
                ],
            };
        }
    });
    server.registerTool('get_merchant_profile', {
        title: 'Get Merchant Profile',
        description: 'Get the CeloDesk merchant profile.',
        inputSchema: z.object({}),
    }, async () => {
        try {
            const result = await backendFetch(`/api/merchants/${MERCHANT_ID}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: error instanceof Error
                            ? error.message
                            : 'Unable to get merchant profile.',
                    },
                ],
            };
        }
    });
    return server;
}
const handler = createMcpHandler(() => createServer());
const app = createMcpExpressApp({
    host: '127.0.0.1',
    allowedHosts: [
        'mcp.185-7-81-139.sslip.io',
        '127.0.0.1',
        'localhost',
    ],
});
app.use(express.json());
app.get('/health', (_req, res) => {
    res.json({
        ok: true,
        service: 'celodesk-mcp',
    });
});
const nodeHandler = toNodeHandler(handler);
app.all('/mcp', authenticateBearer, nodeHandler);
app.listen(PORT, '127.0.0.1', () => {
    console.log(`CeloDesk MCP listening on 127.0.0.1:${PORT}`);
    console.log(`Backend API: ${BACKEND_API_URL}`);
    console.log('MCP endpoint: /mcp');
});
