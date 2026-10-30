import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { Markup, Telegraf } from 'telegraf';
import { Input } from 'telegraf';
import { linkTelegramWallet, getMerchantByTelegramId, getInvoiceBySlug, setInvoiceDecision, setClientTelegramChat, getDueTelegramReminders, markTelegramReminderSent, type TelegramReminder } from './backendClient';
import { handleMessage } from './agent';
import { renderTelegramInvoiceCard } from './invoiceCard';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) throw new Error('Missing TELEGRAM_BOT_TOKEN in .env');

// Where the public pay page lives, for the client "Pay in wallet" button.
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://celo-desk.vercel.app').replace(/\/$/, '');

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
      paymentQrValue: invoice.paymentQrValue || invoice.publicUrl,
    });
    await ctx.replyWithPhoto(Input.fromBuffer(image), {
      caption: '🧾 CeloDesk invoice · ready to share',
      ...Markup.inlineKeyboard([[Markup.button.url('🔗 Open invoice', invoice.publicUrl)]]),
    });
  } catch (err) {
    console.error('Telegram invoice card render failed:', err);
    await ctx.reply('✅ <b>Your invoice is ready</b>:', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.url('🔗 Open invoice', invoice.publicUrl)]]) });
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

// ---- Client-side invoice flow (Telegram delivery) ----
// A client taps a deep link https://t.me/<bot>?start=inv_<publicSlug>. The bot
// cannot cold-DM a username, so this is how an invoice reaches a client on
// Telegram: they open the link, see the invoice, accept or decline, then pay.
function merchantName(invoice: any): string {
  return invoice?.merchantDisplay?.name || invoice?.merchant?.profile?.businessName || 'A CeloDesk merchant';
}

function clientInvoiceView(invoice: any, slug: string): { text: string; keyboard: any } {
  const amount = telegramHtml(String(invoice?.amount ?? '0'));
  const token = telegramHtml(String(invoice?.tokenSymbol ?? ''));
  const name = telegramHtml(merchantName(invoice));
  const status = String(invoice?.status || '');
  const decision = String(invoice?.clientDecision || 'PENDING');
  const payUrl = `${FRONTEND_URL}/invoice/${encodeURIComponent(slug)}`;

  const head = [
    `🧾 <b>${name}</b> sent you an invoice`,
    '',
    `💰 <b>${amount} ${token}</b>`,
  ];
  if (invoice?.description) head.push(`📝 ${telegramHtml(String(invoice.description))}`);
  if (invoice?.dueDate) head.push(`⏰ Due ${telegramHtml(formatInvoiceDate(invoice.dueDate))}`);

  if (status === 'PAID' || status === 'OVERPAID') {
    return { text: [...head, '', '✅ <b>This invoice is already paid.</b> Thank you!'].join('\n'),
      keyboard: Markup.inlineKeyboard([[Markup.button.url('🔗 View receipt', payUrl)]]) };
  }
  if (status === 'CANCELLED' || status === 'EXPIRED') {
    return { text: [...head, '', '🚫 <b>This invoice is no longer available.</b>'].join('\n'),
      keyboard: Markup.inlineKeyboard([]) };
  }

  if (decision === 'ACCEPTED') {
    return {
      text: [...head, '', '✅ <b>You accepted this invoice.</b>', 'Pay from any Celo wallet or MiniPay. You will not be charged anything extra.'].join('\n'),
      keyboard: Markup.inlineKeyboard([
        [Markup.button.url(`💳 Pay ${amount} ${token}`, payUrl)],
        [Markup.button.callback('✖ Decline instead', `inv_dec_${slug}`)],
      ]),
    };
  }
  if (decision === 'DECLINED') {
    return {
      text: [...head, '', '✖ <b>You declined this invoice.</b>', 'Changed your mind? You can accept it below.'].join('\n'),
      keyboard: Markup.inlineKeyboard([[Markup.button.callback('↩ Accept instead', `inv_acc_${slug}`)]]),
    };
  }
  // PENDING: accept-before-pay consent step.
  return {
    text: [...head, '', '🔒 <b>You decide before you pay.</b>', 'Accept to continue, or decline if this is not right. CeloDesk never charges you without your tap.'].join('\n'),
    keyboard: Markup.inlineKeyboard([
      [Markup.button.callback('✅ Accept', `inv_acc_${slug}`), Markup.button.callback('✖ Decline', `inv_dec_${slug}`)],
    ]),
  };
}

async function showClientInvoice(ctx: any, slug: string) {
  try {
    const invoice = await getInvoiceBySlug(slug);
    // Remember this chat so we can push an unpaid reminder later (best effort).
    const chatId = ctx.chat?.id ?? ctx.from?.id;
    if (chatId) setClientTelegramChat(slug, chatId).catch(() => {});
    const view = clientInvoiceView(invoice, slug);
    await ctx.reply(view.text, { parse_mode: 'HTML', ...view.keyboard });
  } catch (err) {
    console.error('Telegram client invoice open failed:', err);
    await ctx.reply('⚠️ <b>We could not open this invoice.</b>\n\nThe link may be invalid or expired. Please ask the sender for a new one.', { parse_mode: 'HTML' });
  }
}

