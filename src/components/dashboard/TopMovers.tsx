import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { formatCurrency, formatPercent, formatVolume } from '@/utils/format';
import type { Stock } from '@/types/stock';

function SectionHeader({ title, badge, link, linkText, icon }: { title: string; badge?: string; link?: string; linkText?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] sm:text-xs font-black text-foreground tracking-tight">{title}</span>
        {badge && (
          <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-primary/8 text-primary font-bold tracking-wider">{badge}</span>
        )}
      </div>
      {link && (
        <Link to={link} className="text-[8px] sm:text-[9px] font-semibold text-primary/40 hover:text-primary transition-colors">
          {linkText || 'View All'} →
        </Link>
      )}
    </div>
  );
}

const StockRow = memo(function StockRow({ stock, rank, showVolume }: { stock: Stock; rank: number; showVolume?: boolean }) {
  const isUp = stock.change_pct >= 0;
  return (
    <Link to={`/stock/${stock.symbol}`}
      className="flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-4 hover:bg-primary/[0.03] transition-all group">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-[8px] text-muted-foreground/60 w-3 sm:w-4 font-data font-bold flex-shrink-0">{rank}</span>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-foreground group-hover:text-primary transition-colors truncate">{stock.symbol}</p>
          <p className="text-[8px] text-muted-foreground/70 truncate max-w-[80px] sm:max-w-[100px]">
            {showVolume ? formatVolume(stock.volume) + ' vol' : stock.sector}
          </p>
        </div>
      </div>
      <div className="text-right font-data flex-shrink-0">
        <p className="text-[9px] sm:text-[10px] text-foreground font-semibold">{formatCurrency(stock.ltp)}</p>
        <p className={`text-[8px] sm:text-[9px] font-bold ${isUp ? 'text-primary' : 'text-destructive'}`}>
          {isUp ? '+' : ''}{formatPercent(stock.change_pct)}
        </p>
      </div>
    </Link>
  );
});

interface TopMoversProps {
  gainers: Stock[];
  losers: Stock[];
  active: Stock[];
  marketOpen: boolean;
}

export default function TopMovers({ gainers, losers, active, marketOpen }: TopMoversProps) {
  const sections = [
    { title: 'Top Gainers', badge: marketOpen ? 'LIVE' : 'CLOSE', data: gainers, showVol: false, icon: <TrendingUp className="w-3.5 h-3.5 text-primary" /> },
    { title: 'Top Losers', badge: marketOpen ? 'LIVE' : 'CLOSE', data: losers, showVol: false, icon: <TrendingDown className="w-3.5 h-3.5 text-destructive" /> },
    { title: 'Most Active', badge: 'VOL', data: active, showVol: true, icon: <Activity className="w-3.5 h-3.5 text-accent" /> },
  ];

  return (
    <>
      {sections.map((section) => (
        <div key={section.title} className="col-span-1 sm:col-span-12 lg:col-span-4">
          <div className="rounded-xl bg-card/30 border border-border/10 overflow-hidden hover:border-border/20 transition-all">
            <SectionHeader title={section.title} badge={section.badge} link="/scanner" linkText="All" icon={section.icon} />
            <div className="divide-y divide-border/5">
              {section.data.slice(0, 8).map((stock, i) => <StockRow key={stock.symbol} stock={stock} rank={i + 1} showVolume={section.showVol} />)}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
