import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface AgentResult {
  symbol: string;
  stockData: any;
  agents: Record<string, string>;
}

/* ── TradingAgents Graph Steps ─────────────────────────── */
const AGENT_STEPS = [
  { key: 'analysts', label: 'Analyst Team', icon: '🔬', agents: ['market', 'sentiment', 'news', 'fundamentals'] },
  { key: 'debate', label: 'Researcher Debate', icon: '⚔️', agents: ['bullCase', 'bearCase'] },
  { key: 'manager', label: 'Research Manager', icon: '📋', agents: ['researchManager'] },
  { key: 'trader', label: 'Trader Agent', icon: '📊', agents: ['traderDecision'] },
  { key: 'risk', label: 'Risk Debate', icon: '⚖️', agents: ['aggressiveRisk', 'conservativeRisk', 'neutralRisk'] },
  { key: 'portfolio', label: 'Portfolio Manager', icon: '🏛️', agents: ['portfolioManager'] },
];

const AGENT_META: Record<string, { label: string; icon: string; group: string }> = {
  market: { label: 'Market / Technical', icon: '📉', group: 'Analyst Team' },
  sentiment: { label: 'Sentiment', icon: '💭', group: 'Analyst Team' },
  news: { label: 'News & Macro', icon: '📰', group: 'Analyst Team' },
  fundamentals: { label: 'Fundamentals', icon: '📈', group: 'Analyst Team' },
  bullCase: { label: 'Bull Researcher', icon: '🐂', group: 'Researcher Debate' },
  bearCase: { label: 'Bear Researcher', icon: '🐻', group: 'Researcher Debate' },
  researchManager: { label: 'Research Manager', icon: '📋', group: 'Research Manager' },
  traderDecision: { label: 'Trader Agent', icon: '🎯', group: 'Trader' },
  aggressiveRisk: { label: 'Aggressive Analyst', icon: '🔥', group: 'Risk Debate' },
  conservativeRisk: { label: 'Conservative Analyst', icon: '🛡️', group: 'Risk Debate' },
  neutralRisk: { label: 'Neutral Analyst', icon: '⚖️', group: 'Risk Debate' },
  portfolioManager: { label: 'Portfolio Manager', icon: '🏛️', group: 'Portfolio Manager' },
};

const FULL_SPAN_AGENTS = new Set(['researchManager', 'traderDecision', 'portfolioManager']);

