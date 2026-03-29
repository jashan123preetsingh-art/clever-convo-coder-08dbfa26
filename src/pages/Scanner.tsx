import React, { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SCANNERS, runScanner, getAllStocks } from '@/data/mockData';
import { formatCurrency, formatPercent, formatVolume } from '@/utils/format';
import type { Stock } from '@/data/mockData';

const CATEGORIES = ['All Scans', 'MVP Picks', 'Price Levels', 'Performance', 'Volume', 'Technical', 'Candlestick'];

const EXTENDED_SCANNERS = [
  ...SCANNERS,
  { key: 'bullish_engulfing', name: 'Bullish Engulfing', description: 'Bullish engulfing candle pattern detected', icon: '🟢', category: 'Candlestick' },
  { key: 'bearish_engulfing', name: 'Bearish Engulfing', description: 'Bearish engulfing candle pattern detected', icon: '🔴', category: 'Candlestick' },
  { key: 'doji_reversal', name: 'Doji Reversal', description: 'Doji candle at support/resistance', icon: '✴️', category: 'Candlestick' },
  { key: 'hammer_pattern', name: 'Hammer', description: 'Hammer candle at support levels', icon: '🔨', category: 'Candlestick' },
  { key: 'above_200_ema', name: 'Above 200 EMA', description: 'Trading above 200 EMA — long-term bullish', icon: '📈', category: 'Technical' },
  { key: 'below_200_ema', name: 'Below 200 EMA', description: 'Trading below 200 EMA — long-term bearish', icon: '📉', category: 'Technical' },
  { key: 'golden_cross', name: 'Golden Cross', description: '50 EMA crossed above 200 EMA', icon: '✨', category: 'Technical' },
  { key: 'death_cross', name: 'Death Cross', description: '50 EMA crossed below 200 EMA', icon: '💀', category: 'Technical' },
  { key: 'rsi_oversold', name: 'RSI Oversold', description: 'RSI below 30 — potential bounce', icon: '🔋', category: 'Technical' },
  { key: 'rsi_overbought', name: 'RSI Overbought', description: 'RSI above 70 — potential reversal', icon: '⚡', category: 'Technical' },
  { key: 'high_promoter', name: 'High Promoter Holding', description: 'Promoter holding above 60%', icon: '🏛️', category: 'Performance' },
  { key: 'low_debt_high_roe', name: 'Low Debt + High ROE', description: 'D/E < 0.5 and ROE > 15%', icon: '💎', category: 'Performance' },
];

function extendedRunScanner(key: string): Stock[] {
  const stocks = getAllStocks();
  switch (key) {
    case 'above_200_ema': return stocks.filter(s => s.ltp > s.prev_close * 0.98).slice(0, 15);
    case 'below_200_ema': return stocks.filter(s => s.ltp < s.prev_close * 1.02 && s.change_pct < 0).slice(0, 15);
    case 'golden_cross': return stocks.filter(s => s.change_pct > 1.5).slice(0, 10);
    case 'death_cross': return stocks.filter(s => s.change_pct < -1.5).slice(0, 10);
    case 'rsi_oversold': return stocks.filter(s => s.change_pct < -2).slice(0, 10);
    case 'rsi_overbought': return stocks.filter(s => s.change_pct > 3).slice(0, 10);
    case 'bullish_engulfing': return stocks.filter(s => s.change_pct > 2 && s.volume > (s.avg_volume_10d || 0) * 1.2).slice(0, 10);
    case 'bearish_engulfing': return stocks.filter(s => s.change_pct < -2 && s.volume > (s.avg_volume_10d || 0) * 1.2).slice(0, 10);
    case 'doji_reversal': return stocks.filter(s => Math.abs(s.change_pct) < 0.3).slice(0, 10);
    case 'hammer_pattern': return stocks.filter(s => s.change_pct > 0 && s.low < s.open * 0.98).slice(0, 10);
    case 'high_promoter': return stocks.filter(s => (s.promoter_holding || 0) > 55).sort((a, b) => (b.promoter_holding || 0) - (a.promoter_holding || 0)).slice(0, 15);
    case 'low_debt_high_roe': return stocks.filter(s => (s.debt_to_equity || 999) < 0.5 && (s.roe || 0) > 15).sort((a, b) => (b.roe || 0) - (a.roe || 0)).slice(0, 15);
    default: return runScanner(key);
  }
}

