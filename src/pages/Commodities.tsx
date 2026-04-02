import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { RefreshCw, Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles } from 'lucide-react';
import LiveRefreshBadge from '@/components/LiveRefreshBadge';
import { formatNumber } from '@/utils/format';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function fetchCommodityPrices() {
  const resp = await fetch(`${FUNCTIONS_URL}/commodity-prices`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!resp.ok) throw new Error('Failed to fetch commodity prices');
  return resp.json();
}

async function fetchCommodityAI(commodityData: any) {
  const resp = await fetch(`${FUNCTIONS_URL}/commodity-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ commodityData }),
  });
  if (!resp.ok) throw new Error('AI analysis failed');
  return resp.json();
}

type Category = 'all' | 'precious' | 'industrial' | 'energy';

const CATEGORY_LABELS: { key: Category; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🌐' },
  { key: 'precious', label: 'Precious Metals', icon: '✨' },
  { key: 'industrial', label: 'Industrial Metals', icon: '🔧' },
  { key: 'energy', label: 'Energy', icon: '⚡' },
];

const COMMODITY_ICONS: Record<string, string> = {
  gold: '🥇', silver: '🥈', platinum: '💎',
  crudeoil: '🛢️', brentcrude: '🛢️', naturalgas: '🔥',
  copper: '🟤', aluminium: '⬜',
};

function PriceChange({ change, changePct }: { change: number; changePct: number }) {
  const isUp = change >= 0;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
      isUp ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
    }`}>
      {isUp ? '+' : ''}{change.toFixed(2)} · {isUp ? '+' : ''}{changePct.toFixed(2)}%
    </span>
  );
}

