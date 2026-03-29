import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllStocks } from '@/data/mockData';
import { formatCurrency, formatPercent, formatVolume, formatMarketCap } from '@/utils/format';
import type { Stock } from '@/data/mockData';

// ── Measures (like ChartInk's measure dropdown) ──
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
  { key: '>=', label: 'greater than equal to' },
  { key: '<=', label: 'less than equal to' },
  { key: '==', label: 'equal to' },
  { key: 'crosses_above', label: 'crossed above' },
  { key: 'crosses_below', label: 'crossed below' },
];

const COMPARE_TYPES = [
  { key: 'number', label: 'Number' },
  { key: 'measure', label: 'Another Measure' },
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

// ── Example scans (like ChartInk chips) ──
const EXAMPLE_SCANS = [
  { label: '📈 Volume > 2x Avg Volume', conditions: [{ measure: 'volume', operator: '>', compareType: 'measure' as const, compareMeasure: 'avg_volume_10d', multiplier: 2, value: '' }] },
  { label: '🔺 Change > 3%', conditions: [{ measure: 'change_pct', operator: '>', compareType: 'number' as const, value: '3', compareMeasure: '', multiplier: 1 }] },
  { label: '🔻 Change < -2%', conditions: [{ measure: 'change_pct', operator: '<', compareType: 'number' as const, value: '-2', compareMeasure: '', multiplier: 1 }] },
  { label: '💎 ROE > 20 & Low Debt', conditions: [
    { measure: 'roe', operator: '>', compareType: 'number' as const, value: '20', compareMeasure: '', multiplier: 1 },
    { measure: 'debt_to_equity', operator: '<', compareType: 'number' as const, value: '0.5', compareMeasure: '', multiplier: 1 },
  ]},
  { label: '🏆 Near 52W High', conditions: [{ measure: 'close', operator: '>', compareType: 'measure' as const, compareMeasure: 'week_52_high', multiplier: 0.95, value: '' }] },
  { label: '💰 High Dividend', conditions: [{ measure: 'dividend_yield', operator: '>', compareType: 'number' as const, value: '3', compareMeasure: '', multiplier: 1 }] },
  { label: '🏛️ Promoter > 55%', conditions: [{ measure: 'promoter_holding', operator: '>', compareType: 'number' as const, value: '55', compareMeasure: '', multiplier: 1 }] },
  { label: '⭐ Quality (ROE>15, ROCE>15, D/E<0.5)', conditions: [
    { measure: 'roe', operator: '>', compareType: 'number' as const, value: '15', compareMeasure: '', multiplier: 1 },
    { measure: 'roce', operator: '>', compareType: 'number' as const, value: '15', compareMeasure: '', multiplier: 1 },
    { measure: 'debt_to_equity', operator: '<', compareType: 'number' as const, value: '0.5', compareMeasure: '', multiplier: 1 },
  ]},
];

const RESULT_COLUMNS = [
  { key: 'symbol', label: 'Stock', align: 'left' as const },
  { key: 'ltp', label: 'Close', align: 'right' as const },
  { key: 'change_pct', label: '% Chg', align: 'right' as const },
  { key: 'open', label: 'Open', align: 'right' as const },
  { key: 'high', label: 'High', align: 'right' as const },
  { key: 'low', label: 'Low', align: 'right' as const },
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

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function newCondition(): Condition {
  return { id: makeId(), measure: 'change_pct', operator: '>', compareType: 'number', value: '2', compareMeasure: 'prev_close', multiplier: 1 };
}

export default function Scanner() {
  const [conditions, setConditions] = useState<Condition[]>([newCondition()]);
  const [logicMode, setLogicMode] = useState<'all' | 'any'>('all');
  const [segment, setSegment] = useState<'cash' | 'fno'>('cash');
  const [results, setResults] = useState<Stock[] | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [sortKey, setSortKey] = useState('change_pct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [searchResults, setSearchResults] = useState('');
  const [magicInput, setMagicInput] = useState('');

  // ── Condition management ──
  const addCondition = useCallback(() => {
    setConditions(prev => [...prev, { id: makeId(), measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: 'prev_close', multiplier: 1 }]);
  }, []);

  const removeCondition = useCallback((id: string) => {
    setConditions(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);
  }, []);

  const updateCondition = useCallback((id: string, updates: Partial<Condition>) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const loadExample = useCallback((example: typeof EXAMPLE_SCANS[0]) => {
    setConditions(example.conditions.map(c => ({ ...c, id: makeId() })));
    setResults(null);
    setHasRun(false);
  }, []);

  // ── Run scan ──
  const runScan = useCallback(() => {
    const stocks = getAllStocks();
    const fnoSymbols = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BAJFINANCE', 'TATAMOTORS', 'ITC', 'LT'];

    const filtered = stocks.filter(stock => {
      if (segment === 'fno' && !fnoSymbols.includes(stock.symbol)) return false;

      const checker = (cond: Condition) => {
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
          case '>': case 'crosses_above': return leftVal > rightVal;
          case '<': case 'crosses_below': return leftVal < rightVal;
          case '>=': return leftVal >= rightVal;
          case '<=': return leftVal <= rightVal;
          case '==': return Math.abs(leftVal - rightVal) < 0.01;
          default: return false;
        }
      };

      return logicMode === 'all' ? conditions.every(checker) : conditions.some(checker);
    });

    setResults(filtered);
    setHasRun(true);
    setPage(0);
  }, [conditions, logicMode, segment]);

  // ── Magic filter (simple NLP) ──
  const handleMagicFilter = useCallback(() => {
    if (!magicInput.trim()) return;
    const input = magicInput.toLowerCase();
    const newConds: Condition[] = [];

    // Simple pattern matching
    const patterns = [
      { regex: /(?:change|chg)\s*(?:>|greater|above|up)\s*([\d.]+)/i, measure: 'change_pct', op: '>' },
      { regex: /(?:change|chg)\s*(?:<|less|below|down)\s*-?([\d.]+)/i, measure: 'change_pct', op: '<' },
      { regex: /volume\s*(?:>|greater|above)\s*([\d.]+)\s*x/i, measure: 'volume', op: '>', compareMeasure: 'avg_volume_10d' },
      { regex: /roe\s*(?:>|greater|above)\s*([\d.]+)/i, measure: 'roe', op: '>' },
      { regex: /pe\s*(?:<|less|below)\s*([\d.]+)/i, measure: 'pe_ratio', op: '<' },
      { regex: /debt.*(?:<|less|below)\s*([\d.]+)/i, measure: 'debt_to_equity', op: '<' },
      { regex: /dividend.*(?:>|greater|above)\s*([\d.]+)/i, measure: 'dividend_yield', op: '>' },
      { regex: /promoter.*(?:>|greater|above)\s*([\d.]+)/i, measure: 'promoter_holding', op: '>' },
      { regex: /market\s*cap.*(?:>|greater|above)\s*([\d.]+)/i, measure: 'market_cap', op: '>' },
    ];

    for (const p of patterns) {
      const match = input.match(p.regex);
      if (match) {
        const cond: Condition = {
          id: makeId(),
          measure: p.measure,
          operator: p.op,
          compareType: (p as any).compareMeasure ? 'measure' : 'number',
          value: match[1],
          compareMeasure: (p as any).compareMeasure || '',
          multiplier: (p as any).compareMeasure ? parseFloat(match[1]) : 1,
        };
        if ((p as any).compareMeasure) {
          cond.value = '';
        }
        newConds.push(cond);
      }
    }

    if (newConds.length > 0) {
      setConditions(newConds);
    }
  }, [magicInput]);

  // ── Sorted & paged results ──
  const sortedResults = useMemo(() => {
    if (!results) return null;
    return [...results].sort((a, b) => {
      const av = getStockValue(a, sortKey) || 0;
      const bv = getStockValue(b, sortKey) || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [results, sortKey, sortDir]);

  const filteredResults = useMemo(() => {
    if (!sortedResults) return null;
    if (!searchResults) return sortedResults;
    return sortedResults.filter(s =>
      s.symbol.toLowerCase().includes(searchResults.toLowerCase()) ||
      s.name.toLowerCase().includes(searchResults.toLowerCase())
    );
  }, [sortedResults, searchResults]);

  const totalPages = filteredResults ? Math.ceil(filteredResults.length / PAGE_SIZE) : 0;
  const pagedResults = filteredResults?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }, [sortKey]);

  // ── Copy results to clipboard ──
  const copyResults = useCallback(() => {
    if (!filteredResults) return;
    const header = RESULT_COLUMNS.map(c => c.label).join('\t');
    const rows = filteredResults.map(s =>
      [s.symbol, s.ltp, s.change_pct, s.open, s.high, s.low, s.volume, s.market_cap, s.pe_ratio || '', s.roe || ''].join('\t')
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
  }, [filteredResults]);

  // ── Export CSV ──
  const exportCSV = useCallback(() => {
    if (!filteredResults) return;
    const header = RESULT_COLUMNS.map(c => c.label).join(',');
    const rows = filteredResults.map(s =>
      [s.symbol, s.ltp, s.change_pct, s.open, s.high, s.low, s.volume, s.market_cap, s.pe_ratio || '', s.roe || ''].join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredResults]);

  // ── Condition description for display ──
  const conditionText = (c: Condition) => {
    const m = MEASURES.find(m => m.key === c.measure)?.label || c.measure;
    const op = OPERATORS.find(o => o.key === c.operator)?.label || c.operator;
    if (c.compareType === 'number') {
      return `${m} ${op} ${c.value}`;
    } else {
      const cm = MEASURES.find(m => m.key === c.compareMeasure)?.label || c.compareMeasure;
      return `${m} ${op} ${c.multiplier !== 1 ? `${c.multiplier} x ` : ''}${cm}`;
    }
  };

  const groups = [...new Set(MEASURES.map(m => m.group))];

  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold text-foreground tracking-wide">STOCK SCREENER</h1>
        <div className="flex items-center gap-2">
          <a href="https://chartink.com/screener" target="_blank" rel="noopener noreferrer"
            className="text-[9px] text-muted-foreground hover:text-terminal-blue transition-colors">Scanner Guide ↗</a>
          <a href="https://chartink.com/screener/scan-examples" target="_blank" rel="noopener noreferrer"
            className="text-[9px] text-muted-foreground hover:text-terminal-blue transition-colors">Scan Examples ↗</a>
        </div>
      </div>

      {/* ══════════ MAGIC FILTERS CARD ══════════ */}
      <div className="border border-primary/20 rounded-lg bg-card overflow-hidden mb-4">
        <div className="px-4 py-2 border-b border-border/50">
          <span className="text-[11px] font-semibold text-primary tracking-wide">✨ MAGIC FILTERS</span>
        </div>

        <div className="p-4">
          {/* Magic input */}
          <div className="flex gap-2 mb-4">
            <div className="flex border border-border rounded overflow-hidden">
              <button className="px-3 py-1.5 text-[10px] font-medium bg-secondary text-foreground border-r border-border">Append</button>
              <button className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">Replace</button>
            </div>
            <input type="text" value={magicInput} onChange={e => setMagicInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMagicFilter()}
              placeholder="Scan stocks using simple language like 'stocks up by 4% and rising volume' or 'ROE above 20 and debt below 0.5'"
              className="flex-1 bg-background border border-border rounded px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors" />
            <button onClick={handleMagicFilter}
              className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5">
              ✨ Generate
            </button>
          </div>

          {/* Example scan chips */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {EXAMPLE_SCANS.map((ex, i) => (
              <button key={i} onClick={() => loadExample(ex)}
                className="px-2.5 py-1 rounded-full text-[9px] font-medium border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                {ex.label}
              </button>
            ))}
          </div>

          {/* Logic + segment */}
          <div className="flex items-center gap-2 mb-3 text-[11px]">
            <span className="text-foreground">Stock</span>
            <span className="font-semibold text-foreground">passes</span>
            <select value={logicMode} onChange={e => setLogicMode(e.target.value as 'all' | 'any')}
              className="bg-secondary border border-border rounded px-2 py-1 text-[10px] text-foreground font-semibold focus:outline-none focus:border-primary/50">
              <option value="all">all</option>
              <option value="any">any</option>
            </select>
            <span className="text-foreground">of the below filters in</span>
            <select value={segment} onChange={e => setSegment(e.target.value as 'cash' | 'fno')}
              className="bg-secondary border border-border rounded px-2 py-1 text-[10px] text-foreground font-semibold focus:outline-none focus:border-primary/50">
              <option value="cash">cash</option>
              <option value="fno">F&O</option>
            </select>
            <span className="text-foreground">segment:</span>
          </div>

          {/* ── Condition rows ── */}
          <div className="space-y-2 mb-4">
            {conditions.map((cond, idx) => (
              <div key={cond.id} className="flex items-center gap-2 flex-wrap">
                {/* Row number */}
                <span className="text-[9px] text-muted-foreground w-4 text-right">{idx + 1}.</span>

                {/* Measure dropdown */}
                <select value={cond.measure} onChange={e => updateCondition(cond.id, { measure: e.target.value })}
                  className="bg-secondary border border-border rounded px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50 min-w-[160px]">
                  {groups.map(g => (
                    <optgroup key={g} label={g}>
                      {MEASURES.filter(m => m.group === g).map(m => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {/* Operator dropdown */}
                <select value={cond.operator} onChange={e => updateCondition(cond.id, { operator: e.target.value })}
                  className="bg-secondary border border-border rounded px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50 min-w-[140px]">
                  {OPERATORS.map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>

                {/* Compare type toggle */}
                <select value={cond.compareType} onChange={e => updateCondition(cond.id, { compareType: e.target.value as 'number' | 'measure' })}
                  className="bg-secondary border border-border rounded px-2 py-1.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50">
                  {COMPARE_TYPES.map(ct => (
                    <option key={ct.key} value={ct.key}>{ct.label}</option>
                  ))}
                </select>

                {/* Value or measure comparison */}
                {cond.compareType === 'number' ? (
                  <input type="number" step="any" value={cond.value}
                    onChange={e => updateCondition(cond.id, { value: e.target.value })}
                    className="bg-secondary border border-border rounded px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50 w-24" />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input type="number" step="any" value={cond.multiplier}
                      onChange={e => updateCondition(cond.id, { multiplier: parseFloat(e.target.value) || 1 })}
                      className="bg-secondary border border-border rounded px-2 py-1.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50 w-16" />
                    <span className="text-[10px] text-muted-foreground">×</span>
                    <select value={cond.compareMeasure} onChange={e => updateCondition(cond.id, { compareMeasure: e.target.value })}
                      className="bg-secondary border border-border rounded px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50 min-w-[140px]">
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

                {/* Remove button */}
                {conditions.length > 1 && (
                  <button onClick={() => removeCondition(cond.id)}
                    className="text-destructive/50 hover:text-destructive text-sm transition-colors ml-1">✕</button>
                )}
              </div>
            ))}
          </div>

          {/* Add + action buttons */}
          <div className="flex items-center gap-2">
            <button onClick={addCondition}
              className="w-7 h-7 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center text-sm font-bold">
              +
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div className="px-4 py-3 border-t border-border/50 flex items-center gap-2">
          <button onClick={runScan}
            className="px-4 py-2 rounded bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5">
            ▶ Run Scan
          </button>
          <span className="text-[9px] text-muted-foreground ml-2">
            Scanning {segment === 'fno' ? '12 F&O' : getAllStocks().length} stocks in {segment} segment
          </span>
          <div className="ml-auto flex items-center gap-3 text-[9px] text-muted-foreground">
            Get <span className="font-semibold text-foreground">Realtime data</span> on{' '}
            <a href="https://chartink.com" target="_blank" rel="noopener noreferrer" className="text-terminal-blue hover:underline font-medium">ChartInk ↗</a>
            <a href="https://scanx.in" target="_blank" rel="noopener noreferrer" className="text-terminal-blue hover:underline font-medium">ScanX ↗</a>
          </div>
        </div>
      </div>

      {/* ══════════ RESULTS ══════════ */}
      {hasRun && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[12px] font-bold text-foreground tracking-wide">
              STOCKS <span className="text-muted-foreground font-normal">({filteredResults?.length || 0} results)</span>
            </h2>
            <div className="flex items-center gap-2">
              {filteredResults && filteredResults.length > 0 && (
                <>
                  <button onClick={copyResults}
                    className="px-2.5 py-1 rounded text-[9px] font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground transition-all">
                    Copy
                  </button>
                  <button onClick={exportCSV}
                    className="px-2.5 py-1 rounded text-[9px] font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground transition-all">
                    CSV
                  </button>
                </>
              )}
              <input type="text" placeholder="Search stocks here..." value={searchResults}
                onChange={e => { setSearchResults(e.target.value); setPage(0); }}
                className="bg-secondary border border-border rounded px-2.5 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground w-48 focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
          </div>

          {/* Applied filters summary */}
          <div className="flex gap-1.5 flex-wrap mb-2">
            {conditions.map((c, i) => (
              <span key={c.id} className="px-2 py-0.5 rounded text-[9px] bg-primary/10 text-primary border border-primary/20">
                {conditionText(c)}
              </span>
            ))}
          </div>

          {pagedResults && pagedResults.length > 0 ? (
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="px-3 py-2.5 text-left text-[9px] font-semibold text-muted-foreground w-8">Sr.</th>
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
                            <span className="text-[8px] text-muted-foreground ml-1.5">{stock.name}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-right text-foreground font-medium">{formatCurrency(stock.ltp)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold
                            ${stock.change_pct >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                            {formatPercent(stock.change_pct)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(stock.open)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(stock.high)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(stock.low)}</td>
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-3 border-t border-border/30">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="px-3 py-1 rounded text-[9px] font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground disabled:opacity-30">
                    ← Prev
                  </button>
                  <span className="text-[9px] text-muted-foreground">Page {page + 1} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded text-[9px] font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground disabled:opacity-30">
                    Next →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card p-16 text-center">
              <p className="text-[11px] text-muted-foreground">No stocks match your scan criteria. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
