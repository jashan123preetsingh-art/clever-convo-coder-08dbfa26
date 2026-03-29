import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllStocks } from '@/data/mockData';
import { formatCurrency, formatPercent, formatVolume, formatMarketCap } from '@/utils/format';
import type { Stock } from '@/data/mockData';
import { motion, AnimatePresence } from 'framer-motion';

// ── Measures ──
const MEASURES = [
  { key: 'close', label: 'Close', group: 'Price' },
  { key: 'open', label: 'Open', group: 'Price' },
  { key: 'high', label: 'High', group: 'Price' },
  { key: 'low', label: 'Low', group: 'Price' },
  { key: 'change_pct', label: '% Change', group: 'Price' },
  { key: 'volume', label: 'Volume', group: 'Volume' },
  { key: 'avg_volume_10d', label: 'Avg Volume (10d)', group: 'Volume' },
  { key: 'market_cap', label: 'Market Cap (Cr)', group: 'Fundamentals' },
  { key: 'pe_ratio', label: 'P/E Ratio', group: 'Fundamentals' },
  { key: 'roe', label: 'ROE %', group: 'Fundamentals' },
  { key: 'roce', label: 'ROCE %', group: 'Fundamentals' },
  { key: 'debt_to_equity', label: 'Debt/Equity', group: 'Fundamentals' },
  { key: 'dividend_yield', label: 'Dividend Yield %', group: 'Fundamentals' },
  { key: 'promoter_holding', label: 'Promoter Holding %', group: 'Fundamentals' },
  { key: 'week_52_high', label: '52W High', group: 'Price Levels' },
  { key: 'week_52_low', label: '52W Low', group: 'Price Levels' },
  { key: 'prev_close', label: 'Previous Close', group: 'Price' },
];

const OPERATORS = [
  { key: '>', label: 'greater than' },
  { key: '<', label: 'less than' },
  { key: '>=', label: '≥' },
  { key: '<=', label: '≤' },
  { key: '==', label: 'equal to' },
];

interface Condition {
  id: string;
  measure: string;
  operator: string;
  compareType: 'number' | 'measure';
  value: string;
  compareMeasure: string;
  multiplier: number;
}

interface ScanPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'breakout' | 'momentum' | 'value' | 'quality' | 'volume' | 'price';
  conditions: Omit<Condition, 'id'>[];
}

