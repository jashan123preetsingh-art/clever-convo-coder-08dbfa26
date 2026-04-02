import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockApi } from '@/lib/api';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface ForexPair {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  prev_close: number;
}

const FOREX_PAIRS = [
  { yahoo: 'USDINR=X', display: 'USD/INR', name: 'US Dollar / Indian Rupee' },
  { yahoo: 'EURINR=X', display: 'EUR/INR', name: 'Euro / Indian Rupee' },
  { yahoo: 'GBPINR=X', display: 'GBP/INR', name: 'British Pound / Indian Rupee' },
  { yahoo: 'JPYINR=X', display: 'JPY/INR', name: 'Japanese Yen / Indian Rupee' },
  { yahoo: 'AEDINR=X', display: 'AED/INR', name: 'UAE Dirham / Indian Rupee' },
  { yahoo: 'SGDINR=X', display: 'SGD/INR', name: 'Singapore Dollar / Indian Rupee' },
  { yahoo: 'AUDINR=X', display: 'AUD/INR', name: 'Australian Dollar / Indian Rupee' },
  { yahoo: 'CADINR=X', display: 'CAD/INR', name: 'Canadian Dollar / Indian Rupee' },
  { yahoo: 'CHFINR=X', display: 'CHF/INR', name: 'Swiss Franc / Indian Rupee' },
  { yahoo: 'HKDINR=X', display: 'HKD/INR', name: 'Hong Kong Dollar / Indian Rupee' },
];

export default function Forex() {
  const { data: pairs, isLoading, refetch, isFetching } = useQuery<ForexPair[]>({
    queryKey: ['forex-pairs'],
    queryFn: () => stockApi.getForexPairs(),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const displayPairs = pairs && pairs.length > 0 ? pairs : FOREX_PAIRS.map(p => ({
    symbol: p.display, name: p.name, price: 0, change_pct: 0, prev_close: 0,
  }));

  return (
    <div className="p-3 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-foreground tracking-tight">Currency Rates</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Live exchange rates against Indian Rupee — auto-refresh every 30s</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/30 border border-border/20 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* USD/INR Spotlight */}
      {displayPairs.length > 0 && displayPairs[0].price > 0 && (
        <div className="bg-card border border-primary/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground font-semibold">SPOTLIGHT</span>
              <h2 className="text-2xl font-black text-foreground mt-1">{displayPairs[0].symbol}</h2>
              <p className="text-[10px] text-muted-foreground">{displayPairs[0].name}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-foreground">{displayPairs[0].price.toFixed(4)}</p>
              <div className={`flex items-center gap-1 justify-end text-sm font-bold ${displayPairs[0].change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {displayPairs[0].change_pct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {displayPairs[0].change_pct >= 0 ? '+' : ''}{displayPairs[0].change_pct.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INR Pairs Grid */}
      <div>
        <h3 className="text-[11px] font-bold text-muted-foreground mb-2">ALL INR PAIRS</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {displayPairs.map((pair, i) => (
            <div key={i} className="bg-card border border-border/30 rounded-xl p-3.5 hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-foreground">{pair.symbol}</span>
                {pair.price > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${pair.change_pct >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                    {pair.change_pct >= 0 ? '+' : ''}{pair.change_pct.toFixed(2)}%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate mb-1">{pair.name}</p>
              {pair.price > 0 ? (
                <p className="text-lg font-black text-foreground">₹{pair.price.toFixed(4)}</p>
              ) : (
                <div className="h-6 bg-secondary/30 rounded animate-pulse" />
              )}
              {pair.prev_close > 0 && (
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">Prev: ₹{pair.prev_close.toFixed(4)}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-[10px] text-muted-foreground">Loading currency data...</div>
      )}
    </div>
  );
}
