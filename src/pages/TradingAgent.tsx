import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { Copy, Download, ChevronDown, Check, Image as ImageIcon, X, Zap, TrendingUp, Landmark } from 'lucide-react';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

type TradeMode = 'scalp' | 'swing' | 'invest';

interface AgentResult {
  symbol: string;
  mode: TradeMode;
  stockData: any;
  agents: Record<string, string>;
  hasChartAnalysis?: boolean;
}

/* ── Mode configs ─────────────────────────── */
const MODE_CONFIG: Record<TradeMode, {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
  steps: { key: string; label: string; icon: string; agents: string[]; statusText: string }[];
}> = {
  scalp: {
    label: 'Intraday & Scalping',
    subtitle: 'Pure technical, quick entries/exits, minutes to hours',
    icon: <Zap className="w-5 h-5" />,
    color: 'text-[hsl(var(--terminal-amber))]',
    borderColor: 'border-[hsl(var(--terminal-amber))]/30',
    bgColor: 'bg-[hsl(var(--terminal-amber))]/10',
    steps: [
      { key: 'analysts', label: 'Technical Analysis', icon: '📉', agents: ['market', 'sentiment'], statusText: 'Running technical scan...' },
      { key: 'trader', label: 'Scalp Trader', icon: '⚡', agents: ['traderDecision'], statusText: 'Trader making quick call...' },
      { key: 'risk', label: 'Risk Check', icon: '🛡️', agents: ['riskCheck'], statusText: 'Checking risk parameters...' },
    ],
  },
  swing: {
    label: 'Swing & Position',
    subtitle: 'Full analysis, weeks to months, with holding duration',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'text-[hsl(var(--terminal-cyan))]',
    borderColor: 'border-[hsl(var(--terminal-cyan))]/30',
    bgColor: 'bg-[hsl(var(--terminal-cyan))]/10',
    steps: [
      { key: 'analysts', label: 'Analyst Team', icon: '🔬', agents: ['market', 'sentiment', 'news', 'fundamentals'], statusText: 'Running analyst evaluations...' },
      { key: 'debate', label: 'Researcher Debate', icon: '⚔️', agents: ['bullCase', 'bearCase'], statusText: 'Bull vs Bear debate...' },
      { key: 'manager', label: 'Research Manager', icon: '📋', agents: ['researchManager'], statusText: 'Manager reviewing...' },
      { key: 'trader', label: 'Swing Trader', icon: '📊', agents: ['traderDecision'], statusText: 'Trader formulating position...' },
      { key: 'risk', label: 'Risk Debate', icon: '⚖️', agents: ['aggressiveRisk', 'conservativeRisk', 'neutralRisk'], statusText: 'Risk analysts debating...' },
      { key: 'portfolio', label: 'Portfolio Manager', icon: '🏛️', agents: ['portfolioManager'], statusText: 'Final decision...' },
    ],
  },
  invest: {
    label: 'Long-term Investment',
    subtitle: 'Warren Buffett style, 1-10 years, deep fundamentals',
    icon: <Landmark className="w-5 h-5" />,
    color: 'text-primary',
    borderColor: 'border-primary/30',
    bgColor: 'bg-primary/10',
    steps: [
      { key: 'analysts', label: 'Deep Fundamentals', icon: '📊', agents: ['fundamentals', 'moat'], statusText: 'Buffett-style analysis...' },
      { key: 'technical', label: 'Long-term Technical', icon: '📈', agents: ['market', 'news'], statusText: 'Macro perspective...' },
      { key: 'debate', label: 'Investment Debate', icon: '⚔️', agents: ['bullCase', 'bearCase'], statusText: 'Bull vs Bear debate...' },
      { key: 'committee', label: 'Investment Committee', icon: '🏛️', agents: ['investmentManager'], statusText: 'Committee reviewing...' },
      { key: 'architect', label: 'Portfolio Architect', icon: '👑', agents: ['portfolioArchitect'], statusText: 'Buffett making final call...' },
    ],
  },
};

