import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  { key: '>=', label: 'greater than or equal' },
  { key: '<=', label: 'less than or equal' },
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

// ── Default Scan Presets (feeds) ──
interface ScanPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'momentum' | 'value' | 'quality' | 'volume' | 'price';
  conditions: Omit<Condition, 'id'>[];
}

const DEFAULT_SCANS: ScanPreset[] = [
  // Momentum
  { id: 's1', name: 'Top Gainers (>3%)', description: 'Stocks up more than 3% today', icon: '🚀', category: 'momentum',
    conditions: [{ measure: 'change_pct', operator: '>', compareType: 'number', value: '3', compareMeasure: '', multiplier: 1 }] },
  { id: 's2', name: 'Top Losers (<-2%)', description: 'Stocks down more than 2% today', icon: '📉', category: 'momentum',
    conditions: [{ measure: 'change_pct', operator: '<', compareType: 'number', value: '-2', compareMeasure: '', multiplier: 1 }] },
  { id: 's3', name: 'Near 52 Week High', description: 'Price within 5% of 52-week high', icon: '🏔️', category: 'momentum',
    conditions: [{ measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'week_52_high', multiplier: 0.95 }] },
  { id: 's4', name: 'Near 52 Week Low', description: 'Price within 10% of 52-week low', icon: '🕳️', category: 'momentum',
    conditions: [{ measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'week_52_low', multiplier: 1.1 }] },

  // Volume
  { id: 's5', name: 'Volume Breakout (2x)', description: 'Volume more than 2x average', icon: '📊', category: 'volume',
    conditions: [{ measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 2 }] },
  { id: 's6', name: 'Volume Surge (3x)', description: 'Volume more than 3x average', icon: '🌊', category: 'volume',
    conditions: [{ measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 3 }] },
  { id: 's7', name: 'Low Volume Stocks', description: 'Volume below average', icon: '🔇', category: 'volume',
    conditions: [{ measure: 'volume', operator: '<', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 0.5 }] },

  // Quality
  { id: 's8', name: 'High ROE (>20%)', description: 'Return on equity above 20%', icon: '💎', category: 'quality',
    conditions: [{ measure: 'roe', operator: '>', compareType: 'number', value: '20', compareMeasure: '', multiplier: 1 }] },
  { id: 's9', name: 'Quality Stocks', description: 'ROE>15, ROCE>15, Debt<0.5', icon: '⭐', category: 'quality',
    conditions: [
      { measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'roce', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 's10', name: 'Debt Free', description: 'Zero or near-zero debt companies', icon: '🏦', category: 'quality',
    conditions: [{ measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.1', compareMeasure: '', multiplier: 1 }] },
  { id: 's11', name: 'High Promoter Holding', description: 'Promoter holding above 60%', icon: '🛡️', category: 'quality',
    conditions: [{ measure: 'promoter_holding', operator: '>', compareType: 'number', value: '60', compareMeasure: '', multiplier: 1 }] },

  // Value
  { id: 's12', name: 'Low PE Stocks', description: 'P/E ratio below 15', icon: '🏷️', category: 'value',
    conditions: [{ measure: 'pe_ratio', operator: '<', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 }] },
  { id: 's13', name: 'High Dividend Yield', description: 'Dividend yield above 3%', icon: '💰', category: 'value',
    conditions: [{ measure: 'dividend_yield', operator: '>', compareType: 'number', value: '3', compareMeasure: '', multiplier: 1 }] },
  { id: 's14', name: 'Value + Quality', description: 'PE<20, ROE>15, Debt<0.5', icon: '🎯', category: 'value',
    conditions: [
      { measure: 'pe_ratio', operator: '<', compareType: 'number', value: '20', compareMeasure: '', multiplier: 1 },
      { measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 's15', name: 'Undervalued Large Caps', description: 'MCap>50000Cr, PE<25', icon: '🐘', category: 'value',
    conditions: [
      { measure: 'market_cap', operator: '>', compareType: 'number', value: '50000', compareMeasure: '', multiplier: 1 },
      { measure: 'pe_ratio', operator: '<', compareType: 'number', value: '25', compareMeasure: '', multiplier: 1 },
    ] },

  // Price
  { id: 's16', name: 'Penny Stocks (<₹50)', description: 'Stocks priced under ₹50', icon: '🪙', category: 'price',
    conditions: [{ measure: 'close', operator: '<', compareType: 'number', value: '50', compareMeasure: '', multiplier: 1 }] },
  { id: 's17', name: 'Blue Chips (>₹2000)', description: 'High price blue-chip stocks', icon: '💠', category: 'price',
    conditions: [{ measure: 'close', operator: '>', compareType: 'number', value: '2000', compareMeasure: '', multiplier: 1 }] },
  { id: 's18', name: 'Mid Range (₹100-₹500)', description: 'Stocks between ₹100 and ₹500', icon: '📏', category: 'price',
    conditions: [
      { measure: 'close', operator: '>', compareType: 'number', value: '100', compareMeasure: '', multiplier: 1 },
      { measure: 'close', operator: '<', compareType: 'number', value: '500', compareMeasure: '', multiplier: 1 },
    ] },
];

const CATEGORIES = [
  { key: 'all', label: 'All Scans' },
  { key: 'momentum', label: 'Momentum' },
  { key: 'volume', label: 'Volume' },
  { key: 'quality', label: 'Quality' },
  { key: 'value', label: 'Value' },
  { key: 'price', label: 'Price Action' },
];

const RESULT_COLUMNS = [
  { key: 'symbol', label: 'Stock', align: 'left' as const },
  { key: 'ltp', label: 'Price', align: 'right' as const },
  { key: 'change_pct', label: '% Chg', align: 'right' as const },
  { key: 'volume', label: 'Volume', align: 'right' as const },
  { key: 'market_cap', label: 'MCap', align: 'right' as const },
  { key: 'pe_ratio', label: 'P/E', align: 'right' as const },
  { key: 'roe', label: 'ROE%', align: 'right' as const },
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

  // Custom builder state
  const [conditions, setConditions] = useState<Condition[]>([newCondition()]);
  const [logicMode, setLogicMode] = useState<'all' | 'any'>('all');
  const [customResults, setCustomResults] = useState<Stock[] | null>(null);
  const [hasRunCustom, setHasRunCustom] = useState(false);

  // Shared
  const [sortKey, setSortKey] = useState('change_pct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  // Precompute result counts for feeds
  const scanCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DEFAULT_SCANS.forEach(s => { counts[s.id] = runConditions(s.conditions).length; });
    return counts;
  }, []);

  const filteredScans = useMemo(() => {
    if (selectedCategory === 'all') return DEFAULT_SCANS;
    return DEFAULT_SCANS.filter(s => s.category === selectedCategory);
  }, [selectedCategory]);

  // Run a default scan
  const selectScan = useCallback((scan: ScanPreset) => {
    setActiveScan(scan);
    setScanResults(runConditions(scan.conditions));
    setPage(0);
    setSearch('');
    setSortKey('change_pct');
    setSortDir('desc');
  }, []);

  // Run custom scan
  const runCustomScan = useCallback(() => {
    const conds = conditions.map(({ id, ...rest }) => rest);
    setCustomResults(runConditions(conds, logicMode));
    setHasRunCustom(true);
    setPage(0);
    setSearch('');
  }, [conditions, logicMode]);

  // Active results based on tab
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
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [sortedResults, search]);

  const totalPages = filteredResults ? Math.ceil(filteredResults.length / PAGE_SIZE) : 0;
  const pagedResults = filteredResults?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }, [sortKey]);

  // Condition management
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
    const a = document.createElement('a');
    a.href = url; a.download = `scan_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filteredResults]);

  const groups = [...new Set(MEASURES.map(m => m.group))];

  const conditionText = (c: Condition) => {
    const m = MEASURES.find(x => x.key === c.measure)?.label || c.measure;
    const op = OPERATORS.find(o => o.key === c.operator)?.label || c.operator;
    if (c.compareType === 'number') return `${m} ${op} ${c.value}`;
    const cm = MEASURES.find(x => x.key === c.compareMeasure)?.label || c.compareMeasure;
    return `${m} ${op} ${c.multiplier !== 1 ? `${c.multiplier}x ` : ''}${cm}`;
  };

  const showResults = (tab === 'feeds' && scanResults) || (tab === 'custom' && hasRunCustom);

  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold text-foreground tracking-wide">STOCK SCANNER</h1>
        <span className="text-[9px] text-muted-foreground">{getAllStocks().length} stocks universe</span>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 mb-4 border border-border rounded-lg p-1 bg-secondary/30 w-fit">
        <button onClick={() => setTab('feeds')}
          className={`px-4 py-2 rounded-md text-[11px] font-semibold transition-all ${tab === 'feeds' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          📋 Default Scans
        </button>
        <button onClick={() => setTab('custom')}
          className={`px-4 py-2 rounded-md text-[11px] font-semibold transition-all ${tab === 'custom' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          🔧 Custom Scan
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'feeds' ? (
          <motion.div key="feeds" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {/* Category pills */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setSelectedCategory(c.key)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all
                    ${selectedCategory === c.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/50 text-muted-foreground border-border hover:text-foreground hover:border-primary/30'}`}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Scan Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
              {filteredScans.map(scan => (
                <button key={scan.id} onClick={() => selectScan(scan)}
                  className={`text-left p-3 rounded-lg border transition-all hover:shadow-sm
                    ${activeScan?.id === scan.id
                      ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                      : 'bg-card border-border hover:border-primary/20'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{scan.icon}</span>
                      <div>
                        <p className="text-[11px] font-semibold text-foreground">{scan.name}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{scan.description}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                      ${scanCounts[scan.id] > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {scanCounts[scan.id]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="custom" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {/* Custom Scan Builder */}
            <div className="border border-primary/20 rounded-lg bg-card overflow-hidden mb-4">
              <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-primary tracking-wide">BUILD YOUR SCAN</span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground">Match</span>
                  <select value={logicMode} onChange={e => setLogicMode(e.target.value as 'all' | 'any')}
                    className="bg-secondary border border-border rounded px-2 py-1 text-[10px] text-foreground font-semibold focus:outline-none">
                    <option value="all">ALL conditions</option>
                    <option value="any">ANY condition</option>
                  </select>
                </div>
              </div>

              <div className="p-4 space-y-2">
                {conditions.map((cond, idx) => (
                  <div key={cond.id} className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] text-muted-foreground w-4 text-right">{idx + 1}.</span>
                    <select value={cond.measure} onChange={e => updateCondition(cond.id, { measure: e.target.value })}
                      className="bg-secondary border border-border rounded px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50 min-w-[150px]">
                      {groups.map(g => (
                        <optgroup key={g} label={g}>
                          {MEASURES.filter(m => m.group === g).map(m => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <select value={cond.operator} onChange={e => updateCondition(cond.id, { operator: e.target.value })}
                      className="bg-secondary border border-border rounded px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50 min-w-[130px]">
                      {OPERATORS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                    <select value={cond.compareType} onChange={e => updateCondition(cond.id, { compareType: e.target.value as 'number' | 'measure' })}
                      className="bg-secondary border border-border rounded px-2 py-1.5 text-[10px] text-foreground focus:outline-none">
                      <option value="number">Number</option>
                      <option value="measure">Measure</option>
                    </select>
                    {cond.compareType === 'number' ? (
                      <input type="number" step="any" value={cond.value}
                        onChange={e => updateCondition(cond.id, { value: e.target.value })}
                        className="bg-secondary border border-border rounded px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50 w-24" />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input type="number" step="any" value={cond.multiplier}
                          onChange={e => updateCondition(cond.id, { multiplier: parseFloat(e.target.value) || 1 })}
                          className="bg-secondary border border-border rounded px-2 py-1.5 text-[10px] text-foreground focus:outline-none w-16" />
                        <span className="text-[10px] text-muted-foreground">×</span>
                        <select value={cond.compareMeasure} onChange={e => updateCondition(cond.id, { compareMeasure: e.target.value })}
                          className="bg-secondary border border-border rounded px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none min-w-[130px]">
                          {groups.map(g => (
                            <optgroup key={g} label={g}>
                              {MEASURES.filter(m => m.group === g).map(m => (
                                <option key={m.key} value={m.key}>{m.label}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    )}
                    {conditions.length > 1 && (
                      <button onClick={() => removeCondition(cond.id)}
                        className="text-destructive/50 hover:text-destructive text-sm transition-colors ml-1">✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-border/50 flex items-center gap-2">
                <button onClick={addCondition}
                  className="w-7 h-7 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center text-sm font-bold">+</button>
                <button onClick={runCustomScan}
                  className="px-5 py-2 rounded bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors">
                  ▶ Run Scan
                </button>
                <span className="text-[9px] text-muted-foreground ml-2">
                  {conditions.length} condition{conditions.length > 1 ? 's' : ''} · {getAllStocks().length} stocks
                </span>
              </div>
            </div>

            {/* Show applied filters when custom results */}
            {hasRunCustom && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                {conditions.map(c => (
                  <span key={c.id} className="px-2 py-0.5 rounded text-[9px] bg-primary/10 text-primary border border-primary/20">
                    {conditionText(c)}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ RESULTS TABLE ══════════ */}
      {showResults && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[12px] font-bold text-foreground tracking-wide">
              {tab === 'feeds' && activeScan ? `${activeScan.icon} ${activeScan.name}` : 'SCAN RESULTS'}
              <span className="text-muted-foreground font-normal ml-2">({filteredResults?.length || 0} stocks)</span>
            </h2>
            <div className="flex items-center gap-2">
              {filteredResults && filteredResults.length > 0 && (
                <button onClick={exportCSV}
                  className="px-2.5 py-1 rounded text-[9px] font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground transition-all">
                  Export CSV
                </button>
              )}
              <input type="text" placeholder="Search..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="bg-secondary border border-border rounded px-2.5 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground w-40 focus:outline-none focus:border-primary/50" />
            </div>
          </div>

          {pagedResults && pagedResults.length > 0 ? (
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="px-3 py-2.5 text-left text-[9px] font-semibold text-muted-foreground w-8">#</th>
                      {RESULT_COLUMNS.map(col => (
                        <th key={col.key} onClick={() => handleSort(col.key)}
                          className={`px-3 py-2.5 text-[9px] font-semibold cursor-pointer select-none transition-colors hover:text-foreground
                            ${col.align === 'right' ? 'text-right' : 'text-left'}
                            ${sortKey === col.key ? 'text-primary' : 'text-muted-foreground'}`}>
                          {col.label} {sortKey === col.key && (sortDir === 'asc' ? '▲' : '▼')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedResults.map((stock, idx) => (
                      <tr key={stock.symbol} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                        <td className="px-3 py-2 text-muted-foreground text-[9px]">{page * PAGE_SIZE + idx + 1}</td>
                        <td className="px-3 py-2">
                          <Link to={`/stock/${stock.symbol}`} className="hover:text-primary transition-colors">
                            <span className="font-bold text-foreground text-[11px]">{stock.symbol}</span>
                            <span className="text-[8px] text-muted-foreground ml-1.5 hidden sm:inline">{stock.name}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-right text-foreground font-medium">{formatCurrency(stock.ltp)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold
                            ${stock.change_pct >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                            {formatPercent(stock.change_pct)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{formatVolume(stock.volume)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{formatMarketCap(stock.market_cap)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{stock.pe_ratio && stock.pe_ratio > 0 ? stock.pe_ratio.toFixed(1) : '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={(stock.roe || 0) >= 15 ? 'text-primary font-medium' : 'text-muted-foreground'}>
                            {stock.roe ? `${stock.roe}%` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-3 border-t border-border/30">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="px-3 py-1 rounded text-[9px] font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground disabled:opacity-30">← Prev</button>
                  <span className="text-[9px] text-muted-foreground">Page {page + 1} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded text-[9px] font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground disabled:opacity-30">Next →</button>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card p-12 text-center">
              <p className="text-[11px] text-muted-foreground">No stocks match this scan. Try different criteria.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state for feeds */}
      {tab === 'feeds' && !scanResults && (
        <div className="border border-border/50 rounded-lg bg-card/50 p-12 text-center">
          <p className="text-[11px] text-muted-foreground">👆 Click any scan above to see results</p>
        </div>
      )}
    </div>
  );
}
