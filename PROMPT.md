'use client';

import { motion } from 'framer-motion';
import { Brain, Boxes, ClipboardCheck, Eye, Gavel, Loader2, Send, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MODE_LABELS, type ThinkingMode } from '@/lib/baderPrompt';
import type { ChatMessage } from '@/lib/types';

const MODE_META: Record<ThinkingMode, { icon: ReactNode; description: string }> = {
  pure: { icon: <Brain size={18} />, description: 'Compressed answer, constraints, mechanism.' },
  clinical: { icon: <ClipboardCheck size={18} />, description: 'Pathophysiology, investigations, management logic.' },
  builder: { icon: <Boxes size={18} />, description: 'Systems, APIs, deployment, data model.' },
  visual: { icon: <Eye size={18} />, description: 'Diagrams, state maps, spatial scaffolds.' },
  debate: { icon: <Gavel size={18} />, description: 'Premise attack, brittleness, strongest survivor.' }
};

const STORAGE_KEY = 'bader-thinking-app:v1:messages';

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

function ExampleButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-left text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
    >
      {children}
    </button>
  );
}

function QualityBadge({ score }: { score?: number }) {
  if (typeof score !== 'number') return null;
  const label = score >= 90 ? 'Disciplined' : score >= 75 ? 'Good' : score >= 55 ? 'Needs tightening' : 'Weak';
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
      <ShieldCheck size={13} /> {label} · {score}
    </span>
  );
}

function MessageCard({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[1.6rem] border p-4 shadow-sm ${
        isUser ? 'ml-auto max-w-3xl border-blue-100 bg-blue-600 text-white' : 'mr-auto max-w-4xl border-slate-200 bg-white/92 text-slate-900'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
          {isUser ? 'You' : 'Bader Thinking Mode'} {message.mode ? `· ${MODE_LABELS[message.mode]}` : ''}
        </div>
        {!isUser && <QualityBadge score={message.evaluation?.score} />}
      </div>
      <pre className={`whitespace-pre-wrap break-words text-sm leading-6 ${isUser ? 'font-sans' : 'font-sans'}`}>{message.content}</pre>
      {!isUser && message.evaluation && (message.evaluation.flags.length > 0 || message.evaluation.missing.length > 0) && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {message.evaluation.missing.length > 0 && <div>Missing: {message.evaluation.missing.join(', ')}</div>}
          {message.evaluation.flags.length > 0 && <div>Flags: {message.evaluation.flags.join(', ')}</div>}
        </div>
      )}
    </motion.article>
  );
}

export default function HomePage() {
  const [mode, setMode] = useState<ThinkingMode>('builder');
  const [input, setInput] = useState('Enhance this into a fully deployable app: architecture, UI, API, data model, safety boundaries, and deployment checklist.');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const modeDescription = useMemo(() => MODE_META[mode].description, [mode]);

  async function submit() {
    const message = input.trim();
    if (!message || loading) return;

    const userMessage: ChatMessage = { id: uid(), role: 'user', content: message, mode, createdAt: now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Request failed');

      const assistantMessage: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: data.text,
        mode,
        createdAt: now(),
        evaluation: data.evaluation
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: `KERNEL\nThe request failed at the transport or server layer.\n\nCONSTRAINTS\n- The UI submitted the message.\n- The API route did not return a valid success payload.\n\nMECHANISM\nsubmit -> fetch('/api/chat') -> server/client error -> visible failure card\n\nVISUAL / STRUCTURE\nUI -> API -> error boundary\n\nARTIFACT\nCheck .env.local, model access, deployment logs, and network console.\n\nEPISTEMIC STATUS\nKnown: ${detail}\nBelieved: The failure is configuration or API access related.\nSuspected: Missing/invalid OPENAI_API_KEY or unavailable OPENAI_MODEL.\nUnknown: The upstream provider state.`,
          mode,
          createdAt: now(),
          evaluation: { score: 80, flags: [], missing: [], strengths: ['Error surfaced structurally'] }
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-[2rem] border border-white/70 bg-white/78 p-5 shadow-soft backdrop-blur-xl lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]">
          <div className="mb-7 flex items-start gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-200">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-950">Bader Thinking Mode</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">A deployable reasoning cockpit: kernel, constraints, mechanism, visual scaffold, artifact.</p>
            </div>
          </div>

          <div className="space-y-2">
            {(Object.keys(MODE_LABELS) as ThinkingMode[]).map((key) => {
              const active = mode === key;
              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    active ? 'border-blue-300 bg-blue-50 text-blue-900 shadow-sm' : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {MODE_META[key].icon}
                    {MODE_LABELS[key]}
                  </div>
                  <p className="mt-1 text-xs leading-5 opacity-75">{MODE_META[key].description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Active mode</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{MODE_LABELS[mode]}</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{modeDescription}</p>
          </div>

          <button
            onClick={clear}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 size={16} /> Clear session
          </button>
        </aside>

        <section className="flex min-h-[calc(100vh-2.5rem)] flex-col rounded-[2rem] border border-white/70 bg-white/70 shadow-soft backdrop-blur-xl">
          <div className="border-b border-slate-200/80 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Reasoning cockpit</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Ask. Compress. Mechanize. Build.</h2>
              </div>
              <div className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                {messages.length} messages · local session
              </div>
            </div>
            {messages.length === 0 && (
              <div className="mt-5 grid gap-2 md:grid-cols-3">
                <ExampleButton onClick={() => setInput('Design the deployable architecture for this thinking-mode app, including routes, database schema, failure modes, and launch checklist.')}>Architecture pass</ExampleButton>
                <ExampleButton onClick={() => setInput('Turn this into a premium mobile-first UI with pages, states, components, and interaction behavior.')}>UX pass</ExampleButton>
                <ExampleButton onClick={() => setInput('Attack this concept: what makes it fail as a real app, and what is the strongest surviving version?')}>Critique pass</ExampleButton>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-blue-200 bg-blue-50/50 p-8 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm">
                  <Brain size={26} />
                </div>
                <h3 className="text-lg font-black text-slate-950">The app is not a chatbot skin.</h3>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  It routes intent through a reasoning discipline, forces visible structure, checks for anti-patterns, and preserves a session locally. Add your API key and deploy.
                </p>
              </div>
            ) : (
              messages.map((message) => <MessageCard key={message.id} message={message} />)
            )}
            {loading && (
              <div className="mr-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                <Loader2 className="animate-spin" size={16} /> Thinking through constraints...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-200/80 p-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit();
                }}
                placeholder="Write the problem. Ctrl/⌘ + Enter to send."
                className="min-h-28 w-full resize-none rounded-[1.2rem] border-0 bg-slate-50 p-4 text-sm leading-6 text-slate-900 outline-none ring-0 placeholder:text-slate-400"
              />
              <div className="flex flex-col gap-2 border-t border-slate-100 p-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">Mode: <span className="font-bold text-slate-700">{MODE_LABELS[mode]}</span></div>
                <button
                  onClick={submit}
                  disabled={loading || input.trim().length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Send
                </button>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
