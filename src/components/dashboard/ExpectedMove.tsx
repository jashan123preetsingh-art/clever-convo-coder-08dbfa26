import { motion } from 'framer-motion';
import DataBadge from './DataBadge';
import type { DataStatus, MetricData } from '@/types/stock';

const fadeUp = { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } };

interface ExpectedMoveProps {
  niftyLtp: number;
  bnfLtp: number;
  niftyMM: MetricData | undefined;
  bnfMM: MetricData | undefined;
  daysToExpiry: number | string;
  metricsLoading: boolean;
  marketOpen: boolean;
  dataSource?: string;
}

export default function ExpectedMove({ niftyLtp, bnfLtp, niftyMM, bnfMM, daysToExpiry, metricsLoading, marketOpen, dataSource }: ExpectedMoveProps) {
  function getMetricStatus(hasData: boolean): DataStatus {
    if (metricsLoading) return 'loading';
    if (!hasData && !marketOpen) return 'market-closed';
    if (!hasData) return 'unavailable';
    if (!marketOpen) return 'delayed';
    if (dataSource === 'yahoo') return 'live';
    if (dataSource === 'vix-estimate') return 'estimated';
    return 'live';
  }

  const items = [
    { label: 'NIFTY', ltp: niftyLtp, metrics: niftyMM },
    { label: 'BANKNIFTY', ltp: bnfLtp, metrics: bnfMM },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
      {items.map((item, i) => {
        const move = item.metrics?.expectedMove;
        const straddle = item.metrics?.atmStraddle;
        const iv = item.metrics?.atmIV;
        const maxPain = item.metrics?.maxPain;
        const source = item.metrics?.source;
        const metricStatus = getMetricStatus(!!item.metrics);

        return (
          <motion.div key={item.label} variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-xl bg-card/40 border border-border/10 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-[11px] font-black text-foreground tracking-tight">Expected Move — {item.label}</span>
              <div className="flex items-center gap-1.5">
                <DataBadge status={metricStatus} source={source} />
                <span className="text-[8px] px-2 py-0.5 rounded-md bg-accent/8 text-accent font-bold">
                  {daysToExpiry !== '—' ? `${daysToExpiry}D` : '—'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-[8px] text-muted-foreground/70 uppercase tracking-[0.15em] mb-1">±1σ Move</p>
                <p className="text-base sm:text-lg font-black text-primary font-data">{move != null ? `±${move}` : '—'}</p>
                <p className="text-[8px] text-muted-foreground/60">{move != null && item.ltp ? `${(move / item.ltp * 100).toFixed(1)}%` : ''}</p>
              </div>
              <div>
                <p className="text-[8px] text-muted-foreground/70 uppercase tracking-[0.15em] mb-1">ATM Straddle</p>
                <p className="text-base sm:text-lg font-black text-foreground font-data">{straddle != null ? `₹${straddle}` : '—'}</p>
                <p className="text-[8px] text-muted-foreground/60">{source === 'yahoo' ? 'Yahoo' : source === 'vix-estimate' ? 'VIX Est.' : ''}</p>
              </div>
              <div>
                <p className="text-[8px] text-muted-foreground/70 uppercase tracking-[0.15em] mb-1">ATM IV</p>
                <p className="text-base sm:text-lg font-black text-accent font-data">{iv != null ? `${Number(iv).toFixed(1)}%` : '—'}</p>
                <p className="text-[8px] text-muted-foreground/60">{item.metrics ? 'Implied' : ''}</p>
              </div>
              <div>
                <p className="text-[8px] text-muted-foreground/70 uppercase tracking-[0.15em] mb-1">Max Pain</p>
                <p className="text-base sm:text-lg font-black text-foreground font-data">{maxPain != null ? maxPain.toLocaleString('en-IN') : '—'}</p>
                <p className="text-[8px] text-muted-foreground/60">{maxPain ? 'Strike' : ''}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