function CommodityCard({ data }: { data: any }) {
  if (data.error) return null;

  const isUp = (data.change || 0) >= 0;
  const unitLabel = data.indiaUnit === 'g' ? '/ gram' :
                    data.indiaUnit === 'barrel' ? '/ barrel' :
                    data.indiaUnit === 'kg' ? '/ kg' :
                    `/ ${data.indiaUnit}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="t-card p-4 hover:border-border/30 transition-all group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{COMMODITY_ICONS[data.key] || '📊'}</span>
          <div>
            <h3 className="text-[12px] font-bold text-foreground">{data.name}</h3>
            <p className="text-[8px] text-muted-foreground font-data">{data.symbol}</p>
          </div>
        </div>
        <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent uppercase">
          {data.categoryLabel}
        </span>
      </div>

      {/* International Price */}
      <div className="mb-3">
        <p className={`text-2xl font-black tracking-tight ${isUp ? 'text-foreground' : 'text-foreground'}`}>
          ${formatNumber(data.price)}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[8px] text-muted-foreground">/ {data.intlUnit.toLowerCase()}</span>
          <PriceChange change={data.change} changePct={data.changePct} />
        </div>
      </div>

      {/* India Import Landed */}
      <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] text-primary uppercase tracking-wider font-semibold">
            ₹ {unitLabel.replace('/', '·').toUpperCase()} · INDIA IMPORT LANDED
          </span>
          <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
            {data.dutyLabel}
          </span>
        </div>

        {/* Gold purity */}
        {data.purity && data.key === 'gold' && (
          <div className="space-y-1.5">
            {Object.entries(data.purity as Record<string, number>).map(([label, price]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[9px] text-muted-foreground">{label} per gram</span>
                <span className="text-[13px] font-black text-primary font-data">₹{formatNumber(price)}/g</span>
              </div>
            ))}
          </div>
        )}

        {/* Silver purity */}
        {data.purity && data.key === 'silver' && (
          <div className="space-y-1.5">
            {Object.entries(data.purity as Record<string, number>).map(([label, price]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[9px] text-muted-foreground">{label} per gram</span>
                <span className="text-[13px] font-black text-primary font-data">₹{formatNumber(price)}/g</span>
              </div>
            ))}
          </div>
        )}

        {/* Non-purity commodities */}
        {!data.purity && (
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-muted-foreground">Per {data.indiaUnit}</span>
            <span className="text-xl font-black text-primary font-data">₹{formatNumber(data.landedPerUnit)}/{data.indiaUnit}</span>
          </div>
        )}
      </div>

      {/* 10g prices for gold */}
      {data.tenGram && data.key === 'gold' && (
        <div className="space-y-1.5 mb-3">
          {Object.entries(data.tenGram as Record<string, number>).map(([label, price]) => (
            <div key={label} className="flex justify-between items-center px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-[9px] text-primary font-bold">10g · {label}</span>
              <span className="text-[11px] font-black text-foreground font-data">₹{Number(price).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Per kg for gold */}
      {data.perKg && data.key === 'gold' && (
        <div className="space-y-1">
          {Object.entries(data.perKg as Record<string, number>).map(([label, price]) => (
            <div key={label} className="flex justify-between items-center text-[9px]">
              <span className="text-muted-foreground">Per kg · {label}</span>
              <span className="font-bold text-foreground font-data">₹{Number(price).toLocaleString('en-IN')}/kg</span>
            </div>
          ))}
        </div>
      )}

      {/* Per kg for silver */}
      {data.perKg && data.key === 'silver' && (
        <div className="space-y-1 mt-2">
          {Object.entries(data.perKg as Record<string, number>).map(([label, price]) => (
            <div key={label} className="flex justify-between items-center text-[9px]">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-bold text-foreground font-data">₹{Number(price).toLocaleString('en-IN')}/kg</span>
            </div>
          ))}
        </div>
      )}

      {/* Platinum 10g */}
      {data.tenGram && data.key === 'platinum' && (
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px]">
            <span className="text-muted-foreground">Per gram</span>
            <span className="font-bold text-foreground font-data">₹{formatNumber(data.tenGram.perGram)}/g</span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
            <span className="text-[9px] text-primary font-bold">10g</span>
            <span className="text-[11px] font-black text-foreground font-data">₹{Number(data.tenGram.per10g).toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}

      {/* Source + Time */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/10">
        <span className="text-[7px] text-muted-foreground/50">Source: Yahoo Finance ({data.yahooSymbol || data.symbol})</span>
      </div>
    </motion.div>
  );
}

export default function Commodities() {
  const [category, setCategory] = useState<Category>('all');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['commodity-prices'],
    queryFn: fetchCommodityPrices,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 2,
  });

  const filtered = useMemo(() => {
    if (!data?.commodities) return [];
    return Object.values(data.commodities).filter((c: any) =>
      category === 'all' || c.category === category
    );
  }, [data, category]);

  const timestamp = data?.timestamp
    ? new Date(data.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })
    : '';

  const { data: aiData, isLoading: aiLoading, refetch: aiRefetch } = useQuery({
    queryKey: ['commodity-ai'],
    queryFn: () => fetchCommodityAI(data?.commodities),
    enabled: !!data?.commodities,
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  });

  return (
    <div className="p-4 max-w-[1800px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-black text-foreground tracking-tight">Commodity Prices</h1>
            {data && (
              <span className="text-[8px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full text-primary bg-primary/10">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)] animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Live international prices · India Import Landed with customs duty · Auto-refreshes every 30s
            {data?.usdInr && (
              <span className="ml-2 text-accent font-bold">USD/INR: ₹{data.usdInr.rate}</span>
            )}
            {timestamp && <span className="ml-2 text-muted-foreground/50">· {timestamp} IST</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LiveRefreshBadge intervalSeconds={30} onRefresh={() => refetch()} isFetching={isFetching} />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5">
        {CATEGORY_LABELS.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
              category === cat.key
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-secondary text-muted-foreground border-border/20 hover:text-foreground'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="t-card p-4 animate-pulse">
              <div className="h-6 bg-secondary/50 rounded w-32 mb-3" />
              <div className="h-10 bg-secondary/50 rounded w-40 mb-3" />
              <div className="h-24 bg-secondary/30 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="t-card p-6 text-center">
          <p className="text-destructive text-sm font-bold mb-2">Failed to load commodity prices</p>
          <button onClick={() => refetch()} className="text-[10px] text-primary hover:underline">Try again</button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((commodity: any) => (
            <CommodityCard key={commodity.key} data={commodity} />
          ))}
        </div>
      )}

      {/* AI Market Analysis */}
      {!isLoading && !isError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="t-card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-accent" />
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-wider">AI Market Analysis</h3>
              {aiData?.cached && (
                <span className="text-[7px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">CACHED</span>
              )}
            </div>
            <button
              onClick={() => aiRefetch()}
              disabled={aiLoading}
              className="text-[8px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Sparkles size={10} />
              {aiLoading ? 'Analyzing…' : 'Refresh Analysis'}
            </button>
          </div>

          {aiLoading && (
            <div className="space-y-2 animate-pulse">
              <div className="h-5 bg-secondary/50 rounded w-48" />
              <div className="h-4 bg-secondary/40 rounded w-full" />
              <div className="h-4 bg-secondary/40 rounded w-3/4" />
            </div>
          )}

          {aiData?.analysis && !aiLoading && (() => {
            const a = aiData.analysis;
            const sentimentIcon = a.sentiment === 'bullish' ? <TrendingUp size={14} className="text-primary" /> :
                                  a.sentiment === 'bearish' ? <TrendingDown size={14} className="text-destructive" /> :
                                  <Minus size={14} className="text-muted-foreground" />;
            const sentimentColor = a.sentiment === 'bullish' ? 'text-primary' :
                                   a.sentiment === 'bearish' ? 'text-destructive' : 'text-muted-foreground';
            const riskColor = a.riskLevel === 'high' ? 'text-destructive' :
                              a.riskLevel === 'moderate' ? 'text-accent' : 'text-primary';

            return (
              <div className="space-y-3">
                {/* Headline + Sentiment */}
                <div className="flex items-center gap-2">
                  {sentimentIcon}
                  <span className={`text-[13px] font-black ${sentimentColor}`}>{a.headline}</span>
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    a.sentiment === 'bullish' ? 'bg-primary/10 text-primary' :
                    a.sentiment === 'bearish' ? 'bg-destructive/10 text-destructive' :
                    'bg-secondary text-muted-foreground'
                  }`}>{a.sentiment}</span>
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${riskColor}`}>
                    <AlertTriangle size={8} /> Risk: {a.riskLevel}
                  </span>
                </div>

                {/* Summary */}
                <p className="text-[10px] text-muted-foreground leading-relaxed">{a.summary}</p>

                {/* Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {a.keyInsights?.map((insight: string, i: number) => (
                    <div key={i} className="bg-secondary/30 rounded-lg p-2.5 border border-border/10">
                      <span className="text-[9px] text-foreground">{insight}</span>
                    </div>
                  ))}
                </div>

                {/* Outlooks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-accent/5 rounded-lg p-2.5 border border-accent/10">
                    <span className="text-[8px] font-bold text-accent uppercase">🥇 Gold Outlook</span>
                    <p className="text-[9px] text-foreground mt-1">{a.goldOutlook}</p>
                  </div>
                  <div className="bg-accent/5 rounded-lg p-2.5 border border-accent/10">
                    <span className="text-[8px] font-bold text-accent uppercase">⚡ Energy Outlook</span>
                    <p className="text-[9px] text-foreground mt-1">{a.energyOutlook}</p>
                  </div>
                </div>

                {/* Recommendation */}
                {a.recommendation && (
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/15">
                    <span className="text-[8px] font-bold text-primary uppercase">💡 Recommendation</span>
                    <p className="text-[10px] text-foreground mt-1 font-medium">{a.recommendation}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {!aiData && !aiLoading && (
            <p className="text-[9px] text-muted-foreground">AI analysis will load automatically with live data.</p>
          )}
        </motion.div>
      )}


      <div className="t-card p-4">
        <h3 className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-2">📐 Methodology</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[9px] text-muted-foreground">
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="font-bold text-foreground mb-1">Core Formula</p>
            <p className="font-data text-[8px]">India Landed = (Intl. Price ÷ Unit) × USD/INR × (1 + Duty%)</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="font-bold text-foreground mb-1">Gold & Silver</p>
            <p>Troy oz → grams (÷ 31.1035) × USD/INR × 1.06 (BCD 5% + AIDC 1%)</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="font-bold text-foreground mb-1">Energy & Industrial</p>
            <p>Crude: ~5% duty · Copper: 2.5% · Aluminium: 7.5% · Natural Gas: 2.5%</p>
          </div>
        </div>
        <p className="text-[7px] text-muted-foreground/50 mt-2">
          Prices are calculated from international COMEX/NYMEX benchmarks via Yahoo Finance, converted to INR via live forex. For illustrative purposes only — not actual MCX/NSE prices.
        </p>
      </div>
    </div>
  );
}
