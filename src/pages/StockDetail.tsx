import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFullStockData, useStockChart } from '@/hooks/useStockData';
import { getStock, generateCandleData } from '@/data/mockData';
import { formatCurrency, formatPercent, formatVolume, formatMarketCap } from '@/utils/format';
import { useWatchlist } from '@/hooks/useWatchlist';
import AIFundamentalsPanel from '@/components/stock/AIFundamentalsPanel';

// ─── Shared Components ───

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-3 border border-border/30 hover:border-border/60 transition-all group">
      <p className="text-[9px] text-muted-foreground mb-1 uppercase tracking-[0.1em] font-medium">{label}</p>
      <p className={`text-sm font-bold font-data ${color || 'text-foreground'}`}>{value || '—'}</p>
      {sub && <p className="text-[8px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <h3 className="text-[11px] font-bold text-foreground mb-3 flex items-center gap-2 tracking-wide">
      {icon && <span className="text-sm">{icon}</span>}
      <span>{children}</span>
      <span className="flex-1 h-px bg-border/30" />
    </h3>
  );
}

function PivotLevel({ label, value, ltp, type }: { label: string; value: number | null; ltp: number; type: 'support' | 'resistance' }) {
  if (!value) return null;
  const pct = ((value - ltp) / ltp * 100);
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${type === 'support' ? 'bg-destructive' : 'bg-primary'}`} />
        <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-foreground font-medium font-data">{formatCurrency(value)}</span>
        <span className={`text-[9px] font-medium font-data ${type === 'support' ? 'text-destructive' : 'text-primary'}`}>
          {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function MultiTFLevel({ label, value, ltp, type, tf }: { label: string; value: number | null; ltp: number; type: 'support' | 'resistance'; tf: string }) {
  if (!value) return null;
  const pct = ((value - ltp) / ltp * 100);
  const proximity = Math.abs(pct);
  const isNear = proximity < 1;
  return (
    <div className={`flex items-center justify-between py-2 px-2 rounded-lg transition-all ${isNear ? 'bg-accent/8 border border-accent/15' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${type === 'support' ? 'bg-destructive' : 'bg-primary'}`} />
        <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
        <span className="text-[8px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-bold">{tf}</span>
        {isNear && <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-bold animate-pulse">NEAR</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-foreground font-medium font-data">{formatCurrency(value)}</span>
        <span className={`text-[9px] font-medium font-data ${type === 'support' ? 'text-destructive' : 'text-primary'}`}>
          {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

// ─── Constants ───

const RANGES = [
  { key: '1mo', label: '1M' }, { key: '3mo', label: '3M' }, { key: '6mo', label: '6M' },
  { key: '1y', label: '1Y' }, { key: '2y', label: '2Y' }, { key: '5y', label: '5Y' },
];

// ─── Main Component ───

export default function StockDetail() {
  const { symbol } = useParams();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const { isInWatchlist, toggle: toggleWatchlist } = useWatchlist();
  const inWatchlist = isInWatchlist(symbol || '');
  const [period, setPeriod] = useState('1y');
  const [chartInterval] = useState('1d');
  const [activeTab, setActiveTab] = useState<'overview' | 'technicals' | 'fundamentals'>('overview');
  const [crosshairData, setCrosshairData] = useState<any>(null);
  const [chartExpanded, setChartExpanded] = useState(false);

  const { data: fullData, isLoading, error } = useFullStockData(symbol || '');
  const { data: chartData, isLoading: chartLoading } = useStockChart(symbol || '', chartInterval, period);

  const mockStock = getStock(symbol || '');
  const quote = fullData?.quote || mockStock;
  const technicals = fullData?.technicals;
  const apiFundamentals = fullData?.fundamentals;
  const fundamentals = quote || apiFundamentals || mockStock ? {
    pe_ratio: apiFundamentals?.pe_ratio ?? quote?.pe_ratio ?? mockStock?.pe_ratio ?? null,
    forward_pe: apiFundamentals?.forward_pe ?? null,
    pb_ratio: apiFundamentals?.pb_ratio ?? null,
    peg_ratio: apiFundamentals?.peg_ratio ?? null,
    market_cap: apiFundamentals?.market_cap ?? quote?.market_cap ?? mockStock?.market_cap ?? null,
    enterprise_value: apiFundamentals?.enterprise_value ?? null,
    profit_margins: apiFundamentals?.profit_margins ?? null,
    operating_margins: apiFundamentals?.operating_margins ?? null,
    gross_margins: apiFundamentals?.gross_margins ?? null,
    roe: apiFundamentals?.roe ?? quote?.roe ?? mockStock?.roe ?? null,
    roa: apiFundamentals?.roa ?? null,
    revenue_growth: apiFundamentals?.revenue_growth ?? null,
    earnings_growth: apiFundamentals?.earnings_growth ?? null,
    debt_to_equity: apiFundamentals?.debt_to_equity ?? quote?.debt_to_equity ?? mockStock?.debt_to_equity ?? null,
    current_ratio: apiFundamentals?.current_ratio ?? null,
    quick_ratio: apiFundamentals?.quick_ratio ?? null,
    ebitda: apiFundamentals?.ebitda ?? null,
    total_revenue: apiFundamentals?.total_revenue ?? null,
    free_cashflow: apiFundamentals?.free_cashflow ?? null,
    operating_cashflow: apiFundamentals?.operating_cashflow ?? null,
    eps_trailing: apiFundamentals?.eps_trailing ?? null,
    eps_forward: apiFundamentals?.eps_forward ?? null,
    beta: apiFundamentals?.beta ?? null,
    book_value: apiFundamentals?.book_value ?? null,
    shares_outstanding: apiFundamentals?.shares_outstanding ?? null,
    dividend_yield: apiFundamentals?.dividend_yield ?? quote?.dividend_yield ?? mockStock?.dividend_yield ?? null,
    dividend_rate: apiFundamentals?.dividend_rate ?? null,
    recommendation: apiFundamentals?.recommendation ?? null,
    target_mean_price: apiFundamentals?.target_mean_price ?? null,
    target_high_price: apiFundamentals?.target_high_price ?? null,
    target_low_price: apiFundamentals?.target_low_price ?? null,
    num_analysts: apiFundamentals?.num_analysts ?? null,
    week_52_high: apiFundamentals?.week_52_high ?? quote?.week_52_high ?? mockStock?.week_52_high ?? null,
    week_52_low: apiFundamentals?.week_52_low ?? quote?.week_52_low ?? mockStock?.week_52_low ?? null,
    fifty_day_avg: apiFundamentals?.fifty_day_avg ?? null,
    two_hundred_day_avg: apiFundamentals?.two_hundred_day_avg ?? null,
    avg_volume: apiFundamentals?.avg_volume ?? null,
    avg_volume_10d: apiFundamentals?.avg_volume_10d ?? quote?.avg_volume_10d ?? mockStock?.avg_volume_10d ?? null,
    promoter_holding: (apiFundamentals as any)?.promoter_holding ?? (mockStock as any)?.promoter_holding ?? null,
    roce: (apiFundamentals as any)?.roce ?? (mockStock as any)?.roce ?? null,
  } : null;
  const realChartData = chartData?.length > 0 ? chartData : generateCandleData(symbol || '', 250);

  // ─── Multi-TF S/R Levels ───
  const multiTFLevels = React.useMemo(() => {
    if (!realChartData || realChartData.length < 20) return null;
    
    const calcPivotsFromRange = (candles: any[]) => {
      if (!candles.length) return null;
      const h = Math.max(...candles.map((c: any) => c.high));
      const l = Math.min(...candles.map((c: any) => c.low));
      const c = candles[candles.length - 1].close;
      const p = (h + l + c) / 3;
      return {
        pivot: Math.round(p * 100) / 100,
        s1: Math.round((2 * p - h) * 100) / 100,
        s2: Math.round((p - (h - l)) * 100) / 100,
        r1: Math.round((2 * p - l) * 100) / 100,
        r2: Math.round((p + (h - l)) * 100) / 100,
      };
    };

    // 4H: last 2 days
    const fourH = calcPivotsFromRange(realChartData.slice(-2));
    // 1D: last candle
    const daily = calcPivotsFromRange(realChartData.slice(-1));
    // 1W: last 5 days
    const weekly = calcPivotsFromRange(realChartData.slice(-5));
    // 1M: last 22 trading days
    const monthly = realChartData.length >= 22 ? calcPivotsFromRange(realChartData.slice(-22)) : null;
    // 1Y: last 252 trading days
    const yearly = realChartData.length >= 100 ? calcPivotsFromRange(realChartData.slice(-252)) : null;

    return { fourH, daily, weekly, monthly, yearly };
  }, [realChartData]);

  // ─── Supply/Demand Zones (MTF aggregated — no TF labels) ───
  const supplyDemandZones = React.useMemo(() => {
    if (!realChartData || realChartData.length < 30) return null;
    const zones: { type: 'supply' | 'demand'; high: number; low: number; strength: number }[] = [];

    // Scan multiple lookback windows for MTF effect
    const windows = [
      { candles: realChartData.slice(-30), weight: 1 },   // Short-term
      { candles: realChartData.slice(-60), weight: 1.5 },  // Mid-term
      { candles: realChartData.slice(-120), weight: 2 },   // Long-term
    ];

    for (const { candles, weight } of windows) {
      for (let i = 2; i < candles.length - 1; i++) {
        const prev = candles[i - 1];
        const curr = candles[i];
        const next = candles[i + 1];
        
        // Demand zone: big bullish candle after consolidation
        if (curr.close > curr.open && (curr.close - curr.open) > (curr.high - curr.low) * 0.6) {
          const volSpike = curr.volume > (prev.volume * 1.3);
          if (next.close > curr.close || volSpike) {
            zones.push({ type: 'demand', high: curr.open, low: curr.low, strength: Math.round((volSpike ? 3 : 2) * weight) });
          }
        }
        // Supply zone: big bearish candle 
        if (curr.open > curr.close && (curr.open - curr.close) > (curr.high - curr.low) * 0.6) {
          const volSpike = curr.volume > (prev.volume * 1.3);
          if (next.close < curr.close || volSpike) {
            zones.push({ type: 'supply', high: curr.high, low: curr.open, strength: Math.round((volSpike ? 3 : 2) * weight) });
          }
        }
      }
    }

    // Merge overlapping zones
    const mergeZones = (zoneList: typeof zones) => {
      const sorted = [...zoneList].sort((a, b) => b.high - a.high);
      const merged: typeof zones = [];
      for (const z of sorted) {
        const existing = merged.find(m => m.type === z.type && Math.abs(m.high - z.high) / z.high < 0.01);
        if (existing) {
          existing.strength = Math.min(existing.strength + 1, 5);
          existing.high = Math.max(existing.high, z.high);
          existing.low = Math.min(existing.low, z.low);
        } else {
          merged.push({ ...z });
        }
      }
      return merged;
    };

    const mergedZones = mergeZones(zones);
    const ltp = realChartData[realChartData.length - 1].close;
    const relevant = mergedZones.filter(z => Math.abs((z.high + z.low) / 2 - ltp) / ltp < 0.10);
    const supply = relevant.filter(z => z.type === 'supply').sort((a, b) => b.strength - a.strength).slice(0, 3);
    const demand = relevant.filter(z => z.type === 'demand').sort((a, b) => b.strength - a.strength).slice(0, 3);
    return { supply, demand };
  }, [realChartData]);

  // ─── Optimized Chart ───
  const renderChart = useCallback(async () => {
    if (chartInstanceRef.current) { try { chartInstanceRef.current.remove(); } catch {} }
    if (!chartRef.current || !realChartData?.length) return;

    try {
      const { createChart, CandlestickSeries, HistogramSeries } = await import('lightweight-charts');
      const height = chartExpanded ? 560 : 380;

      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height,
        layout: {
          background: { color: 'transparent' },
          textColor: '#64748b',
          fontSize: 11,
          fontFamily: "'Inter', -apple-system, sans-serif",
        },
        grid: {
          vertLines: { color: 'rgba(148, 163, 184, 0.04)' },
          horzLines: { color: 'rgba(148, 163, 184, 0.06)' },
        },
        crosshair: {
          mode: 0,
          vertLine: { color: 'rgba(99, 179, 237, 0.12)', width: 1, style: 3, labelBackgroundColor: '#1e293b' },
          horzLine: { color: 'rgba(99, 179, 237, 0.12)', width: 1, style: 3, labelBackgroundColor: '#1e293b' },
        },
        rightPriceScale: {
          borderColor: 'rgba(148, 163, 184, 0.08)',
          scaleMargins: { top: 0.06, bottom: 0.2 },
          textColor: '#64748b',
        },
        timeScale: {
          borderColor: 'rgba(148, 163, 184, 0.08)',
          rightOffset: 8,
          barSpacing: 10,
          minBarSpacing: 4,
          fixLeftEdge: false,
          fixRightEdge: false,
        },
        handleScroll: { vertTouchDrag: false },
      });

      const cs = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b98180',
        wickDownColor: '#ef444480',
      });
      cs.setData(realChartData);

      const vs = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      vs.setData(realChartData.map((c: any) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
      })));

      chart.subscribeCrosshairMove((param: any) => {
        if (!param?.time) { setCrosshairData(null); return; }
        const candle = param.seriesData?.get(cs);
        if (candle) setCrosshairData({ ...candle, time: param.time });
      });

      chart.timeScale().fitContent();
      chartInstanceRef.current = chart;

      const ro = new ResizeObserver(() => { if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth }); });
      ro.observe(chartRef.current);
    } catch (err) {
      console.error('Chart render failed:', err);
    }
  }, [realChartData, technicals, chartExpanded]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (chartRef.current && realChartData?.length > 0) renderChart();
    }, 50);
    return () => {
      clearTimeout(timer);
      if (chartInstanceRef.current) { try { chartInstanceRef.current.remove(); } catch {} }
    };
  }, [renderChart]);

  if (!quote && !isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Stock not found</p>
          <Link to="/" className="text-primary text-xs mt-2 inline-block hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const ltp = quote?.ltp || 0;
  const changePct = quote?.change_pct || 0;
  const isPositive = changePct >= 0;

  return (
    <div className="p-3 sm:p-5 max-w-[1600px] mx-auto space-y-4">
      {/* ─── Header ─── */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-foreground tracking-tight">{symbol}</h1>
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">{quote?.exchange || 'NSE'}</span>
              {isLoading && <span className="text-[9px] text-accent animate-pulse font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> LOADING</span>}
              {!isLoading && !error && <span className="text-[9px] text-primary font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> LIVE</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{quote?.name || symbol}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleWatchlist(symbol!, ltp)}
              className={`px-2.5 py-1.5 rounded-md text-sm transition-all border ${inWatchlist ? 'bg-accent/8 text-accent border-accent/20' : 'bg-secondary text-muted-foreground border-border/50 hover:text-foreground'}`}>
              {inWatchlist ? '★' : '☆'}
            </button>
            <Link to={`/options/${symbol}`}
              className="px-3.5 py-1.5 rounded-md text-[10px] font-semibold bg-card text-foreground border border-border/50 hover:bg-secondary transition-all">
              Options Chain →
            </Link>
          </div>
        </div>

        <div className="flex items-baseline gap-3 mt-3">
          <span className="text-3xl font-black text-foreground font-data tracking-tight">{formatCurrency(ltp)}</span>
          <span className={`text-lg font-bold font-data ${isPositive ? 'text-primary' : 'text-destructive'}`}>
            {isPositive ? '▲' : '▼'} {formatPercent(changePct)}
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5 mt-1.5 text-[10px] text-muted-foreground font-data flex-wrap">
          {quote?.volume && <span>Vol: <span className="text-foreground font-medium">{formatVolume(quote.volume)}</span></span>}
          {(quote?.market_cap || fundamentals?.market_cap) && <span>MCap: <span className="text-foreground font-medium">{formatMarketCap(quote.market_cap || fundamentals?.market_cap)}</span></span>}
          {fundamentals?.pe_ratio && <span>P/E: <span className="text-foreground font-medium">{fundamentals.pe_ratio.toFixed(1)}</span></span>}
        </div>
      </motion.div>

      {/* ─── Chart ─── */}
      <div className="t-card p-3 sm:p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Daily Chart</span>
          <div className="flex items-center gap-2">
            {chartLoading && <span className="text-[9px] text-accent animate-pulse font-medium">Loading…</span>}
            <button onClick={() => setChartExpanded(!chartExpanded)}
              className="text-[10px] text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md bg-secondary/50 border border-border/30 transition-all">
              {chartExpanded ? '⊟' : '⊞'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {crosshairData && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 sm:gap-4 text-[10px] mb-2 px-1 font-data flex-wrap">
              <span className="text-muted-foreground">O <span className="text-foreground font-medium">{crosshairData.open?.toFixed(2)}</span></span>
              <span className="text-muted-foreground">H <span className="text-foreground font-medium">{crosshairData.high?.toFixed(2)}</span></span>
              <span className="text-muted-foreground">L <span className="text-foreground font-medium">{crosshairData.low?.toFixed(2)}</span></span>
              <span className="text-muted-foreground">C <span className={`font-medium ${crosshairData.close >= crosshairData.open ? 'text-primary' : 'text-destructive'}`}>{crosshairData.close?.toFixed(2)}</span></span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={chartRef} className="w-full rounded-md overflow-hidden" style={{ height: chartExpanded ? 560 : 380 }} />

        {technicals && (
          <div className="flex items-center justify-between px-2 pt-3 mt-2 border-t border-border/20 font-data flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-4 text-[9px]">
              <span className="text-destructive/70">S2: {formatCurrency(technicals.s2)}</span>
              <span className="text-destructive/50">S1: {formatCurrency(technicals.s1)}</span>
            </div>
            <span className="text-[9px] text-accent font-semibold">Pivot: {formatCurrency(technicals.pivot)}</span>
            <div className="flex items-center gap-2 sm:gap-4 text-[9px]">
              <span className="text-primary/50">R1: {formatCurrency(technicals.r1)}</span>
              <span className="text-primary/70">R2: {formatCurrency(technicals.r2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="flex gap-0.5 bg-secondary/30 p-0.5 rounded-lg w-fit border border-border/30">
        {(['overview', 'technicals', 'fundamentals'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-3 sm:px-4 py-2 rounded-md text-[10px] font-semibold transition-all tracking-wide
              ${activeTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MetricCard label="Open" value={formatCurrency(quote?.open)} />
              <MetricCard label="High" value={formatCurrency(quote?.high)} color={quote?.high === quote?.week_52_high ? 'text-primary' : undefined} />
              <MetricCard label="Low" value={formatCurrency(quote?.low)} color={quote?.low === quote?.week_52_low ? 'text-destructive' : undefined} />
              <MetricCard label="Prev Close" value={formatCurrency(quote?.prev_close)} />
              <MetricCard label="52W High" value={formatCurrency(quote?.week_52_high || fundamentals?.week_52_high)} />
              <MetricCard label="52W Low" value={formatCurrency(quote?.week_52_low || fundamentals?.week_52_low)} />
              <MetricCard label="Volume" value={formatVolume(quote?.volume)} />
              <MetricCard label="Avg Vol (10D)" value={formatVolume(fundamentals?.avg_volume_10d || quote?.avg_volume_10d)} />
            </div>

            {technicals && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="t-card p-4">
                  <SectionTitle icon="▼">Support Levels</SectionTitle>
                  <PivotLevel label="S1" value={technicals.s1} ltp={ltp} type="support" />
                  <PivotLevel label="S2" value={technicals.s2} ltp={ltp} type="support" />
                  <PivotLevel label="S3" value={technicals.s3} ltp={ltp} type="support" />
                </div>
                <div className="t-card p-4">
                  <SectionTitle icon="▲">Resistance Levels</SectionTitle>
                  <PivotLevel label="R1" value={technicals.r1} ltp={ltp} type="resistance" />
                  <PivotLevel label="R2" value={technicals.r2} ltp={ltp} type="resistance" />
                  <PivotLevel label="R3" value={technicals.r3} ltp={ltp} type="resistance" />
                </div>
              </div>
            )}

            <div className="t-card p-4">
              <SectionTitle icon="📊">Key Ratios</SectionTitle>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <MetricCard label="P/E" value={fundamentals?.pe_ratio?.toFixed(1) || quote?.pe_ratio?.toString() || '—'} />
                <MetricCard label="P/B" value={fundamentals?.pb_ratio?.toFixed(2) || '—'} />
                <MetricCard label="ROE" value={fundamentals?.roe ? `${fundamentals.roe.toFixed(1)}%` : quote?.roe ? `${quote.roe}%` : '—'}
                  color={(fundamentals?.roe || quote?.roe || 0) >= 15 ? 'text-primary' : undefined} />
                <MetricCard label="D/E" value={fundamentals?.debt_to_equity?.toFixed(2) ?? quote?.debt_to_equity?.toString() ?? '—'}
                  color={(fundamentals?.debt_to_equity || quote?.debt_to_equity || 0) <= 0.5 ? 'text-primary' : (fundamentals?.debt_to_equity || 0) > 1.5 ? 'text-destructive' : undefined} />
                <MetricCard label="Div Yield" value={fundamentals?.dividend_yield ? `${fundamentals.dividend_yield.toFixed(1)}%` : quote?.dividend_yield ? `${quote.dividend_yield}%` : '—'} />
                <MetricCard label="Beta" value={fundamentals?.beta?.toFixed(2) || '—'} />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'technicals' && (
          <motion.div key="technicals" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
            {technicals ? (
              <>
                {/* 1. Price Action & Supply/Demand — TOP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="t-card p-4">
                    <SectionTitle icon="🕯️">Price Action</SectionTitle>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-sm font-black px-3 py-1.5 rounded-md ${technicals.trend === 'Bullish' ? 'bg-primary/10 text-primary' : technicals.trend === 'Bearish' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}`}>
                        {technicals.trend}
                      </span>
                      <span className="text-[10px] text-muted-foreground">· {technicals.trend_strength}</span>
                    </div>
                    {technicals.candle_patterns?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {technicals.candle_patterns.map((p: string, i: number) => (
                          <span key={i} className="text-[10px] px-2.5 py-1 rounded-md bg-accent/8 text-accent border border-accent/15 font-medium">{p}</span>
                        ))}
                      </div>
                    ) : <p className="text-[10px] text-muted-foreground mb-3">No patterns detected</p>}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-secondary/20 rounded-lg p-2">
                        <span className="text-muted-foreground">RSI (14) · Daily</span>
                        <p className={`text-base font-black font-data ${(technicals.rsi_14 || 50) > 70 ? 'text-destructive' : (technicals.rsi_14 || 50) < 30 ? 'text-primary' : 'text-foreground'}`}>
                          {technicals.rsi_14?.toFixed(1) || '—'}
                        </p>
                        <span className={`text-[8px] font-bold ${(technicals.rsi_14 || 50) > 70 ? 'text-destructive' : (technicals.rsi_14 || 50) < 30 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {(technicals.rsi_14 || 50) > 70 ? 'OVERBOUGHT' : (technicals.rsi_14 || 50) < 30 ? 'OVERSOLD' : 'NEUTRAL'}
                        </span>
                      </div>
                      <div className="bg-secondary/20 rounded-lg p-2">
                        <span className="text-muted-foreground">ATR (14) · Daily</span>
                        <p className="text-base font-black text-foreground font-data">{technicals.atr_14?.toFixed(2) || '—'}</p>
                        <span className="text-[8px] text-muted-foreground font-bold">VOLATILITY</span>
                      </div>
                    </div>
                  </div>

                  <div className="t-card p-4">
                    <SectionTitle icon="⚡">Supply & Demand Zones</SectionTitle>
                    {supplyDemandZones ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[8px] text-destructive/70 font-bold uppercase tracking-wider mb-1.5">Supply (Resistance)</p>
                          {supplyDemandZones.supply.length > 0 ? supplyDemandZones.supply.map((z, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 text-[10px]">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                <span className="text-muted-foreground">Zone {i + 1}</span>
                                <span className="text-[8px] text-destructive/60 font-bold">{'●'.repeat(Math.min(z.strength, 5))}</span>
                              </div>
                              <span className="text-foreground font-data font-medium">{formatCurrency(z.low)} – {formatCurrency(z.high)}</span>
                            </div>
                          )) : <p className="text-[9px] text-muted-foreground">No strong supply zones nearby</p>}
                        </div>
                        <div>
                          <p className="text-[8px] text-primary/70 font-bold uppercase tracking-wider mb-1.5">Demand (Support)</p>
                          {supplyDemandZones.demand.length > 0 ? supplyDemandZones.demand.map((z, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 text-[10px]">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <span className="text-muted-foreground">Zone {i + 1}</span>
                                <span className="text-[8px] text-primary/60 font-bold">{'●'.repeat(Math.min(z.strength, 5))}</span>
                              </div>
                              <span className="text-foreground font-data font-medium">{formatCurrency(z.low)} – {formatCurrency(z.high)}</span>
                            </div>
                          )) : <p className="text-[9px] text-muted-foreground">No strong demand zones nearby</p>}
                        </div>
                      </div>
                    ) : <p className="text-[10px] text-muted-foreground">Insufficient data</p>}
                  </div>
                </div>

                {/* 2. Multi-TF Support & Resistance — ordered 4H, 1D, 1W, 1M, 1Y */}
                <div className="t-card p-4">
                  <SectionTitle icon="🎯">Multi-Timeframe S/R Levels</SectionTitle>
                  {multiTFLevels ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] text-primary/70 font-bold uppercase tracking-wider mb-2">Resistance</p>
                        <div className="space-y-1">
                          {multiTFLevels.yearly && <MultiTFLevel label="R2" value={multiTFLevels.yearly.r2} ltp={ltp} type="resistance" tf="1Y" />}
                          {multiTFLevels.yearly && <MultiTFLevel label="R1" value={multiTFLevels.yearly.r1} ltp={ltp} type="resistance" tf="1Y" />}
                          {multiTFLevels.monthly && <MultiTFLevel label="R2" value={multiTFLevels.monthly.r2} ltp={ltp} type="resistance" tf="1M" />}
                          {multiTFLevels.monthly && <MultiTFLevel label="R1" value={multiTFLevels.monthly.r1} ltp={ltp} type="resistance" tf="1M" />}
                          {multiTFLevels.weekly && <MultiTFLevel label="R2" value={multiTFLevels.weekly.r2} ltp={ltp} type="resistance" tf="1W" />}
                          {multiTFLevels.weekly && <MultiTFLevel label="R1" value={multiTFLevels.weekly.r1} ltp={ltp} type="resistance" tf="1W" />}
                          {multiTFLevels.daily && <MultiTFLevel label="R2" value={multiTFLevels.daily.r2} ltp={ltp} type="resistance" tf="1D" />}
                          {multiTFLevels.daily && <MultiTFLevel label="R1" value={multiTFLevels.daily.r1} ltp={ltp} type="resistance" tf="1D" />}
                          {multiTFLevels.fourH && <MultiTFLevel label="R2" value={multiTFLevels.fourH.r2} ltp={ltp} type="resistance" tf="4H" />}
                          {multiTFLevels.fourH && <MultiTFLevel label="R1" value={multiTFLevels.fourH.r1} ltp={ltp} type="resistance" tf="4H" />}
                        </div>
                      </div>
                      <div>
                        <p className="text-[8px] text-destructive/70 font-bold uppercase tracking-wider mb-2">Support</p>
                        <div className="space-y-1">
                          {multiTFLevels.fourH && <MultiTFLevel label="S1" value={multiTFLevels.fourH.s1} ltp={ltp} type="support" tf="4H" />}
                          {multiTFLevels.fourH && <MultiTFLevel label="S2" value={multiTFLevels.fourH.s2} ltp={ltp} type="support" tf="4H" />}
                          {multiTFLevels.daily && <MultiTFLevel label="S1" value={multiTFLevels.daily.s1} ltp={ltp} type="support" tf="1D" />}
                          {multiTFLevels.daily && <MultiTFLevel label="S2" value={multiTFLevels.daily.s2} ltp={ltp} type="support" tf="1D" />}
                          {multiTFLevels.weekly && <MultiTFLevel label="S1" value={multiTFLevels.weekly.s1} ltp={ltp} type="support" tf="1W" />}
                          {multiTFLevels.weekly && <MultiTFLevel label="S2" value={multiTFLevels.weekly.s2} ltp={ltp} type="support" tf="1W" />}
                          {multiTFLevels.monthly && <MultiTFLevel label="S1" value={multiTFLevels.monthly.s1} ltp={ltp} type="support" tf="1M" />}
                          {multiTFLevels.monthly && <MultiTFLevel label="S2" value={multiTFLevels.monthly.s2} ltp={ltp} type="support" tf="1M" />}
                          {multiTFLevels.yearly && <MultiTFLevel label="S1" value={multiTFLevels.yearly.s1} ltp={ltp} type="support" tf="1Y" />}
                          {multiTFLevels.yearly && <MultiTFLevel label="S2" value={multiTFLevels.yearly.s2} ltp={ltp} type="support" tf="1Y" />}
                        </div>
                      </div>
                    </div>
                  ) : <p className="text-[10px] text-muted-foreground">Loading S/R data...</p>}
                </div>

                {/* 3. Daily EMAs */}
                <div className="t-card p-4">
                  <SectionTitle icon="📈">Moving Averages · Daily (EMA / SMA)</SectionTitle>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                    {[
                      { l: 'EMA 9', v: technicals.ema_9 }, { l: 'EMA 20', v: technicals.ema_20 },
                      { l: 'EMA 50', v: technicals.ema_50 }, { l: 'EMA 200', v: technicals.ema_200 },
                      { l: 'SMA 50', v: technicals.sma_50 }, { l: 'SMA 200', v: technicals.sma_200 },
                    ].map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/15">
                        <span className="text-[10px] text-muted-foreground">{m.l}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-foreground font-medium font-data">{m.v ? formatCurrency(m.v) : '—'}</span>
                          {m.v && (
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${ltp > m.v ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                              {ltp > m.v ? 'Above' : 'Below'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Volume & VWAP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="t-card p-4">
                    <SectionTitle icon="📊">Volume Analysis</SectionTitle>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Volume Ratio</span>
                        <span className={`text-sm font-black font-data ${(technicals.volume_ratio || 1) > 1.5 ? 'text-primary' : (technicals.volume_ratio || 1) < 0.5 ? 'text-destructive' : 'text-foreground'}`}>
                          {technicals.volume_ratio?.toFixed(2)}× avg
                        </span>
                      </div>
                      <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${(technicals.volume_ratio || 1) > 1.5 ? 'bg-primary' : (technicals.volume_ratio || 1) < 0.5 ? 'bg-destructive' : 'bg-accent'}`}
                          style={{ width: `${Math.min((technicals.volume_ratio || 1) * 33, 100)}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>Avg Vol (20D): {formatVolume(technicals.avg_volume_20)}</span>
                        <span className={`font-bold ${(technicals.volume_ratio || 1) > 1.5 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {(technicals.volume_ratio || 1) > 2 ? 'HIGH VOL 🔥' : (technicals.volume_ratio || 1) > 1.3 ? 'ABOVE AVG' : (technicals.volume_ratio || 1) < 0.5 ? 'DRY' : 'NORMAL'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="t-card p-4">
                    <SectionTitle icon="📉">Bollinger Bands (20,2)</SectionTitle>
                    <div className="space-y-2">
                      <MetricCard label="Upper" value={formatCurrency(technicals.bollinger_upper)} color="text-primary" />
                      <MetricCard label="Middle (SMA20)" value={formatCurrency(technicals.bollinger_middle)} />
                      <MetricCard label="Lower" value={formatCurrency(technicals.bollinger_lower)} color="text-destructive" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="t-card p-12 text-center">
                <p className="text-muted-foreground text-sm">{isLoading ? '⏳ Loading technical data...' : 'Technical data unavailable'}</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'fundamentals' && (
          <motion.div key="fundamentals" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
            {fundamentals ? (
              <>
                <div className="t-card p-4">
                  <SectionTitle icon="💰">Valuation</SectionTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    <MetricCard label="P/E" value={fundamentals.pe_ratio?.toFixed(1) || '—'} />
                    <MetricCard label="Forward P/E" value={fundamentals.forward_pe?.toFixed(1) || '—'} />
                    <MetricCard label="P/B" value={fundamentals.pb_ratio?.toFixed(2) || '—'} />
                    <MetricCard label="PEG" value={fundamentals.peg_ratio?.toFixed(2) || '—'} />
                    <MetricCard label="EV" value={fundamentals.enterprise_value ? formatMarketCap(fundamentals.enterprise_value) : '—'} />
                    <MetricCard label="MCap" value={fundamentals.market_cap ? formatMarketCap(fundamentals.market_cap) : '—'} />
                  </div>
                </div>
                <div className="t-card p-4">
                  <SectionTitle icon="📈">Profitability & Growth</SectionTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    <MetricCard label="ROE" value={fundamentals.roe ? `${fundamentals.roe.toFixed(1)}%` : '—'} color={(fundamentals.roe || 0) >= 15 ? 'text-primary' : undefined} />
                    <MetricCard label="ROA" value={fundamentals.roa ? `${fundamentals.roa.toFixed(1)}%` : '—'} />
                    <MetricCard label="Profit Margin" value={fundamentals.profit_margins ? `${fundamentals.profit_margins.toFixed(1)}%` : '—'} />
                    <MetricCard label="Op. Margin" value={fundamentals.operating_margins ? `${fundamentals.operating_margins.toFixed(1)}%` : '—'} />
                    <MetricCard label="Rev Growth" value={fundamentals.revenue_growth ? `${fundamentals.revenue_growth.toFixed(1)}%` : '—'} color={(fundamentals.revenue_growth || 0) > 10 ? 'text-primary' : undefined} />
                    <MetricCard label="EPS (TTM)" value={fundamentals.eps_trailing?.toFixed(2) || '—'} />
                  </div>
                </div>
                <div className="t-card p-4">
                  <SectionTitle icon="🏛️">Health & Dividend</SectionTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    <MetricCard label="D/E" value={fundamentals.debt_to_equity?.toFixed(2) || '—'} color={(fundamentals.debt_to_equity || 0) > 1.5 ? 'text-destructive' : (fundamentals.debt_to_equity || 0) <= 0.5 ? 'text-primary' : undefined} />
                    <MetricCard label="Current Ratio" value={fundamentals.current_ratio?.toFixed(2) || '—'} />
                    <MetricCard label="Div Yield" value={fundamentals.dividend_yield ? `${fundamentals.dividend_yield.toFixed(1)}%` : '—'} />
                    <MetricCard label="Beta" value={fundamentals.beta?.toFixed(2) || '—'} />
                    <MetricCard label="Book Value" value={fundamentals.book_value?.toFixed(2) || '—'} />
                    <MetricCard label="52W Range" value={fundamentals.week_52_low && fundamentals.week_52_high ? `${formatCurrency(fundamentals.week_52_low)} - ${formatCurrency(fundamentals.week_52_high)}` : '—'} />
                  </div>
                </div>
                {fundamentals.recommendation && (
                  <div className="t-card p-4">
                    <SectionTitle icon="🎯">Analyst Consensus</SectionTitle>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <MetricCard label="Consensus" value={fundamentals.recommendation?.toUpperCase() || '—'} color={fundamentals.recommendation === 'buy' || fundamentals.recommendation === 'strong_buy' ? 'text-primary' : fundamentals.recommendation === 'sell' ? 'text-destructive' : undefined} />
                      <MetricCard label="Target" value={formatCurrency(fundamentals.target_mean_price)} />
                      <MetricCard label="Target High" value={formatCurrency(fundamentals.target_high_price)} color="text-primary" />
                      <MetricCard label="Target Low" value={formatCurrency(fundamentals.target_low_price)} color="text-destructive" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="t-card p-12 text-center">
                <p className="text-muted-foreground text-sm">{isLoading ? '⏳ Loading fundamentals...' : 'Fundamental data unavailable'}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── AI Fundamentals (always visible below tabs) ─── */}
      <div className="mt-4">
        <AIFundamentalsPanel symbol={symbol!} quote={quote} technicals={technicals} partialFundamentals={fundamentals} />
      </div>
    </div>
  );
}
