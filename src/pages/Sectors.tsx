import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSectorPerformance, getStocksBySector, getAllStocks } from '@/data/mockData';
import type { Stock } from '@/data/mockData';
import { formatCurrency, formatPercent, formatVolume, formatMarketCap } from '@/utils/format';
import { ArrowUpRight, ArrowDownRight, TrendingUp, ChevronLeft, BarChart3 } from 'lucide-react';
import { useBatchQuotes, useMarketBreadth } from '@/hooks/useStockData';

const SectorIcon = React.forwardRef<HTMLSpanElement, { change: number }>(({ change, ...props }, ref) => {
  if (change >= 0) return <span ref={ref} {...props}><ArrowUpRight className="w-3.5 h-3.5 text-primary" /></span>;
  return <span ref={ref} {...props}><ArrowDownRight className="w-3.5 h-3.5 text-destructive" /></span>;
});
SectorIcon.displayName = 'SectorIcon';

const MiniHeatmap = React.forwardRef<HTMLDivElement, { stocks: { symbol: string; change_pct: number }[] }>(({ stocks, ...props }, ref) => {
  const sorted = [...stocks].sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
  const maxAbs = Math.max(...sorted.map(s => Math.abs(s.change_pct)), 1);

  return (
    <div ref={ref} {...props} className="grid grid-cols-6 gap-[2px] w-full">
      {sorted.slice(0, 12).map((s, i) => {
        const intensity = Math.min(Math.abs(s.change_pct) / maxAbs, 1);
        const opacity = 0.15 + intensity * 0.65;
        return (
          <div
            key={i}
            className={`rounded-[3px] h-[18px] ${s.change_pct >= 0 ? 'bg-primary' : 'bg-destructive'}`}
            style={{ opacity }}
            title={`${s.symbol}: ${s.change_pct >= 0 ? '+' : ''}${s.change_pct.toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
});
MiniHeatmap.displayName = 'MiniHeatmap';

function SectorDetail({ sectorName }: { sectorName: string }) {
  const { data: liveBreadth } = useMarketBreadth();

  // Build sector map from mock data for fallback sector assignments
  const mockSectorMap = useMemo(() => {
    const map: Record<string, string> = {};
    getAllStocks().forEach(s => { map[s.symbol] = s.sector; });
    return map;
  }, []);

  // Get all live stocks with sector info
  const liveStocks = useMemo(() => {
    if (!Array.isArray(liveBreadth?.stocks) || liveBreadth.stocks.length === 0) return [];
    return (liveBreadth.stocks as Stock[]).filter((s) => s && typeof s.ltp === 'number' && s.ltp > 0);
  }, [liveBreadth]);

  const sectors = useMemo(() => {
    const source = liveStocks.length > 0 ? liveStocks : getAllStocks();
    return getSectorPerformance(source);
  }, [liveStocks]);

  const sectorData = sectors.find(s => s.sector === sectorName);

  // Get stocks for this sector from live data first, then mock fallback
  const sectorStocks = useMemo(() => {
    // Try live breadth data first — filter by sector
    if (liveStocks.length > 0) {
      const liveFiltered = liveStocks.filter(s => {
        const sector = s.sector || mockSectorMap[s.symbol] || 'Other';
        return sector === sectorName;
      });
      if (liveFiltered.length > 0) return liveFiltered;
    }
    // Fallback to mock data
    return getStocksBySector(sectorName);
  }, [liveStocks, sectorName, mockSectorMap]);

  // Fetch live quotes for the stocks in this sector
  const symbols = useMemo(() => sectorStocks.map(s => s.symbol), [sectorStocks]);
  const { data: liveQuotes } = useBatchQuotes(symbols);

  const stocks = useMemo(() => {
    const quoteMap: Record<string, any> = {};
    if (Array.isArray(liveQuotes)) {
      liveQuotes.forEach((q: any) => {
        if (q?.data && q.symbol) quoteMap[q.symbol] = q.data;
      });
    }
    return sectorStocks.map(s => {
      const live = quoteMap[s.symbol];
      if (!live) return s;
      return {
        ...s,
        ltp: live.ltp ?? s.ltp,
        change: live.change ?? s.change,
        change_pct: live.change_pct ?? s.change_pct,
        volume: live.volume ?? s.volume,
        market_cap: live.market_cap ?? s.market_cap,
      };
    }).sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0));
  }, [sectorStocks, liveQuotes]);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link to="/sectors" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs group mb-3">
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Sectors
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/80 border border-border/50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">{sectorName}</h1>
              <p className="text-xs text-muted-foreground">{stocks.length} stocks in sector</p>
            </div>
          </div>
          {sectorData && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${sectorData.avg_change >= 0 ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
              <SectorIcon change={sectorData.avg_change} />
              {formatPercent(sectorData.avg_change)}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/30">
              <th className="text-left px-4 py-3 text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">Symbol</th>
              <th className="text-right px-4 py-3 text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">LTP</th>
              <th className="text-right px-4 py-3 text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">Change</th>
              <th className="text-right px-4 py-3 text-muted-foreground text-[10px] font-semibold tracking-wider uppercase hidden md:table-cell">Volume</th>
              <th className="text-right px-4 py-3 text-muted-foreground text-[10px] font-semibold tracking-wider uppercase hidden lg:table-cell">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, idx) => (
              <motion.tr
                key={stock.symbol}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="border-b border-border/20 hover:bg-secondary/40 transition-colors group"
              >
                <td className="px-4 py-3">
                  <Link to={`/stock/${stock.symbol}`} className="group-hover:text-primary transition-colors">
                    <p className="font-semibold text-foreground text-[11px]">{stock.symbol}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{stock.name}</p>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground text-[11px]">{formatCurrency(stock.ltp)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold ${stock.change_pct >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                    {stock.change_pct >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    {formatPercent(stock.change_pct)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground font-mono text-[10px] hidden md:table-cell">{formatVolume(stock.volume)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground font-mono text-[10px] hidden lg:table-cell">{formatMarketCap(stock.market_cap)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}

export default function Sectors() {
  const { sector: paramSector } = useParams();
  const { data: liveBreadth } = useMarketBreadth();

  const liveStocks = useMemo(() => {
    if (!Array.isArray(liveBreadth?.stocks) || liveBreadth.stocks.length === 0) return [];
    return (liveBreadth.stocks as Stock[]).filter((s) => s && typeof s.ltp === 'number' && s.ltp > 0);
  }, [liveBreadth]);

  const sectors = useMemo(() => {
    const source = liveStocks.length > 0 ? liveStocks : getAllStocks();
    return getSectorPerformance(source);
  }, [liveStocks]);

  const sortedSectors = [...sectors].sort((a, b) => b.avg_change - a.avg_change);
  const gainers = sortedSectors.filter(s => s.avg_change >= 0);
  const losers = sortedSectors.filter(s => s.avg_change < 0);

  if (paramSector) {
    return <SectorDetail sectorName={decodeURIComponent(paramSector)} />;
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">Sector Analysis</h1>
            <p className="text-[10px] text-muted-foreground">
              Live performance across {sectors.length} sectors · {gainers.length} gaining, {losers.length} declining
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-5 flex gap-2 items-center"
      >
        <div className="flex-1 h-2.5 rounded-full bg-secondary/60 overflow-hidden flex">
          {sortedSectors.map((sec, i) => {
            const width = 100 / sortedSectors.length;
            return (
              <div
                key={i}
                className={`h-full ${sec.avg_change >= 0 ? 'bg-primary' : 'bg-destructive'}`}
                style={{ width: `${width}%`, opacity: 0.3 + Math.min(Math.abs(sec.avg_change) / 2, 0.7) }}
                title={`${sec.sector}: ${sec.avg_change >= 0 ? '+' : ''}${sec.avg_change.toFixed(2)}%`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground shrink-0">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Gainers</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Losers</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sortedSectors.map((sec, i) => {
          const isPositive = sec.avg_change >= 0;
          return (
            <motion.div
              key={sec.sector}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025, duration: 0.35 }}
            >
              <Link
                to={`/sectors/${encodeURIComponent(sec.sector)}`}
                className={`group block rounded-xl border transition-all duration-300 p-4 hover:scale-[1.01] hover:shadow-lg ${
                  isPositive
                    ? 'border-primary/10 bg-gradient-to-br from-card to-primary/[0.02] hover:border-primary/30 hover:shadow-primary/5'
                    : 'border-destructive/10 bg-gradient-to-br from-card to-destructive/[0.02] hover:border-destructive/30 hover:shadow-destructive/5'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[12px] font-bold text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                      {sec.sector}
                    </h3>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{sec.count} stocks</p>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold shrink-0 ml-2 ${
                    isPositive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    <SectorIcon change={sec.avg_change} />
                    {sec.avg_change >= 0 ? '+' : ''}{sec.avg_change.toFixed(2)}%
                  </div>
                </div>

                <div className="mb-3">
                  <MiniHeatmap stocks={sec.stocks} />
                </div>

                <div className="flex flex-wrap gap-1">
                  {sec.stocks.slice(0, 4).map(s => (
                    <span
                      key={s.symbol}
                      className={`text-[8px] font-medium px-1.5 py-[3px] rounded-md border transition-colors ${
                        s.change_pct >= 0
                          ? 'bg-primary/5 text-primary/80 border-primary/10 group-hover:bg-primary/10'
                          : 'bg-destructive/5 text-destructive/80 border-destructive/10 group-hover:bg-destructive/10'
                      }`}
                    >
                      {s.symbol} {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(1)}%
                    </span>
                  ))}
                  {sec.stocks.length > 4 && (
                    <span className="text-[8px] text-muted-foreground/60 px-1.5 py-[3px]">
                      +{sec.stocks.length - 4} more
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
