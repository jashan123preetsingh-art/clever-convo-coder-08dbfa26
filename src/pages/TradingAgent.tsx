import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { Copy, Download, Share2, ChevronDown, Check } from 'lucide-react';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface AgentResult {
  symbol: string;
  stockData: any;
  agents: Record<string, string>;
}

/* ── Agent metadata ─────────────────────────── */
const AGENT_STEPS = [
  { key: 'analysts', label: 'Analyst Team', icon: '🔬', agents: ['market', 'sentiment', 'news', 'fundamentals'], accent: 'agent-accent-analysts', statusText: 'Running analyst evaluations...' },
  { key: 'debate', label: 'Researcher Debate', icon: '⚔️', agents: ['bullCase', 'bearCase'], accent: 'agent-accent-debate', statusText: 'Bull vs Bear debate in progress...' },
  { key: 'manager', label: 'Research Manager', icon: '📋', agents: ['researchManager'], accent: 'agent-accent-manager', statusText: 'Research manager reviewing findings...' },
  { key: 'trader', label: 'Trader Agent', icon: '📊', agents: ['traderDecision'], accent: 'agent-accent-trader', statusText: 'Trader formulating position...' },
  { key: 'risk', label: 'Risk Debate', icon: '⚖️', agents: ['aggressiveRisk', 'conservativeRisk', 'neutralRisk'], accent: 'agent-accent-risk', statusText: 'Risk analysts debating exposure...' },
  { key: 'portfolio', label: 'Portfolio Manager', icon: '🏛️', agents: ['portfolioManager'], accent: 'agent-accent-portfolio', statusText: 'Portfolio manager making final decision...' },
];

const AGENT_META: Record<string, { label: string; icon: string }> = {
  market: { label: 'Market / Technical', icon: '📉' },
  sentiment: { label: 'Sentiment', icon: '💭' },
  news: { label: 'News & Macro', icon: '📰' },
  fundamentals: { label: 'Fundamentals', icon: '📈' },
  bullCase: { label: 'Bull Researcher', icon: '🐂' },
  bearCase: { label: 'Bear Researcher', icon: '🐻' },
  researchManager: { label: 'Research Manager', icon: '📋' },
  traderDecision: { label: 'Trader Agent', icon: '🎯' },
  aggressiveRisk: { label: 'Aggressive Analyst', icon: '🔥' },
  conservativeRisk: { label: 'Conservative Analyst', icon: '🛡️' },
  neutralRisk: { label: 'Neutral Analyst', icon: '⚖️' },
  portfolioManager: { label: 'Portfolio Manager', icon: '🏛️' },
};

const FULL_SPAN_AGENTS = new Set(['researchManager', 'traderDecision', 'portfolioManager']);

/* ── Helpers ─────────────────────────── */
function extractVerdict(agents: Record<string, string>) {
  const pm = agents.portfolioManager || '';
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  const upper = pm.toUpperCase();
  if (upper.includes('STRONG BUY') || (upper.includes('BUY') && !upper.includes('DON\'T BUY'))) action = 'BUY';
  else if (upper.includes('SELL') || upper.includes('SHORT')) action = 'SELL';

  // Extract risk score (look for patterns like "risk: 7/10" or "risk score: 6")
  let riskScore = 5;
  const riskMatch = pm.match(/risk[:\s]*(?:score[:\s]*)?\s*(\d+)\s*(?:\/\s*10)?/i);
  if (riskMatch) riskScore = Math.min(10, Math.max(1, parseInt(riskMatch[1])));

  // Extract confidence
  let confidence = 70;
  const confMatch = pm.match(/confidence[:\s]*(\d+)\s*%?/i);
  if (confMatch) confidence = Math.min(100, Math.max(0, parseInt(confMatch[1])));

  // First sentence summary
  const summary = pm.split(/[.\n]/)[0]?.trim() || 'Analysis complete.';

  return { action, riskScore, confidence, summary };
}

function detectSentiment(content: string): 'bullish' | 'bearish' | 'neutral' {
  const u = content.toLowerCase();
  const bullWords = ['bullish', 'upside', 'buy', 'strong', 'growth', 'positive', 'outperform'];
  const bearWords = ['bearish', 'downside', 'sell', 'weak', 'decline', 'negative', 'underperform'];
  const bull = bullWords.filter(w => u.includes(w)).length;
  const bear = bearWords.filter(w => u.includes(w)).length;
  if (bull > bear + 1) return 'bullish';
  if (bear > bull + 1) return 'bearish';
  return 'neutral';
}

