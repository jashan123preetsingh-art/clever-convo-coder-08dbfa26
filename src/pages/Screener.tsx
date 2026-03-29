import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllStocks } from '@/data/mockData';
import { formatCurrency, formatPercent, formatMarketCap } from '@/utils/format';

const PRESET_SCREENS = [
  { name: 'High ROE + Low Debt', filters: { minROE: 20, maxDebt: 0.5 }, icon: '🏆' },
  { name: 'Value Picks (Low PE)', filters: { maxPE: 15, minROE: 12 }, icon: '💎' },
  { name: 'Growth Stars', filters: { minROE: 18, minROCE: 15 }, icon: '🚀' },
  { name: 'Dividend Champions', filters: { minDividend: 3 }, icon: '💰' },
  { name: 'Low Debt Leaders', filters: { maxDebt: 0.1 }, icon: '🛡️' },
  { name: 'All Stocks', filters: {}, icon: '📋' },
];

const COLUMNS = [
  { key: 'symbol', label: 'Symbol', align: 'left' as const },
  { key: 'ltp', label: 'LTP', align: 'right' as const },
  { key: 'change_pct', label: 'Chg%', align: 'right' as const },
  { key: 'market_cap', label: 'MCap', align: 'right' as const },
  { key: 'pe_ratio', label: 'P/E', align: 'right' as const },
  { key: 'roe', label: 'ROE%', align: 'right' as const },
  { key: 'roce', label: 'ROCE%', align: 'right' as const },
  { key: 'debt_to_equity', label: 'D/E', align: 'right' as const },
  { key: 'dividend_yield', label: 'Div%', align: 'right' as const },
];

const PAGE_SIZE = 50;

export default function Screener() {
  const [sortKey, setSortKey] = useState('market_cap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, number | undefined>>({});
  const [page, setPage] = useState(0);
  const [activePreset, setActivePreset] = useState('All Stocks');

  const stocks = getAllStocks();

  const filtered = useMemo(() => {
    return stocks
      .filter(s => {
        if (searchTerm && !s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) && !s.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (filters.maxPE && (s.pe_ratio || 999) > filters.maxPE) return false;
        if (filters.minROE && (s.roe || 0) < filters.minROE) return false;
        if (filters.minROCE && (s.roce || 0) < filters.minROCE) return false;
        if (filters.maxDebt && (s.debt_to_equity || 999) > filters.maxDebt) return false;
        if (filters.minDividend && (s.dividend_yield || 0) < filters.minDividend) return false;
        return true;
      })
      .sort((a, b) => {
        const av = (a as any)[sortKey] || 0;
        const bv = (b as any)[sortKey] || 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      });
  }, [stocks, searchTerm, filters, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handlePreset = (preset: typeof PRESET_SCREENS[0]) => {
    setFilters(preset.filters as any);
    setActivePreset(preset.name);
    setPage(0);
  };

  return (
    <div className="p-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-base font-black text-foreground tracking-wide">FUNDAMENTAL SCREENER</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">Screen {stocks.length} Indian stocks by fundamental metrics</p>
      </div>

      {/* Presets */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {PRESET_SCREENS.map((screen) => (
          <button key={screen.name} onClick={() => handlePreset(screen)}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-semibold border transition-all
              ${activePreset === screen.name
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-secondary text-muted-foreground border-border hover:border-primary/20 hover:text-foreground'}`}>
            {screen.icon} {screen.name}
          </button>
        ))}
      </div>

      {/* Search & Info */}
      <div className="flex items-center justify-between mb-3">
        <input type="text" placeholder="🔍 Search symbol or name..." value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
          className="bg-secondary border border-border rounded-sm px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground w-64 focus:outline-none focus:border-primary/50 transition-colors" />
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="font-medium">{filtered.length} results</span>
          {totalPages > 1 && (
            <span>Page {page + 1} of {totalPages}</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="t-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {COLUMNS.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)}
                    className={`p-2.5 font-semibold cursor-pointer hover:text-foreground select-none transition-colors
                      ${col.align === 'right' ? 'text-right' : 'text-left'}
                      ${sortKey === col.key ? 'text-primary' : 'text-muted-foreground'}`}>
                    {col.label} {sortKey === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((stock) => (
                <tr key={stock.symbol} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                  <td className="p-2.5">
                    <Link to={`/stock/${stock.symbol}`} className="hover:text-primary transition-colors">
                      <p className="font-bold text-foreground">{stock.symbol}</p>
                      <p className="text-[9px] text-muted-foreground truncate max-w-[120px]">{stock.name}</p>
                    </Link>
                  </td>
                  <td className="p-2.5 text-right text-foreground font-medium">{formatCurrency(stock.ltp)}</td>
                  <td className="p-2.5 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${stock.change_pct >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      {formatPercent(stock.change_pct)}
                    </span>
                  </td>
                  <td className="p-2.5 text-right text-muted-foreground">{formatMarketCap(stock.market_cap)}</td>
                  <td className="p-2.5 text-right text-muted-foreground">{stock.pe_ratio || '—'}</td>
                  <td className="p-2.5 text-right">
                    <span className={(stock.roe || 0) >= 15 ? 'text-primary font-medium' : 'text-muted-foreground'}>{stock.roe ? `${stock.roe}%` : '—'}</span>
                  </td>
                  <td className="p-2.5 text-right">
                    <span className={(stock.roce || 0) >= 15 ? 'text-primary font-medium' : 'text-muted-foreground'}>{stock.roce ? `${stock.roce}%` : '—'}</span>
                  </td>
                  <td className="p-2.5 text-right">
                    <span className={(stock.debt_to_equity || 0) <= 0.5 ? 'text-primary font-medium' : (stock.debt_to_equity || 0) > 1 ? 'text-destructive' : 'text-muted-foreground'}>
                      {stock.debt_to_equity ?? '—'}
                    </span>
                  </td>
                  <td className="p-2.5 text-right text-muted-foreground">{stock.dividend_yield ? `${stock.dividend_yield}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-sm text-[10px] font-semibold bg-secondary text-muted-foreground border border-border hover:text-foreground disabled:opacity-30 transition-all">
            ← Prev
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = page < 3 ? i : page - 2 + i;
              if (p >= totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-sm text-[10px] font-semibold transition-all ${p === page ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'}`}>
                  {p + 1}
                </button>
              );
            })}
          </div>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-sm text-[10px] font-semibold bg-secondary text-muted-foreground border border-border hover:text-foreground disabled:opacity-30 transition-all">
            Next →
          </button>
        </div>
      )}

      {/* Note about data */}
      <p className="text-[9px] text-muted-foreground mt-4 text-center">
        For comprehensive fundamental data on 2000+ stocks, visit{' '}
        <a href="https://www.screener.in" target="_blank" rel="noopener noreferrer" className="text-terminal-blue hover:underline">Screener.in</a>,{' '}
        <a href="https://www.trendlyne.com" target="_blank" rel="noopener noreferrer" className="text-terminal-blue hover:underline">Trendlyne</a>, or{' '}
        <a href="https://chartink.com/screener" target="_blank" rel="noopener noreferrer" className="text-terminal-blue hover:underline">ChartInk</a>
      </p>
    </div>
  );
}
