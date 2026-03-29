import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { INDICES, getTopGainers, getTopLosers, getSectorPerformance, getAllStocks } from '@/data/mockData';
import { useIndices } from '@/hooks/useStockData';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function MarketBrief() {
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const { data: liveIndices } = useIndices();
  const indices = liveIndices?.length > 0 && !liveIndices[0]?.error ? liveIndices : INDICES;

  const generateBrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const allStocks = getAllStocks();
      const advances = allStocks.filter(s => s.change_pct > 0).length;
      const declines = allStocks.filter(s => s.change_pct < 0).length;
      const unchanged = allStocks.filter(s => s.change_pct === 0).length;

      const resp = await fetch(`${FUNCTIONS_URL}/market-brief`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          marketData: {
            indices,
            advances, declines, unchanged,
            gainers: getTopGainers().slice(0, 5),
            losers: getTopLosers().slice(0, 5),
            sectors: getSectorPerformance().slice(0, 8),
          },
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      setBrief(data);
      setExpanded(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const moodEmoji: Record<string, string> = {
    'Bullish': '🟢', 'Very Bullish': '🟢', 'BULLISH': '🟢',
    'Bearish': '🔴', 'Very Bearish': '🔴', 'BEARISH': '🔴',
    'Cautious': '🟡', 'CAUTIOUS': '🟡',
    'Euphoric': '🚀', 'EUPHORIC': '🚀',
    'Fearful': '😰', 'FEARFUL': '😰',
    'Neutral': '⚪', 'NEUTRAL': '⚪',
  };

  if (!brief && !loading) {
    return (
      <motion.div whileHover={{ scale: 1.01 }}
        className="t-card p-4 cursor-pointer group hover:border-primary/30 transition-all"
        onClick={generateBrief}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-foreground">AI Market Brief</p>
              <p className="text-[8px] text-muted-foreground">Click to generate today's AI-powered market narrative</p>
            </div>
          </div>
          <span className="text-[9px] font-bold text-primary group-hover:translate-x-1 transition-transform">Generate →</span>
        </div>
        {error && <p className="text-[9px] text-destructive mt-2">⚠ {error}</p>}
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="t-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div>
            <p className="text-[11px] font-bold text-foreground">Generating AI Market Brief...</p>
            <p className="text-[8px] text-muted-foreground">Analyzing live market data with AI</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
        className="t-card overflow-hidden">
        {/* Header */}
        <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">{moodEmoji[brief?.market_mood] || '📊'}</span>
              <div>
                <p className="text-[12px] font-bold text-foreground">{brief?.headline || 'Market Brief'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${
                    (brief?.mood_score || 5) >= 6 ? 'bg-primary/10 text-primary' :
                    (brief?.mood_score || 5) >= 4 ? 'bg-accent/10 text-accent' :
                    'bg-destructive/10 text-destructive'}`}>
                    {brief?.market_mood} • {brief?.mood_score}/10
                  </span>
                  <span className="text-[8px] text-muted-foreground">AI Generated</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); generateBrief(); }}
                className="text-[8px] text-primary hover:underline">Refresh</button>
              <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && brief && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            className="border-t border-border/40">
            {/* Summary */}
            <div className="px-4 py-3">
              <p className="text-[10px] text-foreground leading-relaxed">{brief.summary}</p>
            </div>

            {/* Key Observations */}
            <div className="px-4 pb-3">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Key Observations</p>
              <div className="space-y-1">
                {brief.key_observations?.map((obs: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-primary text-[8px] mt-0.5">▸</span>
                    <p className="text-[9px] text-foreground leading-relaxed">{obs}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid: Levels + Sectors + Trade Idea */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/30">
              {/* Levels */}
              <div className="bg-card p-3">
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">📐 Levels to Watch</p>
                <div className="space-y-1.5 text-[9px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nifty Support</span>
                    <span className="text-primary font-bold font-data">{brief.levels_to_watch?.nifty_support}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nifty Resistance</span>
                    <span className="text-destructive font-bold font-data">{brief.levels_to_watch?.nifty_resistance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BankNifty Support</span>
                    <span className="text-primary font-bold font-data">{brief.levels_to_watch?.banknifty_support}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BankNifty Resistance</span>
                    <span className="text-destructive font-bold font-data">{brief.levels_to_watch?.banknifty_resistance}</span>
                  </div>
                </div>
              </div>

              {/* Sector Spotlight */}
              <div className="bg-card p-3">
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">◫ Sector Spotlight</p>
                <div className="space-y-2 text-[9px]">
                  <div>
                    <p className="text-primary font-semibold">🏆 {brief.sector_spotlight?.winner}</p>
                    <p className="text-muted-foreground text-[8px]">{brief.sector_spotlight?.winner_reason}</p>
                  </div>
                  <div>
                    <p className="text-destructive font-semibold">⚠ {brief.sector_spotlight?.laggard}</p>
                    <p className="text-muted-foreground text-[8px]">{brief.sector_spotlight?.laggard_reason}</p>
                  </div>
                </div>
              </div>

              {/* Trade Idea */}
              <div className="bg-card p-3">
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">💡 Trade Idea</p>
                <div className="text-[9px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-foreground">{brief.trading_idea?.stock}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                      brief.trading_idea?.direction === 'Long' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      {brief.trading_idea?.direction}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[8px]">{brief.trading_idea?.rationale}</p>
                </div>
              </div>
            </div>

            {/* Outlook */}
            <div className="px-4 py-3 bg-secondary/20">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">🔮 Outlook</p>
              <p className="text-[9px] text-foreground leading-relaxed">{brief.outlook}</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
