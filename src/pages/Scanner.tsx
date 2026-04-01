import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllStocks } from '@/data/mockData';
import { formatCurrency, formatPercent, formatVolume, formatMarketCap } from '@/utils/format';
import type { Stock } from '@/data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { stockApi } from '@/lib/api';
import { computeQualityScore } from '@/utils/qualityScore';
import type { QualityScore } from '@/utils/qualityScore';
import {
  DEFAULT_SCANS, CATEGORIES, CATEGORY_ACCENT, RESULT_COLUMNS,
  EMA_MEASURES, scanUsesEMA,
  type Condition, type ScanPreset,
} from '@/data/scanPresets';

const PAGE_SIZE = 50;

function getStockValue(stock: Stock, key: string, emaData?: Record<string, any>): number | null {
  if (key === 'close') return stock.ltp;
  if (key === 'score') return computeQualityScore(stock).total;
  if (EMA_MEASURES.has(key)) {
    const data = emaData?.[stock.symbol];
    return data?.emas?.[key] ?? null;
  }
  return (stock as any)[key] ?? null;
}

function runConditions(conditions: Omit<Condition, 'id'>[], emaData?: Record<string, any>): Stock[] {
  const stocks = getAllStocks();
  return stocks.filter(stock => {
    return conditions.every(cond => {
      const leftVal = getStockValue(stock, cond.measure, emaData);
      if (leftVal === null) return false;
      let rightVal: number;
      if (cond.compareType === 'number') {
        rightVal = parseFloat(cond.value);
        if (isNaN(rightVal)) return false;
      } else {
        const base = getStockValue(stock, cond.compareMeasure, emaData);
        if (base === null) return false;
        rightVal = base * cond.multiplier;
      }
      switch (cond.operator) {
        case '>': return leftVal > rightVal;
        case '<': return leftVal < rightVal;
        case '>=': return leftVal >= rightVal;
        case '<=': return leftVal <= rightVal;
        case '==': return Math.abs(leftVal - rightVal) < 0.01;
        default: return false;
      }
    });
  });
}

// ═══ GRADE BADGE ═══
function GradeBadge({ grade, size = 'sm' }: { grade: string; size?: 'sm' | 'lg' }) {
  const colors: Record<string, string> = {
    'A+': 'bg-primary/15 text-primary border-primary/30',
    'A': 'bg-primary/12 text-primary border-primary/25',
    'B+': 'bg-[hsl(var(--terminal-blue)/0.12)] text-[hsl(var(--terminal-blue))] border-[hsl(var(--terminal-blue)/0.25)]',
    'B': 'bg-[hsl(var(--terminal-blue)/0.08)] text-[hsl(var(--terminal-blue))] border-[hsl(var(--terminal-blue)/0.15)]',
    'C+': 'bg-accent/12 text-accent border-accent/25',
    'C': 'bg-accent/8 text-accent border-accent/15',
    'D': 'bg-destructive/12 text-destructive border-destructive/25',
  };
  const cls = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-[9px]';
  return (
    <span className={`inline-flex items-center justify-center rounded-md font-black border ${cls} ${colors[grade] || 'bg-secondary text-muted-foreground border-border'}`}>
      {grade}
    </span>
  );
}

