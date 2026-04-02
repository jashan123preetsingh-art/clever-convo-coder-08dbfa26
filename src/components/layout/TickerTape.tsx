import React, { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockApi } from '@/lib/api';

interface GlobalTicker {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
}

function TickerTape() {
  const { data: tickers } = useQuery<GlobalTicker[]>({
    queryKey: ['global-tickers'],
    queryFn: () => stockApi.getGlobalIndices(),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const items = tickers && tickers.length > 0 ? tickers : [
    { symbol: 'DOW', name: 'Dow Jones', price: 0, change_pct: 0 },
    { symbol: 'S&P 500', name: 'S&P 500', price: 0, change_pct: 0 },
    { symbol: 'NASDAQ', name: 'NASDAQ', price: 0, change_pct: 0 },
    { symbol: 'FTSE', name: 'FTSE 100', price: 0, change_pct: 0 },
    { symbol: 'NIKKEI', name: 'Nikkei 225', price: 0, change_pct: 0 },
    { symbol: 'USD/INR', name: 'USD/INR', price: 0, change_pct: 0 },
    { symbol: 'BTC', name: 'Bitcoin', price: 0, change_pct: 0 },
  ];

  // Double up for seamless scroll
  const doubled = [...items, ...items];

  return (
    <div className="h-7 bg-card/60 border-b border-border/10 overflow-hidden relative flex-shrink-0">
      <div className="ticker-scroll flex items-center h-full gap-8 whitespace-nowrap">
        {doubled.map((t, i) => (
          <div key={`${t.symbol}-${i}`} className="flex items-center gap-1.5 font-data text-[10px] flex-shrink-0">
            <span className="text-muted-foreground/70 font-semibold">{t.symbol}</span>
            {t.price > 0 ? (
              <>
                <span className="text-foreground font-bold">
                  {t.price > 10000 ? t.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : t.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
                <span className={`font-bold ${t.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {t.change_pct >= 0 ? '▲' : '▼'}{Math.abs(t.change_pct).toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(TickerTape);