/* ── Sub-components ─────────────────────────── */

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1 ml-2">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--terminal-amber))] thinking-dot" />
      ))}
    </span>
  );
}

function RiskGauge({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color = score <= 3 ? 'hsl(var(--primary))' : score <= 6 ? 'hsl(var(--terminal-amber))' : 'hsl(var(--destructive))';

  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <circle cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round" className="gauge-ring" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black font-data" style={{ color }}>{score}</span>
        <span className="text-[7px] text-muted-foreground uppercase tracking-wider">Risk</span>
      </div>
    </div>
  );
}

function VerdictCard({ agents, stockData, symbol }: { agents: Record<string, string>; stockData: any; symbol: string }) {
  const { action, riskScore, confidence, summary } = useMemo(() => extractVerdict(agents), [agents]);
  const [copied, setCopied] = useState(false);

  const actionColors = {
    BUY: { bg: 'bg-primary/15', text: 'text-primary', border: 'border-primary/30', glow: 'glow-primary' },
    SELL: { bg: 'bg-destructive/15', text: 'text-destructive', border: 'border-destructive/30', glow: '' },
    HOLD: { bg: 'bg-[hsl(var(--terminal-amber))]/15', text: 'text-[hsl(var(--terminal-amber))]', border: 'border-[hsl(var(--terminal-amber))]/30', glow: '' },
  };
  const ac = actionColors[action];

  const copyVerdict = () => {
    const text = `${symbol} — ${action}\nRisk: ${riskScore}/10 | Confidence: ${confidence}%\n${summary}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Verdict copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    let report = `# TradingAgents Report: ${symbol}\n\n`;
    report += `**Date:** ${new Date().toLocaleDateString('en-IN')}\n`;
    report += `**Verdict:** ${action} | Risk: ${riskScore}/10 | Confidence: ${confidence}%\n\n`;
    AGENT_STEPS.forEach(step => {
      report += `---\n## ${step.icon} ${step.label}\n\n`;
      step.agents.forEach(ak => {
        const meta = AGENT_META[ak];
        const content = agents[ak];
        if (meta && content) report += `### ${meta.icon} ${meta.label}\n${content}\n\n`;
      });
    });
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TradingAgents_${symbol}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded!');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className={`t-card p-5 ${ac.border} border ${ac.glow} relative overflow-hidden`}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${action === 'BUY' ? 'hsl(var(--primary))' : action === 'SELL' ? 'hsl(var(--destructive))' : 'hsl(var(--terminal-amber))'}, transparent 70%)` }} />

      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4">
        {/* Left: Symbol + price */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-black text-foreground font-data tracking-tight">{symbol}</h2>
            <span className={`px-3 py-1 rounded-md text-sm font-black ${ac.bg} ${ac.text} border ${ac.border}`}>
              {action}
            </span>
          </div>
          {stockData && (
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-2xl font-bold text-foreground font-data">₹{stockData.price?.toFixed(2)}</span>
              <span className={`text-sm font-semibold font-data ${stockData.changePct >= 0 ? 't-value-up' : 't-value-down'}`}>
                {stockData.changePct >= 0 ? '+' : ''}{stockData.changePct?.toFixed(2)}%
              </span>
            </div>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">{summary}</p>
        </div>

        {/* Center: Risk gauge */}
        <RiskGauge score={riskScore} />

        {/* Right: Confidence + actions */}
        <div className="flex flex-col items-end gap-3 min-w-[140px]">
          <div className="w-full">
            <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
              <span>Confidence</span>
              <span className="font-data font-bold text-foreground">{confidence}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${confidence}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(var(--terminal-cyan))]" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={copyVerdict} className="t-btn flex items-center gap-1 text-[9px]">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={downloadReport} className="t-btn flex items-center gap-1 text-[9px]">
              <Download className="w-3 h-3" /> Report
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AgentFlowTimeline({ currentStep, loading }: { currentStep: number; loading: boolean }) {
  return (
    <div className="mb-5">
      {/* Desktop: horizontal flow */}
      <div className="hidden md:flex items-center justify-between gap-1">
        {AGENT_STEPS.map((step, i) => {
          const isDone = i < currentStep || currentStep >= 6;
          const isActive = i === currentStep && loading;
          return (
            <React.Fragment key={step.key}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-500 ${
                  isDone ? 'bg-primary/10 border-primary/30 flow-node-done' :
                  isActive ? 'bg-[hsl(var(--terminal-amber))]/10 border-[hsl(var(--terminal-amber))]/40 flow-node-pulse' :
                  'bg-secondary/40 border-border/30 opacity-40'
                }`}
              >
                <span className="text-base">{isDone ? '✓' : step.icon}</span>
                <div>
                  <p className={`text-[9px] font-bold ${isDone ? 'text-primary' : isActive ? 'text-[hsl(var(--terminal-amber))]' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  {isActive && <ThinkingDots />}
                </div>
              </motion.div>
              {i < AGENT_STEPS.length - 1 && (
                <div className="flex-1 flex items-center">
                  <div className={`w-full h-px transition-colors duration-500 ${isDone ? 'bg-primary/50' : 'bg-border/30'}`} />
                  <div className={`w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-t-transparent border-b-transparent transition-colors duration-500 ${isDone ? 'border-l-primary/50' : 'border-l-border/30'}`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile: vertical timeline */}
      <div className="md:hidden space-y-0">
        {AGENT_STEPS.map((step, i) => {
          const isDone = i < currentStep || currentStep >= 6;
          const isActive = i === currentStep && loading;
          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-all ${
                  isDone ? 'bg-primary/20 border-primary text-primary' :
                  isActive ? 'border-[hsl(var(--terminal-amber))] text-[hsl(var(--terminal-amber))] flow-node-pulse' :
                  'border-border bg-secondary text-muted-foreground opacity-40'
                }`}>
                  {isDone ? '✓' : step.icon}
                </div>
                {i < AGENT_STEPS.length - 1 && (
                  <div className={`w-px flex-1 min-h-[16px] transition-colors ${isDone ? 'bg-primary/40' : 'bg-border/30'}`} />
                )}
              </div>
              <div className="pb-3">
                <p className={`text-[10px] font-bold ${isDone ? 'text-primary' : isActive ? 'text-[hsl(var(--terminal-amber))]' : 'text-muted-foreground opacity-40'}`}>
                  {step.label}
                </p>
                {isActive && (
                  <p className="text-[9px] text-[hsl(var(--terminal-amber))]/70 mt-0.5 flex items-center">
                    {step.statusText}<ThinkingDots />
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: 'bullish' | 'bearish' | 'neutral' }) {
  const styles = {
    bullish: 'bg-primary/10 text-primary border-primary/20',
    bearish: 'bg-destructive/10 text-destructive border-destructive/20',
    neutral: 'bg-[hsl(var(--terminal-amber))]/10 text-[hsl(var(--terminal-amber))] border-[hsl(var(--terminal-amber))]/20',
  };
  return (
    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${styles[sentiment]}`}>
      {sentiment}
    </span>
  );
}

function AgentReportCard({ agentKey, content, accent, delay, forceExpand }: { agentKey: string; content: string; accent: string; delay: number; forceExpand?: boolean }) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpand || localExpanded;
  const meta = AGENT_META[agentKey];
  if (!meta) return null;
  const sentiment = detectSentiment(content);
  const isFullSpan = FULL_SPAN_AGENTS.has(agentKey);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 30 }}
      className={`t-card overflow-hidden ${accent} ${isFullSpan ? 'md:col-span-2 lg:col-span-3' : ''}`}
      style={{ background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--card)) 80%, hsl(var(--secondary) / 0.3))' }}
    >
      <button
        onClick={() => setLocalExpanded(!localExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors text-left group"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-lg group-hover:scale-110 transition-transform">{meta.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] font-bold text-foreground">{meta.label}</h3>
              <SentimentBadge sentiment={sentiment} />
            </div>
            {!expanded && (
              <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">{content.slice(0, 100)}...</p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 text-[11px] text-foreground/90 leading-relaxed border-t border-border/20 pt-2 prose prose-sm prose-invert max-w-none [&_p]:text-[11px] [&_p]:leading-relaxed [&_li]:text-[11px] [&_strong]:text-foreground [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-[11px]">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EmptyState({ onSelectSymbol }: { onSelectSymbol: (s: string) => void }) {
  const nodes = [
    { icon: '📈', title: 'Fundamentals', x: 15, y: 20 },
    { icon: '📉', title: 'Technical', x: 55, y: 10 },
    { icon: '💭', title: 'Sentiment', x: 85, y: 25 },
    { icon: '⚔️', title: 'Debate', x: 30, y: 55 },
    { icon: '📊', title: 'Trader', x: 65, y: 50 },
    { icon: '🏛️', title: 'Portfolio', x: 50, y: 80 },
  ];

  return (
    <div className="t-card p-6 md:p-10 text-center relative overflow-hidden">
      {/* Animated network background */}
      <div className="relative h-40 md:h-48 mb-6">
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100">
          <line x1="15" y1="20" x2="55" y2="10" stroke="hsl(var(--primary))" strokeWidth="0.3" />
          <line x1="55" y1="10" x2="85" y2="25" stroke="hsl(var(--primary))" strokeWidth="0.3" />
          <line x1="15" y1="20" x2="30" y2="55" stroke="hsl(var(--terminal-cyan))" strokeWidth="0.3" />
          <line x1="55" y1="10" x2="65" y2="50" stroke="hsl(var(--terminal-cyan))" strokeWidth="0.3" />
          <line x1="85" y1="25" x2="65" y2="50" stroke="hsl(var(--terminal-amber))" strokeWidth="0.3" />
          <line x1="30" y1="55" x2="65" y2="50" stroke="hsl(var(--terminal-amber))" strokeWidth="0.3" />
          <line x1="30" y1="55" x2="50" y2="80" stroke="hsl(var(--primary))" strokeWidth="0.3" />
          <line x1="65" y1="50" x2="50" y2="80" stroke="hsl(var(--primary))" strokeWidth="0.3" />
        </svg>
        {nodes.map((n, i) => (
          <div key={n.title}
            className="absolute float-node"
            style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%, -50%)' }}>
            <div className="bg-card border border-border/50 rounded-lg p-2 text-center shadow-lg">
              <span className="text-lg block">{n.icon}</span>
              <p className="text-[8px] font-semibold text-foreground mt-0.5">{n.title}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-bold text-foreground mb-2">TradingAgents Multi-Agent Framework</h2>
      <p className="text-[10px] text-muted-foreground max-w-md mx-auto mb-5 leading-relaxed">
        Enter a stock symbol to run the full 12-agent pipeline.
        Analysts evaluate → researchers debate → manager judges → trader decides → risk analysts deliberate → portfolio manager approves.
      </p>

      <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
        {['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'TATAMOTORS'].map(s => (
          <button key={s} onClick={() => onSelectSymbol(s)}
            className="px-3 py-1.5 text-[10px] font-semibold bg-secondary/60 border border-border/50 rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all hover-scale">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────── */
export default function TradingAgent() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  const runAgent = async () => {
    if (!symbol.trim()) { toast.error('Enter a stock symbol'); return; }
    setLoading(true);
    setResult(null);
    setCurrentStep(0);
    setExpandAll(false);

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

  return (
    <div className="p-3 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🤖</span>
          <h1 className="text-base md:text-lg font-black text-foreground tracking-wide">TRADING AGENTS</h1>
          <span className="text-[8px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">TradingAgents Framework</span>
        </div>
        <p className="text-[10px] md:text-xs text-muted-foreground">
          Multi-agent LLM framework — 12 specialized agents collaborate to analyze stocks
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

        {!loading && !result && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'TATAMOTORS', 'ADANIENT'].map(s => (
              <button key={s} onClick={() => setSymbol(s)}
                className="px-2 py-1 text-[9px] bg-secondary/60 border border-border/50 rounded text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Flow Timeline */}
      {(loading || result) && (
        <AgentFlowTimeline currentStep={currentStep} loading={loading} />
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Verdict Card */}
            <VerdictCard agents={result.agents} stockData={result.stockData} symbol={result.symbol} />

            {/* Agent Reports grouped by step */}
            {AGENT_STEPS.map((step, stepIdx) => (
              <div key={step.key}>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>{step.icon}</span> {step.label}
                  <span className="text-[8px] font-normal text-muted-foreground/50">— {step.agents.length} agent{step.agents.length > 1 ? 's' : ''}</span>
                </h3>
                <div className={`grid gap-2 ${step.agents.length >= 3 && !FULL_SPAN_AGENTS.has(step.agents[0]) ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : step.agents.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {step.agents.map((agentKey, idx) => {
                    const content = result.agents[agentKey];
                    if (!content) return null;
                    return (
                      <AgentReportCard
                        key={agentKey}
                        agentKey={agentKey}
                        content={content}
                        accent={step.accent}
                        delay={stepIdx * 0.08 + idx * 0.03}
                        forceExpand={expandAll}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Expand/Collapse All */}
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setExpandAll(!expandAll)}
                className="text-[10px] text-primary hover:underline font-medium"
              >
                {expandAll ? 'Collapse All' : 'Expand All Reports'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!loading && !result && (
        <EmptyState onSelectSymbol={setSymbol} />
      )}
    </div>
  );
}
