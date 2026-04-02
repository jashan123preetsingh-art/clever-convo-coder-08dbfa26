import React, { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockApi } from '@/lib/api';
import { Globe, RefreshCw } from 'lucide-react';

interface GlobalTicker {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
}

function WorldIndices() {
  const { data: tickers, isLoading, dataUpdatedAt } = useQuery<GlobalTicker[]>({
    queryKey: ['global-tickers'],
    queryFn: () => stockApi.getGlobalIndices(),
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: 1,
  });

  const items = tickers && tickers.length > 0 ? tickers : [];

  if (isLoading && items.length === 0) {
    return (
      <div className="rounded-xl bg-card/40 border border-border/10 px-3 py-2.5">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-3 h-3 text-muted-foreground" />
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">World Indices</span>
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-10 w-28 bg-secondary/20 rounded-lg animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  const updatedTime = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })
    : '';

  return (
    <div className="rounded-xl bg-card/40 border border-border/10 px-3 py-2.5 overflow-hidden">
      <div className="flex items-center gap-1.5 mb-2">
        <Globe className="w-3 h-3 text-muted-foreground/60" />
        <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider">World Indices</span>
        <div className="ml-auto flex items-center gap-1 text-[7px] text-muted-foreground/40 font-data">
          <RefreshCw className="w-2 h-2 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Live · {updatedTime}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {items.map((t) => {
          const isUp = t.change_pct >= 0;
          return (
            <div
              key={t.symbol}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/10 bg-card/30 whitespace-nowrap min-w-fit hover:border-border/20 transition-all"
            >
              <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">{t.symbol}</span>
              <span className="text-[10px] font-black text-foreground font-data">
                {t.price > 10000
                  ? t.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  : t.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
              <span className={`text-[8px] font-bold font-data ${isUp ? 'text-primary' : 'text-destructive'}`}>
                {isUp ? '▲' : '▼'} {t.change_pct >= 0 ? '+' : ''}{t.change_pct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(WorldIndices);