const DEFAULT_SCANS: ScanPreset[] = [
  // ─── BREAKOUT ───
  { id: 'b1', name: 'Intraday Breakout – Gap Up', description: 'Open > Prev Close + Volume surge', icon: '⚡', category: 'breakout',
    conditions: [
      { measure: 'open', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.01 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '1', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'b2', name: 'Intraday Breakout – New High', description: 'Price crossing today\'s high with volume', icon: '🔥', category: 'breakout',
    conditions: [
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'high', multiplier: 0.995 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'b3', name: 'Intraday Breakdown – Gap Down', description: 'Open < Prev Close, selling volume', icon: '💥', category: 'breakout',
    conditions: [
      { measure: 'open', operator: '<', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 0.99 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
      { measure: 'change_pct', operator: '<', compareType: 'number', value: '-1', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'b4', name: 'Swing Breakout – Near 52W High', description: 'Within 3% of 52-week high + volume', icon: '🚀', category: 'breakout',
    conditions: [
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'week_52_high', multiplier: 0.97 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.3 },
    ] },
  { id: 'b5', name: 'Swing Breakout – 52W High', description: 'Making new 52-week highs', icon: '🏔️', category: 'breakout',
    conditions: [
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'week_52_high', multiplier: 1.0 },
    ] },
  { id: 'b6', name: 'Swing Reversal – Near 52W Low', description: 'Near 52W low with bounce + volume', icon: '📈', category: 'breakout',
    conditions: [
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'week_52_low', multiplier: 1.05 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '1', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'b7', name: 'Volume Explosion (3x+)', description: 'Massive volume spike – potential breakout', icon: '🌊', category: 'breakout',
    conditions: [
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 3 },
    ] },

  // ─── MOMENTUM ───
  { id: 's1', name: 'Top Gainers (>3%)', description: 'Strong bullish momentum today', icon: '🟢', category: 'momentum',
    conditions: [{ measure: 'change_pct', operator: '>', compareType: 'number', value: '3', compareMeasure: '', multiplier: 1 }] },
  { id: 's2', name: 'Top Losers (<-2%)', description: 'Bearish pressure today', icon: '🔴', category: 'momentum',
    conditions: [{ measure: 'change_pct', operator: '<', compareType: 'number', value: '-2', compareMeasure: '', multiplier: 1 }] },
  { id: 's3', name: 'Strong Rally (>5%)', description: 'Stocks surging 5%+', icon: '🔥', category: 'momentum',
    conditions: [{ measure: 'change_pct', operator: '>', compareType: 'number', value: '5', compareMeasure: '', multiplier: 1 }] },

  // ─── VOLUME ───
  { id: 's5', name: 'Volume Breakout (2x)', description: 'Double average volume', icon: '📊', category: 'volume',
    conditions: [{ measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 2 }] },
  { id: 's7', name: 'Low Volume', description: 'Below half of average volume', icon: '🔇', category: 'volume',
    conditions: [{ measure: 'volume', operator: '<', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 0.5 }] },

  // ─── QUALITY ───
  { id: 's8', name: 'High ROE (>20%)', description: 'Superior return on equity', icon: '💎', category: 'quality',
    conditions: [{ measure: 'roe', operator: '>', compareType: 'number', value: '20', compareMeasure: '', multiplier: 1 }] },
  { id: 's9', name: 'Quality Compounders', description: 'ROE>15, ROCE>15, Low Debt', icon: '⭐', category: 'quality',
    conditions: [
      { measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'roce', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 's10', name: 'Debt Free', description: 'Near-zero debt', icon: '🏦', category: 'quality',
    conditions: [{ measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.1', compareMeasure: '', multiplier: 1 }] },
  { id: 's11', name: 'Promoter Conviction', description: 'Promoter holding > 60%', icon: '🛡️', category: 'quality',
    conditions: [{ measure: 'promoter_holding', operator: '>', compareType: 'number', value: '60', compareMeasure: '', multiplier: 1 }] },

  // ─── VALUE ───
  { id: 's12', name: 'Low PE Stocks', description: 'P/E under 15', icon: '🏷️', category: 'value',
    conditions: [{ measure: 'pe_ratio', operator: '<', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 }] },
  { id: 's13', name: 'High Dividend', description: 'Yield above 3%', icon: '💰', category: 'value',
    conditions: [{ measure: 'dividend_yield', operator: '>', compareType: 'number', value: '3', compareMeasure: '', multiplier: 1 }] },
  { id: 's14', name: 'Value + Quality', description: 'PE<20, ROE>15, Low Debt', icon: '🎯', category: 'value',
    conditions: [
      { measure: 'pe_ratio', operator: '<', compareType: 'number', value: '20', compareMeasure: '', multiplier: 1 },
      { measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },

  // ─── PRICE ───
  { id: 's16', name: 'Penny Stocks (<₹50)', description: 'Low-price stocks', icon: '🪙', category: 'price',
    conditions: [{ measure: 'close', operator: '<', compareType: 'number', value: '50', compareMeasure: '', multiplier: 1 }] },
  { id: 's17', name: 'Blue Chips (>₹2000)', description: 'Premium large caps', icon: '💠', category: 'price',
    conditions: [{ measure: 'close', operator: '>', compareType: 'number', value: '2000', compareMeasure: '', multiplier: 1 }] },
];

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '◎' },
  { key: 'breakout', label: 'Breakouts', icon: '⚡' },
  { key: 'momentum', label: 'Momentum', icon: '🟢' },
  { key: 'volume', label: 'Volume', icon: '📊' },
  { key: 'quality', label: 'Quality', icon: '💎' },
  { key: 'value', label: 'Value', icon: '🏷️' },
  { key: 'price', label: 'Price', icon: '🪙' },
];

const RESULT_COLUMNS = [
  { key: 'symbol', label: 'Stock', align: 'left' as const },
  { key: 'ltp', label: 'Price', align: 'right' as const },
  { key: 'change_pct', label: '% Chg', align: 'right' as const },
  { key: 'volume', label: 'Volume', align: 'right' as const },
  { key: 'market_cap', label: 'MCap', align: 'right' as const },
  { key: 'pe_ratio', label: 'P/E', align: 'right' as const },
  { key: 'roe', label: 'ROE', align: 'right' as const },
];

const PAGE_SIZE = 50;

function getStockValue(stock: Stock, key: string): number | null {
  if (key === 'close') return stock.ltp;
  return (stock as any)[key] ?? null;
}

function makeId() { return Math.random().toString(36).slice(2, 9); }

function newCondition(): Condition {
  return { id: makeId(), measure: 'change_pct', operator: '>', compareType: 'number', value: '2', compareMeasure: '', multiplier: 1 };
}

function runConditions(conditions: Omit<Condition, 'id'>[], logicMode: 'all' | 'any' = 'all'): Stock[] {
  const stocks = getAllStocks();
  return stocks.filter(stock => {
    const checker = (cond: Omit<Condition, 'id'>) => {
      const leftVal = getStockValue(stock, cond.measure);
      if (leftVal === null) return false;
      let rightVal: number;
      if (cond.compareType === 'number') {
        rightVal = parseFloat(cond.value);
        if (isNaN(rightVal)) return false;
      } else {
        const base = getStockValue(stock, cond.compareMeasure);
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
    };
    return logicMode === 'all' ? conditions.every(checker) : conditions.some(checker);
  });
}

export default function Scanner() {
  const [tab, setTab] = useState<'feeds' | 'custom'>('feeds');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeScan, setActiveScan] = useState<ScanPreset | null>(null);
  const [scanResults, setScanResults] = useState<Stock[] | null>(null);

  const [conditions, setConditions] = useState<Condition[]>([newCondition()]);
  const [logicMode, setLogicMode] = useState<'all' | 'any'>('all');
  const [customResults, setCustomResults] = useState<Stock[] | null>(null);
  const [hasRunCustom, setHasRunCustom] = useState(false);

  const [sortKey, setSortKey] = useState('change_pct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const scanCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DEFAULT_SCANS.forEach(s => { counts[s.id] = runConditions(s.conditions).length; });
    return counts;
  }, []);

  const filteredScans = useMemo(() => {
    if (selectedCategory === 'all') return DEFAULT_SCANS;
    return DEFAULT_SCANS.filter(s => s.category === selectedCategory);
  }, [selectedCategory]);

  const selectScan = useCallback((scan: ScanPreset) => {
    setActiveScan(scan);
    setScanResults(runConditions(scan.conditions));
    setPage(0); setSearch(''); setSortKey('change_pct'); setSortDir('desc');
  }, []);

  const runCustomScan = useCallback(() => {
    const conds = conditions.map(({ id, ...rest }) => rest);
    setCustomResults(runConditions(conds, logicMode));
    setHasRunCustom(true); setPage(0); setSearch('');
  }, [conditions, logicMode]);

  const activeResults = tab === 'feeds' ? scanResults : customResults;

  const sortedResults = useMemo(() => {
    if (!activeResults) return null;
    return [...activeResults].sort((a, b) => {
      const av = getStockValue(a, sortKey) || 0;
      const bv = getStockValue(b, sortKey) || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [activeResults, sortKey, sortDir]);

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

  const addCondition = useCallback(() => {
    setConditions(prev => [...prev, { id: makeId(), measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 }]);
  }, []);
  const removeCondition = useCallback((id: string) => {
    setConditions(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);
  }, []);
  const updateCondition = useCallback((id: string, updates: Partial<Condition>) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const exportCSV = useCallback(() => {
    if (!filteredResults) return;
    const header = RESULT_COLUMNS.map(c => c.label).join(',');
    const rows = filteredResults.map(s =>
      [s.symbol, s.ltp, s.change_pct, s.volume, s.market_cap, s.pe_ratio || '', s.roe || ''].join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `scan_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filteredResults]);

  const groups = [...new Set(MEASURES.map(m => m.group))];

  const conditionText = (c: Condition) => {
    const m = MEASURES.find(x => x.key === c.measure)?.label || c.measure;
    const op = OPERATORS.find(o => o.key === c.operator)?.label || c.operator;
    if (c.compareType === 'number') return `${m} ${op} ${c.value}`;
    const cm = MEASURES.find(x => x.key === c.compareMeasure)?.label || c.compareMeasure;
    return `${m} ${op} ${c.multiplier !== 1 ? `${c.multiplier}× ` : ''}${cm}`;
  };

  const showResults = (tab === 'feeds' && scanResults) || (tab === 'custom' && hasRunCustom);

  return (
    <div className="p-5 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">Scanner</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Scan {getAllStocks().length} stocks with pre-built & custom strategies</p>
        </div>
        {/* Tab Toggle */}
        <div className="flex gap-0.5 bg-secondary/50 p-0.5 rounded-lg border border-border/50">
          <button onClick={() => setTab('feeds')}
            className={`px-4 py-2 rounded-md text-[11px] font-semibold transition-all ${tab === 'feeds' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            Pre-built Scans
          </button>
          <button onClick={() => setTab('custom')}
            className={`px-4 py-2 rounded-md text-[11px] font-semibold transition-all ${tab === 'custom' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            Custom Builder
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'feeds' ? (
          <motion.div key="feeds" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {/* Categories */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setSelectedCategory(c.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border whitespace-nowrap transition-all
                    ${selectedCategory === c.key
                      ? 'bg-primary/10 text-primary border-primary/30 glow-primary'
                      : 'bg-card text-muted-foreground border-border/50 hover:text-foreground hover:border-border'}`}>
                  <span>{c.icon}</span> {c.label}
                </button>
              ))}
            </div>

            {/* Scan Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 mb-5">
              {filteredScans.map(scan => (
                <motion.button key={scan.id} onClick={() => selectScan(scan)}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className={`text-left p-3.5 rounded-lg border transition-all
                    ${activeScan?.id === scan.id
                      ? 'bg-primary/5 border-primary/30 glow-primary'
                      : 'bg-card border-border/40 hover:border-border/80 hover:shadow-md'}`}>
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-lg">{scan.icon}</span>
                    <span className={`text-[10px] font-bold font-data px-2 py-0.5 rounded-full
                      ${scanCounts[scan.id] > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {scanCounts[scan.id]}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-foreground mb-0.5">{scan.name}</p>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">{scan.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="custom" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="t-card overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">Build Custom Scan</span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground">Match</span>
                  <select value={logicMode} onChange={e => setLogicMode(e.target.value as 'all' | 'any')}
                    className="bg-secondary border border-border rounded-md px-2 py-1 text-[10px] text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary/30">
                    <option value="all">ALL conditions</option>
                    <option value="any">ANY condition</option>
                  </select>
                </div>
              </div>

              <div className="p-4 space-y-2.5">
                {conditions.map((cond, idx) => (
                  <div key={cond.id} className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] text-muted-foreground w-5 text-right font-data">{idx + 1}.</span>
                    <select value={cond.measure} onChange={e => updateCondition(cond.id, { measure: e.target.value })}
                      className="bg-secondary border border-border rounded-md px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-[140px]">
                      {groups.map(g => (
                        <optgroup key={g} label={g}>
                          {MEASURES.filter(m => m.group === g).map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <select value={cond.operator} onChange={e => updateCondition(cond.id, { operator: e.target.value })}
                      className="bg-secondary border border-border rounded-md px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-[120px]">
                      {OPERATORS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                    <select value={cond.compareType} onChange={e => updateCondition(cond.id, { compareType: e.target.value as 'number' | 'measure' })}
                      className="bg-secondary border border-border rounded-md px-2 py-1.5 text-[10px] text-foreground focus:outline-none">
                      <option value="number">Number</option>
                      <option value="measure">Measure</option>
                    </select>
                    {cond.compareType === 'number' ? (
                      <input type="number" step="any" value={cond.value}
                        onChange={e => updateCondition(cond.id, { value: e.target.value })}
                        className="bg-secondary border border-border rounded-md px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 w-20 font-data" />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input type="number" step="any" value={cond.multiplier}
                          onChange={e => updateCondition(cond.id, { multiplier: parseFloat(e.target.value) || 1 })}
                          className="bg-secondary border border-border rounded-md px-2 py-1.5 text-[10px] text-foreground focus:outline-none w-14 font-data" />
                        <span className="text-[10px] text-muted-foreground">×</span>
                        <select value={cond.compareMeasure} onChange={e => updateCondition(cond.id, { compareMeasure: e.target.value })}
                          className="bg-secondary border border-border rounded-md px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none min-w-[120px]">
                          {groups.map(g => (
                            <optgroup key={g} label={g}>
                              {MEASURES.filter(m => m.group === g).map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    )}
                    {conditions.length > 1 && (
                      <button onClick={() => removeCondition(cond.id)}
                        className="text-destructive/40 hover:text-destructive text-sm transition-colors ml-1">✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-border/40 flex items-center gap-3">
                <button onClick={addCondition}
                  className="w-7 h-7 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center text-sm font-bold">+</button>
                <button onClick={runCustomScan}
                  className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-all shadow-sm glow-primary">
                  Run Scan
                </button>
                <span className="text-[9px] text-muted-foreground">
                  {conditions.length} condition{conditions.length > 1 ? 's' : ''} · {getAllStocks().length} stocks
                </span>
              </div>
            </div>

            {hasRunCustom && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {conditions.map(c => (
                  <span key={c.id} className="px-2 py-0.5 rounded-md text-[9px] bg-primary/8 text-primary border border-primary/15 font-medium">
                    {conditionText(c)}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ RESULTS ═══ */}
      {showResults && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[13px] font-bold text-foreground">
                {tab === 'feeds' && activeScan ? `${activeScan.icon} ${activeScan.name}` : 'Scan Results'}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">{filteredResults?.length || 0} stocks matched</p>
            </div>
            <div className="flex items-center gap-2">
              {filteredResults && filteredResults.length > 0 && (
                <button onClick={exportCSV}
                  className="px-3 py-1.5 rounded-md text-[10px] font-medium bg-card text-muted-foreground border border-border/50 hover:text-foreground transition-all">
                  Export CSV
                </button>
              )}
              <input type="text" placeholder="Filter..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="bg-secondary/60 border border-border/50 rounded-md px-3 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground w-36 focus:outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
          </div>

          {pagedResults && pagedResults.length > 0 ? (
            <div className="t-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-secondary/30 border-b border-border/40">
                      <th className="px-3 py-3 text-left text-[9px] font-semibold text-muted-foreground w-8">#</th>
                      {RESULT_COLUMNS.map(col => (
                        <th key={col.key} onClick={() => handleSort(col.key)}
                          className={`px-3 py-3 text-[9px] font-semibold cursor-pointer select-none transition-colors hover:text-foreground
                            ${col.align === 'right' ? 'text-right' : 'text-left'}
                            ${sortKey === col.key ? 'text-primary' : 'text-muted-foreground'}`}>
                          {col.label} {sortKey === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedResults.map((stock, idx) => (
                      <tr key={stock.symbol} className="border-b border-border/10 hover:bg-secondary/20 transition-colors">
                        <td className="px-3 py-2.5 text-muted-foreground text-[9px] font-data">{page * PAGE_SIZE + idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <Link to={`/stock/${stock.symbol}`} className="hover:text-primary transition-colors group">
                            <span className="font-semibold text-foreground text-[11px] group-hover:text-primary">{stock.symbol}</span>
                            <span className="text-[8px] text-muted-foreground ml-1.5 hidden sm:inline">{stock.name}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-right text-foreground font-medium font-data">{formatCurrency(stock.ltp)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold font-data
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-3 border-t border-border/20">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="px-3 py-1 rounded-md text-[9px] font-medium bg-secondary text-muted-foreground border border-border/50 hover:text-foreground disabled:opacity-30">← Prev</button>
                  <span className="text-[9px] text-muted-foreground font-data">{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded-md text-[9px] font-medium bg-secondary text-muted-foreground border border-border/50 hover:text-foreground disabled:opacity-30">Next →</button>
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

      {tab === 'feeds' && !scanResults && (
        <div className="t-card p-16 text-center">
          <div className="text-3xl mb-3">⊕</div>
          <p className="text-[12px] text-muted-foreground font-medium">Select a scan above to see results</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">or switch to Custom Builder to create your own</p>
        </div>
      )}
    </div>
  );
}