export default function TradingAgent() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const runAgent = async () => {
    if (!symbol.trim()) { toast.error('Enter a stock symbol'); return; }
    setLoading(true);
    setResult(null);
    setCurrentStep(0);
    setExpandedAgent(null);

    try {
      const stepTimer = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < 5) return prev + 1;
          clearInterval(stepTimer);
          return prev;
        });
      }, 5000);

      const resp = await fetch(`${FUNCTIONS_URL}/trading-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ symbol: symbol.toUpperCase().trim() }),
      });

      clearInterval(stepTimer);

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Agent failed');
      }

      const data = await resp.json();
      setResult(data);
      setCurrentStep(6);
      toast.success(`TradingAgents analysis complete for ${data.symbol}`);
    } catch (err: any) {
      toast.error(err.message || 'Agent failed');
      setCurrentStep(-1);
    } finally {
      setLoading(false);
    }
  };

  const isExpanded = (key: string) => expandedAgent === key || expandedAgent === 'all';

  return (
    <div className="p-3 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🤖</span>
          <h1 className="text-base md:text-lg font-black text-foreground tracking-wide">TRADING AGENTS</h1>
          <span className="text-[8px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">TradingAgents Framework</span>
        </div>
        <p className="text-[10px] md:text-xs text-muted-foreground">
          Multi-agent LLM trading framework — 4 Analysts → Bull/Bear Debate → Research Manager → Trader → Risk Debate (Aggressive/Conservative/Neutral) → Portfolio Manager
        </p>
        <p className="text-[8px] text-muted-foreground/60 mt-0.5">
          Inspired by <a href="https://github.com/TauricResearch/TradingAgents" target="_blank" rel="noopener" className="text-primary/60 hover:text-primary underline">TauricResearch/TradingAgents</a>
        </p>
      </div>

      {/* Input */}
      <div className="t-card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-[10px] text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Stock Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && runAgent()}
              placeholder="e.g. RELIANCE, TCS, INFY"
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-data"
              disabled={loading}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={runAgent}
              disabled={loading || !symbol.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-primary to-[hsl(var(--terminal-cyan))] text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Running Agents...
                </span>
              ) : '🚀 Run TradingAgents'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'TATAMOTORS', 'ADANIENT'].map(s => (
            <button key={s} onClick={() => setSymbol(s)}
              className="px-2 py-1 text-[9px] bg-secondary/60 border border-border/50 rounded text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Workflow Progress — 6 steps */}
      {(loading || result) && (
        <div className="mb-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[600px] mb-3">
            {AGENT_STEPS.map((step, i) => (
              <React.Fragment key={step.key}>
                <div className={`flex items-center gap-1 ${i <= currentStep ? 'opacity-100' : 'opacity-30'} transition-opacity duration-500`}>
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs border-2 transition-all duration-500 ${
                    i < currentStep || currentStep >= 6 ? 'bg-primary/20 border-primary text-primary' :
                    i === currentStep && loading ? 'border-[hsl(var(--terminal-amber))] animate-pulse text-[hsl(var(--terminal-amber))] bg-[hsl(var(--terminal-amber)/0.1)]' :
                    'border-border bg-secondary text-muted-foreground'
                  }`}>
                    {i < currentStep || currentStep >= 6 ? '✓' : step.icon}
                  </div>
                  <span className="text-[8px] md:text-[9px] font-semibold text-foreground hidden sm:block whitespace-nowrap">{step.label}</span>
                </div>
                {i < AGENT_STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1.5 transition-colors duration-500 ${i < currentStep ? 'bg-primary' : 'bg-border'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Stock summary */}
            {result.stockData && (
              <div className="t-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-foreground font-data">{result.symbol}</h2>
                    <p className="text-xs text-muted-foreground">TradingAgents Analysis — {new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground font-data">₹{result.stockData.price?.toFixed(2)}</p>
                    <p className={`text-sm font-semibold font-data ${result.stockData.changePct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {result.stockData.changePct >= 0 ? '+' : ''}{result.stockData.changePct?.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Reports grouped by step */}
            {AGENT_STEPS.map((step) => (
              <div key={step.key}>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>{step.icon}</span> {step.label}
                </h3>
                <div className={`grid gap-2 ${step.agents.length >= 3 && !FULL_SPAN_AGENTS.has(step.agents[0]) ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : step.agents.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {step.agents.map((agentKey, idx) => {
                    const meta = AGENT_META[agentKey];
                    const content = result.agents[agentKey];
                    if (!meta || !content) return null;
                    const expanded = isExpanded(agentKey);
                    return (
                      <motion.div key={agentKey}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`t-card overflow-hidden ${FULL_SPAN_AGENTS.has(agentKey) ? 'md:col-span-2 lg:col-span-3' : ''}`}
                      >
                        <button
                          onClick={() => setExpandedAgent(expanded ? null : agentKey)}
                          className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{meta.icon}</span>
                            <div>
                              <h3 className="text-[11px] font-bold text-foreground">{meta.label}</h3>
                              {!expanded && (
                                <p className="text-[9px] text-muted-foreground line-clamp-1 max-w-[300px]">{content.slice(0, 80)}...</p>
                              )}
                            </div>
                          </div>
                          <span className={`text-muted-foreground text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
                        </button>
                        <AnimatePresence>
                          {expanded && (
                            <motion.div
                              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 text-[11px] text-foreground/90 leading-relaxed border-t border-border/30 pt-2 prose prose-sm prose-invert max-w-none [&_p]:text-[11px] [&_p]:leading-relaxed [&_li]:text-[11px] [&_strong]:text-foreground">
                                <ReactMarkdown>{content}</ReactMarkdown>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Expand / Collapse All */}
            <div className="flex justify-center">
              <button
                onClick={() => setExpandedAgent(expandedAgent === 'all' ? null : 'all')}
                className="text-[10px] text-primary hover:underline"
              >
                {expandedAgent === 'all' ? 'Collapse All' : 'Expand All Reports'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!loading && !result && (
        <div className="t-card p-8 md:p-12 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h2 className="text-sm font-bold text-foreground mb-2">TradingAgents Multi-Agent Framework</h2>
          <p className="text-[10px] text-muted-foreground max-w-lg mx-auto mb-6">
            Enter a stock symbol to run the full TradingAgents pipeline. 
            4 specialized analysts evaluate the stock, then bull/bear researchers debate, 
            a research manager judges, a trader makes a decision, 
            3 risk analysts debate risk, and finally the portfolio manager approves or rejects.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 max-w-3xl mx-auto">
            {[
              { icon: '📈', title: 'Fundamentals', desc: 'PE, ROE, growth' },
              { icon: '📉', title: 'Technical', desc: 'Price action, MAs' },
              { icon: '💭', title: 'Sentiment', desc: 'Market mood' },
              { icon: '📰', title: 'News', desc: 'Events, macro' },
              { icon: '⚔️', title: 'Debate', desc: 'Bull vs Bear' },
              { icon: '🏛️', title: 'Portfolio Mgr', desc: 'Final decision' },
            ].map(a => (
              <div key={a.title} className="bg-secondary/30 border border-border/30 rounded-lg p-2.5 text-center">
                <span className="text-xl">{a.icon}</span>
                <p className="text-[9px] font-semibold text-foreground mt-1">{a.title}</p>
                <p className="text-[7px] text-muted-foreground">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
