import React, { memo, useMemo, useState } from 'react';
import { Radio, CheckCircle2, XCircle, Clock, Loader2, ChevronDown } from 'lucide-react';
import { useIndicesWithFallback } from '@/hooks/useIndicesWithFallback';
import { useMarketMetrics, useFiiDiiData, useMarketBreadth } from '@/hooks/useStockData';
import { isMarketHours } from '@/utils/marketHours';

interface SourceInfo {
  name: string;
  status: 'connected' | 'degraded' | 'offline' | 'loading';
  latency?: string;
  detail?: string;
}

const statusConfig = {
  connected: {
    dot: 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]',
    text: 'text-primary',
    Icon: CheckCircle2,
  },
  degraded: {
    dot: 'bg-accent shadow-[0_0_6px_hsl(var(--accent)/0.5)]',
    text: 'text-accent',
    Icon: Clock,
  },
  offline: {
    dot: 'bg-destructive shadow-[0_0_6px_hsl(var(--destructive)/0.5)]',
    text: 'text-destructive',
    Icon: XCircle,
  },
  loading: {
    dot: 'bg-muted-foreground animate-pulse',
    text: 'text-muted-foreground',
    Icon: Loader2,
  },
};

const SourceDot = memo(function SourceDot({ source }: { source: SourceInfo }) {
  const cfg = statusConfig[source.status];

  return (
    <div className="flex items-center gap-1.5 group relative" title={source.detail}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      <span className={`text-[8px] font-bold tracking-wide ${cfg.text}`}>
        {source.name}
      </span>
    </div>
  );
});

export default function DataSourceStatus() {
  const [expanded, setExpanded] = useState(false);
  const { hasLiveData, isUsingMockData, isError } = useIndicesWithFallback();
  const { data: marketMetrics, isLoading: metricsLoading } = useMarketMetrics();
  const { data: fiiDii, isLoading: fiiLoading } = useFiiDiiData();
  const { data: breadth, isLoading: breadthLoading } = useMarketBreadth();
  const marketOpen = isMarketHours();

  const sources: SourceInfo[] = useMemo(() => {
    const result: SourceInfo[] = [];

    // Yahoo Finance (primary data)
    if (isError) {
      result.push({ name: 'Yahoo Finance', status: 'offline', detail: 'API unreachable' });
    } else if (isUsingMockData) {
      result.push({ name: 'Yahoo Finance', status: 'degraded', detail: 'Using fallback data' });
    } else if (hasLiveData) {
      result.push({ name: 'Yahoo Finance', status: 'connected', detail: 'Live data flowing' });
    } else {
      result.push({ name: 'Yahoo Finance', status: 'loading', detail: 'Connecting...' });
    }

    // Market Metrics (VIX, PCR, options)
    if (metricsLoading) {
      result.push({ name: 'Options Data', status: 'loading', detail: 'Fetching VIX & PCR...' });
    } else if (marketMetrics?.vix) {
      result.push({
        name: 'Options Data',
        status: 'connected',
        detail: `VIX: ${marketMetrics.vix.value?.toFixed(2)} | Source: ${marketMetrics.dataSource ?? 'unknown'}`,
      });
    } else {
      result.push({ name: 'Options Data', status: marketOpen ? 'degraded' : 'offline', detail: 'No options data' });
    }

    // FII/DII
    if (fiiLoading) {
      result.push({ name: 'FII/DII', status: 'loading', detail: 'Fetching...' });
    } else if (fiiDii && Array.isArray(fiiDii) && fiiDii.length > 0) {
      result.push({ name: 'FII/DII', status: 'connected', detail: 'Flow data available' });
    } else {
      result.push({ name: 'FII/DII', status: 'degraded', detail: 'No FII/DII data' });
    }

    // Market Breadth
    if (breadthLoading) {
      result.push({ name: 'Breadth', status: 'loading', detail: 'Fetching...' });
    } else if (breadth?.advances > 0 || breadth?.declines > 0) {
      result.push({ name: 'Breadth', status: 'connected', detail: `A:${breadth.advances} D:${breadth.declines}` });
    } else {
      result.push({ name: 'Breadth', status: 'degraded', detail: 'No breadth data' });
    }

    // Edge Functions
    result.push({
      name: 'Edge Functions',
      status: !isError ? 'connected' : 'offline',
      detail: !isError ? 'All functions responding' : 'Connection issues',
    });

    // Market Status
    result.push({
      name: marketOpen ? 'NSE OPEN' : 'NSE CLOSED',
      status: marketOpen ? 'connected' : 'offline',
      detail: marketOpen ? 'Mon–Fri 9:15 AM – 3:30 PM IST' : 'Market closed',
    });

    return result;
  }, [hasLiveData, isUsingMockData, isError, marketMetrics, metricsLoading, fiiDii, fiiLoading, breadth, breadthLoading, marketOpen]);

  const connectedCount = sources.filter((s) => s.status === 'connected').length;
  const totalCount = sources.length;
  const allHealthy = connectedCount === totalCount;

  return (
    <div className="rounded-xl bg-card/20 border border-border/10 overflow-hidden transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/[0.02] transition-colors"
      >
        <Radio className="w-3 h-3 text-primary flex-shrink-0" />
        <span className="text-[8px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] flex-shrink-0">
          Data Sources
        </span>

        <div className="flex items-center gap-2.5 flex-1 overflow-x-auto scrollbar-none">
          {sources.map((source) => (
            <SourceDot key={source.name} source={source} />
          ))}
        </div>

        <span className={`text-[8px] font-data font-bold flex-shrink-0 ${allHealthy ? 'text-primary' : 'text-accent'}`}>
          {connectedCount}/{totalCount}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-border/5 px-3 py-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {sources.map((source) => {
            const cfg = statusConfig[source.status];
            const Icon = cfg.Icon;
            return (
              <div key={source.name} className="flex items-start gap-2 p-2 rounded-lg bg-muted/5">
                <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${cfg.text}`} />
                <div className="min-w-0">
                  <p className={`text-[9px] font-bold ${cfg.text}`}>{source.name}</p>
                  <p className="text-[7px] text-muted-foreground/50 truncate">{source.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
