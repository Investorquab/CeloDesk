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


function telegramHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function invoiceStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    DRAFT: '📝',
    SENT: '📤',
    VIEWED: '👀',
    PENDING: '⏳',
    PARTIALLY_PAID: '🟡',
    PAID: '✅',
    OVERPAID: '💚',
    OVERDUE: '⚠️',
    FAILED: '❌',
    CANCELLED: '🚫',
    EXPIRED: '⌛',
  };
  return icons[status] || '•';
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
    await ctx.reply('📋 <b>No invoices yet</b>\n\nTap below to create your first invoice.', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('➕ Create invoice', 'create_invoice')]]),
    });
    return;
  }

  const shown = invoices.slice(0, 10);
  const lines = ['📋 <b>Recent invoices</b>', '', `Showing ${shown.length} invoice${shown.length === 1 ? '' : 's'}`, ''];

  for (const invoice of shown) {
    const rawStatus = String(invoice.status || '');
    const status = invoiceStatusLabel(rawStatus).toUpperCase();
    const statusIcon = invoiceStatusIcon(rawStatus);
    const client = telegramHtml(String(invoice.clientName || 'Unnamed client'));
    const amount = telegramHtml(String(invoice.amount || '0'));
    const token = telegramHtml(String(invoice.tokenSymbol || ''));
    const date = formatInvoiceDate(invoice.createdAt);
    lines.push(`🧾 <b>${client}</b>`, `   💰 ${amount} ${token}  ·  ${statusIcon} ${status}`, `   📅 ${date}`, '');
  }

  lines.push('💡 Ask me about an invoice for more details.');

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('➕ Create invoice', 'create_invoice')]]),
  });
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
  await sendTelegramText(ctx, '🔐 <b>Session inactive</b>\n\nSend /start to reconnect your Celo wallet.');
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
      caption: '🧾 CeloDesk invoice · ready to share',
      ...Markup.inlineKeyboard([[Markup.button.url('🔗 Open invoice', invoice.publicUrl)]]),
    });
  } catch (err) {
    console.error('Telegram invoice card render failed:', err);
    await ctx.reply('✅ <b>Your invoice is ready</b>:', Markup.inlineKeyboard([[Markup.button.url('🔗 Open invoice', invoice.publicUrl)]]));
  }
}


function invoiceStatusEmoji(status: string): string {
  return invoiceStatusIcon(status);
}

function formatInvoiceBlock(invoice: any, detailed = false): string {
  const status = String(invoice?.status || '');
  const client = telegramHtml(String(invoice?.clientName || 'Unnamed client'));
  const amount = telegramHtml(String(invoice?.amount || '0'));
  const token = telegramHtml(String(invoice?.tokenSymbol || ''));
  const lines = [
    `🧾 <b>${client}</b>`,
    `💰 <b>Amount:</b> ${amount} ${token}`,
    `${invoiceStatusEmoji(status)} <b>Status:</b> ${telegramHtml(invoiceStatusLabel(status))}`,
  ];
  if (invoice?.createdAt) lines.push(`📅 <b>Created:</b> ${telegramHtml(formatInvoiceDate(invoice.createdAt))}`);
  if (invoice?.dueDate) lines.push(`⏰ <b>Due:</b> ${telegramHtml(formatInvoiceDate(invoice.dueDate))}`);
  if (invoice?.description) lines.push(`📝 <b>Description:</b> ${telegramHtml(String(invoice.description))}`);
  if (detailed && Array.isArray(invoice?.payments) && invoice.payments.length) {
    lines.push('', '💳 <b>Payments</b>');
    for (const payment of invoice.payments.slice(0, 5)) {
      const paymentStatus = String(payment.status || '');
      lines.push(`• ${telegramHtml(String(payment.amount || '0'))} ${telegramHtml(String(payment.tokenSymbol || token))} · ${telegramHtml(paymentStatus)}`);
    }
  }
  return lines.join('\n');
}

