'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Spark, ArrowRight, Plus, Telegram, Check, Clock } from './Icons';
import { TELEGRAM_BOT_URL } from '../lib/telegram';
import { api, money } from '../lib/api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type Artifact = {
  action?: string;
  invoice?: {
    id: string;
    publicSlug: string;
    clientName: string;
    amount: string | number;
    tokenSymbol: string;
    description?: string | null;
    status?: string;
    publicUrl?: string;
  };
};

function inlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * The model is instructed not to use tables. This is a final safety net so
 * an accidental Markdown table never becomes the visual language of the chat.
 */
function normalizeAssistantText(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const tableRows = lines.filter((line) => /^\s*\|.*\|\s*$/.test(line));
  if (tableRows.length < 2) return text;

  const dataRows = tableRows.filter(
    (line) => !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line),
  );

  if (dataRows.length < 2) return text;

  const parsed = dataRows.map((line) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim()),
  );

  const header = parsed[0].map((value) => value.toLowerCase());
  const clientIndex = header.findIndex((value) => value.includes('client'));
  const amountIndex = header.findIndex((value) => value.includes('amount'));
  const tokenIndex = header.findIndex((value) => value.includes('token'));
  const statusIndex = header.findIndex((value) => value.includes('status'));

  if (clientIndex < 0 || amountIndex < 0) return text;

  const converted = parsed.slice(1).map((row) => {
    const client = row[clientIndex] || 'This client';
    const amount = row[amountIndex] || '';
    const token = tokenIndex >= 0 ? row[tokenIndex] || '' : '';
    const status = statusIndex >= 0 ? row[statusIndex] || '' : '';
    const sentence = `${client} owes you ${amount}${token ? ` ${token}` : ''}.`;
    return status ? `${sentence} Status: ${status.toLowerCase()}.` : sentence;
  });

  const nonTable = lines.filter(
    (line) => !/^\s*\|.*\|\s*$/.test(line) && !/^\s*:?-{2,}/.test(line),
  );

  const intro = nonTable.filter(Boolean).join('\n').trim();
  return [intro, ...converted].filter(Boolean).join('\n\n');
}

function MessageText({ text }: { text: string }) {
  const normalized = normalizeAssistantText(text);
  const lines = normalized.split('\n');

  return (
    <div className="assistantMessageText">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div className="assistantMessageSpacer" key={`${index}-space`} />;

        const isBullet = /^[-•]\s+/.test(trimmed);
        const content = isBullet ? trimmed.replace(/^[-•]\s+/, '') : trimmed;

        return (
          <div className={isBullet ? 'assistantMessageLine assistantBullet' : 'assistantMessageLine'} key={`${index}-${line}`}>
            {isBullet && <span className="assistantBulletDot">•</span>}
            <span>{inlineMarkdown(content)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AssistantBox({ merchantId }: { merchantId: string }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [shareState, setShareState] = useState('');

  const conversationRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = conversationRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, [messages, busy, artifacts]);

  async function run(input = text) {
    const q = input.trim();
    if (!q || busy) return;

    setText('');
    setBusy(true);
    setShareState('');

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: q,
    };

    setMessages((current) => [...current, userMessage]);

    try {
      const result = await api.agent(merchantId, q, history.slice(-10));
      const reply = result.reply || 'Done.';

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: reply,
        },
      ]);

      setHistory((current) => [
        ...current,
        { role: 'user' as const, content: q },
        { role: 'assistant' as const, content: reply },
      ].slice(-12));

      setArtifacts(result.artifacts || []);
    } catch (error: any) {
      const message = error?.message || 'I could not complete that request.';
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant-error`,
          role: 'assistant',
          text: message,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function quick(q: string) {
    void run(q);
  }

  const created = [...artifacts]
    .reverse()
    .find((artifact) => artifact?.action === 'invoice_created')?.invoice;

  async function shareInvoice() {
    if (!created) return;

    const url = created.publicUrl || `${window.location.origin}/invoice/${created.publicSlug}`;
    const shareData = {
      title: `CeloDesk payment request — ${created.clientName}`,
      text: `${money(created.amount, created.tokenSymbol)} payment request from CeloDesk.`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setShareState('Link copied');
        window.setTimeout(() => setShareState(''), 1800);
      }
    } catch {
      // User cancelled the native share sheet; nothing to report.
    }
  }

  return (
    <section className="assistantBox">
      <div className="assistantTop">
        <div className="assistantIcon"><Spark size={18} /></div>
        <div>
          <strong>CeloDesk AI</strong>
          <div className="muted">Your payment desk. Ask me to create, track, or check.</div>
        </div>
        {busy && <Clock size={15} />}
      </div>

      {messages.length > 0 && (
        <div className="assistantConversation" ref={conversationRef} aria-live="polite">
          {messages.map((message) => (
            <div
              className={`assistantMessage assistantMessage-${message.role}`}
              key={message.id}
            >
              <div className="assistantMessageLabel">
                {message.role === 'user' ? 'You' : 'CeloDesk AI'}
              </div>
              <div className="assistantMessageBubble">
                <MessageText text={message.text} />
              </div>
            </div>
          ))}

          {busy && (
            <div className="assistantMessage assistantMessage-assistant">
              <div className="assistantMessageLabel">CeloDesk AI</div>
              <div className="assistantMessageBubble assistantTyping" aria-label="CeloDesk AI is thinking">
                <span /><span /><span />
              </div>
            </div>
          )}

          {created && (
            <div className="assistantCreatedInConversation">
              <div className="assistantCreatedCopy">
                <span className="assistantCreatedEyebrow"><Check size={12} /> Invoice created</span>
                <strong>{created.clientName}</strong>
                <b>{money(created.amount, created.tokenSymbol)}</b>
                {created.description && <span>{created.description}</span>}
              </div>

              <div className="assistantCreatedActions">
                <Link
                  className="assistantCreatedButton"
                  href={`/invoice/${encodeURIComponent(created.publicSlug)}`}
                >
                  View invoice <ArrowRight size={13} />
                </Link>
                <button className="assistantCreatedButton secondary" onClick={shareInvoice}>
                  Share
                </button>
              </div>

              {shareState && <small className="assistantShareState">{shareState}</small>}
            </div>
          )}

          <div ref={endRef} />
        </div>
      )}

      <div className="assistantInput">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void run();
            }
          }}
          placeholder="Ask CeloDesk AI anything..."
          aria-label="Ask CeloDesk AI"
        />
        <button
          className="btn btnBrand"
          onClick={() => void run()}
          disabled={busy || !text.trim()}
          aria-label="Send message"
        >
          {busy ? <Clock size={16} /> : <ArrowRight size={16} />}
        </button>
      </div>

      <div className="assistantChips">
        <button onClick={() => quick('Create an invoice')}><Plus size={13} />Create invoice</button>
        <button onClick={() => quick('Who owes me?')}>Who owes me?</button>
        <Link href={`/dashboard/profile?merchantId=${encodeURIComponent(merchantId)}`}>My profile</Link>
        <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer"><Telegram size={13} />CeloDesk Telegram</a>
      </div>
    </section>
  );
}


