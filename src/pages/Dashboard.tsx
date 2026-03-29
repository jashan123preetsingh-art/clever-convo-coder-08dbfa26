import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { INDICES, getTopGainers, getTopLosers, getMostActive, getSectorPerformance, NEWS } from '@/data/mockData';
import { useIndices } from '@/hooks/useStockData';
import { formatCurrency, formatPercent, formatVolume, timeAgo } from '@/utils/format';

function SectionHeader({ title, badge, link, linkText }: { title: string; badge?: string; link?: string; linkText?: string }) {
  return (
    <div className="t-header flex items-center justify-between px-3 pt-2">
      <div className="flex items-center gap-2">
        <span>{title}</span>
        {badge && <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{badge}</span>}
      </div>
      {link && <Link to={link} className="text-terminal-blue hover:underline text-[9px]">{linkText || 'MORE'} →</Link>}
    </div>
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
    <div className="p-3 max-w-[1800px] mx-auto">
      {/* Index Cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {indices.map((idx: any, i: number) => (
          <motion.div key={i} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="t-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wide">{idx.symbol}</span>
              <div className="flex items-center gap-1">
                {liveIndices?.length > 0 && !liveIndices[0]?.error && <span className="text-[7px] text-primary">● LIVE</span>}
                <span className={`text-[8px] px-1.5 py-0.5 rounded ${(idx.change_pct || 0) >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                  {(idx.change_pct || 0) >= 0 ? 'BULL' : 'BEAR'}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">{Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span className={`text-xs font-semibold ${(idx.change_pct || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(idx.change_pct)}
              </span>
            </div>
            <div className="flex gap-3 mt-1 text-[9px] text-muted-foreground">
              <span>O: {Number(idx.open).toLocaleString('en-IN')}</span>
              <span>H: {Number(idx.high).toLocaleString('en-IN')}</span>
              <span>L: {Number(idx.low).toLocaleString('en-IN')}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-2">
        {/* Top Gainers */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="TOP GAINERS" badge="LIVE" link="/scanner/top_gainers" linkText="ALL" />
            <div className="divide-y divide-border/30">
              {gainers.slice(0, 8).map((stock, i) => (
                <Link key={stock.symbol} to={`/stock/${stock.symbol}`} className="flex items-center justify-between py-1.5 px-2.5 hover:bg-secondary transition-colors group">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground w-3">{i + 1}</span>
                    <div>
                      <p className="text-[11px] font-semibold text-foreground group-hover:text-terminal-cyan transition-colors">{stock.symbol}</p>
                      <p className="text-[9px] text-muted-foreground truncate max-w-[100px]">{stock.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-foreground">{formatCurrency(stock.ltp)}</p>
                    <p className="text-[10px] font-semibold text-primary">{formatPercent(stock.change_pct)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Top Losers */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.05 } }} className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="TOP LOSERS" badge="LIVE" link="/scanner/top_losers" linkText="ALL" />
            <div className="divide-y divide-border/30">
              {losers.slice(0, 8).map((stock, i) => (
                <Link key={stock.symbol} to={`/stock/${stock.symbol}`} className="flex items-center justify-between py-1.5 px-2.5 hover:bg-secondary transition-colors group">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground w-3">{i + 1}</span>
                    <div>
                      <p className="text-[11px] font-semibold text-foreground group-hover:text-terminal-cyan transition-colors">{stock.symbol}</p>
                      <p className="text-[9px] text-muted-foreground truncate max-w-[100px]">{stock.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-foreground">{formatCurrency(stock.ltp)}</p>
                    <p className="text-[10px] font-semibold text-destructive">{formatPercent(stock.change_pct)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Most Active */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }} className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="MOST ACTIVE" badge="VOL" link="/scanner/most_active" linkText="ALL" />
            <div className="divide-y divide-border/30">
              {active.slice(0, 8).map((stock, i) => (
                <Link key={stock.symbol} to={`/stock/${stock.symbol}`} className="flex items-center justify-between py-1.5 px-2.5 hover:bg-secondary transition-colors group">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground w-3">{i + 1}</span>
                    <div>
                      <p className="text-[11px] font-semibold text-foreground group-hover:text-terminal-cyan transition-colors">{stock.symbol}</p>
                      <p className="text-[9px] text-muted-foreground">{formatVolume(stock.volume)} vol</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-foreground">{formatCurrency(stock.ltp)}</p>
                    <p className={`text-[10px] font-semibold ${stock.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatPercent(stock.change_pct)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Sector Performance */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.15 } }} className="col-span-12 lg:col-span-6">
          <div className="t-card overflow-hidden">
            <SectionHeader title="SECTOR PERFORMANCE" link="/sectors" linkText="VIEW ALL" />
            <div className="divide-y divide-border/30">
              {sectors.slice(0, 10).map((sec, i) => (
                <Link key={sec.sector} to={`/sectors/${encodeURIComponent(sec.sector)}`}
                  className="flex items-center justify-between py-1.5 px-2.5 hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground w-3">{i + 1}</span>
                    <span className="text-[11px] text-foreground">{sec.sector}</span>
                    <span className="text-[9px] text-muted-foreground">({sec.count})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-1 rounded-full ${sec.avg_change >= 0 ? 'bg-primary' : 'bg-destructive'}`}
                      style={{ width: `${Math.min(Math.abs(sec.avg_change) * 20, 60)}px` }} />
                    <span className={`text-[10px] font-semibold w-14 text-right ${sec.avg_change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatPercent(sec.avg_change)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        {/* News */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }} className="col-span-12 lg:col-span-6">
          <div className="t-card overflow-hidden">
            <SectionHeader title="MARKET NEWS" link="/news" linkText="ALL NEWS" />
            <div className="divide-y divide-border/30">
              {NEWS.slice(0, 6).map((article, i) => (
                <div key={i} className="py-2 px-2.5 hover:bg-secondary transition-colors">
                  <p className="text-[11px] text-foreground leading-snug line-clamp-2">{article.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-terminal-blue/10 text-terminal-blue">{article.category}</span>
                    <span className="text-[9px] text-muted-foreground">{article.source}</span>
                    <span className="text-[9px] text-muted-foreground">• {timeAgo(article.published_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
