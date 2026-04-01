import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { usePortfolio, PortfolioPosition } from '@/hooks/usePortfolio';
import { useBatchQuotes, useStockSearch } from '@/hooks/useStockData';
import { getAllStocks } from '@/data/mockData';
import type { SearchResult } from '@/types/stock';

type StockSearchItem = SearchResult & { exchange: string };

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase().replace(/\.NS$|\.BO$/, '');
}

function levenshteinDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[a.length][b.length];
}

const LOCAL_STOCK_INDEX: Array<{ symbol: string; name: string; nameUpper: string; exchange: string }> = (() => {
  const bySymbol = new Map<string, { symbol: string; name: string; nameUpper: string; exchange: string }>();

  getAllStocks().forEach((stock) => {
    const symbol = normalizeSymbol(stock.symbol);
    if (!symbol || bySymbol.has(symbol)) return;

    bySymbol.set(symbol, {
      symbol,
      name: stock.name,
      nameUpper: stock.name.toUpperCase(),
      exchange: stock.exchange || 'NSE',
    });
  });

  return Array.from(bySymbol.values());
})();

function rankSearchResult(query: string, item: { symbol: string; name: string }): number {
  const symbol = normalizeSymbol(item.symbol);
  const name = item.name.toUpperCase();

  if (symbol === query) return 0;
  if (symbol.startsWith(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (symbol.includes(query)) return 3;
  if (name.includes(query)) return 4;

  if (query.length >= 5) {
    const distance = levenshteinDistance(query, symbol);
    if (distance <= 2) return 5 + distance;
  }

  return 99;
}

function getRankedSearchResults(query: string, apiResults: SearchResult[] = []): StockSearchItem[] {
  const normalizedQuery = normalizeSymbol(query);
  if (!normalizedQuery) return [];

  const unique = new Map<string, StockSearchItem>();

  const add = (item: { symbol: string; name: string; exchange?: string }) => {
    const symbol = normalizeSymbol(item.symbol);
    if (!symbol || unique.has(symbol)) return;

    unique.set(symbol, {
      symbol,
      name: item.name,
      exchange: item.exchange || 'NSE',
    });
  };

  apiResults.forEach(add);

  LOCAL_STOCK_INDEX.forEach((item) => {
    if (
      item.symbol.startsWith(normalizedQuery) ||
      item.symbol.includes(normalizedQuery) ||
      item.nameUpper.includes(normalizedQuery) ||
      (normalizedQuery.length >= 5 && levenshteinDistance(normalizedQuery, item.symbol) <= 2)
    ) {
      add(item);
    }
  });

  return Array.from(unique.values())
    .map((item) => ({ item, score: rankSearchResult(normalizedQuery, item) }))
    .filter((entry) => entry.score < 99)
    .sort((a, b) => a.score - b.score || a.item.symbol.length - b.item.symbol.length || a.item.symbol.localeCompare(b.item.symbol))
    .slice(0, 8)
    .map(({ item }) => item);
}

function resolvePortfolioSymbol(input: string, candidates: StockSearchItem[] = []): string | null {
  const normalizedInput = normalizeSymbol(input);
  if (!normalizedInput) return null;

  const exactFromCandidates = candidates.find((item) => normalizeSymbol(item.symbol) === normalizedInput);
  if (exactFromCandidates) return exactFromCandidates.symbol;

  const exactFromLocal = LOCAL_STOCK_INDEX.find((item) => item.symbol === normalizedInput);
  if (exactFromLocal) return exactFromLocal.symbol;

  const ranked = getRankedSearchResults(normalizedInput, candidates);
  if (ranked.length > 0) {
    const topScore = rankSearchResult(normalizedInput, ranked[0]);
    if (topScore <= 4 || (normalizedInput.length >= 5 && topScore <= 7)) {
      return ranked[0].symbol;
    }
  }

  return null;
}

function SymbolSearchInput({
  value,
  onValueChange,
  onSymbolSelect,
  onSuggestionsChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSymbolSelect: (symbol: string) => void;
  onSuggestionsChange: (results: StockSearchItem[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const query = normalizeSymbol(value);
  const { data: apiResults } = useStockSearch(query);

  const suggestions = useMemo(
    () => getRankedSearchResults(query, Array.isArray(apiResults) ? apiResults : []),
    [query, apiResults],
  );

  useEffect(() => {
    onSuggestionsChange(suggestions);
  }, [onSuggestionsChange, suggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSymbol = useCallback((symbol: string) => {
    onValueChange(symbol);
    onSymbolSelect(symbol);
    setOpen(false);
  }, [onSymbolSelect, onValueChange]);

  return (
    <div ref={ref} className="relative">
      <label className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold block mb-1">Symbol</label>
      <div className="flex items-center bg-secondary/40 border border-border/30 rounded-lg px-2.5 py-2 gap-1.5 focus-within:border-primary/30 transition-all">
        <Search className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
        <input
          value={value}
          onChange={(e) => {
            const next = e.target.value.toUpperCase();
            onValueChange(next);
            onSymbolSelect('');
            setOpen(true);
          }}
          onFocus={() => setOpen(query.length >= 1)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestions.length > 0) {
              e.preventDefault();
              selectSymbol(suggestions[0].symbol);
            }

            if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder="Search stock..."
          className="bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/50 w-28 focus:outline-none"
          required
        />
      </div>

      {open && query.length >= 1 && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-card/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-2xl z-50 overflow-hidden max-h-52 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((stock) => (
              <button
                key={stock.symbol}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSymbol(stock.symbol);
                }}
                className="w-full text-left flex items-center justify-between px-3 py-2.5 hover:bg-primary/5 transition-colors border-b border-border/10 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-foreground">{stock.symbol}</span>
                  <span className="text-[9px] text-muted-foreground truncate">{stock.name}</span>
                </div>
                <span className="text-[8px] text-muted-foreground/50 bg-secondary/50 px-1.5 py-0.5 rounded flex-shrink-0">{stock.exchange || 'NSE'}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2.5 text-[10px] text-muted-foreground">No matching stocks found</div>
          )}
        </div>
      )}
    </div>
  );
}

function AddPositionForm({ onSubmit }: { onSubmit: (data: { symbol: string; entry_price: number; quantity: number; trade_type: string; notes?: string }) => void }) {
  const [symbolInput, setSymbolInput] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [type, setType] = useState('buy');
  const [suggestions, setSuggestions] = useState<StockSearchItem[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedSymbol = resolvePortfolioSymbol(selectedSymbol || symbolInput, suggestions);
    const entryPrice = Number(price);
    const quantity = Number(qty);

    if (!resolvedSymbol) {
      toast.error('Please select a valid stock from the search list');
      return;
    }

    if (!Number.isFinite(entryPrice) || entryPrice <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter a valid price and quantity');
      return;
    }

    onSubmit({
      symbol: resolvedSymbol,
      entry_price: entryPrice,
      quantity,
      trade_type: type,
    });

    setSymbolInput('');
    setSelectedSymbol('');
    setPrice('');
    setQty('1');
    setSuggestions([]);
  };

  const handleSuggestionsChange = useCallback((next: StockSearchItem[]) => {
    setSuggestions(next);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <SymbolSearchInput
        value={symbolInput}
        onValueChange={setSymbolInput}
        onSymbolSelect={setSelectedSymbol}
        onSuggestionsChange={handleSuggestionsChange}
      />

      <div>
        <label className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold block mb-1">Entry Price</label>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="1400"
          className="bg-secondary/40 border border-border/30 rounded-lg px-3 py-2 text-[11px] text-foreground w-24 focus:outline-none focus:border-primary/30"
          required
        />
      </div>

      <div>
        <label className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold block mb-1">Qty</label>
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          type="number"
          step="1"
          inputMode="numeric"
          placeholder="1"
          className="bg-secondary/40 border border-border/30 rounded-lg px-3 py-2 text-[11px] text-foreground w-16 focus:outline-none focus:border-primary/30"
          required
        />
      </div>

      <div>
        <label className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold block mb-1">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-secondary/40 border border-border/30 rounded-lg px-3 py-2 text-[11px] text-foreground focus:outline-none focus:border-primary/30"
        >
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </div>

      <button type="submit" className="px-4 py-2 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
        Add Position
      </button>
    </form>
  );
}

const PositionRow = React.memo(function PositionRow({
  pos,
  displaySymbol,
  ltp,
  onClose,
  onDelete,
}: {
  pos: PortfolioPosition;
  displaySymbol: string;
  ltp?: number;
  onClose: (id: string, price: number) => void;
  onDelete: (id: string) => void;
}) {
  const currentPrice = pos.status === 'closed' ? pos.exit_price! : (ltp ?? pos.entry_price);
  const direction = pos.trade_type === 'sell' ? -1 : 1;
  const pnl = (currentPrice - pos.entry_price) * pos.quantity * direction;
  const pnlPct = ((currentPrice - pos.entry_price) / pos.entry_price) * 100 * direction;
  const isProfit = pnl >= 0;

  return (
    <div className="flex items-center justify-between py-2.5 px-3 sm:px-4 hover:bg-primary/[0.03] transition-all group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] sm:text-[11px] font-bold text-foreground">{displaySymbol}</p>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold ${pos.trade_type === 'buy' ? 'bg-primary/8 text-primary' : 'bg-destructive/8 text-destructive'}`}>
              {pos.trade_type.toUpperCase()}
            </span>
            {pos.status === 'closed' && <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-muted/20 text-muted-foreground font-bold">CLOSED</span>}
          </div>
          <p className="text-[8px] text-muted-foreground/70">{pos.quantity} × ₹{pos.entry_price.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right font-data">
          <p className="text-[9px] sm:text-[10px] text-foreground font-semibold">₹{currentPrice.toLocaleString('en-IN')}</p>
          <p className={`text-[8px] sm:text-[9px] font-bold ${isProfit ? 'text-primary' : 'text-destructive'}`}>
            {isProfit ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
          </p>
        </div>

        {pos.status === 'open' && (
          <button
            onClick={() => onClose(pos.id, currentPrice)}
            className="text-[8px] px-2 py-1 rounded-md bg-accent/10 text-accent font-bold hover:bg-accent/20 transition-all opacity-0 group-hover:opacity-100"
          >
            Close
          </button>
        )}

        <button
          onClick={() => onDelete(pos.id)}
          className="text-[8px] px-2 py-1 rounded-md bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 transition-all opacity-0 group-hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}, (prev, next) => prev.pos === next.pos && prev.ltp === next.ltp && prev.displaySymbol === next.displaySymbol);

export default function Portfolio() {
  const { openPositions, closedPositions, isLoading, addPosition, closePosition, deletePosition } = usePortfolio();
  const [tab, setTab] = useState<'open' | 'closed'>('open');

  const liveSymbolByPositionId = useMemo(() => {
    const map: Record<string, string> = {};

    openPositions.forEach((position) => {
      const normalized = normalizeSymbol(position.symbol);
      map[position.id] = resolvePortfolioSymbol(normalized) ?? normalized;
    });

    return map;
  }, [openPositions]);

  const symbols = useMemo(
    () => [...new Set(Object.values(liveSymbolByPositionId).filter(Boolean))],
    [liveSymbolByPositionId],
  );

  const { data: liveQuotes } = useBatchQuotes(symbols, {
    staleTime: 4_000,
    refetchInterval: 5_000,
  });

  const quoteMap = useMemo(() => {
    const map: Record<string, number> = {};

    if (Array.isArray(liveQuotes)) {
      liveQuotes.forEach((quote: { symbol?: string; data?: { symbol?: string; ltp?: number } | null }) => {
        const symbol = normalizeSymbol(quote?.symbol || quote?.data?.symbol || '');
        const ltp = quote?.data?.ltp;

        if (symbol && ltp != null && ltp > 0) {
          map[symbol] = ltp;
        }
      });
    }

    return map;
  }, [liveQuotes]);

  const getCurrentPrice = useCallback((position: PortfolioPosition): number => {
    if (position.status === 'closed') return position.exit_price ?? position.entry_price;

    const liveSymbol = liveSymbolByPositionId[position.id] ?? normalizeSymbol(position.symbol);
    return quoteMap[liveSymbol] ?? position.entry_price;
  }, [liveSymbolByPositionId, quoteMap]);

  const totalInvested = openPositions.reduce((sum, position) => sum + position.entry_price * position.quantity, 0);

  const totalPnl = openPositions.reduce((sum, position) => {
    const direction = position.trade_type === 'sell' ? -1 : 1;
    return sum + (getCurrentPrice(position) - position.entry_price) * position.quantity * direction;
  }, 0);

  const totalCurrent = totalInvested + totalPnl;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const isProfit = totalPnl >= 0;

  const realizedPnl = closedPositions.reduce((sum, position) => {
    const direction = position.trade_type === 'sell' ? -1 : 1;
    const exitPrice = position.exit_price ?? position.entry_price;
    return sum + (exitPrice - position.entry_price) * position.quantity * direction;
  }, 0);

  const handleClosePosition = useCallback((id: string, price: number) => {
    closePosition({ id, exit_price: price });
  }, [closePosition]);

  const handleDeletePosition = useCallback((id: string) => {
    deletePosition(id);
  }, [deletePosition]);

  const positions = tab === 'open' ? openPositions : closedPositions;

  return (
    <div className="p-3 sm:p-5 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm sm:text-base font-black text-foreground tracking-tight">Portfolio & P&L</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl bg-card/40 p-4 border border-border/10">
          <p className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold mb-1">Invested</p>
          <p className="text-lg font-black font-data text-foreground">₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>

        <div className="rounded-xl bg-card/40 p-4 border border-border/10">
          <p className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold mb-1">Current</p>
          <p className="text-lg font-black font-data text-foreground">₹{totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>

        <div className="rounded-xl bg-card/40 p-4 border border-border/10">
          <p className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold mb-1">Unrealized P&L</p>
          <p className={`text-lg font-black font-data ${isProfit ? 'text-primary' : 'text-destructive'}`}>
            {isProfit ? '+' : ''}₹{Math.abs(totalPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className={`text-[8px] font-bold ${isProfit ? 'text-primary' : 'text-destructive'}`}>
            {isProfit ? '+' : ''}{totalPnlPct.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-xl bg-card/40 p-4 border border-border/10">
          <p className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold mb-1">Realized P&L</p>
          <p className={`text-lg font-black font-data ${realizedPnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {realizedPnl >= 0 ? '+' : ''}₹{Math.abs(realizedPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-card/30 border border-border/10 p-4">
        <p className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider mb-3">Add Position</p>
        <AddPositionForm onSubmit={addPosition} />
      </div>

      <div className="rounded-xl bg-card/30 border border-border/10 overflow-hidden">
        <div className="flex items-center gap-0 border-b border-border/10">
          <button
            onClick={() => setTab('open')}
            className={`px-4 py-3 text-[10px] font-bold transition-all ${tab === 'open' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Open ({openPositions.length})
          </button>
          <button
            onClick={() => setTab('closed')}
            className={`px-4 py-3 text-[10px] font-bold transition-all ${tab === 'closed' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Closed ({closedPositions.length})
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[10px] text-muted-foreground">Loading positions...</div>
        ) : positions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-[11px] font-bold text-foreground mb-1">No {tab} positions</p>
            <p className="text-[9px] text-muted-foreground/70">
              {tab === 'open' ? 'Add your first position above to start tracking P&L' : 'Close open positions to see them here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/5">
            {positions.map((position) => {
              const displaySymbol = tab === 'open'
                ? (liveSymbolByPositionId[position.id] ?? normalizeSymbol(position.symbol))
                : normalizeSymbol(position.symbol);

              return (
                <PositionRow
                  key={position.id}
                  pos={position}
                  displaySymbol={displaySymbol}
                  ltp={tab === 'open' ? quoteMap[displaySymbol] : undefined}
                  onClose={handleClosePosition}
                  onDelete={handleDeletePosition}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="text-center pt-4 border-t border-border/10">
        <p className="text-[8px] text-muted-foreground/40 leading-relaxed">
          ⚠️ Investment in securities market are subject to market risks. Read all the related documents carefully before investing.
          Trade Arsenal is not a SEBI-registered Research Analyst or Investment Advisor. Past performance is not indicative of future results.
        </p>
      </div>
    </div>
  );
}
