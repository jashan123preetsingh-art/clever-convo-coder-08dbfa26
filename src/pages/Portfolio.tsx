import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePortfolio, PortfolioPosition } from '@/hooks/usePortfolio';
import { useBatchQuotes, useStockSearch } from '@/hooks/useStockData';
import { formatCurrency, formatPercent } from '@/utils/format';
import { Search } from 'lucide-react';
import type { Stock } from '@/types/stock';

function SymbolSearchInput({ value, onChange }: { value: string; onChange: (symbol: string) => void }) {
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const { data: results } = useStockSearch(input);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!input || input.length < 1 || !Array.isArray(results)) return [];
    return results.slice(0, 8);
  }, [input, results]);

  return (
    <div ref={ref} className="relative">
      <label className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold block mb-1">Symbol</label>
      <div className="flex items-center bg-secondary/40 border border-border/30 rounded-lg px-2.5 py-2 gap-1.5 focus-within:border-primary/30 transition-all">
        <Search className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
        <input
          value={input}
          onChange={e => { setInput(e.target.value); onChange(''); setOpen(true); }}
          onFocus={() => input.length >= 1 && setOpen(true)}
          placeholder="Search stock..."
          className="bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/50 w-28 focus:outline-none"
          required
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-card/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-2xl z-50 overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map((stock: { symbol: string; name: string; exchange?: string }, i: number) => (
            <button key={`${stock.symbol}-${i}`} type="button"
              onMouseDown={e => {
                e.preventDefault();
                setInput(stock.symbol);
                onChange(stock.symbol);
                setOpen(false);
              }}
              className="w-full text-left flex items-center justify-between px-3 py-2.5 hover:bg-primary/5 transition-colors border-b border-border/10 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-bold text-foreground">{stock.symbol}</span>
                <span className="text-[9px] text-muted-foreground truncate">{stock.name}</span>
              </div>
              <span className="text-[8px] text-muted-foreground/50 bg-secondary/50 px-1.5 py-0.5 rounded flex-shrink-0">{stock.exchange || 'NSE'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddPositionForm({ onSubmit }: { onSubmit: (data: { symbol: string; entry_price: number; quantity: number; trade_type: string; notes?: string }) => void }) {
  const [symbol, setSymbol] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [type, setType] = useState('buy');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !price) return;
    onSubmit({ symbol: symbol.toUpperCase(), entry_price: parseFloat(price), quantity: parseFloat(qty), trade_type: type });
    setSymbol(''); setPrice(''); setQty('1');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <SymbolSearchInput value={symbol} onChange={setSymbol} />
      <div>
        <label className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold block mb-1">Entry Price</label>
        <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.01" placeholder="1400"
          className="bg-secondary/40 border border-border/30 rounded-lg px-3 py-2 text-[11px] text-foreground w-24 focus:outline-none focus:border-primary/30" required />
      </div>
      <div>
        <label className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold block mb-1">Qty</label>
        <input value={qty} onChange={e => setQty(e.target.value)} type="number" step="1" placeholder="1"
          className="bg-secondary/40 border border-border/30 rounded-lg px-3 py-2 text-[11px] text-foreground w-16 focus:outline-none focus:border-primary/30" required />
      </div>
      <div>
        <label className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold block mb-1">Type</label>
        <select value={type} onChange={e => setType(e.target.value)}
          className="bg-secondary/40 border border-border/30 rounded-lg px-3 py-2 text-[11px] text-foreground focus:outline-none focus:border-primary/30">
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

function PositionRow({ pos, ltp, onClose, onDelete }: { pos: PortfolioPosition; ltp?: number; onClose: (id: string, price: number) => void; onDelete: (id: string) => void }) {
  const hasLivePrice = pos.status === 'closed' || ltp != null;
  const currentPrice = pos.status === 'closed' ? pos.exit_price! : (ltp ?? pos.entry_price);
  const pnl = (currentPrice - pos.entry_price) * pos.quantity * (pos.trade_type === 'sell' ? -1 : 1);
  const pnlPct = ((currentPrice - pos.entry_price) / pos.entry_price) * 100 * (pos.trade_type === 'sell' ? -1 : 1);
  const isProfit = pnl >= 0;

  return (
    <div className="flex items-center justify-between py-2.5 px-3 sm:px-4 hover:bg-primary/[0.03] transition-all group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] sm:text-[11px] font-bold text-foreground">{pos.symbol}</p>
            <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-bold ${pos.trade_type === 'buy' ? 'bg-primary/8 text-primary' : 'bg-destructive/8 text-destructive'}`}>
              {pos.trade_type.toUpperCase()}
            </span>
            {pos.status === 'closed' && <span className="text-[7px] px-1.5 py-0.5 rounded-md bg-muted/20 text-muted-foreground font-bold">CLOSED</span>}
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
          <button onClick={() => onClose(pos.id, currentPrice)}
            className="text-[8px] px-2 py-1 rounded-md bg-accent/10 text-accent font-bold hover:bg-accent/20 transition-all opacity-0 group-hover:opacity-100">
            Close
          </button>
        )}
        <button onClick={() => onDelete(pos.id)}
          className="text-[8px] px-2 py-1 rounded-md bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 transition-all opacity-0 group-hover:opacity-100">
          ✕
        </button>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const { openPositions, closedPositions, isLoading, addPosition, closePosition, deletePosition } = usePortfolio();
  const [tab, setTab] = useState<'open' | 'closed'>('open');

  const symbols = useMemo(() => [...new Set(openPositions.map(p => p.symbol))], [openPositions]);
  const { data: liveQuotes } = useBatchQuotes(symbols);

  const quoteMap = useMemo(() => {
    const m: Record<string, number> = {};
    if (Array.isArray(liveQuotes)) {
      liveQuotes.forEach((q: { symbol?: string; data?: { symbol?: string; ltp?: number } | null }) => {
        const sym = q?.symbol;
        const ltp = q?.data?.ltp;
        if (sym && ltp != null && ltp > 0) m[sym] = ltp;
      });
    }
    return m;
  }, [liveQuotes]);

  const totalInvested = openPositions.reduce((sum, p) => sum + p.entry_price * p.quantity, 0);
  const totalCurrent = openPositions.reduce((sum, p) => sum + (quoteMap[p.symbol] ?? p.entry_price) * p.quantity, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const isProfit = totalPnl >= 0;

  const realizedPnl = closedPositions.reduce((sum, p) => {
    const pnl = ((p.exit_price! - p.entry_price) * p.quantity) * (p.trade_type === 'sell' ? -1 : 1);
    return sum + pnl;
  }, 0);

  const positions = tab === 'open' ? openPositions : closedPositions;

  return (
    <div className="p-3 sm:p-5 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm sm:text-base font-black text-foreground tracking-tight">Portfolio & P&L</h1>
      </div>

      {/* Summary Cards */}
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
          <p className={`text-[8px] font-bold ${isProfit ? 'text-primary' : 'text-destructive'}`}>{isProfit ? '+' : ''}{totalPnlPct.toFixed(2)}%</p>
        </div>
        <div className="rounded-xl bg-card/40 p-4 border border-border/10">
          <p className="text-[8px] text-muted-foreground/70 uppercase tracking-wider font-bold mb-1">Realized P&L</p>
          <p className={`text-lg font-black font-data ${realizedPnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {realizedPnl >= 0 ? '+' : ''}₹{Math.abs(realizedPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Add Position */}
      <div className="rounded-xl bg-card/30 border border-border/10 p-4">
        <p className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider mb-3">Add Position</p>
        <AddPositionForm onSubmit={addPosition} />
      </div>

      {/* Positions */}
      <div className="rounded-xl bg-card/30 border border-border/10 overflow-hidden">
        <div className="flex items-center gap-0 border-b border-border/10">
          <button onClick={() => setTab('open')} className={`px-4 py-3 text-[10px] font-bold transition-all ${tab === 'open' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            Open ({openPositions.length})
          </button>
          <button onClick={() => setTab('closed')} className={`px-4 py-3 text-[10px] font-bold transition-all ${tab === 'closed' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            Closed ({closedPositions.length})
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[10px] text-muted-foreground">Loading positions...</div>
        ) : positions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-[11px] font-bold text-foreground mb-1">No {tab} positions</p>
            <p className="text-[9px] text-muted-foreground/70">{tab === 'open' ? 'Add your first position above to start tracking P&L' : 'Close open positions to see them here'}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/5">
            {positions.map(pos => (
              <PositionRow
                key={pos.id}
                pos={pos}
                ltp={quoteMap[pos.symbol]}
                onClose={(id, price) => closePosition({ id, exit_price: price })}
                onDelete={deletePosition}
              />
            ))}
          </div>
        )}
      </div>

      {/* SEBI Disclaimer */}
      <div className="text-center pt-4 border-t border-border/10">
        <p className="text-[8px] text-muted-foreground/40 leading-relaxed">
          ⚠️ Investment in securities market are subject to market risks. Read all the related documents carefully before investing.
          Trade Arsenal is not a SEBI-registered Research Analyst or Investment Advisor. Past performance is not indicative of future results.
        </p>
      </div>
    </div>
  );
}
