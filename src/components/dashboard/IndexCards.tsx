import React, { memo } from 'react';
import { formatPercent } from '@/utils/format';
import DataBadge from './DataBadge';
import type { IndexData, DataStatus } from '@/types/stock';
import { isMarketHours } from '@/utils/marketHours';

interface IndexCardProps {
  idx: IndexData;
  isLive: boolean;
}

const IndexCard = memo(function IndexCard({ idx, isLive }: IndexCardProps) {
  const isUp = (idx.change_pct || 0) >= 0;
  const marketOpen = isMarketHours();
  const displayStatus: DataStatus = isLive ? (marketOpen ? 'live' : 'market-closed') : 'unavailable';
  const range = idx.high > idx.low ? ((idx.ltp - idx.low) / (idx.high - idx.low)) * 100 : 50;
  const clampedRange = Math.min(Math.max(range, 0), 100);

  return (
    <div className="rounded-xl bg-card/40 border border-border/10 p-4 sm:p-5 hover:border-border/25 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 font-bold tracking-wide">{idx.symbol}</span>
          <DataBadge status={displayStatus} />
        </div>
        <span className={`text-[8px] px-2 py-0.5 rounded-md font-bold ${
          isUp ? 'bg-primary/8 text-primary' : 'bg-destructive/8 text-destructive'}`}>
          {isUp ? '▲ BULL' : '▼ BEAR'}
        </span>
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="text-2xl sm:text-3xl font-black text-foreground font-data tracking-tighter">
          {Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
        <span className={`text-xs sm:text-sm font-bold font-data ${isUp ? 'text-primary' : 'text-destructive'}`}>
          {formatPercent(idx.change_pct)}
        </span>
      </div>
      <div className="mt-3 sm:mt-4">
        <div className="flex justify-between text-[8px] text-muted-foreground/35 mb-1.5 font-data">
          <span>L: {Number(idx.low).toLocaleString('en-IN')}</span>
          <span>H: {Number(idx.high).toLocaleString('en-IN')}</span>
        </div>
        <div className="h-1 bg-secondary/30 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-destructive/30 via-accent/20 to-primary/30 rounded-full" />
          {idx.high > idx.low && (
            <div
              className="absolute top-1/2 w-1.5 h-1.5 rounded-full bg-foreground shadow-md -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${clampedRange}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
});

interface IndexCardsProps {
  indices: IndexData[];
  hasLiveData: boolean;
}

export default function IndexCards({ indices, hasLiveData }: IndexCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
      {indices.map((idx) => (
        <IndexCard key={idx.symbol} idx={idx} isLive={hasLiveData} />
      ))}
    </div>
  );
}
