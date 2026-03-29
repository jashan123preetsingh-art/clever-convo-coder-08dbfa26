import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFullStockData, useStockChart, useAIAnalysis } from '@/hooks/useStockData';
import { getStock, generateCandleData } from '@/data/mockData';
import { formatCurrency, formatPercent, formatVolume, formatMarketCap } from '@/utils/format';
import useStore from '@/store/useStore';

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

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    'A+': 'bg-primary/15 text-primary border-primary/25', 'A': 'bg-primary/12 text-primary border-primary/20',
    'B+': 'bg-[hsl(var(--terminal-blue)/0.12)] text-[hsl(var(--terminal-blue))] border-[hsl(var(--terminal-blue)/0.2)]',
    'B': 'bg-[hsl(var(--terminal-blue)/0.08)] text-[hsl(var(--terminal-blue))] border-[hsl(var(--terminal-blue)/0.15)]',
    'C+': 'bg-accent/12 text-accent border-accent/20', 'C': 'bg-accent/8 text-accent border-accent/15',
    'D': 'bg-destructive/12 text-destructive border-destructive/20', 'F': 'bg-destructive/15 text-destructive border-destructive/25',
  };
  return (
    <span className={`inline-flex items-center justify-center w-11 h-11 rounded-lg text-sm font-black border ${colors[grade] || 'bg-secondary text-muted-foreground border-border'}`}>
      {grade}
    </span>
  );
}

