import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  "Analyze Nifty trend for today",
  "Best options strategy for sideways market?",
  "Explain PCR ratio significance",
  "Support/resistance for BankNifty",
  "What is iron condor strategy?",
  "How to read option chain data?",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const getContext = () => {
    const path = location.pathname;
    const parts = path.split('/');
    return {
      currentPage: path,
      currentStock: parts[1] === 'stock' ? parts[2] : undefined,
    };
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setLoading(true);

    let assistantContent = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          context: getContext(),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              const final = assistantContent;
              setMessages(prev =>
                prev.map((m, i) => i === prev.length - 1 ? { ...m, content: final } : m)
              );
            }
          } catch { /* partial json */ }
        }
      }
    } catch (e: any) {
      setMessages(prev => [
        ...prev.filter(m => !(m.role === 'assistant' && m.content === '')),
        { role: 'assistant', content: `⚠️ ${e.message || 'Something went wrong. Please try again.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, location.pathname]);

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--terminal-cyan))] text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        whileTap={{ scale: 0.9 }}
        title="AI Assistant"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-5 z-50 w-[380px] h-[520px] bg-card border border-border/60 rounded-xl shadow-2xl flex flex-col overflow-hidden"
            style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-[hsl(var(--terminal-cyan)/0.1)] border-b border-border/40 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--terminal-cyan))] flex items-center justify-center">
                <span className="text-[10px] font-black text-primary-foreground">AI</span>
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-foreground">StockPulse AI</p>
                <p className="text-[9px] text-muted-foreground">Options & Chart Analysis</p>
              </div>
              <button onClick={() => { setMessages([]); }} className="text-[9px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary/60 transition-colors" title="Clear chat">
                Clear
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3 mt-2">
                  <div className="text-center space-y-1">
                    <p className="text-[11px] text-muted-foreground">Ask me anything about</p>
                    <p className="text-[13px] font-semibold text-foreground">Stocks, Options & Trading</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)}
                        className="text-left text-[9px] text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary/70 rounded-md px-2.5 py-2 transition-colors border border-border/30">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary/20 text-foreground border border-primary/20'
                      : 'bg-secondary/50 text-foreground border border-border/30'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none [&>*]:text-[11px] [&>*]:leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-[13px] [&_h2]:text-[12px] [&_h3]:text-[11px] [&_code]:text-[10px] [&_code]:bg-background/50 [&_code]:px-1 [&_code]:rounded [&_strong]:text-primary [&_a]:text-[hsl(var(--terminal-cyan))]">
                        <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                      </div>
                    ) : (
                      <span>{msg.content}</span>
                    )}
                  </div>
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/40 bg-card/80">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about stocks, options, charts..."
                  disabled={loading}
                  className="flex-1 bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors disabled:opacity-50"
                />
                <button type="submit" disabled={loading || !input.trim()}
                  className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Send
                </button>
              </form>
              <p className="text-[8px] text-muted-foreground text-center mt-1.5">AI analysis is not financial advice. Always do your own research.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
