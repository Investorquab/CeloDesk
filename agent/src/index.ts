import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { Markup, Telegraf } from 'telegraf';
import { Input } from 'telegraf';
import { linkTelegramWallet, getMerchantByTelegramId } from './backendClient';
import { handleMessage } from './agent';
import { renderTelegramInvoiceCard } from './invoiceCard';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) throw new Error('Missing TELEGRAM_BOT_TOKEN in .env');

const bot = new Telegraf(botToken);

interface Session { merchantId: string; token: string }
const sessions = new Map<string, Session>();
const awaitingWallet = new Set<string>();
const histories = new Map<string, { role: 'user' | 'assistant'; content: string }[]>();

const mainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🧾 Create invoice', 'create_invoice')],
  [Markup.button.callback('💰 Who owes me?', 'who_owes'), Markup.button.callback('📊 Summary', 'summary')],
  [Markup.button.callback('📋 My invoices', 'invoices'), Markup.button.callback('❓ Help', 'help')],
]);

function cleanTelegramText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '· ')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1: $2')
    .trim();
}


function invoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Sent',
    VIEWED: 'Viewed',
    PENDING: 'Pending',
    PARTIALLY_PAID: 'Partially paid',
    PAID: 'Paid',
    OVERPAID: 'Overpaid',
    OVERDUE: 'Overdue',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
  };
  return labels[status] || status.replaceAll('_', ' ');
}

function formatInvoiceDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function sendRecentInvoices(ctx: any, artifact: any) {
  const invoices = Array.isArray(artifact?.invoices) ? artifact.invoices : [];
  if (!invoices.length) {
    await ctx.reply('You do not have any invoices yet.', mainKeyboard);
    return;
  }

  await ctx.reply('Your recent invoices', Markup.inlineKeyboard([
    [Markup.button.callback('Create invoice', 'create_invoice')],
  ]));

  for (const invoice of invoices.slice(0, 10)) {
    const lines = [
      'Invoice',
      String(invoice.clientName || 'Unnamed client'),
      '',
      'Amount  ' + String(invoice.amount || '0') + ' ' + String(invoice.tokenSymbol || ''),
      'Status  ' + invoiceStatusLabel(String(invoice.status || '')),
      'Created ' + formatInvoiceDate(invoice.createdAt),
      invoice.dueDate ? 'Due     ' + formatInvoiceDate(invoice.dueDate) : '',
      invoice.description ? 'For     ' + String(invoice.description) : '',
    ].filter(Boolean);

    const buttons = [];
    if (invoice.publicUrl) {
      buttons.push(Markup.button.url('Open invoice', invoice.publicUrl));
    }
    await ctx.reply(lines.join('\n'), Markup.inlineKeyboard([buttons]));
  }
}

function remember(telegramId: string, message: { role: 'user' | 'assistant'; content: string }) {
  const current = histories.get(telegramId) ?? [];
  current.push(message);
  histories.set(telegramId, current.slice(-6));
}

async function requireSession(ctx: any): Promise<Session | null> {
  const telegramId = String(ctx.from.id);
  const session = sessions.get(telegramId);
  if (session) return session;
  await ctx.reply('Your CeloDesk session is not active. Send /start to reconnect your wallet.');
  return null;
}

async function sendInvoiceArtifact(ctx: any, artifact: any) {
  const invoice = artifact?.invoice;
  if (!invoice?.publicUrl) return;
  try {
    const image = await renderTelegramInvoiceCard({
      clientName: invoice.clientName,
      amount: invoice.amount,
      tokenSymbol: invoice.tokenSymbol,
      description: invoice.description,
      dueDate: invoice.dueDate,
      publicUrl: invoice.publicUrl,
    });
    await ctx.replyWithPhoto(Input.fromBuffer(image), {
      caption: 'CeloDesk invoice · ready to share',
      ...Markup.inlineKeyboard([[Markup.button.url('🔗 Open invoice', invoice.publicUrl)]]),
    });
  } catch (err) {
    console.error('Telegram invoice card render failed:', err);
    await ctx.reply('Your invoice is ready:', Markup.inlineKeyboard([[Markup.button.url('🔗 Open invoice', invoice.publicUrl)]]));
  }
}

