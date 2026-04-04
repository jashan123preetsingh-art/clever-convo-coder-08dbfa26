import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useBatchQuotes } from '@/hooks/useStockData';
import { formatCurrency, formatVolume } from '@/utils/format';
import DataBadge from './DataBadge';
import type { DataStatus } from '@/types/stock';

const FO_STOCKS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT',
  'AXISBANK', 'BAJFINANCE', 'MARUTI', 'TATAMOTORS', 'WIPRO',
  'TATASTEEL', 'ADANIENT', 'HINDALCO', 'JSWSTEEL', 'POWERGRID',
  'HCLTECH', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'M&M',
];

interface ActiveFOEntry {
  symbol: string;
  ltp: number;
  changePct: number;
  volume: number;
  interpretation: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

function getOIInterpretation(changePct: number, volume: number): { text: string; sentiment: 'bullish' | 'bearish' | 'neutral' } {
  if (changePct > 2 && volume > 500000) return { text: 'LONG BUILD', sentiment: 'bullish' };
  if (changePct > 1) return { text: 'FRESH BUYING', sentiment: 'bullish' };
  if (changePct < -2 && volume > 500000) return { text: 'LONG UNWINDING', sentiment: 'bearish' };
  if (changePct < -1) return { text: 'SELLING PRESSURE', sentiment: 'bearish' };
  if (volume > 1000000) return { text: 'HIGH ACTIVITY', sentiment: 'neutral' };
  return { text: 'RANGE BOUND', sentiment: 'neutral' };
}

const sentimentConfig = {
  bullish: { color: 'text-primary', bg: 'bg-primary/10', Icon: TrendingUp },
  bearish: { color: 'text-destructive', bg: 'bg-destructive/10', Icon: TrendingDown },
  neutral: { color: 'text-muted-foreground', bg: 'bg-muted/15', Icon: Minus },
};

const FORow = memo(function FORow({ entry, rank }: { entry: ActiveFOEntry; rank: number }) {
  const cfg = sentimentConfig[entry.sentiment];
  const Icon = cfg.Icon;

  return (
    <Link
      to={`/stock/${entry.symbol}`}
      className="flex items-center gap-2 sm:gap-3 py-2 px-3 sm:px-4 hover:bg-primary/[0.03] transition-all group"
    >
      <span className="text-[8px] text-muted-foreground/50 w-3 font-data font-bold flex-shrink-0">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">
            {entry.symbol}
          </span>
          <span className="text-[9px] font-data font-semibold text-foreground/80">
            {formatCurrency(entry.ltp)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[8px] text-muted-foreground/60">
            {formatVolume(entry.volume)} vol
          </span>
          <span className={`text-[8px] font-bold ${entry.changePct >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {entry.changePct >= 0 ? '+' : ''}{entry.changePct.toFixed(2)}%
          </span>
        </div>
      </div>
      <span className={`text-[7px] px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color} font-bold tracking-wider flex items-center gap-0.5 flex-shrink-0 whitespace-nowrap`}>
        <Icon className="w-2.5 h-2.5" />
        {entry.interpretation}
      </span>
    </Link>
  );
});

export default function MostActiveFO() {
  const { data: batchQuotes, isLoading } = useBatchQuotes(FO_STOCKS, { staleTime: 15_000, refetchInterval: 15_000 });

  const entries: ActiveFOEntry[] = useMemo(() => {
    if (!Array.isArray(batchQuotes)) return [];

    return batchQuotes
      .filter((q: any) => q?.data && q.symbol)
      .map((q: any) => {
        const d = q.data;
        const ltp = d.ltp ?? d.regularMarketPrice ?? 0;
        const changePct = d.change_pct ?? d.regularMarketChangePercent ?? 0;
        const volume = d.volume ?? d.regularMarketVolume ?? 0;
        const { text, sentiment } = getOIInterpretation(changePct, volume);

        return { symbol: q.symbol, ltp, changePct, volume, interpretation: text, sentiment };
      })
      .sort((a: ActiveFOEntry, b: ActiveFOEntry) => b.volume - a.volume)
      .slice(0, 10);
  }, [batchQuotes]);

  const status: DataStatus = isLoading ? 'loading' : entries.length > 0 ? 'live' : 'unavailable';

  return (
    <div className="col-span-1 sm:col-span-12 lg:col-span-6">
      <div className="rounded-xl bg-card/30 border border-border/10 overflow-hidden hover:border-border/20 transition-all">
        <div className="flex items-center justify-between px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-accent" />
            <span className="text-[11px] sm:text-xs font-black text-foreground tracking-tight">Most Active F&O</span>
            <DataBadge status={status} />
          </div>
          <Link to="/options" className="text-[8px] sm:text-[9px] font-semibold text-primary/40 hover:text-primary transition-colors">
            Options Desk →
          </Link>
        </div>

        {isLoading ? (
          <div className="px-4 pb-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/5">
            {entries.map((entry, i) => (
              <FORow key={entry.symbol} entry={entry} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