function formatArtifactReply(artifact: any): string | null {
  if (!artifact?.action) return null;
  switch (artifact.action) {
    case 'invoice_status':
      return `🔎 <b>Invoice status</b>\n\n${formatInvoiceBlock(artifact.invoice)}`;
    case 'invoice_detail':
      return `📄 <b>Invoice details</b>\n\n${formatInvoiceBlock(artifact.invoice, true)}`;
    case 'outstanding': {
      const invoices = Array.isArray(artifact.invoices) ? artifact.invoices : [];
      if (!invoices.length) return '🎉 <b>You are all caught up!</b>\n\nThere are no outstanding invoices right now.';
      const lines = ['💰 <b>Outstanding invoices</b>', '', `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} awaiting payment`, ''];
      for (const invoice of invoices.slice(0, 10)) lines.push(formatInvoiceBlock(invoice), '');
      lines.push('💡 Ask me about any invoice for more details.');
      return lines.join('\n');
    }
    case 'payment_summary': {
      const summary = artifact.summary || {};
      const byStatus = summary.byStatus || {};
      const outstandingByToken = summary.outstandingByToken || {};
      const lines = [
        '📊 <b>Payment summary</b>',
        '',
        `🧾 <b>Total invoices:</b> ${Number(summary.total || 0)}`,
        `📤 <b>Sent:</b> ${Number(byStatus.SENT || 0)}`,
        `👀 <b>Viewed:</b> ${Number(byStatus.VIEWED || 0)}`,
        `⏳ <b>Pending:</b> ${Number(byStatus.PENDING || 0)}`,
        `🟡 <b>Partially paid:</b> ${Number(byStatus.PARTIALLY_PAID || 0)}`,
        `✅ <b>Paid:</b> ${Number(byStatus.PAID || 0) + Number(byStatus.OVERPAID || 0)}`,
      ];
      const tokenEntries = Object.entries(outstandingByToken) as [string, unknown][];
      if (tokenEntries.length) {
        lines.push('', '💸 <b>Still outstanding</b>');
        for (const [token, amount] of tokenEntries) lines.push(`• ${telegramHtml(String(amount))} ${telegramHtml(token)}`);
      } else {
        lines.push('', '🎉 <b>Nothing outstanding</b>');
      }
      return lines.join('\n');
    }
    case 'help':
      return ['🤖 <b>What CeloDesk can do</b>', '', '🧾 Create invoices', '💰 See who still owes you', '🔎 Check invoice and payment status', '📊 View your payment summary', '📋 Review recent invoices', '👤 View your business profile', '', 'Just tell me what you need in plain English.'].join('\n');
    case 'invoice_created': {
      const invoice = artifact.invoice;
      if (!invoice) return null;
      return `✅ <b>Invoice created</b>\n\n${formatInvoiceBlock(invoice)}\n\n🔗 Your secure payment link is ready below.`;
    }
    default:
      return null;
  }
}

function formatGenericTelegramReply(text: string): string {
  const cleaned = cleanTelegramText(text);
  if (!cleaned) return '';
  const escaped = telegramHtml(cleaned);
  return /^(sure|okay|ok|done|completed|here|of course)/i.test(cleaned) ? `✨ ${escaped}` : escaped;
}

async function sendTelegramText(ctx: any, html: string) {
  if (!html) return;
  const max = 3900;
  const lines = html.split('\n');
  let chunk = '';
  for (const line of lines) {
    if ((chunk + (chunk ? '\n' : '') + line).length > max && chunk) {
      await ctx.reply(chunk, { parse_mode: 'HTML' });
      chunk = line;
    } else {
      chunk += (chunk ? '\n' : '') + line;
    }
  }
  if (chunk) await ctx.reply(chunk, { parse_mode: 'HTML' });
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

    const artifacts = result.artifacts ?? [];
    const invoiceArtifact = artifacts.find((a: any) => a?.action === 'invoice_created');
    const recentInvoicesArtifact = artifacts.find((a: any) => a?.action === 'recent_activity');
    const displayArtifact = [...artifacts].reverse().find((a: any) => ['invoice_status', 'invoice_detail', 'outstanding', 'payment_summary', 'help', 'invoice_created'].includes(a?.action));

    if (recentInvoicesArtifact) {
      await sendRecentInvoices(ctx, recentInvoicesArtifact);
    } else {
      const formatted = formatArtifactReply(displayArtifact) || formatGenericTelegramReply(reply);
      await sendTelegramText(ctx, formatted);
    }

    if (invoiceArtifact) await sendInvoiceArtifact(ctx, invoiceArtifact);
  } catch (err: any) {
    console.error('CeloDesk Telegram agent error:', err);
    await sendTelegramText(ctx, '⚠️ <b>CeloDesk is temporarily busy</b>\n\nPlease try again in a few seconds.');
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
    await sendTelegramText(ctx, '👋 <b>Welcome back to CeloDesk</b>\n\nWhat would you like to do?');\n    await ctx.reply('What would you like to do?', mainKeyboard);
    return;
  }

  const knownMerchantId = await getMerchantByTelegramId(telegramId);
  awaitingWallet.add(telegramId);
  if (knownMerchantId) {
    await sendTelegramText(ctx, '👋 <b>Welcome back</b>\n\n🔐 Reconnect your Celo wallet to refresh your secure session.\n\nPaste the wallet address that receives your payments.');
  } else {
    await sendTelegramText(ctx, '👋 <b>Welcome to CeloDesk</b>\n\n🧾 Create invoices\n💰 Track payments\n📊 Manage your payment desk\n\n🔐 First, connect your receiving wallet by pasting its Celo address (starts with 0x).');
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
      await sendTelegramText(ctx, '⚠️ <b>Invalid wallet address</b>\n\nA Celo wallet address should start with <code>0x</code> and contain 42 characters. Please try again.');
      return;
    }
    try {
      const result = await linkTelegramWallet(telegramId, text);
      if (!result.token) throw new Error('The server did not issue a secure session token.');
      sessions.set(telegramId, { merchantId: result.merchantId, token: result.token });
      histories.delete(telegramId);
      awaitingWallet.delete(telegramId);
      await ctx.reply('✅ <b>Wallet connected</b>\n\nYou are ready to use CeloDesk. 👋\n\nTry <b>Create an invoice</b> or <b>Who still owes me?</b>', mainKeyboard);
    } catch (err: any) {
      console.error('Telegram wallet link error:', err);
      await sendTelegramText(ctx, '❌ <b>Wallet connection failed</b>\n\nPlease check the address and try again.');
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