async function askAgent(ctx: any, text: string) {
  const telegramId = String(ctx.from.id);
  const session = await requireSession(ctx);
  if (!session) return;

  await ctx.sendChatAction('typing');
  try {
    const history = histories.get(telegramId) ?? [];
    const result = await handleMessage(session.merchantId, session.token, text, history);
    remember(telegramId, { role: 'user', content: text });
    const reply = cleanTelegramText(result.reply);
    remember(telegramId, { role: 'assistant', content: reply });

    const invoiceArtifact = (result.artifacts ?? []).find((a: any) => a?.action === 'invoice_created');
    const recentInvoicesArtifact = (result.artifacts ?? []).find((a: any) => a?.action === 'recent_activity');

    if (recentInvoicesArtifact) {
      await sendRecentInvoices(ctx, recentInvoicesArtifact);
    } else if (reply) {
      await ctx.reply(reply);
    }

    if (invoiceArtifact) await sendInvoiceArtifact(ctx, invoiceArtifact);
  } catch (err: any) {
    console.error('CeloDesk Telegram agent error:', err);
    await ctx.reply('CeloDesk is temporarily busy. Please try again in a few seconds.');
  }
}

bot.telegram.setMyCommands([
  { command: 'start', description: 'Connect or reconnect your Celo wallet' },
  { command: 'invoice', description: 'Create an invoice' },
  { command: 'owed', description: 'See who still owes you' },
  { command: 'summary', description: 'See your payment summary' },
  { command: 'invoices', description: 'View recent invoices' },
  { command: 'help', description: 'See what CeloDesk can do' },
]).catch(() => {});

bot.start(async (ctx) => {
  const telegramId = String(ctx.from.id);
  const existing = sessions.get(telegramId);
  if (existing) {
    await ctx.reply('Welcome back to CeloDesk! 👋\n\nWhat would you like to do?', mainKeyboard);
    return;
  }

  const knownMerchantId = await getMerchantByTelegramId(telegramId);
  awaitingWallet.add(telegramId);
  if (knownMerchantId) {
    await ctx.reply('Welcome back! Please reconnect your Celo wallet address to refresh your secure session:\n\nPaste the wallet address that receives your payments.');
  } else {
    await ctx.reply('Welcome to CeloDesk! 👋\n\nI can create invoices, help you track payments, and manage your Celo payment desk.\n\nFirst, connect your receiving wallet by pasting its Celo address (starts with 0x).');
  }
});

bot.command('invoice', (ctx) => askAgent(ctx, 'Create an invoice'));
bot.command('owed', (ctx) => askAgent(ctx, 'Who still owes me?'));
bot.command('summary', (ctx) => askAgent(ctx, 'How much am I owed and what is my payment summary?'));
bot.command('invoices', (ctx) => askAgent(ctx, 'Show me my recent invoices and their statuses.'));
bot.command('help', (ctx) => askAgent(ctx, 'What can you help me with?'));

bot.action('create_invoice', async (ctx) => { await ctx.answerCbQuery(); await askAgent(ctx, 'Create an invoice'); });
bot.action('who_owes', async (ctx) => { await ctx.answerCbQuery(); await askAgent(ctx, 'Who still owes me?'); });
bot.action('summary', async (ctx) => { await ctx.answerCbQuery(); await askAgent(ctx, 'How much am I owed and what is my payment summary?'); });
bot.action('invoices', async (ctx) => { await ctx.answerCbQuery(); await askAgent(ctx, 'Show me my recent invoices and their statuses.'); });
bot.action('help', async (ctx) => { await ctx.answerCbQuery(); await askAgent(ctx, 'What can you help me with?'); });

bot.on('text', async (ctx) => {
  const telegramId = String(ctx.from.id);
  const text = ctx.message.text.trim();

  if (awaitingWallet.has(telegramId)) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(text)) {
      await ctx.reply('That does not look like a valid Celo wallet address. It should start with 0x and be 42 characters.');
      return;
    }
    try {
      const result = await linkTelegramWallet(telegramId, text);
      if (!result.token) throw new Error('The server did not issue a secure session token.');
      sessions.set(telegramId, { merchantId: result.merchantId, token: result.token });
      histories.delete(telegramId);
      awaitingWallet.delete(telegramId);
      await ctx.reply('Wallet linked successfully. You are ready to use CeloDesk. 👋\n\nTry “Create an invoice” or “Who still owes me?”', mainKeyboard);
    } catch (err: any) {
      console.error('Telegram wallet link error:', err);
      await ctx.reply('I could not link that wallet. Please check the address and try again.');
    }
    return;
  }

  if (text.startsWith('/')) return;
  await askAgent(ctx, text);
});

bot.launch();
console.log('CeloDesk Telegram agent is running');
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
