import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { forwardRef } from 'react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useBatchQuotes } from '@/hooks/useStockData';
import { formatCurrency, formatPercent } from '@/utils/format';
import { getStock } from '@/data/mockData';

export default function WatchlistWidget() {
  const { watchlist, isLoading, remove } = useWatchlist();
  const { data: liveQuotes } = useBatchQuotes(watchlist.map(w => w.symbol));

  if (isLoading) {
    return (
      <div className="t-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">⭐</span>
          <span className="text-[11px] font-bold text-foreground">My Watchlist</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-secondary/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="t-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">⭐</span>
          <span className="text-[11px] font-bold text-foreground">My Watchlist</span>
        </div>
        <div className="py-6 text-center">
          <p className="text-[10px] text-muted-foreground">No stocks in your watchlist yet</p>
          <p className="text-[9px] text-muted-foreground/70 mt-1">Click ★ on any stock to add it here</p>
        </div>
      </div>
    );
  }

  const quotesMap = new Map<string, any>();
  if (Array.isArray(liveQuotes)) {
    for (const q of liveQuotes) quotesMap.set(q.symbol, q);
  }

  return (
    <div className="t-card overflow-hidden">
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">⭐</span>
          <span className="text-[11px] font-bold text-foreground tracking-wide">My Watchlist</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{watchlist.length}</span>
        </div>
      </div>
      <AnimatePresence>
        {watchlist.map((item, i) => {
          const live = quotesMap.get(item.symbol);
          const mock = getStock(item.symbol);
          const ltp = live?.ltp || mock?.ltp || 0;
          const changePct = live?.change_pct || mock?.change_pct || 0;
          const addedPrice = item.added_price;
          const pnlPct = addedPrice ? ((ltp - addedPrice) / addedPrice) * 100 : null;

          return (
            <motion.div key={item.symbol} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between py-2 px-3.5 hover:bg-secondary/40 transition-all border-b border-border/10 last:border-0 group">
              <Link to={`/stock/${item.symbol}`} className="flex items-center gap-2.5 flex-1 min-w-0">
                <div>
                  <p className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors">{item.symbol}</p>
                  {addedPrice && (
                    <p className="text-[8px] text-muted-foreground">
                      Avg: {formatCurrency(addedPrice)}
                      {pnlPct !== null && (
                        <span className={`ml-1 font-bold ${pnlPct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <div className="text-right font-data">
                  <p className="text-[10px] text-foreground font-medium">{formatCurrency(ltp)}</p>
                  <p className={`text-[9px] font-bold ${changePct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {changePct >= 0 ? '+' : ''}{formatPercent(changePct)}
                  </p>
                </div>
                <button onClick={(e) => { e.preventDefault(); remove(item.symbol); }}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground hover:text-destructive transition-all p-1">
                  ✕
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
