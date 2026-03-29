import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFullStockData, useStockChart, useAIAnalysis } from '@/hooks/useStockData';
import { getStock, generateCandleData } from '@/data/mockData';
import { formatCurrency, formatPercent, formatVolume, formatMarketCap } from '@/utils/format';
import useStore from '@/store/useStore';

function ScoreBar({ label, score, maxScore = 20, color = 'bg-primary' }: { label: string; score: number; maxScore?: number; color?: string }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground w-20 text-right shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-[9px] text-foreground w-8">{score}/{maxScore}</span>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    'A+': 'bg-primary/20 text-primary border-primary/30',
    'A': 'bg-primary/15 text-primary border-primary/25',
    'B+': 'bg-terminal-blue/15 text-terminal-blue border-terminal-blue/25',
    'B': 'bg-terminal-blue/10 text-terminal-blue border-terminal-blue/20',
    'C+': 'bg-terminal-amber/15 text-terminal-amber border-terminal-amber/25',
    'C': 'bg-terminal-amber/10 text-terminal-amber border-terminal-amber/20',
    'D': 'bg-destructive/15 text-destructive border-destructive/25',
    'F': 'bg-destructive/20 text-destructive border-destructive/30',
  };
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-black border ${colors[grade] || 'bg-secondary text-muted-foreground border-border'}`}>
      {grade}
    </span>
  );
}

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

  // Fetch real data
  const { data: fullData, isLoading, error } = useFullStockData(symbol || '');
  const { data: chartData } = useStockChart(symbol || '', chartInterval, period);
  const { data: aiAnalysis, isLoading: aiLoading, refetch: refetchAI } = useAIAnalysis(fullData, showAI);

  // Fallback to mock data
  const mockStock = getStock(symbol || '');
  const quote = fullData?.quote || mockStock;
  const technicals = fullData?.technicals;
  const fundamentals = fullData?.fundamentals;
  const realChartData = chartData || generateCandleData(symbol || '', 250);

  useEffect(() => {
    if (chartRef.current && (realChartData?.length > 0 || mockStock)) renderChart();
    return () => { if (chartInstanceRef.current) { try { chartInstanceRef.current.remove(); } catch {} } };
  }, [symbol, period, chartInterval, realChartData]);

  const renderChart = async () => {
    if (chartInstanceRef.current) { try { chartInstanceRef.current.remove(); } catch {} }
    if (!chartRef.current) return;
    const data = realChartData?.length > 0 ? realChartData : generateCandleData(symbol || '', 250);
    if (!data.length) return;

    try {
      const { createChart, CandlestickSeries, HistogramSeries, LineSeries } = await import('lightweight-charts');
      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth, height: 350,
        layout: { background: { color: '#0a0e14' }, textColor: '#484f58', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
        grid: { vertLines: { color: '#1c233320' }, horzLines: { color: '#1c233320' } },
        crosshair: { mode: 0 },
        rightPriceScale: { borderColor: '#1c233360' },
        timeScale: { borderColor: '#1c233360' },
      });

      const cs = chart.addSeries(CandlestickSeries, { upColor: '#00d68f', downColor: '#ff4757', borderUpColor: '#00d68f', borderDownColor: '#ff4757', wickUpColor: '#00d68f80', wickDownColor: '#ff475780' });
      cs.setData(data);

      const vs = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      vs.setData(data.map((c: any) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? '#00d68f18' : '#ff475718' })));

      // Add SMA lines if we have enough data
      if (data.length > 20) {
        const sma20 = chart.addSeries(LineSeries, { color: '#e3b34160', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        const sma20Data = [];
        for (let i = 19; i < data.length; i++) {
          const sum = data.slice(i - 19, i + 1).reduce((s: number, c: any) => s + c.close, 0);
          sma20Data.push({ time: data[i].time, value: sum / 20 });
        }
        sma20.setData(sma20Data);
      }

      // Add support/resistance lines if technicals available
      if (technicals) {
        const markers = [];
        if (technicals.s1) {
          const priceLine = cs.createPriceLine({ price: technicals.s1, color: '#ff475760', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'S1' });
        }
        if (technicals.r1) {
          cs.createPriceLine({ price: technicals.r1, color: '#00d68f60', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'R1' });
        }
      }

      chart.timeScale().fitContent();
      chartInstanceRef.current = chart;
      const ro = new ResizeObserver(() => { if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth }); });
      ro.observe(chartRef.current);
    } catch {}
  };

  const handleAnalyze = () => {
    setShowAI(true);
    setActiveTab('ai');
    refetchAI();
  };

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
              {isLoading && <span className="text-[8px] text-terminal-amber animate-pulse">● LOADING LIVE DATA...</span>}
              {!isLoading && !error && <span className="text-[8px] text-primary">● LIVE</span>}
            </div>
            <p className="text-[10px] text-muted-foreground">{quote?.name || symbol}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleAnalyze} disabled={aiLoading}
              className="t-btn border-terminal-cyan/30 text-terminal-cyan hover:bg-terminal-cyan/10">
              {aiLoading ? '⏳ ANALYZING...' : '🤖 AI ANALYSIS'}
            </button>
            <button onClick={() => inWatchlist ? removeFromWatchlist(symbol!) : addToWatchlist(symbol!)}
              className={`t-btn ${inWatchlist ? 'border-terminal-amber/30 text-terminal-amber' : ''}`}>
              {inWatchlist ? '★ WATCHING' : '☆ WATCH'}
            </button>
            <Link to={`/charts/${symbol}`} className="t-btn t-btn-active">FULL CHART</Link>
            <Link to={`/options/${symbol}`} className="t-btn">OPTIONS</Link>
          </div>
        </div>
        <div className="flex items-baseline gap-3 mt-2">
          <span className="text-3xl font-bold text-foreground">{formatCurrency(ltp)}</span>
          <span className={`text-lg font-semibold ${changePct >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatPercent(changePct)}</span>
          {quote?.volume && <span className="text-[10px] text-muted-foreground">Vol: {formatVolume(quote.volume)}</span>}
          {(quote?.market_cap || fundamentals?.market_cap) && (
            <span className="text-[10px] text-muted-foreground">MCap: {formatMarketCap(quote.market_cap || fundamentals?.market_cap)}</span>
          )}
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex gap-0.5 mb-3 bg-secondary/50 p-0.5 rounded-sm w-fit">
        {(['overview', 'technicals', 'fundamentals', 'ai'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'ai' && !showAI) handleAnalyze(); }}
            className={`px-3 py-1 rounded-sm text-[10px] font-semibold transition-all ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab === 'ai' ? '🤖 AI ANALYSIS' : tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="t-card p-2 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted-foreground font-semibold">PRICE CHART</span>
          <div className="flex gap-2">
            <div className="flex gap-0.5">
              {[{ k: '1d', l: 'D' }, { k: '1wk', l: 'W' }, { k: '1mo', l: 'M' }].map(i => (
                <button key={i.k} onClick={() => setChartInterval(i.k)}
                  className={`px-2 py-0.5 rounded text-[9px] font-semibold ${chartInterval === i.k ? 'bg-terminal-blue/15 text-terminal-blue' : 'text-muted-foreground hover:text-foreground'}`}>{i.l}</button>
              ))}
            </div>
            <div className="w-px h-4 bg-border self-center" />
            <div className="flex gap-0.5">
              {[{ k: '1mo', l: '1M' }, { k: '3mo', l: '3M' }, { k: '6mo', l: '6M' }, { k: '1y', l: '1Y' }, { k: '2y', l: '2Y' }, { k: '5y', l: '5Y' }].map(p => (
                <button key={p.k} onClick={() => setPeriod(p.k)}
                  className={`px-2 py-0.5 rounded text-[9px] font-semibold ${period === p.k ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{p.l}</button>
              ))}
            </div>
          </div>
        </div>
        <div ref={chartRef} className="w-full" style={{ height: 350 }} />
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* OHLC + Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {[
              { l: 'Open', v: formatCurrency(quote?.open) },
              { l: 'High', v: formatCurrency(quote?.high) },
              { l: 'Low', v: formatCurrency(quote?.low) },
              { l: 'Prev Close', v: formatCurrency(quote?.prev_close) },
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
            <div className="grid grid-cols-2 gap-2 mb-3">
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
                    { l: 'SMA 5', v: technicals.sma_5 }, { l: 'SMA 10', v: technicals.sma_10 },
                    { l: 'SMA 20', v: technicals.sma_20 }, { l: 'SMA 50', v: technicals.sma_50 },
                    { l: 'SMA 100', v: technicals.sma_100 }, { l: 'SMA 200', v: technicals.sma_200 },
                    { l: 'EMA 9', v: technicals.ema_9 }, { l: 'EMA 12', v: technicals.ema_12 },
                    { l: 'EMA 20', v: technicals.ema_20 }, { l: 'EMA 26', v: technicals.ema_26 },
                    { l: 'EMA 50', v: technicals.ema_50 }, { l: 'EMA 200', v: technicals.ema_200 },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-border/20">
                      <span className="text-[9px] text-muted-foreground">{m.l}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-foreground">{m.v ? formatCurrency(m.v) : '—'}</span>
                        {m.v && <span className={`text-[8px] ${ltp > m.v ? 'text-primary' : 'text-destructive'}`}>{ltp > m.v ? '▲' : '▼'}</span>}
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
                  ) : (
                    <p className="text-[9px] text-muted-foreground">No patterns detected</p>
                  )}
                </div>
              </div>

              {/* Bollinger Bands */}
              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground mb-2">BOLLINGER BANDS (20,2)</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[8px] text-muted-foreground">Upper</p>
                    <p className="text-[11px] text-foreground">{formatCurrency(technicals.bollinger_upper)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-muted-foreground">Middle</p>
                    <p className="text-[11px] text-foreground">{formatCurrency(technicals.bollinger_middle)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-muted-foreground">Lower</p>
                    <p className="text-[11px] text-foreground">{formatCurrency(technicals.bollinger_lower)}</p>
                  </div>
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
              <p className="text-muted-foreground text-[11px]">
                {isLoading ? '⏳ Loading technical data...' : 'Technical data unavailable — using mock fallback'}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Fundamentals Tab */}
      {activeTab === 'fundamentals' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {fundamentals ? (
            <>
              {/* Valuation */}
              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-wide">VALUATION</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { l: 'Trailing P/E', v: fundamentals.pe_ratio?.toFixed(1) },
                    { l: 'Forward P/E', v: fundamentals.forward_pe?.toFixed(1) },
                    { l: 'P/B Ratio', v: fundamentals.pb_ratio?.toFixed(2) },
                    { l: 'PEG Ratio', v: fundamentals.peg_ratio?.toFixed(2) },
                    { l: 'EV/EBITDA', v: fundamentals.enterprise_value && fundamentals.ebitda ? (fundamentals.enterprise_value / fundamentals.ebitda).toFixed(1) : null },
                    { l: 'Book Value', v: fundamentals.book_value ? `₹${fundamentals.book_value.toFixed(2)}` : null },
                  ].map((m, i) => (
                    <div key={i}>
                      <p className="text-[8px] text-muted-foreground mb-0.5">{m.l}</p>
                      <p className="text-[12px] font-semibold text-foreground">{m.v ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profitability */}
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
                    <div key={i}>
                      <p className="text-[8px] text-muted-foreground mb-0.5">{m.l}</p>
                      <p className="text-[12px] font-semibold text-foreground">{m.v ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Growth */}
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
                    <div key={i}>
                      <p className="text-[8px] text-muted-foreground mb-0.5">{m.l}</p>
                      <p className="text-[12px] font-semibold text-foreground">{m.v ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analyst */}
              {fundamentals.recommendation && (
                <div className="t-card p-3">
                  <h3 className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-wide">ANALYST CONSENSUS</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <p className="text-[8px] text-muted-foreground mb-0.5">Recommendation</p>
                      <p className={`text-[12px] font-bold uppercase ${fundamentals.recommendation?.includes('buy') ? 'text-primary' : fundamentals.recommendation?.includes('sell') ? 'text-destructive' : 'text-terminal-amber'}`}>
                        {fundamentals.recommendation}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] text-muted-foreground mb-0.5">Target Mean</p>
                      <p className="text-[12px] font-semibold text-foreground">{formatCurrency(fundamentals.target_mean_price)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-muted-foreground mb-0.5">Target Range</p>
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(fundamentals.target_low_price)} - {formatCurrency(fundamentals.target_high_price)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-muted-foreground mb-0.5"># Analysts</p>
                      <p className="text-[12px] font-semibold text-foreground">{fundamentals.num_analysts || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dividends & Cashflow */}
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
                    <div key={i}>
                      <p className="text-[8px] text-muted-foreground mb-0.5">{m.l}</p>
                      <p className="text-[12px] font-semibold text-foreground">{m.v ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="t-card p-8 text-center">
              <p className="text-muted-foreground text-[11px]">
                {isLoading ? '⏳ Loading fundamental data...' : 'Fundamental data unavailable'}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* AI Analysis Tab */}
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
          ) : aiAnalysis ? (
            <>
              {/* Summary Header */}
              <div className="t-card p-3 border-l-2 border-terminal-cyan">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-terminal-cyan font-semibold">● {aiAnalysis.freshness || 'Fresh'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GradeBadge grade={aiAnalysis.grade} />
                    <span className="text-lg font-bold text-foreground">{aiAnalysis.overall_score}/100</span>
                  </div>
                </div>
                <p className="text-[11px] text-foreground leading-relaxed">{aiAnalysis.summary}</p>
              </div>

              {/* Key Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="t-card p-2">
                  <p className="text-[8px] text-muted-foreground mb-1">🎯 Key Level</p>
                  <p className="text-[10px] text-foreground">Support: {formatCurrency(aiAnalysis.key_levels?.immediate_support)}</p>
                  <p className="text-[10px] text-foreground">Resistance: {formatCurrency(aiAnalysis.key_levels?.immediate_resistance)}</p>
                </div>
                <div className="t-card p-2">
                  <p className="text-[8px] text-muted-foreground mb-1">📊 Volume</p>
                  <p className="text-[10px] text-foreground">{technicals?.volume_ratio?.toFixed(1)}x avg volume</p>
                </div>
                <div className="t-card p-2">
                  <p className="text-[8px] text-muted-foreground mb-1">🕯️ Candle</p>
                  <p className="text-[10px] text-foreground">{aiAnalysis.candle_analysis?.pattern || 'None'}</p>
                  <p className="text-[8px] text-muted-foreground">{aiAnalysis.candle_analysis?.description}</p>
                </div>
              </div>

              {/* MA & Structure Analysis */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="t-card p-2">
                  <p className="text-[8px] text-muted-foreground mb-1">📐 Structure</p>
                  <p className={`text-[10px] font-semibold ${aiAnalysis.ma_analysis?.alignment === 'Bullish' ? 'text-primary' : aiAnalysis.ma_analysis?.alignment === 'Bearish' ? 'text-destructive' : 'text-terminal-amber'}`}>
                    {aiAnalysis.ma_analysis?.alignment} MA stack
                  </p>
                  <p className="text-[8px] text-muted-foreground">{aiAnalysis.ma_analysis?.description}</p>
                </div>
                <div className="t-card p-2">
                  <p className="text-[8px] text-muted-foreground mb-1">💪 Relative Strength</p>
                  <p className="text-[10px] text-foreground">{aiAnalysis.scores?.relative_strength?.comment}</p>
                </div>
                <div className="t-card p-2">
                  <p className="text-[8px] text-muted-foreground mb-1">🏭 Sector</p>
                  <p className="text-[10px] text-foreground">{aiAnalysis.sector_context}</p>
                </div>
              </div>

              {/* Quality Score Breakdown */}
              <div className="t-card p-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-semibold text-foreground">⭐ Quality Score</span>
                  <GradeBadge grade={aiAnalysis.grade} />
                  <span className="text-[10px] text-muted-foreground">{aiAnalysis.overall_score}/100</span>
                </div>
                <div className="space-y-1.5">
                  {aiAnalysis.scores && Object.entries(aiAnalysis.scores).map(([key, val]: [string, any]) => (
                    <ScoreBar
                      key={key}
                      label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      score={val?.score || 0}
                      maxScore={20}
                      color="bg-primary"
                    />
                  ))}
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="t-card p-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground mb-2">⚠️ RISK ASSESSMENT</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground">Risk:</span>
                    <span className={`text-[10px] font-semibold ${aiAnalysis.risk_assessment?.risk_level === 'Low' ? 'text-primary' : aiAnalysis.risk_assessment?.risk_level === 'High' ? 'text-destructive' : 'text-terminal-amber'}`}>
                      {aiAnalysis.risk_assessment?.risk_level}
                    </span>
                  </div>
                  {aiAnalysis.risk_assessment?.risk_factors?.map((f: string, i: number) => (
                    <p key={i} className="text-[9px] text-muted-foreground">• {f}</p>
                  ))}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-destructive font-semibold">🚫 Invalidation:</span>
                    <span className="text-[9px] text-muted-foreground">{aiAnalysis.risk_assessment?.invalidation}</span>
                  </div>
                </div>
              </div>

              {/* Verdict & Targets */}
              <div className="t-card p-3 border-t-2 border-primary">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${
                    aiAnalysis.verdict?.includes('Buy') ? 'text-primary' :
                    aiAnalysis.verdict?.includes('Sell') ? 'text-destructive' : 'text-terminal-amber'
                  }`}>
                    {aiAnalysis.verdict}
                  </span>
                </div>
                {aiAnalysis.key_levels && (
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <p className="text-[8px] text-muted-foreground">Stop Loss</p>
                      <p className="text-[11px] font-semibold text-destructive">{formatCurrency(aiAnalysis.key_levels.stop_loss)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-muted-foreground">Support</p>
                      <p className="text-[11px] font-semibold text-foreground">{formatCurrency(aiAnalysis.key_levels.immediate_support)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-muted-foreground">Target 1</p>
                      <p className="text-[11px] font-semibold text-primary">{formatCurrency(aiAnalysis.key_levels.target_1)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-muted-foreground">Target 2</p>
                      <p className="text-[11px] font-semibold text-primary">{formatCurrency(aiAnalysis.key_levels.target_2)}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="t-card p-12 text-center">
              <p className="text-muted-foreground text-[11px] mb-2">Click "AI ANALYSIS" to get a comprehensive analysis</p>
              <button onClick={handleAnalyze} className="t-btn border-terminal-cyan/30 text-terminal-cyan">🤖 RUN AI ANALYSIS</button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
