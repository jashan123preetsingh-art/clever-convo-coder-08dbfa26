import { Link } from 'react-router-dom';
import { formatPercent } from '@/utils/format';
import type { SectorPerformance } from '@/types/stock';

interface SectorsListProps {
  sectors: SectorPerformance[];
}

export default function SectorsList({ sectors }: SectorsListProps) {
  return (
    <div className="col-span-1 sm:col-span-12 lg:col-span-6">
      <div className="rounded-xl bg-card/30 border border-border/10 overflow-hidden hover:border-border/20 transition-all">
        <div className="flex items-center justify-between px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
          <span className="text-[11px] sm:text-xs font-black text-foreground tracking-tight">Sector Performance</span>
          <Link to="/sectors" className="text-[8px] sm:text-[9px] font-semibold text-primary/40 hover:text-primary transition-colors">View All →</Link>
        </div>
        {sectors.slice(0, 8).map((sec, i) => (
          <Link key={sec.sector} to={`/sectors/${encodeURIComponent(sec.sector)}`}
            className="flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-4 hover:bg-primary/[0.03] transition-all">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="text-[8px] text-muted-foreground/60 w-3 sm:w-4 font-data font-bold flex-shrink-0">{i + 1}</span>
              <span className="text-[9px] sm:text-[10px] text-foreground font-semibold truncate">{sec.sector}</span>
              <span className="text-[8px] text-muted-foreground/60 flex-shrink-0">({sec.count})</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="w-12 sm:w-16 h-1 bg-secondary/20 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${sec.avg_change >= 0 ? 'bg-primary/50' : 'bg-destructive/50'}`}
                  style={{ width: `${Math.min(Math.abs(sec.avg_change) * 18, 100)}%` }} />
              </div>
              <span className={`text-[8px] sm:text-[9px] font-bold w-10 sm:w-12 text-right font-data ${sec.avg_change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(sec.avg_change)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