const AGENT_META: Record<string, { label: string; icon: string }> = {
  market: { label: 'Market / Technical', icon: '📉' },
  sentiment: { label: 'Sentiment', icon: '💭' },
  news: { label: 'News & Macro', icon: '📰' },
  fundamentals: { label: 'Fundamentals', icon: '📈' },
  moat: { label: 'Moat Analysis', icon: '🏰' },
  bullCase: { label: 'Bull Researcher', icon: '🐂' },
  bearCase: { label: 'Bear Researcher', icon: '🐻' },
  researchManager: { label: 'Research Manager', icon: '📋' },
  traderDecision: { label: 'Trader Agent', icon: '🎯' },
  aggressiveRisk: { label: 'Aggressive Analyst', icon: '🔥' },
  conservativeRisk: { label: 'Conservative Analyst', icon: '🛡️' },
  neutralRisk: { label: 'Neutral Analyst', icon: '⚖️' },
  riskCheck: { label: 'Risk Manager', icon: '🛡️' },
  portfolioManager: { label: 'Portfolio Manager', icon: '🏛️' },
  investmentManager: { label: 'Investment Committee', icon: '🏛️' },
  portfolioArchitect: { label: 'Portfolio Architect', icon: '👑' },
};

const FULL_SPAN_AGENTS = new Set(['researchManager', 'traderDecision', 'portfolioManager', 'riskCheck', 'investmentManager', 'portfolioArchitect']);