// ═══ SCORE BAR ═══
function ScoreBar({ label, score, maxScore }: { label: string; score: number; maxScore: number }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const color = pct >= 70 ? 'bg-primary' : pct >= 40 ? 'bg-[hsl(var(--terminal-blue))]' : 'bg-destructive/60';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] text-muted-foreground w-16 text-right shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-2 bg-secondary/60 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`} />
      </div>
      <span className="text-[8px] text-foreground font-bold w-8 font-data">{score}/{maxScore}</span>
    </div>
  );
}

// ═══ BREAKOUT DETAIL CARD ═══
function BreakoutDetailCard({ stock, onClose }: { stock: Stock; onClose: () => void }) {
  const qs = computeQualityScore(stock);
  const volRatio = (stock.avg_volume_10d && stock.avg_volume_10d > 0) ? stock.volume / stock.avg_volume_10d : 1;

  return (
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.99 }}
      className="t-card overflow-hidden border-l-2 border-l-primary">
      <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-4">
          <Link to={`/stock/${stock.symbol}`} className="hover:text-primary transition-colors">
            <span className="text-lg font-black text-foreground">{stock.symbol}</span>
            <p className="text-[9px] text-muted-foreground">{stock.name}</p>
          </Link>
          <span className="text-[9px] text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">{stock.sector}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right font-data">
            <span className="text-lg font-black text-foreground">{formatCurrency(stock.ltp)}</span>
            <span className={`text-sm font-bold ml-2 ${stock.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {stock.change_pct >= 0 ? '▲' : '▼'} {formatPercent(stock.change_pct)}
            </span>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-muted-foreground">Volume</p>
            <p className="text-[10px] font-bold text-foreground font-data">{volRatio.toFixed(1)}x avg</p>
            <div className="w-16 h-1.5 rounded-full bg-secondary mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-[hsl(var(--terminal-blue))]" style={{ width: `${Math.min(volRatio * 20, 100)}%` }} />
            </div>
          </div>
          <GradeBadge grade={qs.grade} size="lg" />
          <span className="text-lg font-black text-foreground font-data">{qs.total}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg ml-2 hover:bg-secondary/60 w-7 h-7 rounded-md flex items-center justify-center transition-colors">✕</button>
        </div>
      </div>

      <div className="px-5 py-2 bg-primary/5 border-b border-border/20">
        <span className="text-[10px] text-primary font-bold">● {qs.freshness}</span>
      </div>

      <div className="px-5 py-3 border-b border-border/20">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="text-foreground font-semibold">{stock.symbol}</span> — {stock.change_pct >= 0 ? 'up' : 'down'} {Math.abs(stock.change_pct).toFixed(1)}% with {volRatio.toFixed(1)}x relative volume.
          {qs.keyLevel} · {qs.candleDesc} · {qs.structureDesc}.
        </p>
      </div>

      <div className="grid grid-cols-3 border-b border-border/20">
        {[
          { icon: '🎯', label: 'Key Level', val: qs.keyLevel, sub: `₹${stock.ltp.toFixed(2)}` },
          { icon: '📊', label: 'Volume', val: qs.volumeDesc, sub: `${formatVolume(stock.volume)} shares` },
          { icon: '🕯️', label: 'Candle', val: qs.candleDesc, sub: `Body ${((Math.abs(stock.ltp - stock.open) / Math.max(stock.high - stock.low, 0.01)) * 100).toFixed(0)}% of range` },
        ].map((item, i) => (
          <div key={i} className={`p-3 ${i < 2 ? 'border-r border-border/20' : ''}`}>
            <p className="text-[8px] text-muted-foreground mb-0.5">{item.icon} {item.label}</p>
            <p className="text-[11px] font-bold text-foreground">{item.val}</p>
            <p className="text-[9px] text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-b border-border/20">
        <p className="text-[10px] font-bold text-foreground mb-2 flex items-center gap-2">
          ⭐ Quality Score <GradeBadge grade={qs.grade} /> <span className="font-data">{qs.total}/100</span>
        </p>
        <div className="space-y-1.5">
          <ScoreBar label="Price Event" score={qs.priceEvent} maxScore={20} />
          <ScoreBar label="Volume" score={qs.volume} maxScore={20} />
          <ScoreBar label="Candle" score={qs.candle} maxScore={15} />
          <ScoreBar label="Structure" score={qs.structure} maxScore={15} />
          <ScoreBar label="Liquidity" score={qs.liquidity} maxScore={10} />
          <ScoreBar label="Rel Strength" score={qs.relStrength} maxScore={15} />
          <ScoreBar label="Sector" score={qs.sector} maxScore={5} />
        </div>
      </div>

      <div className="px-5 py-3 bg-secondary/20 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-accent">⚠ Risk</span>
          <span className="text-[9px] text-muted-foreground">{qs.risk}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-destructive">🚫 Invalidation</span>
          <span className="text-[9px] text-muted-foreground">{qs.invalidation}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ═══ MAIN COMPONENT ═══
export default function Scanner() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeScan, setActiveScan] = useState<ScanPreset | null>(null);
  const [scanResults, setScanResults] = useState<Stock[] | null>(null);
  const [expandedStock, setExpandedStock] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState('change_pct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [emaData, setEmaData] = useState<Record<string, any>>({});
  const [emaLoading, setEmaLoading] = useState(false);

  // Fetch EMA data once for EMA scans (cached for 5 min via react-query in hook, but here we do it imperatively)
  const fetchEMAData = useCallback(async () => {
    if (Object.keys(emaData).length > 0) return emaData; // already loaded
    setEmaLoading(true);
    try {
      const stocks = getAllStocks();
      // Fetch in batches of 30
      const allSymbols = stocks.map(s => s.symbol);
      const batches: string[][] = [];
      for (let i = 0; i < allSymbols.length; i += 30) batches.push(allSymbols.slice(i, i + 30));
      
      const results = await Promise.all(batches.map(b => stockApi.getBatchEMA(b).catch(() => [])));
      const map: Record<string, any> = {};
      for (const batch of results) {
        if (!Array.isArray(batch)) continue;
        for (const item of batch) {
          if (item.emas) map[item.symbol] = item;
        }
      }
      setEmaData(map);
      return map;
    } catch {
      return {};
    } finally {
      setEmaLoading(false);
    }
  }, [emaData]);

  const scanCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DEFAULT_SCANS.forEach(s => {
      // Skip EMA scans in count if no EMA data loaded yet
      if (scanUsesEMA(s.conditions) && Object.keys(emaData).length === 0) {
        counts[s.id] = -1; // will show "..." 
      } else {
        counts[s.id] = runConditions(s.conditions, emaData).length;
      }
    });
    return counts;
  }, [emaData]);

  const filteredScans = useMemo(() => {
    if (selectedCategory === 'all') return DEFAULT_SCANS;
    return DEFAULT_SCANS.filter(s => s.category === selectedCategory);
  }, [selectedCategory]);

  const selectScan = useCallback(async (scan: ScanPreset) => {
    setActiveScan(scan);
    setPage(0); setSearch(''); setSortKey('change_pct'); setSortDir('desc'); setExpandedStock(null);
    
    if (scanUsesEMA(scan.conditions)) {
      // Fetch EMA data first, then run conditions
      const data = await fetchEMAData();
      setScanResults(runConditions(scan.conditions, data));
    } else {
      setScanResults(runConditions(scan.conditions, emaData));
    }
  }, [fetchEMAData, emaData]);

  // Auto-fetch EMA data when EMA category is selected
  useEffect(() => {
    if (selectedCategory === 'ema' && Object.keys(emaData).length === 0) {
      fetchEMAData();
    }
  }, [selectedCategory]);

  const sortedResults = useMemo(() => {
    if (!scanResults) return null;
    return [...scanResults].sort((a, b) => {
      const av = getStockValue(a, sortKey) || 0;
      const bv = getStockValue(b, sortKey) || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [scanResults, sortKey, sortDir]);

  const filteredResults = useMemo(() => {
    if (!sortedResults) return null;
    if (!search) return sortedResults;
    return sortedResults.filter(s =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [sortedResults, search]);

  const totalPages = filteredResults ? Math.ceil(filteredResults.length / PAGE_SIZE) : 0;
  const pagedResults = filteredResults?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }, [sortKey]);

  const exportCSV = useCallback(() => {
    if (!filteredResults) return;
    const header = RESULT_COLUMNS.map(c => c.label).join(',');
    const rows = filteredResults.map(s => {
      const qs = computeQualityScore(s);
      return [s.symbol, s.ltp, s.change_pct, s.volume, s.market_cap, s.pe_ratio || '', s.roe || '', `${qs.total} (${qs.grade})`].join(',');
    });
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `scan_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filteredResults]);

  // Stats bar
  const totalStocks = getAllStocks().length;
  const topScanCount = useMemo(() => {
    let max = 0; let maxName = '';
    Object.entries(scanCounts).forEach(([id, c]) => { if (c > max) { max = c; maxName = DEFAULT_SCANS.find(s => s.id === id)?.name || ''; } });
    return { count: max, name: maxName };
  }, [scanCounts]);

  return (
    <div className="p-4 max-w-[1600px] mx-auto space-y-4">
      {/* ═══ Premium Header ═══ */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-[hsl(var(--terminal-cyan)/0.1)] flex items-center justify-center border border-primary/20">
              <span className="text-sm">⊕</span>
            </span>
            Scanner
          </h1>
          <p className="text-[10px] text-muted-foreground mt-1 ml-11">
            {totalStocks} stocks · {DEFAULT_SCANS.length} algorithms · {CATEGORIES.length - 1} categories · 7-pillar quality scoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-card rounded-lg px-3 py-2 border border-border/40 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-live" />
            <span className="text-[9px] text-muted-foreground font-medium">Most Active: </span>
            <span className="text-[9px] text-primary font-bold">{topScanCount.name}</span>
            <span className="text-[9px] text-foreground font-bold font-data">({topScanCount.count})</span>
          </div>
        </div>
      </motion.div>

      {/* ═══ Category Tabs ═══ */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((c, i) => {
          const count = c.key === 'all' ? DEFAULT_SCANS.length : DEFAULT_SCANS.filter(s => s.category === c.key).length;
          const isActive = selectedCategory === c.key;
          return (
            <motion.button key={c.key} onClick={() => setSelectedCategory(c.key)}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-semibold border whitespace-nowrap transition-all duration-200
                ${isActive
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.1)]'
                  : 'bg-card/80 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/60 hover:bg-card'}`}>
              <span className="text-sm">{c.icon}</span>
              <span>{c.label}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-primary/15 text-primary' : 'bg-secondary/80 text-muted-foreground/70'}`}>{count}</span>
            </motion.button>
          );
        })}
      </div>

      {/* ═══ Scan Cards Grid ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        <AnimatePresence mode="popLayout">
          {filteredScans.map((scan, i) => {
            const count = scanCounts[scan.id] || 0;
            const isActive = activeScan?.id === scan.id;
            const accent = CATEGORY_ACCENT[scan.category] || 'border-l-primary';
            return (
              <motion.button key={scan.id} onClick={() => selectScan(scan)}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, delay: i * 0.015 }}
                className={`text-left p-3 rounded-lg border border-l-[3px] transition-all duration-200 group relative overflow-hidden
                  ${accent}
                  ${isActive
                    ? 'bg-primary/5 border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.08)]'
                    : 'bg-card/80 border-border/30 hover:bg-card hover:border-border/60'}`}>
                {/* Subtle top gradient */}
                <div className={`absolute inset-x-0 top-0 h-px ${isActive ? 'bg-gradient-to-r from-transparent via-primary/40 to-transparent' : 'bg-transparent'}`} />

                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-base group-hover:scale-110 transition-transform duration-200">{scan.icon}</span>
                  <span className={`text-[10px] font-black font-data px-2 py-0.5 rounded-full transition-colors
                    ${count === -1
                      ? 'bg-secondary/60 text-muted-foreground/70'
                      : count > 0
                        ? isActive ? 'bg-primary/15 text-primary' : 'bg-primary/8 text-primary'
                        : 'bg-secondary/60 text-muted-foreground/70'}`}>
                    {count === -1 ? '...' : count}
                  </span>
                </div>
                <p className={`text-[10px] font-bold mb-0.5 transition-colors ${isActive ? 'text-primary' : 'text-foreground group-hover:text-foreground'}`}>
                  {scan.name}
                </p>
                <p className="text-[8px] text-muted-foreground/80 leading-relaxed line-clamp-2">{scan.description}</p>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ═══ RESULTS ═══ */}
      <AnimatePresence>
        {scanResults && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 rounded-full bg-primary" />
                <div>
                  <h2 className="text-[13px] font-black text-foreground flex items-center gap-2">
                    {activeScan?.icon} {activeScan?.name}
                    <span className="text-[10px] font-bold text-primary font-data bg-primary/8 px-2 py-0.5 rounded-full">
                      {filteredResults?.length || 0} matches
                    </span>
                  </h2>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Click any row for detailed quality analysis</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {filteredResults && filteredResults.length > 0 && (
                  <button onClick={exportCSV}
                    className="px-3 py-1.5 rounded-md text-[10px] font-medium bg-card text-muted-foreground border border-border/40 hover:text-foreground hover:border-border/60 transition-all flex items-center gap-1.5">
                    <span className="text-xs">↓</span> Export
                  </button>
                )}
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Filter results..." value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0); }}
                    className="bg-card border border-border/40 rounded-md pl-8 pr-3 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground w-40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-all" />
                </div>
              </div>
            </div>

            {/* Expanded Detail Card */}
            <AnimatePresence>
              {expandedStock && pagedResults && (
                <div className="mb-3">
                  <BreakoutDetailCard
                    stock={pagedResults.find(s => s.symbol === expandedStock) || getAllStocks().find(s => s.symbol === expandedStock)!}
                    onClose={() => setExpandedStock(null)}
                  />
                </div>
              )}
            </AnimatePresence>

            {pagedResults && pagedResults.length > 0 ? (
              <div className="t-card-static overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-secondary/20 border-b border-border/40">
                        <th className="px-3 py-2.5 text-left text-[9px] font-semibold text-muted-foreground w-8">#</th>
                        {RESULT_COLUMNS.map(col => (
                          <th key={col.key} onClick={() => handleSort(col.key)}
                            className={`px-3 py-2.5 text-[9px] font-semibold cursor-pointer select-none transition-colors hover:text-foreground
                              ${col.align === 'right' ? 'text-right' : 'text-left'}
                              ${sortKey === col.key ? 'text-primary' : 'text-muted-foreground'}`}>
                            {col.label} {sortKey === col.key && <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedResults.map((stock, idx) => {
                        const qs = computeQualityScore(stock);
                        const isExpanded = expandedStock === stock.symbol;
                        return (
                          <tr key={stock.symbol}
                            onClick={() => setExpandedStock(isExpanded ? null : stock.symbol)}
                            className={`border-b border-border/10 cursor-pointer transition-all duration-150
                              ${isExpanded ? 'bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'hover:bg-secondary/20 hover:shadow-[inset_3px_0_0_hsl(var(--primary)/0.3)]'}`}>
                            <td className="px-3 py-2.5 text-muted-foreground/60 text-[9px] font-data">{page * PAGE_SIZE + idx + 1}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <GradeBadge grade={qs.grade} />
                                <div>
                                  <Link to={`/stock/${stock.symbol}`} onClick={e => e.stopPropagation()}
                                    className="font-bold text-foreground text-[11px] hover:text-primary transition-colors">{stock.symbol}</Link>
                                  <p className="text-[8px] text-muted-foreground/70 hidden sm:block">{stock.sector}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-foreground font-medium font-data">{formatCurrency(stock.ltp)}</td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold font-data
                                ${stock.change_pct >= 0 ? 'bg-primary/8 text-primary' : 'bg-destructive/8 text-destructive'}`}>
                                {stock.change_pct >= 0 ? '+' : ''}{formatPercent(stock.change_pct)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground font-data">{formatVolume(stock.volume)}</td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground font-data">{formatMarketCap(stock.market_cap)}</td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground font-data">{stock.pe_ratio && stock.pe_ratio > 0 ? stock.pe_ratio.toFixed(1) : '—'}</td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={`font-data ${(stock.roe || 0) >= 15 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                {stock.roe ? `${stock.roe}%` : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={`text-[10px] font-black font-data ${qs.total >= 65 ? 'text-primary' : qs.total >= 45 ? 'text-accent' : 'text-muted-foreground'}`}>
                                {qs.total}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/20 bg-secondary/10">
                    <span className="text-[9px] text-muted-foreground font-data">
                      Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredResults!.length)} of {filteredResults!.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        className="px-3 py-1.5 rounded-md text-[9px] font-medium bg-card text-muted-foreground border border-border/40 hover:text-foreground disabled:opacity-30 transition-all">
                        ← Prev
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                        return (
                          <button key={pageNum} onClick={() => setPage(pageNum)}
                            className={`w-7 h-7 rounded-md text-[9px] font-bold font-data transition-all
                              ${page === pageNum ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}>
                            {pageNum + 1}
                          </button>
                        );
                      })}
                      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        className="px-3 py-1.5 rounded-md text-[9px] font-medium bg-card text-muted-foreground border border-border/40 hover:text-foreground disabled:opacity-30 transition-all">
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="t-card p-12 text-center">
                <p className="text-[11px] text-muted-foreground">No stocks match this scan criteria.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!scanResults && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="t-card p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/3 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-[hsl(var(--terminal-cyan)/0.05)] flex items-center justify-center mx-auto mb-4 border border-primary/10">
              <span className="text-3xl">⊕</span>
            </div>
            <p className="text-sm font-bold text-foreground mb-1">Select a scan to get started</p>
            <p className="text-[10px] text-muted-foreground max-w-md mx-auto">
              Choose from {DEFAULT_SCANS.length} pre-built algorithms across {CATEGORIES.length - 1} categories.
              Each result includes a 7-pillar quality score for actionable insights.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
