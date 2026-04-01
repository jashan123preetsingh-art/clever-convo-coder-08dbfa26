import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatMarketCap } from '@/utils/format';

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-3 border border-border/30 hover:border-border/60 transition-all group">
      <p className="text-[9px] text-muted-foreground mb-1 uppercase tracking-[0.1em] font-medium">{label}</p>
      <p className={`text-sm font-bold font-data ${color || 'text-foreground'}`}>{value || '—'}</p>
      {sub && <p className="text-[8px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <h3 className="text-[11px] font-bold text-foreground mb-3 flex items-center gap-2 tracking-wide">
      {icon && <span className="text-sm">{icon}</span>}
      <span>{children}</span>
      <span className="flex-1 h-px bg-border/30" />
    </h3>
  );
}

export default function AIFundamentalsPanel({ symbol, quote, technicals, partialFundamentals }: { symbol: string; quote: any; technicals: any; partialFundamentals: any }) {
  const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const { data: aiData, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-fundamentals', symbol],
    queryFn: async () => {
      const resp = await fetch(`${FUNCTIONS_URL}/ai-fundamentals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ symbol, quote, technicals, partialFundamentals }),
      });
      if (resp.status === 429) throw new Error('Rate limited. Please try again shortly.');
      if (resp.status === 402) throw new Error('AI credits exhausted. Please add funds.');
      if (!resp.ok) throw new Error('Failed to fetch AI analysis');
      return resp.json();
    },
    staleTime: 600_000,
    retry: 1,
    enabled: !!symbol,
  });

  if (isLoading) {
    return (
      <div className="t-card p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[hsl(var(--terminal-cyan)/0.3)] border-t-[hsl(var(--terminal-cyan))] rounded-full animate-spin" />
          <p className="text-[hsl(var(--terminal-cyan))] text-sm font-medium">🤖 AI Fundamental Agent analyzing {symbol}...</p>
          <p className="text-[10px] text-muted-foreground">Evaluating valuation, profitability, growth, health & risks</p>
        </div>
      </div>
    );
  }

  if (error || aiData?.error) {
    return (
      <div className="t-card p-8 text-center space-y-3">
        <p className="text-destructive text-sm">⚠️ {(error as Error)?.message || aiData?.error}</p>
        <button onClick={() => refetch()} className="px-4 py-2 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all">
          🔄 Retry Analysis
        </button>
      </div>
    );
  }

  if (!aiData) return null;

  const verdictColor: Record<string, string> = {
    'STRONG BUY': 'text-primary bg-primary/10 border-primary/25',
    'BUY': 'text-primary bg-primary/8 border-primary/20',
    'HOLD': 'text-accent bg-accent/8 border-accent/20',
    'SELL': 'text-destructive bg-destructive/8 border-destructive/20',
    'STRONG SELL': 'text-destructive bg-destructive/10 border-destructive/25',
  };

  const scoreColor = (s: number) => s >= 7 ? 'text-primary' : s >= 5 ? 'text-accent' : 'text-destructive';
  const scoreBg = (s: number) => s >= 7 ? 'bg-primary' : s >= 5 ? 'bg-accent' : 'bg-destructive';

  return (
    <div className="space-y-4">
      {/* Verdict Banner */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        className={`t-card p-5 border-2 ${verdictColor[aiData.verdict] || 'border-border'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-3xl font-black">{aiData.verdict === 'STRONG BUY' || aiData.verdict === 'BUY' ? '🟢' : aiData.verdict === 'HOLD' ? '🟡' : '🔴'}</span>
            <div>
              <p className={`text-xl font-black ${verdictColor[aiData.verdict]?.split(' ')[0] || 'text-foreground'}`}>{aiData.verdict}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">AI Confidence: {aiData.confidence}%</p>
            </div>
          </div>
          {aiData.target_range && (
            <div className="text-right font-data">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Target Range</p>
              <p className="text-sm font-bold text-foreground">
                ₹{aiData.target_range.low} — <span className="text-primary">₹{aiData.target_range.mid}</span> — ₹{aiData.target_range.high}
              </p>
            </div>
          )}
        </div>
        <p className="text-[11px] text-foreground/80 mt-3 leading-relaxed">{aiData.summary}</p>
      </motion.div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { key: 'valuation', icon: '💰', label: 'Valuation' },
          { key: 'profitability', icon: '📈', label: 'Profitability' },
          { key: 'growth', icon: '🚀', label: 'Growth' },
          { key: 'financial_health', icon: '🏥', label: 'Financial Health' },
          { key: 'dividend', icon: '💵', label: 'Dividends' },
        ].map(({ key, icon, label }) => {
          const section = aiData[key];
          if (!section) return null;
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="t-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{icon}</span>
                <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{label}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-2xl font-black font-data ${scoreColor(section.score)}`}>{section.score}</span>
                <span className="text-[9px] text-muted-foreground">/10</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                <motion.div initial={{ width: 0 }} animate={{ width: `${section.score * 10}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`h-full rounded-full ${scoreBg(section.score)}`} />
              </div>
              <p className={`text-[9px] font-bold mb-1 ${scoreColor(section.score)}`}>{section.assessment}</p>
              <p className="text-[8px] text-muted-foreground leading-relaxed">{section.reasoning}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Risks & Catalysts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {aiData.risks?.length > 0 && (
          <div className="t-card p-4">
            <SectionTitle icon="⚠️">Key Risks</SectionTitle>
            <div className="space-y-2">
              {aiData.risks.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <span className="text-destructive mt-0.5 shrink-0">●</span>
                  <span className="text-foreground/80 leading-relaxed">{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {aiData.catalysts?.length > 0 && (
          <div className="t-card p-4">
            <SectionTitle icon="🚀">Growth Catalysts</SectionTitle>
            <div className="space-y-2">
              {aiData.catalysts.map((c: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <span className="text-primary mt-0.5 shrink-0">●</span>
                  <span className="text-foreground/80 leading-relaxed">{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sector Outlook */}
      {aiData.sector_outlook && (
        <div className="t-card p-4">
          <SectionTitle icon="🏭">Sector Outlook</SectionTitle>
          <p className="text-[10px] text-foreground/80 leading-relaxed">{aiData.sector_outlook}</p>
        </div>
      )}

      {/* Available Metrics */}
      {partialFundamentals && Object.values(partialFundamentals).some((v: any) => v != null) && (
        <div className="t-card p-4">
          <SectionTitle icon="📊">Available Data Points</SectionTitle>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {partialFundamentals.pe_ratio != null && <MetricCard label="P/E Ratio" value={partialFundamentals.pe_ratio.toFixed(1)} />}
            {partialFundamentals.roe != null && <MetricCard label="ROE" value={`${partialFundamentals.roe.toFixed(1)}%`} color={(partialFundamentals.roe || 0) >= 15 ? 'text-primary' : undefined} />}
            {partialFundamentals.debt_to_equity != null && <MetricCard label="D/E" value={partialFundamentals.debt_to_equity.toFixed(2)} color={(partialFundamentals.debt_to_equity || 0) <= 0.5 ? 'text-primary' : (partialFundamentals.debt_to_equity || 0) > 1.5 ? 'text-destructive' : undefined} />}
            {partialFundamentals.dividend_yield != null && <MetricCard label="Div Yield" value={`${partialFundamentals.dividend_yield.toFixed(2)}%`} />}
            {partialFundamentals.pb_ratio != null && <MetricCard label="P/B" value={partialFundamentals.pb_ratio.toFixed(2)} />}
            {partialFundamentals.beta != null && <MetricCard label="Beta" value={partialFundamentals.beta.toFixed(2)} />}
            {partialFundamentals.profit_margins != null && <MetricCard label="Profit Margin" value={`${partialFundamentals.profit_margins.toFixed(1)}%`} />}
            {partialFundamentals.market_cap != null && <MetricCard label="Market Cap" value={formatMarketCap(partialFundamentals.market_cap)} />}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[8px] text-muted-foreground px-1">
        <span>🤖 Powered by AI Fundamental Agent · Analysis may not be 100% accurate</span>
        <button onClick={() => refetch()} className="text-primary hover:underline">↻ Refresh</button>
      </div>
    </div>
  );
}