/* ── Image compression ─────────────────────────── */
function compressImage(file: File, maxSize = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Helpers ─────────────────────────── */
function extractVerdict(agents: Record<string, string>, mode: TradeMode) {
  // Pick the final agent based on mode
  const finalKey = mode === 'scalp' ? 'traderDecision' : mode === 'invest' ? 'portfolioArchitect' : 'portfolioManager';
  const pm = agents[finalKey] || '';
  let action: 'BUY' | 'SELL' | 'HOLD' | 'INVEST' | 'PASS' = 'HOLD';
  const upper = pm.toUpperCase();

  if (mode === 'invest') {
    if (upper.includes('INVEST') && !upper.includes('DON\'T INVEST')) action = 'INVEST';
    else if (upper.includes('PASS') || upper.includes('AVOID')) action = 'PASS';
    else if (upper.includes('BUY') || upper.includes('ACCUMULATE')) action = 'BUY';
  } else {
    if (upper.includes('STRONG BUY') || (upper.includes('BUY') && !upper.includes('DON\'T BUY'))) action = 'BUY';
    else if (upper.includes('SELL') || upper.includes('SHORT')) action = 'SELL';
  }

  let riskScore = 5;
  const riskMatch = pm.match(/risk[:\s]*(?:score[:\s]*)?\s*(\d+)\s*(?:\/\s*10)?/i);
  if (riskMatch) riskScore = Math.min(10, Math.max(1, parseInt(riskMatch[1])));

  let confidence = 70;
  const confMatch = pm.match(/confidence[:\s]*(\d+)\s*%?/i);
  if (confMatch) confidence = Math.min(100, Math.max(0, parseInt(confMatch[1])));

  // Extract holding duration
  let duration = '';
  const durMatch = pm.match(/(?:hold(?:ing)?|duration|horizon|time)[:\s]*([^\n,]+)/i);
  if (durMatch) duration = durMatch[1].trim();

  const summary = pm.split(/[.\n]/)[0]?.trim() || 'Analysis complete.';
  return { action, riskScore, confidence, summary, duration };
}

function detectSentiment(content: string): 'bullish' | 'bearish' | 'neutral' {
  const u = content.toLowerCase();
  const bullWords = ['bullish', 'upside', 'buy', 'strong', 'growth', 'positive', 'outperform', 'invest', 'accumulate', 'wide moat'];
  const bearWords = ['bearish', 'downside', 'sell', 'weak', 'decline', 'negative', 'underperform', 'avoid', 'pass', 'no moat'];
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

function VerdictCard({ agents, stockData, symbol, hasChartAnalysis, mode }: { agents: Record<string, string>; stockData: any; symbol: string; hasChartAnalysis?: boolean; mode: TradeMode }) {
  const { action, riskScore, confidence, summary, duration } = useMemo(() => extractVerdict(agents, mode), [agents, mode]);
  const [copied, setCopied] = useState(false);
  const config = MODE_CONFIG[mode];
  const steps = config.steps;

  const actionColors: Record<string, any> = {
    BUY: { bg: 'bg-primary/15', text: 'text-primary', border: 'border-primary/30', glow: 'glow-primary' },
    SELL: { bg: 'bg-destructive/15', text: 'text-destructive', border: 'border-destructive/30', glow: '' },
    HOLD: { bg: 'bg-[hsl(var(--terminal-amber))]/15', text: 'text-[hsl(var(--terminal-amber))]', border: 'border-[hsl(var(--terminal-amber))]/30', glow: '' },
    INVEST: { bg: 'bg-primary/15', text: 'text-primary', border: 'border-primary/30', glow: 'glow-primary' },
    PASS: { bg: 'bg-destructive/15', text: 'text-destructive', border: 'border-destructive/30', glow: '' },
  };
  const ac = actionColors[action] || actionColors.HOLD;

  const modeLabels: Record<TradeMode, string> = { scalp: '⚡ SCALP', swing: '📈 SWING', invest: '🏦 INVEST' };

  const copyVerdict = () => {
    const text = `${symbol} [${config.label}] — ${action}\nRisk: ${riskScore}/10 | Confidence: ${confidence}%${duration ? ` | Duration: ${duration}` : ''}\n${summary}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Verdict copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    let report = `# TradingAgents Report: ${symbol}\n**Mode:** ${config.label}\n**Date:** ${new Date().toLocaleDateString('en-IN')}\n`;
    report += `**Verdict:** ${action} | Risk: ${riskScore}/10 | Confidence: ${confidence}%\n`;
    if (duration) report += `**Holding Duration:** ${duration}\n`;
    if (hasChartAnalysis) report += `**Chart Analysis:** Included\n`;
    report += '\n';
    steps.forEach(step => {
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
    a.download = `TradingAgents_${mode}_${symbol}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded!');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className={`rounded-xl sm:rounded-2xl bg-card/50 p-3 sm:p-5 ${ac.border} border ${ac.glow} relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${action === 'BUY' || action === 'INVEST' ? 'hsl(var(--primary))' : action === 'SELL' || action === 'PASS' ? 'hsl(var(--destructive))' : 'hsl(var(--terminal-amber))'}, transparent 70%)` }} />
      <div className="relative">
        {/* Top row: symbol + action + mode */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h2 className="text-lg sm:text-xl font-black text-foreground font-data tracking-tight">{symbol}</h2>
          <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-xs sm:text-sm font-black ${ac.bg} ${ac.text} border ${ac.border}`}>
            {action}
          </span>
          <span className={`text-[7px] sm:text-[8px] px-1.5 sm:px-2 py-0.5 rounded-lg ${config.bgColor} ${config.color} font-bold border ${config.borderColor}`}>
            {modeLabels[mode]}
          </span>
          {hasChartAnalysis && (
            <span className="text-[7px] sm:text-[8px] px-1.5 sm:px-2 py-0.5 rounded-lg bg-[hsl(var(--terminal-cyan))]/10 text-[hsl(var(--terminal-cyan))] font-bold border border-[hsl(var(--terminal-cyan))]/20">
              📸 Chart
            </span>
          )}
        </div>

        {/* Price + metrics row */}
        <div className="flex items-center gap-3 sm:gap-6 mb-2 flex-wrap">
          {stockData && (
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-foreground font-data">₹{stockData.price?.toFixed(2)}</span>
              <span className={`text-xs sm:text-sm font-semibold font-data ${stockData.changePct >= 0 ? 't-value-up' : 't-value-down'}`}>
                {stockData.changePct >= 0 ? '+' : ''}{stockData.changePct?.toFixed(2)}%
              </span>
            </div>
          )}
          {duration && (
            <span className="text-[9px] sm:text-[10px] font-semibold text-[hsl(var(--terminal-cyan))]">⏱️ {duration}</span>
          )}
        </div>

        {/* Stats row: risk gauge + confidence + actions */}
        <div className="flex items-center gap-3 sm:gap-4 mt-3">
          <RiskGauge score={riskScore} />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
              <span>Confidence</span>
              <span className="font-data font-bold text-foreground">{confidence}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${confidence}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(var(--terminal-cyan))]" />
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed mt-2 line-clamp-2">{summary}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={copyVerdict} className="t-btn flex items-center gap-1 text-[8px] sm:text-[9px]">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? '✓' : 'Copy'}
            </button>
            <button onClick={downloadReport} className="t-btn flex items-center gap-1 text-[8px] sm:text-[9px]">
              <Download className="w-3 h-3" /> Report
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AgentFlowTimeline({ currentStep, loading, mode }: { currentStep: number; loading: boolean; mode: TradeMode }) {
  const steps = MODE_CONFIG[mode].steps;
  return (
    <div className="mb-5">
      <div className="hidden md:flex items-center justify-between gap-1">
        {steps.map((step, i) => {
          const isDone = i < currentStep || currentStep >= steps.length;
          const isActive = i === currentStep && loading;
          return (
            <React.Fragment key={step.key}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-500 ${
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
              {i < steps.length - 1 && (
                <div className="flex-1 flex items-center">
                  <div className={`w-full h-px transition-colors duration-500 ${isDone ? 'bg-primary/50' : 'bg-border/30'}`} />
                  <div className={`w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-t-transparent border-b-transparent transition-colors duration-500 ${isDone ? 'border-l-primary/50' : 'border-l-border/30'}`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Mobile */}
      <div className="md:hidden space-y-0">
        {steps.map((step, i) => {
          const isDone = i < currentStep || currentStep >= steps.length;
          const isActive = i === currentStep && loading;
          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-all ${
                  isDone ? 'bg-primary/20 border-primary text-primary' :
                  isActive ? 'border-[hsl(var(--terminal-amber))] text-[hsl(var(--terminal-amber))] flow-node-pulse' :
                  'border-border bg-secondary text-muted-foreground opacity-40'
                }`}>{isDone ? '✓' : step.icon}</div>
                {i < steps.length - 1 && <div className={`w-px flex-1 min-h-[16px] transition-colors ${isDone ? 'bg-primary/40' : 'bg-border/30'}`} />}
              </div>
              <div className="pb-3">
                <p className={`text-[10px] font-bold ${isDone ? 'text-primary' : isActive ? 'text-[hsl(var(--terminal-amber))]' : 'text-muted-foreground opacity-40'}`}>{step.label}</p>
                {isActive && <p className="text-[9px] text-[hsl(var(--terminal-amber))]/70 mt-0.5 flex items-center">{step.statusText}<ThinkingDots /></p>}
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

function AgentReportCard({ agentKey, content, delay, forceExpand }: { agentKey: string; content: string; delay: number; forceExpand?: boolean }) {
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
      className={`rounded-2xl bg-card/50 border border-border/20 overflow-hidden ${isFullSpan ? 'md:col-span-2 lg:col-span-3' : ''}`}
    >
      <button
        onClick={() => setLocalExpanded(!localExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-primary/3 transition-colors text-left group"
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

/* ── Mode Selector ─────────────────────────── */
function ModeSelector({ mode, setMode, disabled }: { mode: TradeMode; setMode: (m: TradeMode) => void; disabled: boolean }) {
  const modes: TradeMode[] = ['scalp', 'swing', 'invest'];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
      {modes.map(m => {
        const cfg = MODE_CONFIG[m];
        const active = mode === m;
        return (
          <button
            key={m}
            onClick={() => !disabled && setMode(m)}
            disabled={disabled}
            className={`relative rounded-xl sm:rounded-2xl border-2 p-2.5 sm:p-4 text-left transition-all duration-300 ${
              active
                ? `${cfg.borderColor} ${cfg.bgColor} shadow-lg`
                : 'border-border/20 bg-card/30 hover:bg-card/50 hover:border-border/40'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {active && (
              <motion.div layoutId="mode-indicator" className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-primary/20 pointer-events-none" />
            )}
            <div className="flex items-center gap-1.5 sm:gap-3 mb-1 sm:mb-2">
              <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${active ? cfg.bgColor : 'bg-secondary/40'} ${active ? cfg.color : 'text-muted-foreground'} transition-colors`}>
                {cfg.icon}
              </div>
              <h3 className={`text-[10px] sm:text-sm font-bold leading-tight ${active ? 'text-foreground' : 'text-muted-foreground'} transition-colors`}>{cfg.label}</h3>
            </div>
            <p className="text-[7px] sm:text-[9px] text-muted-foreground leading-relaxed hidden sm:block">{cfg.subtitle}</p>
            <div className="mt-1 sm:mt-2 flex flex-wrap gap-0.5 sm:gap-1 hidden sm:flex">
              {cfg.steps.map(s => (
                <span key={s.key} className="text-[6px] sm:text-[7px] px-1 sm:px-1.5 py-0.5 rounded bg-secondary/40 text-muted-foreground">{s.icon}</span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ onSelectSymbol }: { onSelectSymbol: (s: string) => void }) {
  return (
    <div className="rounded-2xl bg-card/40 border border-border/15 p-6 md:p-10 text-center">
      <h2 className="text-sm font-bold text-foreground mb-2">Select a Mode & Enter Symbol</h2>
      <p className="text-[10px] text-muted-foreground max-w-md mx-auto mb-5 leading-relaxed">
        Choose your trading style above, then enter a stock symbol to run the AI analysis pipeline.
      </p>
      <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
        {['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'TATAMOTORS'].map(s => (
          <button key={s} onClick={() => onSelectSymbol(s)}
            className="px-3 py-1.5 text-[10px] font-semibold bg-secondary/50 border border-border/30 rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-primary/5 transition-all">
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
  const [mode, setMode] = useState<TradeMode>('swing');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [chartImage, setChartImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    try {
      const compressed = await compressImage(file);
      setChartImage(compressed);
      toast.success('Chart image attached!');
    } catch { toast.error('Failed to process image'); }
  }, []);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await handleImageFile(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleImageFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleImageFile(file);
  };

  const config = MODE_CONFIG[mode];
  const steps = config.steps;

  const runAgent = async () => {
    if (!symbol.trim()) { toast.error('Enter a stock symbol'); return; }
    setLoading(true);
    setResult(null);
    setCurrentStep(0);
    setExpandAll(false);

    try {
      const stepTimer = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < steps.length - 1) return prev + 1;
          clearInterval(stepTimer);
          return prev;
        });
      }, mode === 'scalp' ? 4000 : 5000);

      const resp = await fetch(`${FUNCTIONS_URL}/trading-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase().trim(),
          chartImage: mode !== 'invest' ? (chartImage || undefined) : undefined,
          mode,
        }),
      });

      clearInterval(stepTimer);

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Agent failed');
      }

      const data = await resp.json();
      setResult(data);
      setCurrentStep(steps.length);
      toast.success(`${config.label} analysis complete for ${data.symbol}`);
    } catch (err: any) {
      toast.error(err.message || 'Agent failed');
      setCurrentStep(-1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-[1400px] mx-auto"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 p-16 text-center">
              <ImageIcon className="w-12 h-12 text-primary mx-auto mb-4" />
              <p className="text-lg font-bold text-foreground">Drop chart image here</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🤖</span>
          <h1 className="text-base md:text-lg font-black text-foreground tracking-wide">TRADING AGENTS</h1>
          <span className={`text-[8px] px-2 py-0.5 rounded-lg ${config.bgColor} ${config.color} font-bold border ${config.borderColor}`}>
            {config.label}
          </span>
        </div>
        <p className="text-[10px] md:text-xs text-muted-foreground">
          Choose your trading style, enter a symbol, and let the AI agents do the rest.
        </p>
      </div>

      {/* Mode Selector */}
      <ModeSelector mode={mode} setMode={setMode} disabled={loading} />

      {/* Input */}
      <div className="rounded-xl sm:rounded-2xl bg-card/50 border border-border/15 p-3 sm:p-4 mb-4">
        <div className="flex flex-col gap-2 sm:gap-3">
          <div>
            <label className="block text-[9px] sm:text-[10px] text-muted-foreground font-semibold mb-1 sm:mb-1.5 uppercase tracking-wider">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && runAgent()}
              placeholder={mode === 'invest' ? 'e.g. RELIANCE, TCS' : 'e.g. NIFTY 50'}
              className="w-full bg-secondary/40 border border-border/30 rounded-xl px-3 py-2 sm:py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 font-data transition-colors"
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-2">
            {mode !== 'invest' && (
              <>
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
                  onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleImageFile(f); if (fileInputRef.current) fileInputRef.current.value = ''; }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className={`px-3 py-2 sm:py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    chartImage
                      ? 'bg-[hsl(var(--terminal-cyan))]/10 border-[hsl(var(--terminal-cyan))]/30 text-[hsl(var(--terminal-cyan))]'
                      : 'bg-secondary/30 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/50'
                  } disabled:opacity-50`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{chartImage ? 'Chart ✓' : 'Chart'}</span>
                </button>
              </>
            )}
            <button
              onClick={runAgent}
              disabled={loading || !symbol.trim()}
              className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-primary to-[hsl(var(--terminal-cyan))] text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span className="hidden sm:inline">Running...</span>
                  <span className="sm:hidden">...</span>
                </span>
              ) : '🚀 Run'}
            </button>
          </div>
        </div>
      </div>

      {/* Chart upload section - only for scalp/swing */}
      {mode !== 'invest' && (
        <div className="rounded-xl sm:rounded-2xl bg-card/50 border border-border/15 p-3 sm:p-4 mb-4">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <span className="text-sm sm:text-base">📸</span>
            <h3 className="text-[10px] sm:text-[11px] font-bold text-foreground uppercase tracking-wider">Chart Analysis</h3>
            <span className="text-[7px] sm:text-[8px] px-1.5 sm:px-2 py-0.5 rounded-lg bg-[hsl(var(--terminal-cyan))]/10 text-[hsl(var(--terminal-cyan))] font-semibold border border-[hsl(var(--terminal-cyan))]/20">Optional</span>
          </div>

          {chartImage ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4 p-3 rounded-xl bg-[hsl(var(--terminal-cyan))]/5 border border-[hsl(var(--terminal-cyan))]/15">
              <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-border/30 flex-shrink-0">
                <img src={chartImage} alt="Uploaded chart" className="w-full h-full object-cover" />
                <button onClick={() => setChartImage(null)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] font-bold shadow-sm hover:scale-110 transition-transform">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-foreground">✅ Chart attached</p>
                <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed">
                  The Technical Analyst will visually analyze chart patterns, candlesticks, and support/resistance zones.
                </p>
              </div>
            </motion.div>
          ) : (
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full rounded-xl border-2 border-dashed border-border/30 hover:border-primary/30 bg-secondary/20 hover:bg-primary/5 p-5 transition-all group disabled:opacity-50"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-secondary/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <ImageIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-[11px] font-semibold text-foreground">Click to upload chart screenshot</p>
                  <p className="text-[9px] text-muted-foreground">
                    or paste with <kbd className="text-[8px] bg-secondary/60 px-1.5 py-0.5 rounded border border-border/30 font-mono">Ctrl+V</kbd> / drag & drop
                  </p>
                </div>
              </button>
              {mode === 'scalp' && (
                <div className="mt-3 rounded-xl bg-secondary/30 border border-border/15 p-3">
                  <p className="text-[9px] font-bold text-foreground uppercase tracking-wider mb-2">⏱️ Recommended Timeframes</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-background/50 border border-[hsl(var(--terminal-red))]/15 p-2">
                      <p className="text-[9px] font-bold text-[hsl(var(--terminal-red))]">⚡ Scalp</p>
                      <p className="text-[10px] font-semibold text-foreground">1 – 5 min</p>
                    </div>
                    <div className="rounded-lg bg-background/50 border border-[hsl(var(--terminal-amber))]/15 p-2">
                      <p className="text-[9px] font-bold text-[hsl(var(--terminal-amber))]">🔥 Intraday</p>
                      <p className="text-[10px] font-semibold text-foreground">5 – 30 min</p>
                    </div>
                  </div>
                </div>
              )}
              {mode === 'swing' && (
                <div className="mt-3 rounded-xl bg-secondary/30 border border-border/15 p-3">
                  <p className="text-[9px] font-bold text-foreground uppercase tracking-wider mb-2">⏱️ Recommended Timeframes</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-background/50 border border-[hsl(var(--terminal-cyan))]/15 p-2">
                      <p className="text-[9px] font-bold text-[hsl(var(--terminal-cyan))]">📈 Swing</p>
                      <p className="text-[10px] font-semibold text-foreground">1H – 1D</p>
                    </div>
                    <div className="rounded-lg bg-background/50 border border-[hsl(var(--terminal-green))]/15 p-2">
                      <p className="text-[9px] font-bold text-[hsl(var(--terminal-green))]">🏦 Position</p>
                      <p className="text-[10px] font-semibold text-foreground">1D & above</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Invest mode info */}
      {mode === 'invest' && !loading && !result && (
        <div className="rounded-2xl bg-card/50 border border-primary/15 p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🏦</span>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-1">Warren Buffett Mode</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Deep fundamental analysis inspired by Warren Buffett's investment philosophy. Evaluates economic moats, management quality,
                intrinsic value, and margin of safety. No chart upload needed — this mode focuses on business quality over price action.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[8px] px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold">🏰 Moat Analysis</span>
                <span className="text-[8px] px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold">📊 DCF Valuation</span>
                <span className="text-[8px] px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold">📈 1-10 Year Horizon</span>
                <span className="text-[8px] px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold">🛡️ Margin of Safety</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick symbols */}
      {!loading && !result && (
        <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-4">
          {(mode === 'invest'
            ? ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ASIANPAINT', 'NESTLEIND']
            : ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'TATAMOTORS']
          ).map(s => (
            <button key={s} onClick={() => setSymbol(s)}
              className="px-2 py-1 text-[8px] sm:text-[9px] bg-secondary/40 border border-border/20 rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Flow Timeline */}
      {(loading || result) && (
        <AgentFlowTimeline currentStep={currentStep} loading={loading} mode={result?.mode || mode} />
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <VerdictCard agents={result.agents} stockData={result.stockData} symbol={result.symbol} hasChartAnalysis={result.hasChartAnalysis} mode={result.mode} />

            {MODE_CONFIG[result.mode].steps.map((step, stepIdx) => (
              <div key={step.key}>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>{step.icon}</span> {step.label}
                  <span className="text-[8px] font-normal text-muted-foreground/50">— {step.agents.length} agent{step.agents.length > 1 ? 's' : ''}</span>
                </h3>
                <div className={`grid gap-2 ${step.agents.length >= 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : step.agents.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {step.agents.map((agentKey, idx) => {
                    const content = result.agents[agentKey];
                    if (!content) return null;
                    return (
                      <AgentReportCard
                        key={agentKey}
                        agentKey={agentKey}
                        content={content}
                        delay={stepIdx * 0.08 + idx * 0.03}
                        forceExpand={expandAll}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex justify-center pt-2">
              <button onClick={() => setExpandAll(!expandAll)} className="text-[10px] text-primary hover:underline font-medium">
                {expandAll ? 'Collapse All' : 'Expand All Reports'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && !result && <EmptyState onSelectSymbol={setSymbol} />}
    </div>
  );
}
