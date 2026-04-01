import React from 'react';
import DataBadge from './DataBadge';
import type { DataStatus, MarketMetrics } from '@/types/stock';

interface MetricWidgetProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: string;
  status?: DataStatus;
}

function MetricWidget({ label, value, sub, color, icon, status }: MetricWidgetProps) {
  const isLoading = status === 'loading' || value === '—';
  return (
    <div className={`rounded-xl bg-card/40 p-3 sm:p-4 border border-border/10 hover:border-border/25 transition-all duration-300 group ${isLoading ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>}
        <p className="text-[8px] text-muted-foreground/70 uppercase tracking-[0.15em] font-bold flex-1">{label}</p>
        {status && status !== 'loading' && <DataBadge status={status} />}
      </div>
      <p className={`text-base sm:text-lg font-black font-data tracking-tight ${color || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[8px] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}

interface MetricsGridProps {
  marketMetrics: MarketMetrics | null;
  metricsLoading: boolean;
  marketOpen: boolean;
  advances: number;
  declines: number;
  unchanged: number;
  hasBreadth: boolean;
  fiiDiiParsed: { fiiNet: number; diiNet: number; date: string } | null;
}

export default function MetricsGrid({ marketMetrics, metricsLoading, marketOpen, advances, declines, unchanged, hasBreadth, fiiDiiParsed }: MetricsGridProps) {
  const mm = marketMetrics;
  const vix = mm?.vix;
  const niftyMM = mm?.nifty;
  const dataSource = mm?.dataSource;

  function getMetricStatus(hasData: boolean): DataStatus {
    if (metricsLoading) return 'loading';
    if (!hasData && !marketOpen) return 'market-closed';
    if (!hasData) return 'unavailable';
    if (!marketOpen) return 'delayed';
    if (dataSource === 'yahoo') return 'live';
    if (dataSource === 'vix-estimate') return 'estimated';
    return 'live';
  }

  function getDataStatus(hasData: boolean): DataStatus {
    if (!hasData) return 'loading';
    if (!marketOpen) return 'delayed';
    return 'live';
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[8px] sm:text-[9px] text-muted-foreground/70 font-bold uppercase tracking-[0.15em]">Key Metrics</p>
        {dataSource && <DataBadge status={getMetricStatus(!!vix)} source={dataSource} />}
        {mm?.timestamp && (
          <span className="text-[8px] text-muted-foreground/60 font-data ml-auto">
            {new Date(mm.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2">
        <MetricWidget icon="📊" label="Nifty PCR"
          value={niftyMM ? (niftyMM.pcr ?? 0).toFixed(2) : '—'}
          sub={mm?.banknifty ? `BNF: ${(mm.banknifty.pcr ?? 0).toFixed(2)}` : undefined}
          color={niftyMM ? ((niftyMM.pcr ?? 0) > 1 ? 'text-primary' : 'text-destructive') : undefined}
          status={getMetricStatus(!!niftyMM)} />
        <MetricWidget icon="⚡" label="India VIX"
          value={vix ? (vix.value ?? 0).toFixed(2) : '—'}
          sub={vix ? `${(vix.change_pct ?? 0) >= 0 ? '+' : ''}${(vix.change_pct ?? 0).toFixed(1)}%` : undefined}
          color={vix ? ((vix.change_pct ?? 0) <= 0 ? 'text-primary' : 'text-destructive') : 'text-accent'}
          status={getMetricStatus(!!vix)} />
        <MetricWidget icon="📈" label="Adv / Dec" value={`${advances} / ${declines}`} sub={`${unchanged} unch`}
          color={advances > declines ? 'text-primary' : 'text-destructive'}
          status={getDataStatus(hasBreadth)} />
        <MetricWidget icon="🏦" label="FII Net"
          value={fiiDiiParsed ? `${fiiDiiParsed.fiiNet >= 0 ? '+' : ''}₹${Math.abs(Math.round(fiiDiiParsed.fiiNet)).toLocaleString('en-IN')} Cr` : '—'}
          sub={fiiDiiParsed?.date || undefined}
          color={fiiDiiParsed ? (fiiDiiParsed.fiiNet >= 0 ? 'text-primary' : 'text-destructive') : undefined}
          status={getDataStatus(!!fiiDiiParsed)} />
        <MetricWidget icon="📊" label="DII Net"
          value={fiiDiiParsed ? `${fiiDiiParsed.diiNet >= 0 ? '+' : ''}₹${Math.abs(Math.round(fiiDiiParsed.diiNet)).toLocaleString('en-IN')} Cr` : '—'}
          sub={fiiDiiParsed?.date || undefined}
          color={fiiDiiParsed ? (fiiDiiParsed.diiNet >= 0 ? 'text-primary' : 'text-destructive') : undefined}
          status={getDataStatus(!!fiiDiiParsed)} />
      </div>
    </div>
  );
}
