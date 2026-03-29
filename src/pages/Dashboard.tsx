import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { INDICES, getTopGainers, getTopLosers, getMostActive, getSectorPerformance, NEWS } from '@/data/mockData';
import { useIndices } from '@/hooks/useStockData';
import { formatCurrency, formatPercent, formatVolume, timeAgo } from '@/utils/format';

function SectionHeader({ title, badge, link, linkText }: { title: string; badge?: string; link?: string; linkText?: string }) {
  return (
    <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-foreground tracking-wide uppercase">{title}</span>
        {badge && <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{badge}</span>}
      </div>
      {link && <Link to={link} className="text-terminal-blue hover:underline text-[10px] font-medium">{linkText || 'MORE'} →</Link>}
    </div>
  );
}

function StockRow({ stock, rank, showVolume }: { stock: any; rank: number; showVolume?: boolean }) {
  return (
    <Link to={`/stock/${stock.symbol}`}
      className="flex items-center justify-between py-2 px-3 hover:bg-secondary/50 transition-colors group border-b border-border/15 last:border-0">
      <div className="flex items-center gap-2.5">
        <span className="text-[10px] text-muted-foreground w-4 font-medium">{rank}</span>
        <div>
          <p className="text-[11px] font-bold text-foreground group-hover:text-terminal-cyan transition-colors">{stock.symbol}</p>
          <p className="text-[9px] text-muted-foreground truncate max-w-[100px]">
            {showVolume ? formatVolume(stock.volume) + ' vol' : stock.name}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[11px] text-foreground font-medium">{formatCurrency(stock.ltp)}</p>
        <p className={`text-[10px] font-bold ${stock.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatPercent(stock.change_pct)}</p>
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
    <div className="p-4 max-w-[1800px] mx-auto space-y-4">
      {/* Index Cards */}
      <div className="grid grid-cols-3 gap-3">
        {indices.map((idx: any, i: number) => (
          <motion.div key={i} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}
            className="t-card p-3 hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground font-bold tracking-wider">{idx.symbol}</span>
              <div className="flex items-center gap-1.5">
                {liveIndices?.length > 0 && !liveIndices[0]?.error && <span className="text-[7px] text-primary font-medium">● LIVE</span>}
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${(idx.change_pct || 0) >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                  {(idx.change_pct || 0) >= 0 ? 'BULL' : 'BEAR'}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-xl font-black text-foreground tracking-tight">{Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span className={`text-sm font-bold ${(idx.change_pct || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(idx.change_pct)}
              </span>
            </div>
            <div className="flex gap-4 mt-1.5 text-[9px] text-muted-foreground">
              <span>O: {Number(idx.open).toLocaleString('en-IN')}</span>
              <span>H: {Number(idx.high).toLocaleString('en-IN')}</span>
              <span>L: {Number(idx.low).toLocaleString('en-IN')}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Top Gainers */}
        <div className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Top Gainers" badge="LIVE" link="/scanner/top_gainers" linkText="ALL" />
            {gainers.slice(0, 8).map((stock, i) => (
              <StockRow key={stock.symbol} stock={stock} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Top Losers" badge="LIVE" link="/scanner/top_losers" linkText="ALL" />
            {losers.slice(0, 8).map((stock, i) => (
              <StockRow key={stock.symbol} stock={stock} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* Most Active */}
        <div className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Most Active" badge="VOL" link="/scanner/most_active" linkText="ALL" />
            {active.slice(0, 8).map((stock, i) => (
              <StockRow key={stock.symbol} stock={stock} rank={i + 1} showVolume />
            ))}
          </div>
        </div>

        {/* Sector Performance */}
        <div className="col-span-12 lg:col-span-6">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Sector Performance" link="/sectors" linkText="VIEW ALL" />
            {sectors.slice(0, 10).map((sec, i) => (
              <Link key={sec.sector} to={`/sectors/${encodeURIComponent(sec.sector)}`}
                className="flex items-center justify-between py-2 px-3 hover:bg-secondary/30 transition-colors border-b border-border/15 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] text-muted-foreground w-4 font-medium">{i + 1}</span>
                  <span className="text-[11px] text-foreground font-medium">{sec.sector}</span>
                  <span className="text-[9px] text-muted-foreground">({sec.count})</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`h-1.5 rounded-full ${sec.avg_change >= 0 ? 'bg-primary' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(Math.abs(sec.avg_change) * 20, 60)}px` }} />
                  <span className={`text-[10px] font-bold w-14 text-right ${sec.avg_change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatPercent(sec.avg_change)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* News */}
        <div className="col-span-12 lg:col-span-6">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Market News" link="/news" linkText="ALL NEWS" />
            {NEWS.slice(0, 6).map((article, i) => (
              <div key={i} className="py-2.5 px-3 hover:bg-secondary/30 transition-colors border-b border-border/15 last:border-0">
                <p className="text-[11px] text-foreground leading-snug line-clamp-2 font-medium">{article.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-terminal-blue/10 text-terminal-blue font-semibold">{article.category}</span>
                  <span className="text-[9px] text-muted-foreground">{article.source}</span>
                  <span className="text-[9px] text-muted-foreground">• {timeAgo(article.published_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