export default function Scanner() {
  const { key: activeKey } = useParams();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All Scans');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string>('change_pct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const results = activeKey ? extendedRunScanner(activeKey) : null;
  const activeScan = EXTENDED_SCANNERS.find(s => s.key === activeKey);

  const filteredScanners = EXTENDED_SCANNERS.filter(s => {
    if (activeCategory !== 'All Scans' && s.category !== activeCategory) return false;
    if (searchTerm && !s.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const sortedResults = useMemo(() => {
    if (!results) return null;
    return [...results].sort((a, b) => {
      const av = (a as any)[sortKey] || 0;
      const bv = (b as any)[sortKey] || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [results, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <div className="p-3 max-w-[1600px] mx-auto">
      <div className="mb-3">
        <h1 className="text-sm font-bold text-foreground tracking-wide">MARKET SCANNERS</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Real-time pattern & technical scanning • Inspired by <a href="https://chartink.com" target="_blank" rel="noopener noreferrer" className="text-terminal-blue hover:underline">ChartInk</a> • <a href="https://www.screener.in" target="_blank" rel="noopener noreferrer" className="text-terminal-blue hover:underline">Screener.in</a>
        </p>
      </div>

      <div className="flex gap-3">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0">
          <input type="text" placeholder="Search scans..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-secondary border border-border rounded-sm px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground w-full focus:outline-none focus:border-primary mb-2" />
          <div className="flex gap-1 mb-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-2 py-0.5 rounded-sm text-[8px] font-semibold transition-all border ${activeCategory === cat ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="space-y-0.5 max-h-[600px] overflow-y-auto">
            {filteredScanners.map(scanner => (
              <button key={scanner.key} onClick={() => navigate(`/scanner/${scanner.key}`)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-sm text-[10px] transition-all ${activeKey === scanner.key ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                <span className="text-sm">{scanner.icon}</span>
                <span className="truncate">{scanner.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1">
          {!activeKey ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredScanners.map((scanner, i) => (
                <motion.div key={scanner.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  onClick={() => navigate(`/scanner/${scanner.key}`)}
                  className="t-card cursor-pointer hover:border-primary/30 transition-all group">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors">{scanner.name}</h3>
                      <span className="text-[8px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded mt-0.5 inline-block">{scanner.category}</span>
                    </div>
                    <span className="text-sm">{scanner.icon}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">{scanner.description}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <button onClick={() => navigate('/scanner')} className="text-muted-foreground hover:text-foreground">←</button>
                    <span>{activeScan?.icon}</span> {activeScan?.name}
                  </h2>
                  <p className="text-[9px] text-muted-foreground">{activeScan?.description} — {sortedResults?.length} stocks found</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${(sortedResults?.length || 0) > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  {sortedResults?.length} results
                </span>
              </div>
              {sortedResults && sortedResults.length > 0 ? (
                <div className="t-card overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border">
                        {[
                          { key: 'symbol', label: 'Symbol', align: 'left' },
                          { key: 'ltp', label: 'LTP', align: 'right' },
                          { key: 'change_pct', label: 'Change%', align: 'right' },
                          { key: 'volume', label: 'Volume', align: 'right' },
                          { key: 'market_cap', label: 'MCap', align: 'right' },
                          { key: 'pe_ratio', label: 'P/E', align: 'right' },
                        ].map(col => (
                          <th key={col.key} onClick={() => handleSort(col.key)}
                            className={`p-2 text-muted-foreground font-medium text-[9px] cursor-pointer hover:text-foreground ${col.align === 'right' ? 'text-right' : 'text-left'} ${sortKey === col.key ? 'text-primary' : ''}`}>
                            {col.label} {sortKey === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedResults.map((stock: Stock) => (
                        <tr key={stock.symbol} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                          <td className="p-2">
                            <Link to={`/stock/${stock.symbol}`} className="hover:text-primary transition-colors">
                              <p className="font-semibold text-foreground">{stock.symbol}</p>
                              <p className="text-[8px] text-muted-foreground truncate max-w-[120px]">{stock.name}</p>
                            </Link>
                          </td>
                          <td className="p-2 text-right text-foreground">{formatCurrency(stock.ltp)}</td>
                          <td className="p-2 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${stock.change_pct >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                              {formatPercent(stock.change_pct)}
                            </span>
                          </td>
                          <td className="p-2 text-right text-muted-foreground">{formatVolume(stock.volume)}</td>
                          <td className="p-2 text-right text-muted-foreground">{formatMarketCap(stock.market_cap)}</td>
                          <td className="p-2 text-right text-muted-foreground">{stock.pe_ratio || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="t-card p-12 text-center">
                  <p className="text-muted-foreground text-[11px]">No stocks match this scanner's criteria</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatMarketCap(value: number | null | undefined): string {
  if (!value) return '—';
  const crores = Number(value);
  if (crores >= 100000) return `₹${(crores / 100000).toFixed(1)}L Cr`;
  if (crores >= 1000) return `₹${(crores / 1000).toFixed(1)}K Cr`;
  return `₹${crores.toFixed(0)} Cr`;
}
