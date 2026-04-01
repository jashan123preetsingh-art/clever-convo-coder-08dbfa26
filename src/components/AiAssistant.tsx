import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { stockApi, fiiDiiApi } from '@/lib/api';

type MessageContent = string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
type Message = { role: 'user' | 'assistant'; content: MessageContent; imagePreview?: string };

type LiveContext = {
  indices: any[];
  fiiDii: any[];
  stockData: any | null;
};

const SUGGESTIONS = [
  'Analyze RELIANCE',
  'Analyze TCS',
  'Best options strategy for current market?',
  "What does today's FII/DII data indicate?",
  'Support/resistance for BankNifty today',
  'What sectors are strong today?',
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const FRIENDLY_RATE_LIMIT_MESSAGE = '⚠️ Trade Arsenal AI is busy right now. Please retry in a moment, or use the Trading Agent page for a full report.';

const normalizeAssistantError = (message?: string) => {
  const rawMessage = message?.trim() || 'Something went wrong. Please try again.';
  const normalized = rawMessage.toLowerCase();
  if (normalized.includes('429') || normalized.includes('rate_limited') || normalized.includes('rate limit')) return FRIENDLY_RATE_LIMIT_MESSAGE;
  if (normalized.includes('402') || normalized.includes('credits exhausted')) return '⚠️ AI is temporarily unavailable right now. Please try again later.';
  return `⚠️ ${rawMessage}`;
};

function getDisplayContent(content: MessageContent): string {
  if (typeof content === 'string') return content;
  const textPart = content.find(p => p.type === 'text');
  return textPart && 'text' in textPart ? textPart.text : '';
}


export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState<LiveContext>({ indices: [], fiiDii: [], stockData: null });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  const fetchContextData = useCallback(async () => {
    try {
      const path = location.pathname;
      const parts = path.split('/');
      const currentStock = parts[1] === 'stock' ? parts[2] : undefined;
      const [indices, fiiDii, stockData] = await Promise.all([
        stockApi.getIndices().catch(() => []),
        fiiDiiApi.getData().catch(() => []),
        currentStock ? stockApi.getFullData(currentStock).catch(() => null) : Promise.resolve(null),
      ]);
      setLiveData({
        indices: Array.isArray(indices) ? indices : [],
        fiiDii: Array.isArray(fiiDii) ? fiiDii : [],
        stockData: stockData?.quote ? { ...stockData.quote, fundamentals: stockData.fundamentals, technicals: stockData.technicals } : null,
      });
    } catch {
      setLiveData(prev => ({ ...prev, stockData: null }));
    }
  }, [location.pathname]);

  useEffect(() => { if (open) fetchContextData(); }, [open, fetchContextData]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, open]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  // Clipboard paste support for images
  useEffect(() => {
    if (!open) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          try {
            const compressed = await compressImage(file);
            setPendingImage(compressed);
            if (inputRef.current) inputRef.current.focus();
          } catch (err) {
            console.error('Paste image error:', err);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open]);

  const getContext = () => {
    const path = location.pathname;
    const parts = path.split('/');
    return {
      currentPage: path,
      currentStock: parts[1] === 'stock' ? parts[2] : undefined,
      liveIndices: liveData.indices,
      fiiDii: liveData.fiiDii,
      stockData: liveData.stockData,
    };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    try {
      const compressed = await compressImage(file);
      setPendingImage(compressed);
      if (inputRef.current) inputRef.current.focus();
    } catch (err) {
      console.error('Image compression error:', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = useCallback(async (text: string) => {
    if ((!text.trim() && !pendingImage) || loading) return;

    const hasImage = !!pendingImage;
    const userText = text.trim() || (hasImage ? 'Analyze this chart' : '');

    let userContent: MessageContent;
    let imagePreview: string | undefined;

    if (hasImage) {
      userContent = [
        { type: 'text', text: userText },
        { type: 'image_url', image_url: { url: pendingImage! } },
      ];
      imagePreview = pendingImage!;
    } else {
      userContent = userText;
    }

    const userMsg: Message = { role: 'user', content: userContent, imagePreview };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setPendingImage(null);
    setLoading(true);

    if (location.pathname.startsWith('/stock/')) await fetchContextData();

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
              setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: final } : m));
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages(prev => [
        ...prev.filter(m => !(m.role === 'assistant' && m.content === '')),
        { role: 'assistant', content: normalizeAssistantError(e?.message) },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, pendingImage, location.pathname, fetchContextData, liveData]);

  const hasLiveData = liveData.indices.length > 0;

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
            className="fixed bottom-20 right-5 z-50 w-[400px] h-[560px] bg-card border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-[hsl(var(--terminal-cyan)/0.1)] border-b border-border/40 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--terminal-cyan))] flex items-center justify-center">
                <span className="text-[10px] font-black text-primary-foreground">AI</span>
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-foreground">Trade Arsenal AI</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasLiveData ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                  <p className="text-[9px] text-muted-foreground">
                    {hasLiveData ? 'Live Data · Chart Analysis' : 'Connecting...'}
                  </p>
                </div>
              </div>
              <button onClick={() => setMessages([])} className="text-[9px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary/60 transition-colors" title="Clear chat">
                Clear
              </button>
            </div>

            {/* Live ticker strip */}
            {hasLiveData && (
              <div className="px-3 py-1.5 bg-secondary/30 border-b border-border/20 flex items-center gap-3 overflow-x-auto">
                {liveData.indices.slice(0, 3).map((idx: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9px] font-data whitespace-nowrap">
                    <span className="text-muted-foreground">{idx.symbol}</span>
                    <span className="text-foreground font-semibold">₹{Number(idx.ltp).toLocaleString('en-IN')}</span>
                    <span className={idx.change_pct >= 0 ? 'text-primary' : 'text-destructive'}>
                      {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3 mt-2">
                  <div className="text-center space-y-1">
                    <p className="text-[11px] text-muted-foreground">Powered by live market data</p>
                    <p className="text-[13px] font-semibold text-foreground">Stocks, Options, Charts & More</p>
                    <p className="text-[9px] text-primary/70 font-medium mt-1">📸 Upload or paste (Ctrl+V) any chart for instant technical analysis</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => {
                        if (s.includes('📸')) {
                          fileInputRef.current?.click();
                        } else {
                          sendMessage(s);
                        }
                      }}
                        className="text-left text-[9px] text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary/70 rounded-lg px-2.5 py-2 transition-colors border border-border/30">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary/15 text-foreground border border-primary/15'
                      : 'bg-secondary/40 text-foreground border border-border/20'
                  }`}>
                    {/* Show uploaded image thumbnail */}
                    {msg.imagePreview && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-border/20">
                        <img src={msg.imagePreview} alt="Uploaded chart" className="w-full max-h-40 object-contain bg-background/50" />
                      </div>
                    )}
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none [&>*]:text-[11px] [&>*]:leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-[13px] [&_h2]:text-[12px] [&_h3]:text-[11px] [&_code]:text-[10px] [&_code]:bg-background/50 [&_code]:px-1 [&_code]:rounded [&_strong]:text-primary [&_a]:text-[hsl(var(--terminal-cyan))]">
                        <ReactMarkdown>{(typeof msg.content === 'string' ? msg.content : getDisplayContent(msg.content)) || '...'}</ReactMarkdown>
                      </div>
                    ) : (
                      <span>{getDisplayContent(msg.content)}</span>
                    )}
                  </div>
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-secondary/40 border border-border/20 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Pending image preview */}
            {pendingImage && (
              <div className="px-3 py-2 border-t border-border/30 bg-secondary/20">
                <div className="flex items-center gap-2">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-border/30">
                    <img src={pendingImage} alt="Chart to analyze" className="w-full h-full object-cover" />
                    <button onClick={() => setPendingImage(null)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[8px] font-bold shadow-sm">
                      ×
                    </button>
                  </div>
                  <p className="text-[9px] text-muted-foreground flex-1">Chart attached — add a question or send directly</p>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border/40 bg-card/80">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2 items-end">
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-9 h-9 rounded-lg bg-secondary/40 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
                  title="Upload chart screenshot">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={pendingImage ? "Ask about this chart..." : "Ask about stocks, options, charts..."}
                  disabled={loading}
                  className="flex-1 bg-secondary/40 border border-border/30 rounded-lg px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 transition-colors disabled:opacity-50"
                />
                <button type="submit" disabled={loading || (!input.trim() && !pendingImage)}
                  className="flex-shrink-0 px-3 py-2 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/20 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Send
                </button>
              </form>
              <p className="text-[8px] text-muted-foreground/50 text-center mt-1.5">AI analysis is not financial advice. Always do your own research.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
