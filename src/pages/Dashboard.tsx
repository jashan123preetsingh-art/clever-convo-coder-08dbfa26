import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { INDICES, getTopGainers, getTopLosers, getMostActive, getSectorPerformance, NEWS } from '@/data/mockData';
import { useIndices } from '@/hooks/useStockData';
import { formatCurrency, formatPercent, formatVolume, timeAgo } from '@/utils/format';

function SectionHeader({ title, badge, link, linkText }: { title: string; badge?: string; link?: string; linkText?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-2">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold text-foreground tracking-wide">{title}</span>
        {badge && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{badge}</span>}
      </div>
      {link && (
        <Link to={link} className="text-[10px] font-medium text-primary/70 hover:text-primary transition-colors">
          {linkText || 'View All'} →
        </Link>
      )}
    </div>
  );
}

function StockRow({ stock, rank, showVolume }: { stock: any; rank: number; showVolume?: boolean }) {
  return (
    <Link to={`/stock/${stock.symbol}`}
      className="flex items-center justify-between py-2.5 px-4 hover:bg-secondary/40 transition-all group border-b border-border/10 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground w-4 font-data font-medium">{rank}</span>
        <div>
          <p className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors">{stock.symbol}</p>
          <p className="text-[9px] text-muted-foreground truncate max-w-[110px]">
            {showVolume ? formatVolume(stock.volume) + ' vol' : stock.name}
          </p>
        </div>
      </div>
      <div className="text-right font-data">
        <p className="text-[11px] text-foreground font-medium">{formatCurrency(stock.ltp)}</p>
        <p className={`text-[10px] font-bold ${stock.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
          {stock.change_pct >= 0 ? '+' : ''}{formatPercent(stock.change_pct)}
        </p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: liveIndices } = useIndices();
  const indices = liveIndices?.length > 0 && !liveIndices[0]?.error ? liveIndices : INDICES;

  const gainers = getTopGainers();
  const losers = getTopLosers();
  const active = getMostActive();
  const sectors = getSectorPerformance();

  return (
    <div className="p-5 max-w-[1800px] mx-auto space-y-5">
      {/* ═══ Index Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {indices.map((idx: any, i: number) => (
          <motion.div key={i} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.35 }}
            className="t-card p-4 group cursor-default">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-bold tracking-wider">{idx.symbol}</span>
              <div className="flex items-center gap-1.5">
                {liveIndices?.length > 0 && !liveIndices[0]?.error && (
                  <span className="text-[7px] text-primary font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> LIVE
                  </span>
                )}
                <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${(idx.change_pct || 0) >= 0
                  ? 'bg-primary/10 text-primary'
                  : 'bg-destructive/10 text-destructive'}`}>
                  {(idx.change_pct || 0) >= 0 ? '▲ BULL' : '▼ BEAR'}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black text-foreground font-data tracking-tight">
                {Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className={`text-sm font-bold font-data ${(idx.change_pct || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {(idx.change_pct || 0) >= 0 ? '+' : ''}{formatPercent(idx.change_pct)}
              </span>
            </div>
            <div className="flex gap-4 mt-2 text-[9px] text-muted-foreground font-data">
              <span>O: {Number(idx.open).toLocaleString('en-IN')}</span>
              <span>H: {Number(idx.high).toLocaleString('en-IN')}</span>
              <span>L: {Number(idx.low).toLocaleString('en-IN')}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-12 gap-3">
        {/* Gainers */}
        <div className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Top Gainers" badge="LIVE" link="/scanner" linkText="All" />
            {gainers.slice(0, 8).map((stock, i) => <StockRow key={stock.symbol} stock={stock} rank={i + 1} />)}
          </div>
        </div>

        {/* Losers */}
        <div className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Top Losers" badge="LIVE" link="/scanner" linkText="All" />
            {losers.slice(0, 8).map((stock, i) => <StockRow key={stock.symbol} stock={stock} rank={i + 1} />)}
          </div>
        </div>

        {/* Most Active */}
        <div className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Most Active" badge="VOL" link="/scanner" linkText="All" />
            {active.slice(0, 8).map((stock, i) => <StockRow key={stock.symbol} stock={stock} rank={i + 1} showVolume />)}
          </div>
        </div>

        {/* Sectors */}
        <div className="col-span-12 lg:col-span-6">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Sector Performance" link="/sectors" linkText="View All" />
            {sectors.slice(0, 10).map((sec, i) => (
              <Link key={sec.sector} to={`/sectors/${encodeURIComponent(sec.sector)}`}
                className="flex items-center justify-between py-2.5 px-4 hover:bg-secondary/30 transition-all border-b border-border/10 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-4 font-data">{i + 1}</span>
                  <span className="text-[11px] text-foreground font-medium">{sec.sector}</span>
                  <span className="text-[9px] text-muted-foreground">({sec.count})</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${sec.avg_change >= 0 ? 'bg-primary' : 'bg-destructive'}`}
                      style={{ width: `${Math.min(Math.abs(sec.avg_change) * 18, 100)}%` }} />
                  </div>
                  <span className={`text-[10px] font-bold w-14 text-right font-data ${sec.avg_change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {sec.avg_change >= 0 ? '+' : ''}{formatPercent(sec.avg_change)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* News */}
        <div className="col-span-12 lg:col-span-6">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Market News" link="/news" linkText="All News" />
            {NEWS.slice(0, 6).map((article, i) => (
              <div key={i} className="py-3 px-4 hover:bg-secondary/30 transition-all border-b border-border/10 last:border-0 cursor-pointer">
                <p className="text-[11px] text-foreground leading-relaxed line-clamp-2 font-medium">{article.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[8px] px-2 py-0.5 rounded-full bg-[hsl(var(--terminal-blue)/0.1)] text-[hsl(var(--terminal-blue))] font-bold">{article.category}</span>
                  <span className="text-[9px] text-muted-foreground">{article.source}</span>
                  <span className="text-[9px] text-muted-foreground">· {timeAgo(article.published_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