async function handleClientDecision(ctx: any, slug: string, decision: 'ACCEPTED' | 'DECLINED') {
  try {
    await setInvoiceDecision(slug, decision);
    const invoice = await getInvoiceBySlug(slug);
    const view = clientInvoiceView(invoice, slug);
    await ctx.answerCbQuery(decision === 'ACCEPTED' ? 'Invoice accepted' : 'Invoice declined');
    await ctx.editMessageText(view.text, { parse_mode: 'HTML', ...view.keyboard });
  } catch (err) {
    console.error('Telegram client decision failed:', err);
    await ctx.answerCbQuery('Could not record that. Please try again.', { show_alert: true });
  }
}

bot.action(/^inv_acc_(.+)$/, (ctx) => handleClientDecision(ctx, ctx.match[1], 'ACCEPTED'));
bot.action(/^inv_dec_(.+)$/, (ctx) => handleClientDecision(ctx, ctx.match[1], 'DECLINED'));

bot.telegram.setMyCommands([
  { command: 'start', description: 'Connect or reconnect your Celo wallet' },
  { command: 'invoice', description: 'Create an invoice' },
  { command: 'owed', description: 'See who still owes you' },
  { command: 'summary', description: 'See your payment summary' },
  { command: 'invoices', description: 'View recent invoices' },
  { command: 'help', description: 'See what CeloDesk can do' },
]).catch(() => {});

bot.start(async (ctx) => {
  // Deep link from an invoice delivery: open the client invoice flow and stop
  // (the client is not a merchant, so no wallet-link onboarding).
  const payload = (ctx as any).startPayload as string | undefined;
  if (payload && payload.startsWith('inv_')) {
    await showClientInvoice(ctx, payload.slice(4));
    return;
  }

  const telegramId = String(ctx.from.id);
  const existing = sessions.get(telegramId);
  if (existing) {
    await ctx.reply('👋 <b>Welcome back to CeloDesk</b>\n\nWhat would you like to do?', { parse_mode: 'HTML', ...mainKeyboard });
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
      await ctx.reply('✅ <b>Wallet connected</b>\n\nYou are ready to use CeloDesk. 👋\n\nTry <b>Create an invoice</b> or <b>Who still owes me?</b>', { parse_mode: 'HTML', ...mainKeyboard });
    } catch (err: any) {
      console.error('Telegram wallet link error:', err);
      await sendTelegramText(ctx, '❌ <b>Wallet connection failed</b>\n\nPlease check the address and try again.');
    }
    return;
  }

  if (text.startsWith('/')) return;
  await askAgent(ctx, text);
});

// ---- Unpaid-invoice Telegram reminders ----
// The backend decides who is due (shared throttle with email); the bot delivers.
function reminderMessage(r: TelegramReminder): { text: string; keyboard: any } {
  const amount = telegramHtml(r.amount);
  const token = telegramHtml(r.tokenSymbol);
  const lines = [
    '⏰ <b>Payment reminder</b>',
    '',
    `🧾 <b>${telegramHtml(r.merchantName)}</b> is still awaiting payment`,
    `💰 <b>${amount} ${token}</b>`,
  ];
  if (r.description) lines.push(`📝 ${telegramHtml(r.description)}`);
  lines.push('', 'Tap below to review and pay. You will not be charged without your tap.');
  return {
    text: lines.join('\n'),
    keyboard: Markup.inlineKeyboard([[Markup.button.url(`💳 Pay ${amount} ${token}`, r.payUrl)]]),
  };
}

let remindersRunning = false;
function startReminderScheduler() {
  if (!process.env.INTERNAL_API_KEY) {
    console.log('[reminders] Telegram reminder scheduler disabled (no INTERNAL_API_KEY)');
    return;
  }
  const intervalMs = process.env.REMINDER_POLL_MS ? Number(process.env.REMINDER_POLL_MS) : 10 * 60 * 1000;
  const tick = async () => {
    if (remindersRunning) return;
    remindersRunning = true;
    try {
      const due = await getDueTelegramReminders();
      for (const r of due) {
        try {
          const msg = reminderMessage(r);
          await bot.telegram.sendMessage(r.chatId, msg.text, { parse_mode: 'HTML', ...msg.keyboard });
          await markTelegramReminderSent(r.id);
        } catch (err) {
          // A blocked bot / closed chat should not stop the rest of the batch.
          console.error('[reminders] send failed for invoice', r.id, err);
        }
      }
      if (due.length) console.log(`[reminders] Telegram reminders processed: ${due.length}`);
    } catch (err) {
      console.error('[reminders] poll error:', err);
    } finally {
      remindersRunning = false;
    }
  };
  setTimeout(tick, 20_000);
  setInterval(tick, intervalMs);
  console.log(`[reminders] Telegram reminder scheduler started (every ${Math.round(intervalMs / 1000)}s)`);
}

bot.launch();
console.log('CeloDesk Telegram agent is running');
startReminderScheduler();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
