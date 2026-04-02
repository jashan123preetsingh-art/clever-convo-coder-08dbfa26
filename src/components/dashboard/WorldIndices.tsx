import React, { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockApi } from '@/lib/api';
import { TrendingUp, TrendingDown, Globe } from 'lucide-react';

interface GlobalTicker {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
}

function WorldIndices() {
  const { data: tickers, isLoading } = useQuery<GlobalTicker[]>({
    queryKey: ['global-tickers'],
    queryFn: () => stockApi.getGlobalIndices(),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const items = tickers && tickers.length > 0 ? tickers : [];

  if (isLoading && items.length === 0) {
    return (
      <div className="rounded-2xl bg-card/40 border border-border/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">World Indices</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-16 bg-secondary/20 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-card/40 border border-border/10 p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-[hsl(var(--terminal-blue))]/10 flex items-center justify-center">
          <Globe className="w-3.5 h-3.5 text-[hsl(var(--terminal-blue))]" />
        </div>
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">World Indices</h3>
        <span className="ml-auto text-[8px] text-muted-foreground/40 font-data">
          Auto-refresh 30s
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {items.map((t) => {
          const isUp = t.change_pct >= 0;
          return (
            <div
              key={t.symbol}
              className={`rounded-xl border p-2.5 transition-colors hover:border-border/30 ${
                isUp ? 'border-primary/10 bg-primary/[0.03]' : 'border-destructive/10 bg-destructive/[0.03]'
              }`}
            >
              <p className="text-[8px] font-bold text-muted-foreground/70 uppercase tracking-wider truncate mb-1">
                {t.symbol}
              </p>
              <p className="text-[12px] font-black text-foreground font-data leading-tight">
                {t.price > 10000
                  ? t.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  : t.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
              <div className={`flex items-center gap-0.5 mt-1 ${isUp ? 'text-primary' : 'text-destructive'}`}>
                {isUp ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5" />
                )}
                <span className="text-[9px] font-bold font-data">
                  {isUp ? '+' : ''}{t.change_pct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(WorldIndices);
