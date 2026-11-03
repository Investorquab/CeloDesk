'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Spark, ArrowRight, Plus, Telegram, Check, Clock, Copy } from './Icons';
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
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return <span key={index}>{part}</span>;
  });
}

function normalizeAssistantText(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const tableRows = lines.filter((line) => /^\s*\|.*\|\s*$/.test(line));
  if (tableRows.length < 2) return text;
  const dataRows = tableRows.filter((line) => !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line));
  if (dataRows.length < 2) return text;
  const parsed = dataRows.map((line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()));
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
  const nonTable = lines.filter((line) => !/^\s*\|.*\|\s*$/.test(line) && !/^\s*:?-{2,}/.test(line));
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

export default function AssistantBox({ merchantId, onInvoiceCreated }: { merchantId: string; onInvoiceCreated?: () => Promise<void> | void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [shareState, setShareState] = useState('');
  const [copyState, setCopyState] = useState('');

  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = conversationRef.current;
    if (!container) return;
    requestAnimationFrame(() => container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }));
  }, [messages, busy, artifacts]);

  async function run(input = text) {
    const q = input.trim();
    if (!q || busy) return;
    setText('');
    setBusy(true);
    setShareState('');
    setCopyState('');

    const userMessage: ChatMessage = { id: `${Date.now()}-user`, role: 'user', text: q };
    setMessages((current) => [...current, userMessage]);

    try {
      const result = await api.agent(merchantId, q, history.slice(-6));
      const reply = result.reply || 'Done.';
      setMessages((current) => [...current, { id: `${Date.now()}-assistant`, role: 'assistant', text: reply }]);
      setHistory((current) => [...current, { role: 'user' as const, content: q }, { role: 'assistant' as const, content: reply }].slice(-6));
      setArtifacts(result.artifacts || []);

      const createdArtifact = (result.artifacts || []).find((artifact: Artifact) => artifact?.action === 'invoice_created');
      if (createdArtifact?.invoice && onInvoiceCreated) await onInvoiceCreated();
    } catch (error: any) {
      setMessages((current) => [...current, { id: `${Date.now()}-assistant-error`, role: 'assistant', text: error?.message || 'I could not complete that request.' }]);
    } finally {
      setBusy(false);
    }
  }

  function quick(q: string) { void run(q); }

  const created = [...artifacts].reverse().find((artifact) => artifact?.action === 'invoice_created')?.invoice;
  const lastMessage = messages[messages.length - 1];
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const askingForToken = !created && !busy && lastMessage?.role === 'assistant' && lastUserMessage?.role === 'user' && /\b(?:\$|usd|dollars?|million dollars?|thousand dollars?)\b/i.test(lastUserMessage.text) && /which (payment )?token|what (payment )?token|choose (a )?(payment )?token/i.test(lastMessage.text);

  function invoiceUrl() {
    if (!created) return '';
    return created.publicUrl || `${window.location.origin}/invoice/${created.publicSlug}`;
  }

  async function shareInvoice() {
    if (!created) return;
    const url = invoiceUrl();
    try {
      if (navigator.share) {
        await navigator.share({ title: `CeloDesk payment request - ${created.clientName}`, text: `${money(created.amount, created.tokenSymbol)} payment request from CeloDesk.`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareState('Link copied');
        window.setTimeout(() => setShareState(''), 1800);
      }
    } catch {
      // User cancelled the native share sheet.
    }
  }

  async function copyInvoiceLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(invoiceUrl());
      setCopyState('Copied');
      window.setTimeout(() => setCopyState(''), 1800);
    } catch {
      setCopyState('Could not copy');
      window.setTimeout(() => setCopyState(''), 1800);
    }
  }

  return (
    <>
      <section className="aiBox">
        <div className="aiTop">
          <div className="aiIcon"><Spark size={18} /></div>
          <div><strong>CeloDesk AI</strong><div className="aiSub">Your payment desk. Ask me to create, track, or check.</div></div>
          {busy && <Clock size={15} />}
        </div>

        {messages.length > 0 && (
          <div className="assistantConversation" ref={conversationRef} aria-live="polite">
            {messages.map((message) => (
              <div className={`assistantMessage assistantMessage-${message.role}`} key={message.id}>
                <div className="assistantMessageLabel">{message.role === 'user' ? 'You' : 'CeloDesk AI'}</div>
                <div className="assistantMessageBubble"><MessageText text={message.text} /></div>
              </div>
            ))}

            {busy && (
              <div className="assistantMessage assistantMessage-assistant">
                <div className="assistantMessageLabel">CeloDesk AI</div>
                <div className="assistantMessageBubble assistantTyping" aria-label="CeloDesk AI is thinking"><span /><span /><span /></div>
              </div>
            )}

            {askingForToken && (
              <div className="assistantTokenPicker" aria-label="Choose payment token">
                {[
                  ['USDm', 'Mento Dollar'],
                  ['USDC', 'USD Coin'],
                  ['USDT', 'Tether'],
                  ['NGNm', 'Mento Naira'],
                ].map(([symbol, name]) => (
                  <button key={symbol} onClick={() => quick(symbol)}><strong>{symbol}</strong><span>{name}</span></button>
                ))}
              </div>
            )}

            {created && (
              <div className="assistantCreatedInConversation">
                <div className="assistantCreatedHeader"><span className="assistantCreatedEyebrow"><Check size={12} /> Invoice created</span><span className="assistantCreatedStatus">{created.status || 'SENT'}</span></div>
                <div className="assistantCreatedBody">
                  <strong>{created.clientName}</strong>
                  <b>{money(created.amount, created.tokenSymbol)}</b>
                  {created.description && <span>{created.description}</span>}
                </div>
                <div className="assistantCreatedActions">
                  <Link className="assistantCreatedButton primary" href={`/invoice/${encodeURIComponent(created.publicSlug)}`}>View invoice <ArrowRight size={13} /></Link>
                  <button className="assistantCreatedButton" onClick={shareInvoice}>Share</button>
                  <button className="assistantCreatedButton copyButton" onClick={copyInvoiceLink}><Copy size={13} />{copyState || 'Copy link'}</button>
                </div>
                {(shareState || copyState) && <small className="assistantShareState">{shareState || copyState}</small>}
              </div>
            )}
          </div>
        )}

        <div className="aiInput">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void run(); } }}
            placeholder="Ask CeloDesk AI anything..."
            aria-label="Ask CeloDesk AI"
            inputMode="text"
            autoComplete="off"
          />
          <button className="aiSend" onClick={() => void run()} disabled={busy || !text.trim()} aria-label="Send message">
            {busy ? <Clock size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>

        <div className="aiChips">
          <button onClick={() => quick('Create an invoice')}><Plus size={13} />Create invoice</button>
          <button onClick={() => quick('Who owes me?')}>Who owes me?</button>
          <Link href={`/dashboard/profile?merchantId=${encodeURIComponent(merchantId)}`}>My profile</Link>
          <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer"><Telegram size={13} />CeloDesk Telegram</a>
        </div>
      </section>

      <style jsx>{`
        .aiBox{background:var(--ck-card);border:1px solid var(--ck-line);border-radius:14px;padding:20px;margin:0 0 18px}
        .aiTop{display:flex;align-items:center;gap:12px;margin-bottom:14px}
        .aiTop>div{min-width:0}
        .aiIcon{width:38px;height:38px;border-radius:11px;background:var(--ck-accent-soft);color:var(--ck-accent);display:grid;place-items:center;flex:none}
        .aiTop strong{font-size:14px;font-weight:600;color:var(--ck-text)}
        .aiSub{font-size:12.5px;color:var(--ck-text2);margin-top:2px}
        .aiInput{display:flex;gap:8px}
        .aiInput input{flex:1;min-width:0;border:1px solid var(--ck-line);background:var(--ck-raised);color:var(--ck-text);border-radius:10px;padding:12px 13px;outline:none;font-size:15px;font-family:inherit}
        .aiInput input::placeholder{color:var(--ck-muted)}
        .aiInput input:focus{border-color:var(--ck-accent-line);box-shadow:0 0 0 3px var(--ck-accent-soft)}
        .aiSend{flex:none;display:inline-grid;place-items:center;width:44px;border:none;border-radius:10px;background:var(--ck-btn-bg);color:var(--ck-btn-text);box-shadow:inset 0 1px 0 var(--ck-btn-hl);cursor:pointer;transition:transform .12s ease,background .15s ease}
        .aiSend:hover{background:var(--ck-btn-hover)}.aiSend:active{transform:scale(.97)}.aiSend:disabled{opacity:.5;cursor:not-allowed}
        .aiChips{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
        .aiChips :global(button),.aiChips :global(a){border:1px solid var(--ck-line);background:transparent;color:var(--ck-text2);border-radius:999px;padding:7px 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;text-decoration:none;font-family:inherit;transition:border-color .15s ease,color .15s ease}
        .aiChips :global(button):hover,.aiChips :global(a):hover{border-color:var(--ck-line2);color:var(--ck-text)}
        .assistantConversation{max-height:360px;overflow-y:auto;padding:2px 2px 10px;margin:4px 0 14px;display:flex;flex-direction:column;gap:14px;scrollbar-width:thin}
        .assistantMessage{display:flex;flex-direction:column;gap:5px;max-width:86%}
        .assistantMessage-user{align-self:flex-end;align-items:flex-end}
        .assistantMessage-assistant{align-self:flex-start;align-items:flex-start}
        .assistantMessageLabel{font-size:10px;font-weight:500;letter-spacing:.02em;color:var(--ck-muted);padding:0 5px;font-family:var(--ck-mono)}
        .assistantMessageBubble{padding:10px 12px;border-radius:13px;background:var(--ck-raised);border:1px solid var(--ck-line);font-size:13px;line-height:1.5;color:var(--ck-text);white-space:normal;overflow-wrap:anywhere}
        .assistantMessage-user .assistantMessageBubble{background:var(--ck-accent-soft);border-color:var(--ck-accent-line);color:var(--ck-text);border-bottom-right-radius:5px}
        .assistantMessage-assistant .assistantMessageBubble{border-bottom-left-radius:5px}
        .assistantMessageText{display:grid;gap:2px}.assistantMessageLine{min-height:18px}.assistantMessageSpacer{height:3px}
        .assistantBullet{display:flex;gap:7px}.assistantBulletDot{color:var(--ck-accent)}
        .assistantMessageBubble code{background:rgba(127,127,127,.18);padding:1px 4px;border-radius:5px;font-size:.92em;font-family:var(--ck-mono)}
        .assistantTyping{display:flex;gap:4px;align-items:center;padding:11px 13px}.assistantTyping span{width:5px;height:5px;border-radius:50%;background:var(--ck-text2);animation:assistantDot 1.1s infinite ease-in-out}.assistantTyping span:nth-child(2){animation-delay:.12s}.assistantTyping span:nth-child(3){animation-delay:.24s}
        @keyframes assistantDot{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-2px)}}
        .assistantTokenPicker{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0 4px 2px;max-width:100%}
        .assistantTokenPicker button{border:1px solid var(--ck-line);background:var(--ck-raised);color:var(--ck-text);border-radius:10px;padding:9px 8px;text-align:left;display:grid;gap:2px;cursor:pointer;font-family:inherit}.assistantTokenPicker button:hover{border-color:var(--ck-accent-line)}.assistantTokenPicker strong{font-size:12px}.assistantTokenPicker span{font-size:10px;color:var(--ck-muted)}
        .assistantCreatedInConversation{border:1px solid var(--ck-line);background:var(--ck-raised);border-radius:14px;padding:14px;margin:1px 2px 0}
        .assistantCreatedHeader{display:flex;align-items:center;justify-content:space-between;gap:10px}.assistantCreatedEyebrow{display:inline-flex;align-items:center;gap:5px;color:var(--ck-pos);font-size:11px;font-weight:500;font-family:var(--ck-mono)}.assistantCreatedStatus{font-size:10px;font-weight:500;color:var(--ck-text2);background:var(--ck-card);border:1px solid var(--ck-line);border-radius:999px;padding:3px 9px;font-family:var(--ck-mono)}
        .assistantCreatedBody{display:grid;gap:3px;margin:10px 0 12px}.assistantCreatedBody strong{font-size:15px;font-weight:600}.assistantCreatedBody b{font-family:var(--ck-mono);font-size:20px;letter-spacing:-.02em;font-weight:500}.assistantCreatedBody span{font-size:12px;color:var(--ck-text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .assistantCreatedActions{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:7px}.assistantCreatedButton{min-width:0;border:1px solid var(--ck-line2);background:transparent;color:var(--ck-text);border-radius:9px;padding:9px 10px;font-size:11px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;text-decoration:none;white-space:nowrap}.assistantCreatedButton.copyButton{grid-column:1/-1}.assistantCreatedButton.primary{background:var(--ck-btn-bg);border-color:transparent;color:var(--ck-btn-text)}.assistantCreatedButton:hover{border-color:var(--ck-text2)}.assistantShareState{display:block;margin-top:7px;color:var(--ck-pos);font-size:11px;font-weight:500}
        @media(max-width:560px){.assistantConversation{max-height:330px;gap:12px}.assistantMessage{max-width:91%}.assistantMessageBubble{font-size:12px;padding:9px 11px}.assistantTokenPicker{grid-template-columns:repeat(2,1fr)}.assistantCreatedInConversation{padding:12px}.assistantCreatedBody b{font-size:18px}.aiInput input{font-size:16px!important;line-height:1.2}.aiInput{position:relative}}
      `}</style>
    </>
  );
}
