import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStock, getAllStocks, generateCandleData } from '@/data/mockData';
import { useStockQuote, useStockChart } from '@/hooks/useStockData';
import { formatCurrency, formatPercent } from '@/utils/format';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BAJFINANCE', 'ITC', 'TATAMOTORS', 'SUNPHARMA', 'LT', 'MARUTI', 'TITAN', 'ADANIENT', 'WIPRO'];
const INTERVALS = [
  { key: '1d', label: 'D' }, { key: '1wk', label: 'W' }, { key: '1mo', label: 'M' },
];
const RANGES = [
  { key: '1mo', label: '1M' }, { key: '3mo', label: '3M' }, { key: '6mo', label: '6M' },
  { key: '1y', label: '1Y' }, { key: '2y', label: '2Y' }, { key: '5y', label: '5Y' }, { key: 'max', label: 'MAX' },
];

export default function Charts() {
  const { symbol: paramSymbol } = useParams();
  const [symbol, setSymbol] = useState(paramSymbol || 'RELIANCE');
  const [interval, setInterval] = useState('1d');
  const [range, setRange] = useState('1y');
  const [searchInput, setSearchInput] = useState('');
  const [crosshairData, setCrosshairData] = useState<any>(null);
  const [indicators, setIndicators] = useState({ sma20: true, sma50: true, ema20: false, volume: true, bollinger: false });
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Real data
  const { data: quoteData } = useStockQuote(symbol);
  const { data: realChartData, isLoading: chartLoading } = useStockChart(symbol, interval, range);

  // Fallback
  const mockStock = getStock(symbol);
  const info = quoteData || mockStock || { ltp: 0, change_pct: 0, name: symbol };
  const chartData = realChartData?.length > 0 ? realChartData : generateCandleData(symbol, interval === '1wk' ? 250 : interval === '1mo' ? 60 : 500);

  useEffect(() => {
    if (chartRef.current && chartData.length > 0) renderChart();
    return () => { if (chartInstanceRef.current) { try { chartInstanceRef.current.remove(); } catch {} } };
  }, [symbol, interval, range, indicators, chartData]);

  const renderChart = async () => {
    if (chartInstanceRef.current) { try { chartInstanceRef.current.remove(); } catch {} }
    if (!chartRef.current || !chartData.length) return;

    try {
      const { createChart, CandlestickSeries, HistogramSeries, LineSeries } = await import('lightweight-charts');
      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth, height: 550,
        layout: { background: { color: '#0a0e14' }, textColor: '#484f58', fontSize: 10, fontFamily: 'JetBrains Mono, Consolas, monospace' },
        grid: { vertLines: { color: '#1c233320' }, horzLines: { color: '#1c233320' } },
        crosshair: { mode: 0, vertLine: { color: '#58a6ff30', width: 1 }, horzLine: { color: '#58a6ff30', width: 1 } },
        rightPriceScale: { borderColor: '#1c233360', scaleMargins: { top: 0.05, bottom: 0.2 } },
        timeScale: { borderColor: '#1c233360', rightOffset: 5, barSpacing: 8, minBarSpacing: 4 },
        handleScroll: { vertTouchDrag: false },
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#00d68f', downColor: '#ff4757', borderUpColor: '#00d68f', borderDownColor: '#ff4757',
        wickUpColor: '#00d68f80', wickDownColor: '#ff475780',
      });
      candleSeries.setData(chartData);

      if (indicators.volume) {
        const vs = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
        vs.setData(chartData.map((c: any) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? '#00d68f12' : '#ff475712' })));
      }

      const addSMA = (period: number, color: string, enabled: boolean) => {
        if (!enabled || chartData.length <= period) return;
        const series = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        const smaData = [];
        for (let i = period - 1; i < chartData.length; i++) {
          const sum = chartData.slice(i - period + 1, i + 1).reduce((s: number, c: any) => s + c.close, 0);
          smaData.push({ time: chartData[i].time, value: sum / period });
        }
        series.setData(smaData);
      };

      addSMA(20, '#e3b34160', indicators.sma20);
      addSMA(50, '#58a6ff40', indicators.sma50);

      if (indicators.ema20 && chartData.length > 20) {
        const emaSeries = chart.addSeries(LineSeries, { color: '#ff475760', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        const k = 2 / 21;
        let e = chartData.slice(0, 20).reduce((s: number, c: any) => s + c.close, 0) / 20;
        const emaData = [{ time: chartData[19].time, value: e }];
        for (let i = 20; i < chartData.length; i++) {
          e = chartData[i].close * k + e * (1 - k);
          emaData.push({ time: chartData[i].time, value: e });
        }
        emaSeries.setData(emaData);
      }

      if (indicators.bollinger && chartData.length > 20) {
        const upper = chart.addSeries(LineSeries, { color: '#58a6ff25', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        const lower = chart.addSeries(LineSeries, { color: '#58a6ff25', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        const bbUpper: any[] = [], bbLower: any[] = [];
        for (let i = 19; i < chartData.length; i++) {
          const slice = chartData.slice(i - 19, i + 1);
          const avg = slice.reduce((s: number, c: any) => s + c.close, 0) / 20;
          const stdDev = Math.sqrt(slice.reduce((s: number, c: any) => s + (c.close - avg) ** 2, 0) / 20);
          bbUpper.push({ time: chartData[i].time, value: avg + 2 * stdDev });
          bbLower.push({ time: chartData[i].time, value: avg - 2 * stdDev });
        }
        upper.setData(bbUpper);
        lower.setData(bbLower);
      }

      chart.subscribeCrosshairMove((param: any) => {
        if (!param?.time) { setCrosshairData(null); return; }
        const candle = param.seriesData?.get(candleSeries);
        if (candle) setCrosshairData({ ...candle, time: param.time });
      });

      chart.timeScale().fitContent();
      chartInstanceRef.current = chart;
      const ro = new ResizeObserver(() => { if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth }); });
      ro.observe(chartRef.current);
    } catch (err) { console.error('Chart render error:', err); }
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      const found = getAllStocks().find(s => s.symbol.includes(searchInput.toUpperCase()));
      if (found) setSymbol(found.symbol);
      else setSymbol(searchInput.toUpperCase());
      setSearchInput('');
    }
  };

  return (
    <div className="p-2 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="t-card overflow-hidden mb-2">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-3">
            <input type="text" placeholder="SEARCH SYMBOL..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={handleSearch}
              className="bg-secondary border border-border rounded-sm px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground w-36 focus:outline-none focus:border-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground">{symbol}</h1>
                <span className={`text-sm font-bold ${(info as any).change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency((info as any).ltp)}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${(info as any).change_pct >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                  {formatPercent((info as any).change_pct)}
                </span>
                {chartLoading && <span className="text-[8px] text-terminal-amber animate-pulse">● LOADING...</span>}
              </div>
              <p className="text-[9px] text-muted-foreground">{(info as any).name} | NSE</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/stock/${symbol}`} className="t-btn">DETAIL</Link>
            <Link to={`/options/${symbol}`} className="t-btn">OPTIONS</Link>
          </div>
        </div>
        <div className="flex gap-0.5 px-2 pb-2 flex-wrap">
          {POPULAR.map(s => (
            <button key={s} onClick={() => setSymbol(s)}
              className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all border ${symbol === s ? 'bg-primary/15 text-primary border-primary/25' : 'bg-background text-muted-foreground border-border hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="t-card px-2 py-1.5 mb-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {/* Interval selector */}
          <div className="flex gap-0.5 bg-background rounded p-0.5">
            {INTERVALS.map(i => (
              <button key={i.key} onClick={() => setInterval(i.key)}
                className={`px-2 py-0.5 rounded text-[9px] font-semibold ${interval === i.key ? 'bg-terminal-blue/15 text-terminal-blue' : 'text-muted-foreground hover:text-foreground'}`}>
                {i.label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-border" />
          {/* Range selector */}
          <div className="flex gap-0.5 bg-background rounded p-0.5">
            {RANGES.map(r => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={`px-2 py-0.5 rounded text-[9px] font-semibold ${range === r.key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-border" />
          {/* Indicators */}
          {[
            { key: 'sma20', label: 'SMA 20', color: 'text-terminal-amber' },
            { key: 'sma50', label: 'SMA 50', color: 'text-terminal-blue' },
            { key: 'ema20', label: 'EMA 20', color: 'text-destructive' },
            { key: 'bollinger', label: 'BB', color: 'text-terminal-cyan' },
            { key: 'volume', label: 'VOL', color: 'text-muted-foreground' },
          ].map(ind => (
            <button key={ind.key} onClick={() => setIndicators(prev => ({ ...prev, [ind.key]: !prev[ind.key as keyof typeof prev] }))}
              className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${indicators[ind.key as keyof typeof indicators] ? `${ind.color} border-current bg-current/10` : 'text-muted-foreground border-border'}`}>
              {ind.label}
            </button>
          ))}
        </div>
        {crosshairData && (
          <div className="flex items-center gap-3 text-[9px]">
            <span className="text-muted-foreground">O:<span className="text-foreground ml-0.5">{crosshairData.open?.toFixed(2)}</span></span>
            <span className="text-muted-foreground">H:<span className="text-foreground ml-0.5">{crosshairData.high?.toFixed(2)}</span></span>
            <span className="text-muted-foreground">L:<span className="text-foreground ml-0.5">{crosshairData.low?.toFixed(2)}</span></span>
            <span className="text-muted-foreground">C:<span className="text-foreground ml-0.5">{crosshairData.close?.toFixed(2)}</span></span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="t-card overflow-hidden">
        <div ref={chartRef} className="w-full" style={{ height: 550 }} />
      </div>
    </div>
  );
}
