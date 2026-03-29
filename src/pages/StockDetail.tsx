import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFullStockData, useStockChart, useAIAnalysis } from '@/hooks/useStockData';
import { getStock, generateCandleData } from '@/data/mockData';
import { formatCurrency, formatPercent, formatVolume, formatMarketCap } from '@/utils/format';
import useStore from '@/store/useStore';

function ScoreBar({ label, score, maxScore = 20 }: { label: string; score: number; maxScore?: number }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground w-20 text-right shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-primary" />
      </div>
      <span className="text-[9px] text-foreground w-8">{score}/{maxScore}</span>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    'A+': 'bg-primary/20 text-primary border-primary/30', 'A': 'bg-primary/15 text-primary border-primary/25',
    'B+': 'bg-terminal-blue/15 text-terminal-blue border-terminal-blue/25', 'B': 'bg-terminal-blue/10 text-terminal-blue border-terminal-blue/20',
    'C+': 'bg-terminal-amber/15 text-terminal-amber border-terminal-amber/25', 'C': 'bg-terminal-amber/10 text-terminal-amber border-terminal-amber/20',
    'D': 'bg-destructive/15 text-destructive border-destructive/25', 'F': 'bg-destructive/20 text-destructive border-destructive/30',
  };
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-black border ${colors[grade] || 'bg-secondary text-muted-foreground border-border'}`}>
      {grade}
    </span>
  );
}

const INTERVALS = [
  { key: '1d', label: 'D', desc: 'Daily' },
  { key: '60m', label: '4H', desc: '4 Hour' },
  { key: '1wk', label: 'W', desc: 'Weekly' },
  { key: '1mo', label: 'M', desc: 'Monthly' },
];

const RANGES = [
  { key: '1mo', label: '1M' }, { key: '3mo', label: '3M' }, { key: '6mo', label: '6M' },
  { key: '1y', label: '1Y' }, { key: '2y', label: '2Y' }, { key: '5y', label: '5Y' },
];

export default function StockDetail() {
  const { symbol } = useParams();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const { watchlist, addToWatchlist, removeFromWatchlist } = useStore();
  const inWatchlist = watchlist.includes(symbol || '');
  const [period, setPeriod] = useState('1y');
  const [chartInterval, setChartInterval] = useState('1d');
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
  const fundamentals = fullData?.fundamentals;
  const realChartData = chartData?.length > 0 ? chartData : generateCandleData(symbol || '', 250);

  const renderChart = useCallback(async () => {
    if (chartInstanceRef.current) { try { chartInstanceRef.current.remove(); } catch {} }
    if (!chartRef.current || !realChartData?.length) return;

    try {
      const { createChart, CandlestickSeries, HistogramSeries, LineSeries } = await import('lightweight-charts');
      const height = chartExpanded ? 600 : 420;
      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth, height,
        layout: { background: { color: '#0a0e14' }, textColor: '#484f58', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
        grid: { vertLines: { color: '#1c233315' }, horzLines: { color: '#1c233315' } },
        crosshair: { mode: 0, vertLine: { color: '#58a6ff20', width: 1 }, horzLine: { color: '#58a6ff20', width: 1 } },
        rightPriceScale: { borderColor: '#1c233340', scaleMargins: { top: 0.05, bottom: 0.18 } },
        timeScale: { borderColor: '#1c233340', rightOffset: 5, barSpacing: 8 },
      });

      const cs = chart.addSeries(CandlestickSeries, {
        upColor: '#00d68f', downColor: '#ff4757', borderUpColor: '#00d68f', borderDownColor: '#ff4757',
        wickUpColor: '#00d68f80', wickDownColor: '#ff475780',
      });
      cs.setData(realChartData);

      // Volume
      const vs = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      vs.setData(realChartData.map((c: any) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? '#00d68f10' : '#ff475710' })));

      // EMA helper
      const addEMA = (period: number, color: string) => {
        if (realChartData.length <= period) return;
        const k = 2 / (period + 1);
        let e = realChartData.slice(0, period).reduce((s: number, c: any) => s + c.close, 0) / period;
        const emaData = [{ time: realChartData[period - 1].time, value: e }];
        for (let i = period; i < realChartData.length; i++) {
          e = realChartData[i].close * k + e * (1 - k);
          emaData.push({ time: realChartData[i].time, value: e });
        }
        const s = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        s.setData(emaData);
      };

      // Only 20, 50, 200 EMA
      addEMA(20, '#e3b34170');
      addEMA(50, '#58a6ff50');
      addEMA(200, '#ff475750');

      // Auto S1-S3, R1-R3 price lines
      if (technicals) {
        const levels = [
          { price: technicals.s1, title: 'S1', color: '#ff475750' },
          { price: technicals.s2, title: 'S2', color: '#ff475740' },
          { price: technicals.s3, title: 'S3', color: '#ff475730' },
          { price: technicals.r1, title: 'R1', color: '#00d68f50' },
          { price: technicals.r2, title: 'R2', color: '#00d68f40' },
          { price: technicals.r3, title: 'R3', color: '#00d68f30' },
        ];
        levels.forEach(l => {
          if (l.price) {
            cs.createPriceLine({ price: l.price, color: l.color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: l.title });
          }
        });
      }

      chart.subscribeCrosshairMove((param: any) => {
        if (!param?.time) { setCrosshairData(null); return; }
        const candle = param.seriesData?.get(cs);
        if (candle) setCrosshairData({ ...candle, time: param.time });
      });

      chart.timeScale().fitContent();
      chartInstanceRef.current = chart;
      const ro = new ResizeObserver(() => { if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth }); });
      ro.observe(chartRef.current);
    } catch {}
  }, [realChartData, technicals, chartExpanded]);

  useEffect(() => {
    if (chartRef.current && realChartData?.length > 0) renderChart();
    return () => { if (chartInstanceRef.current) { try { chartInstanceRef.current.remove(); } catch {} } };
  }, [renderChart]);

  const handleAnalyze = () => { setShowAI(true); setActiveTab('ai'); refetchAI(); };

  if (!quote && !isLoading) return <div className="flex items-center justify-center h-96 text-muted-foreground text-[11px]">Stock not found</div>;

  const ltp = quote?.ltp || 0;
  const changePct = quote?.change_pct || 0;

  return (
    <div className="p-3 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-lg font-bold text-foreground">{symbol}</h1>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{quote?.exchange || 'NSE'}</span>
              {quote?.sector && <span className="text-[8px] px-1.5 py-0.5 rounded bg-terminal-blue/10 text-terminal-blue">{quote.sector}</span>}
              {isLoading && <span className="text-[8px] text-terminal-amber animate-pulse">● LOADING...</span>}
              {!isLoading && !error && <span className="text-[8px] text-primary">● LIVE</span>}
            </div>
            <p className="text-[10px] text-muted-foreground">{quote?.name || symbol}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleAnalyze} disabled={aiLoading}
              className="t-btn border-terminal-cyan/30 text-terminal-cyan hover:bg-terminal-cyan/10 text-[9px]">
              {aiLoading ? '⏳ ANALYZING...' : '🤖 AI ANALYSIS'}
            </button>
            <button onClick={() => inWatchlist ? removeFromWatchlist(symbol!) : addToWatchlist(symbol!)}
              className={`t-btn text-[9px] ${inWatchlist ? 'border-terminal-amber/30 text-terminal-amber' : ''}`}>
              {inWatchlist ? '★' : '☆'}
            </button>
            <Link to={`/options/${symbol}`} className="t-btn text-[9px]">OPTIONS</Link>
          </div>
        </div>
        <div className="flex items-baseline gap-3 mt-1.5">
          <span className="text-2xl font-bold text-foreground">{formatCurrency(ltp)}</span>
          <span className={`text-base font-semibold ${changePct >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatPercent(changePct)}</span>
          {quote?.volume && <span className="text-[10px] text-muted-foreground">Vol: {formatVolume(quote.volume)}</span>}
          {(quote?.market_cap || fundamentals?.market_cap) && <span className="text-[10px] text-muted-foreground">MCap: {formatMarketCap(quote.market_cap || fundamentals?.market_cap)}</span>}
        </div>
      </motion.div>

      {/* Full Chart Section */}
      <div className="t-card p-2 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Interval */}
            <div className="flex gap-0.5 bg-background rounded p-0.5">
              {INTERVALS.map(i => (
                <button key={i.key} onClick={() => setChartInterval(i.key)}
                  className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all ${chartInterval === i.key ? 'bg-terminal-blue/15 text-terminal-blue' : 'text-muted-foreground hover:text-foreground'}`}>
                  {i.label}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-border" />
            {/* Range */}
            <div className="flex gap-0.5 bg-background rounded p-0.5">
              {RANGES.map(r => (
                <button key={r.key} onClick={() => setPeriod(r.key)}
                  className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all ${period === r.key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-border" />
            {/* EMA legend */}
            <div className="flex items-center gap-2 text-[8px]">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-terminal-amber/70 rounded" /> EMA 20</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-terminal-blue/50 rounded" /> EMA 50</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-destructive/50 rounded" /> EMA 200</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chartLoading && <span className="text-[8px] text-terminal-amber animate-pulse">● LOADING...</span>}
            <button onClick={() => setChartExpanded(!chartExpanded)} className="text-[9px] text-muted-foreground hover:text-foreground">
              {chartExpanded ? '⊟ COLLAPSE' : '⊞ EXPAND'}
            </button>
          </div>
        </div>
        {/* OHLCV crosshair */}
        {crosshairData && (
          <div className="flex items-center gap-3 text-[9px] mb-1 px-1">
            <span className="text-muted-foreground">O:<span className="text-foreground ml-0.5">{crosshairData.open?.toFixed(2)}</span></span>
            <span className="text-muted-foreground">H:<span className="text-foreground ml-0.5">{crosshairData.high?.toFixed(2)}</span></span>
            <span className="text-muted-foreground">L:<span className="text-foreground ml-0.5">{crosshairData.low?.toFixed(2)}</span></span>
            <span className="text-muted-foreground">C:<span className="text-foreground ml-0.5">{crosshairData.close?.toFixed(2)}</span></span>
          </div>
        )}
        <div ref={chartRef} className="w-full" style={{ height: chartExpanded ? 600 : 420 }} />
        {/* S/R Quick Reference */}
        {technicals && (
          <div className="flex items-center justify-between px-2 pt-2 border-t border-border/30 mt-1">
            <div className="flex items-center gap-3 text-[8px]">
              <span className="text-destructive">S3: {formatCurrency(technicals.s3)}</span>
              <span className="text-destructive">S2: {formatCurrency(technicals.s2)}</span>
              <span className="text-destructive">S1: {formatCurrency(technicals.s1)}</span>
            </div>
            <span className="text-[8px] text-terminal-amber">Pivot: {formatCurrency(technicals.pivot)}</span>
            <div className="flex items-center gap-3 text-[8px]">
              <span className="text-primary">R1: {formatCurrency(technicals.r1)}</span>
              <span className="text-primary">R2: {formatCurrency(technicals.r2)}</span>
              <span className="text-primary">R3: {formatCurrency(technicals.r3)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-0.5 mb-3 bg-secondary/50 p-0.5 rounded-sm w-fit">
        {(['overview', 'technicals', 'fundamentals', 'ai'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'ai' && !showAI) handleAnalyze(); }}
            className={`px-3 py-1 rounded-sm text-[10px] font-semibold transition-all ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab === 'ai' ? '🤖 AI' : tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { l: 'Open', v: formatCurrency(quote?.open) }, { l: 'High', v: formatCurrency(quote?.high) },
              { l: 'Low', v: formatCurrency(quote?.low) }, { l: 'Prev Close', v: formatCurrency(quote?.prev_close) },
              { l: '52W High', v: formatCurrency(quote?.week_52_high || fundamentals?.week_52_high) },
              { l: '52W Low', v: formatCurrency(quote?.week_52_low || fundamentals?.week_52_low) },
              { l: 'Volume', v: formatVolume(quote?.volume) },
              { l: 'Avg Vol (10D)', v: formatVolume(fundamentals?.avg_volume_10d || quote?.avg_volume_10d) },
            ].map((m, i) => (
              <div key={i} className="t-card p-2">
                <p className="text-[8px] text-muted-foreground mb-0.5">{m.l}</p>
                <p className="text-[11px] text-foreground font-semibold">{m.v}</p>
              </div>
            ))}
          </div>

          {/* Support & Resistance */}
          {technicals && (
            <div className="grid grid-cols-2 gap-2">
              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-primary mb-2 tracking-wide">▼ SUPPORT LEVELS</h3>
                <div className="space-y-2">
                  {[{ l: 'S1', v: technicals.s1 }, { l: 'S2', v: technicals.s2 }, { l: 'S3', v: technicals.s3 }].map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground font-semibold">{s.l}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-foreground">{formatCurrency(s.v)}</span>
                        {s.v && ltp && <span className="text-[8px] text-destructive">{((s.v - ltp) / ltp * 100).toFixed(1)}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-destructive mb-2 tracking-wide">▲ RESISTANCE LEVELS</h3>
                <div className="space-y-2">
                  {[{ l: 'R1', v: technicals.r1 }, { l: 'R2', v: technicals.r2 }, { l: 'R3', v: technicals.r3 }].map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground font-semibold">{r.l}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-foreground">{formatCurrency(r.v)}</span>
                        {r.v && ltp && <span className="text-[8px] text-primary">+{((r.v - ltp) / ltp * 100).toFixed(1)}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Fundamentals */}
          <div className="t-card p-3">
            <h3 className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-wide">FUNDAMENTAL RATIOS</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { l: 'P/E', v: fundamentals?.pe_ratio || quote?.pe_ratio },
                { l: 'P/B', v: fundamentals?.pb_ratio },
                { l: 'ROE', v: fundamentals?.roe ? `${fundamentals.roe.toFixed(1)}%` : (quote?.roe ? `${quote.roe}%` : '—') },
                { l: 'D/E', v: fundamentals?.debt_to_equity ?? quote?.debt_to_equity },
                { l: 'Div Yield', v: fundamentals?.dividend_yield ? `${fundamentals.dividend_yield.toFixed(1)}%` : (quote?.dividend_yield ? `${quote.dividend_yield}%` : '—') },
                { l: 'Beta', v: fundamentals?.beta?.toFixed(2) },
              ].map((m, i) => (
                <div key={i}>
                  <p className="text-[8px] text-muted-foreground mb-0.5">{m.l}</p>
                  <p className="text-[12px] font-semibold text-foreground">{m.v ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links for paid data */}
          <div className="t-card p-3">
            <h3 className="text-[10px] font-semibold text-muted-foreground mb-2 tracking-wide">📊 DETAILED DATA SOURCES</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Screener.in', url: `https://www.screener.in/company/${symbol}/` },
                { label: 'Moneycontrol', url: `https://www.moneycontrol.com/india/stockpricequote/${symbol}` },
                { label: 'Trendlyne', url: `https://trendlyne.com/equity/${symbol}/` },
                { label: 'Tickertape', url: `https://www.tickertape.in/stocks/${symbol}` },
                { label: 'Yahoo Finance', url: `https://finance.yahoo.com/quote/${symbol}.NS` },
              ].map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="text-[9px] px-2 py-1 rounded bg-terminal-blue/10 text-terminal-blue border border-terminal-blue/20 hover:bg-terminal-blue/20 transition-colors">
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Technicals Tab */}
      {activeTab === 'technicals' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {technicals ? (
            <>
              {/* Moving Averages */}
              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-wide">MOVING AVERAGES</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { l: 'EMA 20', v: technicals.ema_20 }, { l: 'EMA 50', v: technicals.ema_50 },
                    { l: 'EMA 200', v: technicals.ema_200 }, { l: 'SMA 20', v: technicals.sma_20 },
                    { l: 'SMA 50', v: technicals.sma_50 }, { l: 'SMA 200', v: technicals.sma_200 },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-border/20">
                      <span className="text-[9px] text-muted-foreground">{m.l}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-foreground">{m.v ? formatCurrency(m.v) : '—'}</span>
                        {m.v && <span className={`text-[8px] ${ltp > m.v ? 'text-primary' : 'text-destructive'}`}>{ltp > m.v ? '▲ Above' : '▼ Below'}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Oscillators */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="t-card p-3">
                  <p className="text-[8px] text-muted-foreground mb-1">RSI (14)</p>
                  <p className={`text-xl font-bold ${(technicals.rsi_14 || 50) > 70 ? 'text-destructive' : (technicals.rsi_14 || 50) < 30 ? 'text-primary' : 'text-foreground'}`}>
                    {technicals.rsi_14?.toFixed(1) || '—'}
                  </p>
                  <p className="text-[8px] text-muted-foreground">
                    {(technicals.rsi_14 || 50) > 70 ? 'OVERBOUGHT' : (technicals.rsi_14 || 50) < 30 ? 'OVERSOLD' : 'NEUTRAL'}
                  </p>
                </div>
                <div className="t-card p-3">
                  <p className="text-[8px] text-muted-foreground mb-1">MACD</p>
                  <p className={`text-xl font-bold ${(technicals.macd || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {technicals.macd?.toFixed(2) || '—'}
                  </p>
                  <p className="text-[8px] text-muted-foreground">{(technicals.macd || 0) >= 0 ? 'BULLISH' : 'BEARISH'}</p>
                </div>
                <div className="t-card p-3">
                  <p className="text-[8px] text-muted-foreground mb-1">ATR (14)</p>
                  <p className="text-xl font-bold text-foreground">{technicals.atr_14?.toFixed(2) || '—'}</p>
                  <p className="text-[8px] text-muted-foreground">VOLATILITY</p>
                </div>
              </div>

              {/* Trend & Patterns */}
              <div className="grid grid-cols-2 gap-2">
                <div className="t-card p-3">
                  <h3 className="text-[10px] font-semibold text-muted-foreground mb-2">TREND ANALYSIS</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-bold ${technicals.trend === 'Bullish' ? 'text-primary' : technicals.trend === 'Bearish' ? 'text-destructive' : 'text-terminal-amber'}`}>
                      {technicals.trend}
                    </span>
                    <span className="text-[9px] text-muted-foreground">• {technicals.trend_strength}</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    Vol Ratio: <span className={`${(technicals.volume_ratio || 1) > 1.5 ? 'text-primary' : 'text-foreground'}`}>{technicals.volume_ratio?.toFixed(1)}x</span> avg
                  </div>
                </div>
                <div className="t-card p-3">
                  <h3 className="text-[10px] font-semibold text-muted-foreground mb-2">CANDLE PATTERNS</h3>
                  {technicals.candle_patterns?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {technicals.candle_patterns.map((p: string, i: number) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-terminal-amber/10 text-terminal-amber border border-terminal-amber/20">{p}</span>
                      ))}
                    </div>
                  ) : <p className="text-[9px] text-muted-foreground">No patterns detected</p>}
                </div>
              </div>

              {/* Bollinger Bands */}
              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground mb-2">BOLLINGER BANDS (20,2)</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-[8px] text-muted-foreground">Upper</p><p className="text-[11px] text-foreground">{formatCurrency(technicals.bollinger_upper)}</p></div>
                  <div><p className="text-[8px] text-muted-foreground">Middle</p><p className="text-[11px] text-foreground">{formatCurrency(technicals.bollinger_middle)}</p></div>
                  <div><p className="text-[8px] text-muted-foreground">Lower</p><p className="text-[11px] text-foreground">{formatCurrency(technicals.bollinger_lower)}</p></div>
                </div>
              </div>

              {/* Support & Resistance */}
              <div className="grid grid-cols-2 gap-2">
                <div className="t-card p-3">
                  <h3 className="text-[10px] font-semibold text-primary mb-2 tracking-wide">▼ SUPPORT LEVELS</h3>
                  <div className="space-y-2">
                    {[{ l: 'S1', v: technicals.s1 }, { l: 'S2', v: technicals.s2 }, { l: 'S3', v: technicals.s3 }].map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground font-semibold">{s.l}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-foreground">{formatCurrency(s.v)}</span>
                          {s.v && <span className="text-[8px] text-destructive">{((s.v - ltp) / ltp * 100).toFixed(1)}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="t-card p-3">
                  <h3 className="text-[10px] font-semibold text-destructive mb-2 tracking-wide">▲ RESISTANCE LEVELS</h3>
                  <div className="space-y-2">
                    {[{ l: 'R1', v: technicals.r1 }, { l: 'R2', v: technicals.r2 }, { l: 'R3', v: technicals.r3 }].map((r, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground font-semibold">{r.l}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-foreground">{formatCurrency(r.v)}</span>
                          {r.v && <span className="text-[8px] text-primary">+{((r.v - ltp) / ltp * 100).toFixed(1)}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="t-card p-8 text-center">
              <p className="text-muted-foreground text-[11px]">{isLoading ? '⏳ Loading technical data...' : 'Technical data unavailable'}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Fundamentals Tab */}
      {activeTab === 'fundamentals' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {fundamentals ? (
            <>
              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-wide">VALUATION</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { l: 'Trailing P/E', v: fundamentals.pe_ratio?.toFixed(1) }, { l: 'Forward P/E', v: fundamentals.forward_pe?.toFixed(1) },
                    { l: 'P/B Ratio', v: fundamentals.pb_ratio?.toFixed(2) }, { l: 'PEG Ratio', v: fundamentals.peg_ratio?.toFixed(2) },
                    { l: 'EV/EBITDA', v: fundamentals.enterprise_value && fundamentals.ebitda ? (fundamentals.enterprise_value / fundamentals.ebitda).toFixed(1) : null },
                    { l: 'Book Value', v: fundamentals.book_value ? `₹${fundamentals.book_value.toFixed(2)}` : null },
                  ].map((m, i) => (
                    <div key={i}><p className="text-[8px] text-muted-foreground mb-0.5">{m.l}</p><p className="text-[12px] font-semibold text-foreground">{m.v ?? '—'}</p></div>
                  ))}
                </div>
              </div>

              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-wide">PROFITABILITY</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { l: 'ROE', v: fundamentals.roe ? `${fundamentals.roe.toFixed(1)}%` : null },
                    { l: 'ROA', v: fundamentals.roa ? `${fundamentals.roa.toFixed(1)}%` : null },
                    { l: 'Profit Margin', v: fundamentals.profit_margins ? `${fundamentals.profit_margins.toFixed(1)}%` : null },
                    { l: 'Operating Margin', v: fundamentals.operating_margins ? `${fundamentals.operating_margins.toFixed(1)}%` : null },
                    { l: 'Gross Margin', v: fundamentals.gross_margins ? `${fundamentals.gross_margins.toFixed(1)}%` : null },
                    { l: 'EPS (TTM)', v: fundamentals.eps_trailing ? `₹${fundamentals.eps_trailing.toFixed(2)}` : null },
                  ].map((m, i) => (
                    <div key={i}><p className="text-[8px] text-muted-foreground mb-0.5">{m.l}</p><p className="text-[12px] font-semibold text-foreground">{m.v ?? '—'}</p></div>
                  ))}
                </div>
              </div>

              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-wide">GROWTH & HEALTH</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { l: 'Revenue Growth', v: fundamentals.revenue_growth ? `${fundamentals.revenue_growth.toFixed(1)}%` : null },
                    { l: 'Earnings Growth', v: fundamentals.earnings_growth ? `${fundamentals.earnings_growth.toFixed(1)}%` : null },
                    { l: 'Debt/Equity', v: fundamentals.debt_to_equity?.toFixed(2) },
                    { l: 'Current Ratio', v: fundamentals.current_ratio?.toFixed(2) },
                    { l: 'Quick Ratio', v: fundamentals.quick_ratio?.toFixed(2) },
                    { l: 'Beta', v: fundamentals.beta?.toFixed(2) },
                  ].map((m, i) => (
                    <div key={i}><p className="text-[8px] text-muted-foreground mb-0.5">{m.l}</p><p className="text-[12px] font-semibold text-foreground">{m.v ?? '—'}</p></div>
                  ))}
                </div>
              </div>

              {fundamentals.recommendation && (
                <div className="t-card p-3">
                  <h3 className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-wide">ANALYST CONSENSUS</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div><p className="text-[8px] text-muted-foreground mb-0.5">Recommendation</p><p className={`text-[12px] font-bold uppercase ${fundamentals.recommendation?.includes('buy') ? 'text-primary' : fundamentals.recommendation?.includes('sell') ? 'text-destructive' : 'text-terminal-amber'}`}>{fundamentals.recommendation}</p></div>
                    <div><p className="text-[8px] text-muted-foreground mb-0.5">Target Mean</p><p className="text-[12px] font-semibold text-foreground">{formatCurrency(fundamentals.target_mean_price)}</p></div>
                    <div><p className="text-[8px] text-muted-foreground mb-0.5">Target Range</p><p className="text-[10px] text-muted-foreground">{formatCurrency(fundamentals.target_low_price)} - {formatCurrency(fundamentals.target_high_price)}</p></div>
                    <div><p className="text-[8px] text-muted-foreground mb-0.5"># Analysts</p><p className="text-[12px] font-semibold text-foreground">{fundamentals.num_analysts || '—'}</p></div>
                  </div>
                </div>
              )}

              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-wide">DIVIDENDS & CASHFLOW</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { l: 'Dividend Yield', v: fundamentals.dividend_yield ? `${fundamentals.dividend_yield.toFixed(2)}%` : null },
                    { l: 'Dividend Rate', v: fundamentals.dividend_rate ? `₹${fundamentals.dividend_rate.toFixed(2)}` : null },
                    { l: 'Free Cashflow', v: fundamentals.free_cashflow ? formatCurrency(fundamentals.free_cashflow, true) : null },
                    { l: 'Operating CF', v: fundamentals.operating_cashflow ? formatCurrency(fundamentals.operating_cashflow, true) : null },
                    { l: 'Total Revenue', v: fundamentals.total_revenue ? formatCurrency(fundamentals.total_revenue, true) : null },
                    { l: 'EBITDA', v: fundamentals.ebitda ? formatCurrency(fundamentals.ebitda, true) : null },
                  ].map((m, i) => (
                    <div key={i}><p className="text-[8px] text-muted-foreground mb-0.5">{m.l}</p><p className="text-[12px] font-semibold text-foreground">{m.v ?? '—'}</p></div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="t-card p-8 text-center">
              <p className="text-muted-foreground text-[11px]">{isLoading ? '⏳ Loading...' : 'Fundamental data unavailable'}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* AI Tab */}
      {activeTab === 'ai' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {aiLoading ? (
            <div className="t-card p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-terminal-cyan/30 border-t-terminal-cyan rounded-full animate-spin" />
                <p className="text-terminal-cyan text-[11px]">🤖 AI is analyzing {symbol}...</p>
                <p className="text-[9px] text-muted-foreground">Evaluating technicals, fundamentals, patterns & risk</p>
              </div>
            </div>
          ) : aiAnalysis && !aiAnalysis.error ? (
            <>
              <div className="t-card p-3 border-l-2 border-terminal-cyan">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <GradeBadge grade={aiAnalysis.grade} />
                    <div>
                      <span className="text-lg font-bold text-foreground">{aiAnalysis.overall_score}/100</span>
                      <p className={`text-[10px] font-semibold ${aiAnalysis.verdict?.includes('Buy') ? 'text-primary' : aiAnalysis.verdict?.includes('Sell') ? 'text-destructive' : 'text-terminal-amber'}`}>
                        {aiAnalysis.verdict}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] text-terminal-cyan">● {aiAnalysis.freshness || 'Fresh'}</span>
                </div>
                <p className="text-[11px] text-foreground leading-relaxed">{aiAnalysis.summary}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="t-card p-2">
                  <p className="text-[8px] text-muted-foreground mb-1">🎯 Key Levels</p>
                  <p className="text-[10px] text-foreground">Support: {formatCurrency(aiAnalysis.key_levels?.immediate_support)}</p>
                  <p className="text-[10px] text-foreground">Resistance: {formatCurrency(aiAnalysis.key_levels?.immediate_resistance)}</p>
                  <p className="text-[10px] text-destructive">SL: {formatCurrency(aiAnalysis.key_levels?.stop_loss)}</p>
                </div>
                <div className="t-card p-2">
                  <p className="text-[8px] text-muted-foreground mb-1">🎯 Targets</p>
                  <p className="text-[10px] text-primary">T1: {formatCurrency(aiAnalysis.key_levels?.target_1)}</p>
                  <p className="text-[10px] text-primary">T2: {formatCurrency(aiAnalysis.key_levels?.target_2)}</p>
                </div>
                <div className="t-card p-2">
                  <p className="text-[8px] text-muted-foreground mb-1">🕯️ Candle</p>
                  <p className="text-[10px] text-foreground">{aiAnalysis.candle_analysis?.pattern || 'None'}</p>
                  <p className={`text-[9px] ${aiAnalysis.candle_analysis?.bias === 'Bullish' ? 'text-primary' : aiAnalysis.candle_analysis?.bias === 'Bearish' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {aiAnalysis.candle_analysis?.bias}
                  </p>
                </div>
              </div>

              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-foreground mb-3">⭐ Quality Score Breakdown</h3>
                <div className="space-y-1.5">
                  {aiAnalysis.scores && Object.entries(aiAnalysis.scores).map(([key, val]: [string, any]) => (
                    <ScoreBar key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} score={val?.score || 0} maxScore={20} />
                  ))}
                </div>
              </div>

              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground mb-2">⚠️ RISK ASSESSMENT</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${aiAnalysis.risk_assessment?.risk_level === 'Low' ? 'bg-primary/10 text-primary' : aiAnalysis.risk_assessment?.risk_level === 'High' || aiAnalysis.risk_assessment?.risk_level === 'Very High' ? 'bg-destructive/10 text-destructive' : 'bg-terminal-amber/10 text-terminal-amber'}`}>
                    {aiAnalysis.risk_assessment?.risk_level}
                  </span>
                </div>
                {aiAnalysis.risk_assessment?.risk_factors?.map((f: string, i: number) => (
                  <p key={i} className="text-[9px] text-muted-foreground">• {f}</p>
                ))}
                {aiAnalysis.risk_assessment?.invalidation && (
                  <p className="text-[9px] text-destructive mt-1">⚡ Invalidation: {aiAnalysis.risk_assessment.invalidation}</p>
                )}
              </div>
            </>
          ) : (
            <div className="t-card p-8 text-center">
              <p className="text-muted-foreground text-[11px]">{aiAnalysis?.error || 'Click AI ANALYSIS to get started'}</p>
              <button onClick={handleAnalyze} className="t-btn mt-3 border-terminal-cyan/30 text-terminal-cyan">🤖 RUN ANALYSIS</button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
