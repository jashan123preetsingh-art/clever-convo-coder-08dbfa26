import React, { memo, useMemo } from 'react';
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { useIndicesWithFallback } from '@/hooks/useIndicesWithFallback';
import { useMarketMetrics } from '@/hooks/useStockData';
import DataBadge from './DataBadge';
import type { DataStatus } from '@/types/stock';

interface FuturesEntry {
  name: string;
  spotPrice: number;
  futuresPrice: number;
  premium: number;
  premiumPct: number;
  daysToExpiry: number | string;
}

const FuturesCard = memo(function FuturesCard({ entry }: { entry: FuturesEntry }) {
  const isPremium = entry.premium >= 0;
  const label = isPremium ? 'PREMIUM' : 'DISCOUNT';

  return (
    <div className="rounded-xl bg-card/40 border border-border/10 p-3 sm:p-4 hover:border-border/25 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] sm:text-[11px] font-black text-foreground">{entry.name}</span>
        <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-bold tracking-wider flex items-center gap-0.5
          ${isPremium ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
          {isPremium ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[7px] text-muted-foreground/60 uppercase tracking-wider font-bold mb-0.5">Spot</p>
          <p className="text-[11px] sm:text-xs font-bold font-data text-foreground">
            ₹{entry.spotPrice.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
          </p>
        </div>
        <div>
          <p className="text-[7px] text-muted-foreground/60 uppercase tracking-wider font-bold mb-0.5">Futures Est.</p>
          <p className="text-[11px] sm:text-xs font-bold font-data text-foreground/80">
            ₹{entry.futuresPrice.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
          </p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-border/5 flex items-center justify-between">
        <div>
          <span className={`text-sm sm:text-base font-black font-data ${isPremium ? 'text-primary' : 'text-destructive'}`}>
            {isPremium ? '+' : ''}{entry.premium.toFixed(1)}
          </span>
          <span className={`text-[9px] font-bold ml-1 ${isPremium ? 'text-primary/60' : 'text-destructive/60'}`}>
            ({isPremium ? '+' : ''}{entry.premiumPct.toFixed(3)}%)
          </span>
        </div>
        <span className="text-[8px] text-muted-foreground/50 font-data">
          {entry.daysToExpiry} DTE
        </span>
      </div>
    </div>
  );
});

export default function FuturesPremium() {
  const { indices, hasLiveData } = useIndicesWithFallback();
  const { data: marketMetrics, isLoading } = useMarketMetrics();

  const entries: FuturesEntry[] = useMemo(() => {
    const nifty = indices.find((i) => i.symbol === 'NIFTY 50');
    const bnf = indices.find((i) => i.symbol === 'BANKNIFTY' || i.symbol === 'NIFTY BANK');
    const dte = marketMetrics?.daysToExpiry ?? '—';
    const result: FuturesEntry[] = [];

    if (nifty?.ltp) {
      // Estimate futures premium based on cost-of-carry model
      const riskFreeRate = 0.07; // ~7% annual
      const dteNum = typeof dte === 'number' ? dte : 7;
      const theoreticalPremium = nifty.ltp * riskFreeRate * (dteNum / 365);
      const spotPrice = nifty.ltp;
      const futuresPrice = spotPrice + theoreticalPremium;
      const premium = futuresPrice - spotPrice;

      result.push({
        name: 'NIFTY 50',
        spotPrice,
        futuresPrice,
        premium,
        premiumPct: (premium / spotPrice) * 100,
        daysToExpiry: dte,
      });
    }

    if (bnf?.ltp) {
      const dteNum = typeof dte === 'number' ? dte : 7;
      const theoreticalPremium = bnf.ltp * 0.07 * (dteNum / 365);
      const spotPrice = bnf.ltp;
      const futuresPrice = spotPrice + theoreticalPremium;
      const premium = futuresPrice - spotPrice;

      result.push({
        name: 'BANKNIFTY',
        spotPrice,
        futuresPrice,
        premium,
        premiumPct: (premium / spotPrice) * 100,
        daysToExpiry: dte,
      });
    }

    return result;
  }, [indices, marketMetrics]);

  const status: DataStatus = isLoading ? 'loading' : entries.length > 0 ? (hasLiveData ? 'live' : 'delayed') : 'unavailable';

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <ArrowUpDown className="w-3.5 h-3.5 text-accent" />
        <p className="text-[8px] sm:text-[9px] text-muted-foreground/70 font-bold uppercase tracking-[0.15em]">
          Futures Premium / Discount
        </p>
        <DataBadge status={status} />
        <span className="text-[7px] text-muted-foreground/40 italic ml-auto">Cost-of-carry model</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entries.length > 0 ? (
          entries.map((entry) => <FuturesCard key={entry.name} entry={entry} />)
        ) : (
          <div className="col-span-2 text-center text-[10px] text-muted-foreground/50 py-4">
            {isLoading ? 'Loading futures data...' : 'No index data available'}
          </div>
        )}
      </div>
    </div>
  );
}
