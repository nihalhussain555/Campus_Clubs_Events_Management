import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import {
  Bot,
  Sparkles,
  Minimize2,
  X,
  Send,
  BookOpen,
  ArrowUpRight
} from 'lucide-react';

import { helpAPI } from '../services/api';

// A short, honest preamble: ClubAssist is the help-desk guide, not a second
// campus-data agent. The existing AI agent already answers "how many events did
// I attend" - this one only explains how the site works.
const GREETING =
  "Hi! I'm **ClubAssist**, your guide to *using* this site - clubs, events, " +
  'certificates, the leaderboard and your account. Ask me how a feature works ' +
  "and I'll point you to the right article. For questions about your own " +
  'campus data, use the Campus Clubs AI instead.';

const QUICK_QUESTIONS = [
  'How do I join a club?',
  'How do I register for an event?',
  'Where do I download my certificate?',
  'How do I change my password?',
  'How do I check my leaderboard position?'
];

// A single assistant greeting seeds the thread before any request goes out.
const seed = () => [{ id: 1, role: 'assistant', content: GREETING }];

const ClubAssist =({
  starterQuestion = '',
  onStarterConsumed,
  onArticleSelect
}) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(seed);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const idRef = useRef(2);
  const lastStarterRef = useRef('');

  const nextId = () => idRef.current++;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, suggestions]);

  const pushAssistant = (content, { fallback } = {}) =>
    setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content, fallback }]);

  // Send `text` (from the box, a chip, or an injected starter question).
  const send = async (rawText) => {
    const text = (rawText ?? '').trim();
    if (!text || loading) return;

    // History is the PRIOR turns only - computed before we append the new
    // message, capped at the last 8 real exchanges (fallback lines excluded).
    const history = messages
      .filter((m) => !m.fallback)
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: text }]);
    setInput('');
    setSuggestions([]);
    setLoading(true);

    try {
      const response = await helpAPI.assistant(text, history);
      const reply = response.data?.reply || 'Sorry, I could not find a clear answer for that.';

      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: reply }]);
      setSuggestions(Array.isArray(response.data?.suggestions) ? response.data.suggestions : []);
    } catch (err) {
      const status = err.response?.status;
      const message = (err.response?.data?.message || '').toLowerCase();
      const unconfigured =
        status === 503 ||
        (/assistant/.test(message) && /(not configured|unconfigured|not (set up|available)|disabled)/.test(message));

      let line = 'Sorry, I could not reach the helper just now. Please try again in a moment.';
      if (status === 401) {
        line = 'Please **log in** to chat with ClubAssist.';
      } else if (status === 429) {
        line = "I'm thinking a little too fast right now - please try again shortly.";
      } else if (unconfigured) {
        line =
          "ClubAssist isn't available on this site yet. Please use the **search box** on this page or send a **support request** below and a human will help.";
      }

      pushAssistant(line, { fallback: true });
    } finally {
      setLoading(false);
    }
  };

  // The Help page can inject a category-specific opener. Open the panel,
  // auto-send it once, then tell the page to clear it.
  useEffect(() => {
    if (starterQuestion && starterQuestion !== lastStarterRef.current) {
      lastStarterRef.current = starterQuestion;
      setOpen(true);
      send(starterQuestion);
      onStarterConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starterQuestion]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  };

  const showQuickQuestions = messages.length <= 1 && !loading;

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-5 z-[9999] flex w-[350px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          role="dialog"
          aria-label="ClubAssist"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#073c57] px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#073c57]">
                <Bot size={22} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black">ClubAssist</h3>
                  <Sparkles size={14} className="text-yellow-300" />
                </div>
                <p className="text-xs text-slate-200">Site help guide</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 transition hover:bg-white/10"
                aria-label="Minimize ClubAssist"
              >
                <Minimize2 size={17} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 transition hover:bg-white/10"
                aria-label="Close ClubAssist"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[390px] overflow-y-auto bg-slate-50 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#073c57] text-white">
                    <Bot size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-[#145f82] text-white'
                      : 'rounded-bl-md border border-slate-100 bg-white text-slate-700 shadow-sm'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown
                      components={{
                        strong: ({ children }) => (
                          <strong className="font-extrabold text-slate-900">{children}</strong>
                        ),
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ol: ({ children }) => (
                          <ol className="ml-5 list-decimal space-y-2">{children}</ol>
                        ),
                        ul: ({ children }) => (
                          <ul className="ml-5 list-disc space-y-2">{children}</ul>
                        ),
                        li: ({ children }) => <li className="pl-1">{children}</li>,
                        h1: ({ children }) => (
                          <h1 className="mb-2 text-lg font-black text-slate-900">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="mb-2 text-base font-black text-slate-900">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="mb-2 font-black text-slate-900">{children}</h3>
                        ),
                        code: ({ children }) => (
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
                            {children}
                          </code>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="my-2 border-l-4 border-[#145f82] pl-3 text-slate-600">
                            {children}
                          </blockquote>
                        )
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Suggestion chips: only shown when the page can open them. */}
            {suggestions.length > 0 && onArticleSelect && (
              <div className="mb-4 flex justify-start gap-2 pl-10">
                <div className="max-w-[78%]">
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
                    Related help articles
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.articleId}-${suggestion.title}`}
                        type="button"
                        onClick={() => onArticleSelect(suggestion)}
                        className="chip flex items-center gap-1.5 border-[#bcddeb] bg-[#e8f5fb] text-[#145f82] hover:bg-[#d7edf7]"
                      >
                        <BookOpen size={13} />
                        {suggestion.title}
                        <ArrowUpRight size={13} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#073c57] text-white">
                  <Bot size={16} />
                </div>
                <div className="rounded-2xl rounded-bl-md border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          {showQuickQuestions && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-3 py-2">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => send(question)}
                  className="filter-pill px-3 py-1 text-xs"
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask how to do something..."
                disabled={loading}
                aria-label="Message ClubAssist"
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-black outline-none placeholder:text-slate-400 disabled:text-slate-500"
              />
              <button
                type="button"
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#145f82] text-white transition hover:bg-[#073c57] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-[#073c57] text-white shadow-xl transition duration-200 hover:scale-105 hover:bg-[#145f82]"
          aria-label="Open ClubAssist"
        >
          <Bot size={26} />
          <span className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
        </button>
      )}
    </>
  );
};

export default ClubAssist;