function ScoreBar({ label, score, maxScore = 20 }: { label: string; score: number; maxScore?: number }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const color = pct >= 70 ? 'bg-primary' : pct >= 40 ? 'bg-accent' : 'bg-destructive';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground w-24 text-right shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className={`h-full rounded-full ${color}`} />
      </div>
      <span className="text-[9px] text-foreground font-semibold w-10 font-data">{score}/{maxScore}</span>
    </div>
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
  const { watchlist, addToWatchlist, removeFromWatchlist } = useStore();
  const inWatchlist = watchlist.includes(symbol || '');
  const [period, setPeriod] = useState('1y');
  const [chartInterval] = useState('1d');
  const [showAI, setShowAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'technicals' | 'fundamentals' | 'ai'>('overview');
  const [crosshairData, setCrosshairData] = useState<any>(null);
  const [chartExpanded, setChartExpanded] = useState(false);

  const { data: fullData, isLoading, error } = useFullStockData(symbol || '');
  const { data: chartData, isLoading: chartLoading } = useStockChart(symbol || '', chartInterval, period);
  const { data: aiAnalysis, isLoading: aiLoading, refetch: refetchAI } = useAIAnalysis(fullData, showAI);

  const mockStock = getStock(symbol || '');
  const quote = fullData?.quote || mockStock;
  const technicals = fullData?.technicals;
  const apiFundamentals = fullData?.fundamentals;
  const hasApiFundamentals = apiFundamentals && Object.values(apiFundamentals).some(v => v !== null && v !== undefined);
  const fundamentals = hasApiFundamentals ? apiFundamentals : mockStock ? {
    pe_ratio: mockStock.pe_ratio, market_cap: mockStock.market_cap, roe: mockStock.roe,
    roce: mockStock.roce, debt_to_equity: mockStock.debt_to_equity, dividend_yield: mockStock.dividend_yield,
    promoter_holding: (mockStock as any).promoter_holding,
  } : null;
  const realChartData = chartData?.length > 0 ? chartData : generateCandleData(symbol || '', 250);

  // ─── Optimized Chart ───
  const renderChart = useCallback(async () => {
    if (chartInstanceRef.current) { try { chartInstanceRef.current.remove(); } catch {} }
    if (!chartRef.current || !realChartData?.length) return;

    try {
      const { createChart, CandlestickSeries, HistogramSeries } = await import('lightweight-charts');
      const height = chartExpanded ? 560 : 380;
      const isDark = true;

      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height,
        layout: {
          background: { color: 'transparent' },
          textColor: isDark ? '#64748b' : '#94a3b8',
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

      // Candlesticks with premium colors
      const cs = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b98180',
        wickDownColor: '#ef444480',
      });
      cs.setData(realChartData);

      // Volume histogram
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

  const handleAnalyze = () => { setShowAI(true); setActiveTab('ai'); refetchAI(); };

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
    <div className="p-5 max-w-[1600px] mx-auto space-y-4">
      {/* ─── Header ─── */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-start justify-between">
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
            <button onClick={handleAnalyze} disabled={aiLoading}
              className="px-3.5 py-1.5 rounded-md text-[10px] font-semibold bg-[hsl(var(--terminal-cyan)/0.08)] text-[hsl(var(--terminal-cyan))] border border-[hsl(var(--terminal-cyan)/0.15)] hover:bg-[hsl(var(--terminal-cyan)/0.15)] transition-all disabled:opacity-50">
              {aiLoading ? '⏳ Analyzing...' : '🤖 AI Analysis'}
            </button>
            <button onClick={() => inWatchlist ? removeFromWatchlist(symbol!) : addToWatchlist(symbol!)}
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
        <div className="flex items-center gap-5 mt-1.5 text-[10px] text-muted-foreground font-data">
          {quote?.volume && <span>Vol: <span className="text-foreground font-medium">{formatVolume(quote.volume)}</span></span>}
          {(quote?.market_cap || fundamentals?.market_cap) && <span>MCap: <span className="text-foreground font-medium">{formatMarketCap(quote.market_cap || fundamentals?.market_cap)}</span></span>}
          {fundamentals?.pe_ratio && <span>P/E: <span className="text-foreground font-medium">{fundamentals.pe_ratio.toFixed(1)}</span></span>}
        </div>
      </motion.div>

      {/* ─── Chart ─── */}
      <div className="t-card p-4 overflow-hidden">
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

        {/* Crosshair OHLCV */}
        <AnimatePresence>
          {crosshairData && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-4 text-[10px] mb-2 px-1 font-data">
              <span className="text-muted-foreground">O <span className="text-foreground font-medium">{crosshairData.open?.toFixed(2)}</span></span>
              <span className="text-muted-foreground">H <span className="text-foreground font-medium">{crosshairData.high?.toFixed(2)}</span></span>
              <span className="text-muted-foreground">L <span className="text-foreground font-medium">{crosshairData.low?.toFixed(2)}</span></span>
              <span className="text-muted-foreground">C <span className={`font-medium ${crosshairData.close >= crosshairData.open ? 'text-primary' : 'text-destructive'}`}>{crosshairData.close?.toFixed(2)}</span></span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={chartRef} className="w-full rounded-md overflow-hidden" style={{ height: chartExpanded ? 560 : 380 }} />

        {/* Pivot strip */}
        {technicals && (
          <div className="flex items-center justify-between px-2 pt-3 mt-2 border-t border-border/20 font-data">
            <div className="flex items-center gap-4 text-[9px]">
              <span className="text-destructive/70">S3: {formatCurrency(technicals.s3)}</span>
              <span className="text-destructive/50">S2: {formatCurrency(technicals.s2)}</span>
              <span className="text-destructive/35">S1: {formatCurrency(technicals.s1)}</span>
            </div>
            <span className="text-[9px] text-accent font-semibold">Pivot: {formatCurrency(technicals.pivot)}</span>
            <div className="flex items-center gap-4 text-[9px]">
              <span className="text-primary/35">R1: {formatCurrency(technicals.r1)}</span>
              <span className="text-primary/50">R2: {formatCurrency(technicals.r2)}</span>
              <span className="text-primary/70">R3: {formatCurrency(technicals.r3)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="flex gap-0.5 bg-secondary/30 p-0.5 rounded-lg w-fit border border-border/30">
        {(['overview', 'technicals', 'fundamentals', 'ai'] as const).map(t => (
          <button key={t} onClick={() => { setActiveTab(t); if (t === 'ai' && !showAI) handleAnalyze(); }}
            className={`px-4 py-2 rounded-md text-[10px] font-semibold transition-all tracking-wide
              ${activeTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'ai' ? '🤖 AI' : t.charAt(0).toUpperCase() + t.slice(1)}
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
              <div className="grid grid-cols-2 gap-3">
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
                <div className="t-card p-4">
                  <SectionTitle icon="📈">Moving Averages</SectionTitle>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                    {[
                      { l: 'EMA 20', v: technicals.ema_20 }, { l: 'EMA 50', v: technicals.ema_50 },
                      { l: 'EMA 200', v: technicals.ema_200 }, { l: 'SMA 20', v: technicals.sma_20 },
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

                <div className="grid grid-cols-3 gap-3">
                  <div className="t-card p-4 text-center">
                    <p className="text-[9px] text-muted-foreground mb-2 uppercase tracking-[0.12em]">RSI (14)</p>
                    <p className={`text-2xl font-black font-data ${(technicals.rsi_14 || 50) > 70 ? 'text-destructive' : (technicals.rsi_14 || 50) < 30 ? 'text-primary' : 'text-foreground'}`}>
                      {technicals.rsi_14?.toFixed(1) || '—'}
                    </p>
                    <p className={`text-[9px] mt-1 font-bold ${(technicals.rsi_14 || 50) > 70 ? 'text-destructive' : (technicals.rsi_14 || 50) < 30 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {(technicals.rsi_14 || 50) > 70 ? 'OVERBOUGHT' : (technicals.rsi_14 || 50) < 30 ? 'OVERSOLD' : 'NEUTRAL'}
                    </p>
                  </div>
                  <div className="t-card p-4 text-center">
                    <p className="text-[9px] text-muted-foreground mb-2 uppercase tracking-[0.12em]">MACD</p>
                    <p className={`text-2xl font-black font-data ${(technicals.macd || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {technicals.macd?.toFixed(2) || '—'}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-1 font-bold">{(technicals.macd || 0) >= 0 ? 'BULLISH' : 'BEARISH'}</p>
                  </div>
                  <div className="t-card p-4 text-center">
                    <p className="text-[9px] text-muted-foreground mb-2 uppercase tracking-[0.12em]">ATR (14)</p>
                    <p className="text-2xl font-black text-foreground font-data">{technicals.atr_14?.toFixed(2) || '—'}</p>
                    <p className="text-[9px] text-muted-foreground mt-1 font-bold">VOLATILITY</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="t-card p-4">
                    <SectionTitle icon="🎯">Trend</SectionTitle>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-sm font-black px-3 py-1.5 rounded-md ${technicals.trend === 'Bullish' ? 'bg-primary/10 text-primary' : technicals.trend === 'Bearish' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}`}>
                        {technicals.trend}
                      </span>
                      <span className="text-[10px] text-muted-foreground">· {technicals.trend_strength}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-2 font-data">
                      Vol Ratio: <span className={`font-semibold ${(technicals.volume_ratio || 1) > 1.5 ? 'text-primary' : 'text-foreground'}`}>{technicals.volume_ratio?.toFixed(1)}×</span> avg
                    </div>
                  </div>
                  <div className="t-card p-4">
                    <SectionTitle icon="🕯️">Candle Patterns</SectionTitle>
                    {technicals.candle_patterns?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {technicals.candle_patterns.map((p: string, i: number) => (
                          <span key={i} className="text-[10px] px-2.5 py-1 rounded-md bg-accent/8 text-accent border border-accent/15 font-medium">{p}</span>
                        ))}
                      </div>
                    ) : <p className="text-[10px] text-muted-foreground">No patterns detected</p>}
                  </div>
                </div>

                <div className="t-card p-4">
                  <SectionTitle icon="📉">Bollinger Bands (20,2)</SectionTitle>
                  <div className="grid grid-cols-3 gap-3">
                    <MetricCard label="Upper" value={formatCurrency(technicals.bollinger_upper)} />
                    <MetricCard label="Middle" value={formatCurrency(technicals.bollinger_middle)} />
                    <MetricCard label="Lower" value={formatCurrency(technicals.bollinger_lower)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <MetricCard label="Trailing P/E" value={fundamentals.pe_ratio?.toFixed(1) || '—'} />
                    <MetricCard label="Forward P/E" value={fundamentals.forward_pe?.toFixed(1) || '—'} />
                    <MetricCard label="P/B Ratio" value={fundamentals.pb_ratio?.toFixed(2) || '—'} />
                    <MetricCard label="PEG Ratio" value={fundamentals.peg_ratio?.toFixed(2) || '—'} />
                    <MetricCard label="EV/EBITDA" value={fundamentals.enterprise_value && fundamentals.ebitda ? (fundamentals.enterprise_value / fundamentals.ebitda).toFixed(1) : '—'} />
                    <MetricCard label="Book Value" value={fundamentals.book_value ? `₹${fundamentals.book_value.toFixed(2)}` : '—'} />
                  </div>
                </div>

                <div className="t-card p-4">
                  <SectionTitle icon="📈">Profitability</SectionTitle>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <MetricCard label="ROE" value={fundamentals.roe ? `${fundamentals.roe.toFixed(1)}%` : '—'} color={(fundamentals.roe || 0) >= 15 ? 'text-primary' : undefined} />
                    <MetricCard label="ROA" value={fundamentals.roa ? `${fundamentals.roa.toFixed(1)}%` : '—'} />
                    <MetricCard label="Profit Margin" value={fundamentals.profit_margins ? `${fundamentals.profit_margins.toFixed(1)}%` : '—'} />
                    <MetricCard label="Operating Margin" value={fundamentals.operating_margins ? `${fundamentals.operating_margins.toFixed(1)}%` : '—'} />
                    <MetricCard label="Gross Margin" value={fundamentals.gross_margins ? `${fundamentals.gross_margins.toFixed(1)}%` : '—'} />
                    <MetricCard label="EPS (TTM)" value={fundamentals.eps_trailing ? `₹${fundamentals.eps_trailing.toFixed(2)}` : '—'} />
                  </div>
                </div>

                <div className="t-card p-4">
                  <SectionTitle icon="🏥">Growth & Health</SectionTitle>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <MetricCard label="Revenue Growth" value={fundamentals.revenue_growth ? `${fundamentals.revenue_growth.toFixed(1)}%` : '—'} color={(fundamentals.revenue_growth || 0) > 0 ? 'text-primary' : 'text-destructive'} />
                    <MetricCard label="Earnings Growth" value={fundamentals.earnings_growth ? `${fundamentals.earnings_growth.toFixed(1)}%` : '—'} color={(fundamentals.earnings_growth || 0) > 0 ? 'text-primary' : 'text-destructive'} />
                    <MetricCard label="Debt/Equity" value={fundamentals.debt_to_equity?.toFixed(2) || '—'} color={(fundamentals.debt_to_equity || 0) <= 0.5 ? 'text-primary' : (fundamentals.debt_to_equity || 0) > 1.5 ? 'text-destructive' : undefined} />
                    <MetricCard label="Current Ratio" value={fundamentals.current_ratio?.toFixed(2) || '—'} />
                    <MetricCard label="Quick Ratio" value={fundamentals.quick_ratio?.toFixed(2) || '—'} />
                    <MetricCard label="Beta" value={fundamentals.beta?.toFixed(2) || '—'} />
                  </div>
                </div>

                {fundamentals.recommendation && (
                  <div className="t-card p-4">
                    <SectionTitle icon="🎯">Analyst Consensus</SectionTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MetricCard label="Recommendation" value={fundamentals.recommendation?.toUpperCase() || '—'}
                        color={fundamentals.recommendation?.includes('buy') ? 'text-primary' : fundamentals.recommendation?.includes('sell') ? 'text-destructive' : 'text-accent'} />
                      <MetricCard label="Target Mean" value={formatCurrency(fundamentals.target_mean_price)} />
                      <MetricCard label="Target Range" value={`${formatCurrency(fundamentals.target_low_price)} – ${formatCurrency(fundamentals.target_high_price)}`} />
                      <MetricCard label="# Analysts" value={fundamentals.num_analysts?.toString() || '—'} />
                    </div>
                  </div>
                )}

                <div className="t-card p-4">
                  <SectionTitle icon="💵">Dividends & Cashflow</SectionTitle>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <MetricCard label="Dividend Yield" value={fundamentals.dividend_yield ? `${fundamentals.dividend_yield.toFixed(2)}%` : '—'} />
                    <MetricCard label="Dividend Rate" value={fundamentals.dividend_rate ? `₹${fundamentals.dividend_rate.toFixed(2)}` : '—'} />
                    <MetricCard label="Free Cashflow" value={fundamentals.free_cashflow ? formatCurrency(fundamentals.free_cashflow, true) : '—'} />
                    <MetricCard label="Operating CF" value={fundamentals.operating_cashflow ? formatCurrency(fundamentals.operating_cashflow, true) : '—'} />
                    <MetricCard label="Total Revenue" value={fundamentals.total_revenue ? formatCurrency(fundamentals.total_revenue, true) : '—'} />
                    <MetricCard label="EBITDA" value={fundamentals.ebitda ? formatCurrency(fundamentals.ebitda, true) : '—'} />
                  </div>
                </div>
              </>
            ) : (
              <div className="t-card p-12 text-center">
                <p className="text-muted-foreground text-sm">{isLoading ? '⏳ Loading fundamentals...' : 'Fundamental data unavailable'}</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'ai' && (
          <motion.div key="ai" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
            {aiLoading ? (
              <div className="t-card p-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-[hsl(var(--terminal-cyan)/0.3)] border-t-[hsl(var(--terminal-cyan))] rounded-full animate-spin" />
                  <p className="text-[hsl(var(--terminal-cyan))] text-sm font-medium">🤖 AI is analyzing {symbol}...</p>
                  <p className="text-[10px] text-muted-foreground">Evaluating technicals, fundamentals, patterns & risk</p>
                </div>
              </div>
            ) : aiAnalysis && !aiAnalysis.error ? (
              <>
                <div className="t-card p-5 border-l-2 border-[hsl(var(--terminal-cyan))]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <GradeBadge grade={aiAnalysis.grade} />
                      <div>
                        <span className="text-2xl font-black text-foreground font-data">{aiAnalysis.overall_score}/100</span>
                        <p className={`text-[11px] font-bold ${aiAnalysis.verdict?.includes('Buy') ? 'text-primary' : aiAnalysis.verdict?.includes('Sell') ? 'text-destructive' : 'text-accent'}`}>
                          {aiAnalysis.verdict}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] text-[hsl(var(--terminal-cyan))] font-medium">● {aiAnalysis.freshness || 'Fresh'}</span>
                  </div>
                  {aiAnalysis.summary && <p className="text-[11px] text-muted-foreground leading-relaxed">{aiAnalysis.summary}</p>}
                </div>

                {aiAnalysis.scores && (
                  <div className="t-card p-4">
                    <SectionTitle icon="📊">Score Breakdown</SectionTitle>
                    <div className="space-y-2">
                      {Object.entries(aiAnalysis.scores).map(([key, val]) => (
                        <ScoreBar key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} score={val as number} />
                      ))}
                    </div>
                  </div>
                )}

                {aiAnalysis.key_levels && (
                  <div className="t-card p-4">
                    <SectionTitle icon="🎯">AI Key Levels</SectionTitle>
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard label="Entry" value={formatCurrency(aiAnalysis.key_levels.entry)} color="text-[hsl(var(--terminal-cyan))]" />
                      <MetricCard label="Target" value={formatCurrency(aiAnalysis.key_levels.target)} color="text-primary" />
                      <MetricCard label="Stop Loss" value={formatCurrency(aiAnalysis.key_levels.stop_loss)} color="text-destructive" />
                    </div>
                  </div>
                )}

                {aiAnalysis.catalysts?.length > 0 && (
                  <div className="t-card p-4">
                    <SectionTitle icon="⚡">Catalysts</SectionTitle>
                    <div className="space-y-2">
                      {aiAnalysis.catalysts.map((c: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                          <span className="text-[hsl(var(--terminal-cyan))] mt-0.5">•</span><span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiAnalysis.risks?.length > 0 && (
                  <div className="t-card p-4">
                    <SectionTitle icon="⚠️">Risks</SectionTitle>
                    <div className="space-y-2">
                      {aiAnalysis.risks.map((r: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                          <span className="text-destructive mt-0.5">•</span><span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="t-card p-12 text-center">
                <p className="text-muted-foreground text-sm mb-3">{aiAnalysis?.error || 'Click AI Analysis to generate insights'}</p>
                <button onClick={handleAnalyze} className="text-[10px] px-4 py-2 rounded-md bg-[hsl(var(--terminal-cyan)/0.08)] text-[hsl(var(--terminal-cyan))] border border-[hsl(var(--terminal-cyan)/0.15)] hover:bg-[hsl(var(--terminal-cyan)/0.15)] transition-all font-semibold">
                  🤖 Generate AI Analysis
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
