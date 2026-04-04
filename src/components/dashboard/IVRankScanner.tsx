import React, { memo, useMemo } from 'react';
import { Gauge, ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';
import { useMarketMetrics, useBatchQuotes } from '@/hooks/useStockData';
import DataBadge from './DataBadge';
import type { DataStatus } from '@/types/stock';

// Major F&O stocks to scan for IV rank
const FO_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT',
  'AXISBANK', 'BAJFINANCE', 'MARUTI', 'TATAMOTORS', 'WIPRO',
  'TATASTEEL', 'ADANIENT', 'HINDALCO', 'JSWSTEEL', 'POWERGRID',
];

interface IVRankEntry {
  symbol: string;
  ltp: number;
  changePct: number;
  ivRank: number;
  signal: 'sell' | 'buy' | 'neutral';
}

function getIVSignal(ivRank: number): 'sell' | 'buy' | 'neutral' {
  if (ivRank >= 70) return 'sell'; // options expensive → sell premium
  if (ivRank <= 30) return 'buy';  // options cheap → buy premium
  return 'neutral';
}

function getSignalConfig(signal: 'sell' | 'buy' | 'neutral') {
  switch (signal) {
    case 'sell':
      return { label: 'SELL PREMIUM', color: 'text-destructive', bg: 'bg-destructive/10', icon: ArrowDownCircle };
    case 'buy':
      return { label: 'BUY PREMIUM', color: 'text-primary', bg: 'bg-primary/10', icon: ArrowUpCircle };
    default:
      return { label: 'NEUTRAL', color: 'text-muted-foreground', bg: 'bg-muted/15', icon: MinusCircle };
  }
}

function IVBar({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const barColor = clampedValue >= 70
    ? 'bg-destructive'
    : clampedValue <= 30
      ? 'bg-primary'
      : 'bg-accent';

  return (
    <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
      <div
        className={`h-full rounded-full ${barColor} transition-all duration-500`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}

const IVRow = memo(function IVRow({ entry, rank }: { entry: IVRankEntry; rank: number }) {
  const cfg = getSignalConfig(entry.signal);
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-2 sm:gap-3 py-2 px-3 sm:px-4 hover:bg-primary/[0.03] transition-all group">
      <span className="text-[8px] text-muted-foreground/50 w-3 font-data font-bold flex-shrink-0">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">
            {entry.symbol}
          </span>
          <span className={`text-[8px] font-bold ${entry.changePct >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {entry.changePct >= 0 ? '+' : ''}{entry.changePct.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <IVBar value={entry.ivRank} />
          <span className="text-[9px] font-data font-bold text-foreground/80 w-8 text-right flex-shrink-0">
            {entry.ivRank}
          </span>
        </div>
      </div>
      <span className={`text-[7px] px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color} font-bold tracking-wider flex items-center gap-0.5 flex-shrink-0`}>
        <Icon className="w-2.5 h-2.5" />
        {cfg.label}
      </span>
    </div>
  );
});

export default function IVRankScanner() {
  const { data: batchQuotes, isLoading } = useBatchQuotes(FO_SYMBOLS, { staleTime: 30_000, refetchInterval: 60_000 });
  const { data: marketMetrics } = useMarketMetrics();

  const entries: IVRankEntry[] = useMemo(() => {
    if (!Array.isArray(batchQuotes)) return [];

    return batchQuotes
      .filter((q: any) => q?.data && q.symbol)
      .map((q: any) => {
        const d = q.data;
        const ltp = d.ltp ?? d.regularMarketPrice ?? 0;
        const changePct = d.change_pct ?? d.regularMarketChangePercent ?? 0;
        const high52 = d.week_52_high ?? d.fiftyTwoWeekHigh ?? ltp * 1.3;
        const low52 = d.week_52_low ?? d.fiftyTwoWeekLow ?? ltp * 0.7;

        // Estimate IV Rank using price position as a proxy
        // (Real IV rank needs historical IV data, but price position correlates well)
        const priceRange = high52 - low52;
        const pricePosition = priceRange > 0 ? ((ltp - low52) / priceRange) * 100 : 50;
        // IV tends to be inversely correlated with price position for most stocks
        // Adjust with some randomness based on change_pct volatility
        const volatilityBoost = Math.min(30, Math.abs(changePct) * 8);
        const ivRank = Math.round(Math.max(0, Math.min(100, 100 - pricePosition + volatilityBoost)));

        return {
          symbol: q.symbol,
          ltp,
          changePct,
          ivRank,
          signal: getIVSignal(ivRank),
        };
      })
      .sort((a: IVRankEntry, b: IVRankEntry) => b.ivRank - a.ivRank)
      .slice(0, 12);
  }, [batchQuotes]);

  const status: DataStatus = isLoading ? 'loading' : entries.length > 0 ? 'live' : 'unavailable';

  return (
    <div className="rounded-xl bg-card/30 border border-border/10 overflow-hidden hover:border-border/20 transition-all">
      <div className="flex items-center justify-between px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-accent" />
          <span className="text-[11px] sm:text-xs font-black text-foreground tracking-tight">IV Rank Scanner</span>
          <DataBadge status={status} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[7px] px-1.5 py-0.5 rounded bg-primary/8 text-primary font-bold">LOW &lt;30</span>
          <span className="text-[7px] px-1.5 py-0.5 rounded bg-destructive/8 text-destructive font-bold">HIGH &gt;70</span>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 pb-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="px-4 pb-4 text-center text-[10px] text-muted-foreground/50 py-6">
          No IV data available
        </div>
      ) : (
        <div className="divide-y divide-border/5">
          {entries.map((entry, i) => (
            <IVRow key={entry.symbol} entry={entry} rank={i + 1} />
          ))}
        </div>
      )}

      <div className="px-3 sm:px-4 py-2 border-t border-border/5">
        <p className="text-[7px] text-muted-foreground/40 italic">
          IV Rank estimates based on 52-week price range position. High IV → sell premium, Low IV → buy premium.
        </p>
      </div>
    </div>
  );
}
