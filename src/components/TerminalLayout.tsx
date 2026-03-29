import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useStore from '@/store/useStore';
import { INDICES, getAllStocks } from '@/data/mockData';
import { formatPercent } from '@/utils/format';
import { useStockSearch } from '@/hooks/useStockData';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', shortcut: 'F1', icon: '⌂' },
  { path: '/heatmap', label: 'Heatmap', shortcut: 'F2', icon: '▦' },
  { path: '/scanner', label: 'Scanner', shortcut: 'F3', icon: '⊕' },
  { path: '/options', label: 'Options', shortcut: 'F4', icon: '◎' },
  { path: '/sectors', label: 'Sectors', shortcut: 'F5', icon: '◫' },
  { path: '/fii-dii', label: 'FII/DII', shortcut: 'F6', icon: '⇄' },
  { path: '/oi-analysis', label: 'OI Analysis', shortcut: 'F7', icon: '📈' },
  { path: '/news', label: 'News', shortcut: 'F8', icon: '◉' },
];

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useStore();
  const [time, setTime] = useState(new Date());
  const [searchInput, setSearchInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data: searchResults } = useStockSearch(searchInput);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowSearch(true);
        }
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const isMarketOpen = () => {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false;
    const timeVal = now.getHours() * 60 + now.getMinutes();
    return timeVal >= 555 && timeVal <= 930;
  };

  const handleSearchSelect = (symbol: string) => {
    navigate(`/stock/${symbol}`);
    setSearchInput('');
    setShowSearch(false);
  };

  const localStockResults = searchInput.length >= 1
    ? getAllStocks().filter(s => s.symbol.toLowerCase().includes(searchInput.toLowerCase()) || s.name.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 12)
    : [];

  // Merge API + local results, deduplicate by symbol, local results always available
  const apiResults = Array.isArray(searchResults) ? searchResults : [];
  const mergedMap = new Map<string, any>();
  for (const s of localStockResults) mergedMap.set(s.symbol, s);
  for (const s of apiResults) {
    if (!mergedMap.has(s.symbol)) mergedMap.set(s.symbol, s);
  }
  const combinedResults = Array.from(mergedMap.values()).slice(0, 10);
  const marketOpen = isMarketOpen();

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ═══ Top Bar ═══ */}
      <header className="h-11 bg-card/80 glass border-b border-border/60 flex items-center justify-between px-4 flex-shrink-0 z-30">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-[hsl(var(--terminal-cyan))] flex items-center justify-center shadow-sm glow-primary">
              <span className="text-[9px] font-black text-primary-foreground tracking-tight">SP</span>
            </div>
            <span className="text-[13px] font-bold text-foreground tracking-wide group-hover:text-primary transition-colors">StockPulse</span>
          </Link>

          <div className="w-px h-5 bg-border/50" />

          {/* Search */}
          <div className="relative">
            <div className="flex items-center bg-secondary/60 border border-border/50 rounded-md px-3 py-1.5 gap-2 focus-within:border-primary/40 focus-within:bg-secondary transition-all">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search stocks..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                className="bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground w-36 focus:w-52 focus:outline-none transition-all" />
              <kbd className="hidden sm:inline text-[8px] text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded border border-border/50 font-mono">/</kbd>
            </div>
            {showSearch && searchInput.length >= 1 && combinedResults.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border/60 rounded-lg shadow-lg z-50 overflow-hidden" style={{ boxShadow: 'var(--shadow-elevated)' }}>
                {combinedResults.map((stock: any, i: number) => (
                  <button key={i} onClick={() => handleSearchSelect(stock.symbol)}
                    className="w-full text-left flex items-center justify-between px-3.5 py-2.5 hover:bg-secondary/60 transition-colors border-b border-border/20 last:border-0">
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">{stock.symbol}</p>
                      <p className="text-[9px] text-muted-foreground truncate max-w-[160px]">{stock.name}</p>
                    </div>
                    <span className="text-[8px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{stock.exchange || 'NSE'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-border/50 hidden lg:block" />

          {/* Index ticker */}
          <div className="hidden lg:flex items-center gap-5">
            {INDICES.map((idx, i) => (
              <div key={i} className="flex items-center gap-2 font-data text-[11px]">
                <span className="text-muted-foreground font-medium">{idx.symbol}</span>
                <span className="text-foreground font-semibold">{Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span className={`font-semibold ${idx.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${marketOpen ? 'bg-primary animate-pulse' : 'bg-muted-foreground/50'}`} />
            <span className={`text-[10px] font-medium ${marketOpen ? 'text-primary' : 'text-muted-foreground'}`}>
              {marketOpen ? 'LIVE' : 'CLOSED'}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-data">{time.toLocaleTimeString('en-IN', { hour12: false })} IST</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ═══ Sidebar ═══ */}
        <aside className={`${sidebarOpen ? 'w-44' : 'w-[52px]'} flex-shrink-0 bg-[hsl(var(--sidebar-background))] border-r border-sidebar-border flex flex-col transition-all duration-200`}>
          <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[11px] transition-all duration-150 group
                    ${isActive
                      ? 'bg-primary/10 text-primary font-semibold glow-primary'
                      : 'text-sidebar-foreground hover:text-foreground hover:bg-secondary/50'}`}>
                  <span className={`w-5 text-center text-[13px] flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                    {item.icon}
                  </span>
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 tracking-wide">{item.label}</span>
                      <span className="text-[8px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-mono">{item.shortcut}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="p-2 border-t border-sidebar-border">
            <button onClick={toggleSidebar}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-[11px] transition-colors py-1.5 rounded-md hover:bg-secondary/50">
              <span className="text-sm">{sidebarOpen ? '◂' : '▸'}</span>
              {sidebarOpen && <span className="text-[10px]">Collapse</span>}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="min-h-full">{children}</div>
        </main>
      </div>

      {/* ═══ Status Bar ═══ */}
      <footer className="h-7 bg-card/60 glass border-t border-border/40 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[9px] text-muted-foreground font-medium font-data">CONNECTED</span>
          </div>
          <span className="text-[9px] text-muted-foreground">NSE · BSE</span>
          <span className="text-[9px] text-muted-foreground">{getAllStocks().length} stocks</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-[9px] text-primary font-semibold">StockPulse v3.1</span>
        </div>
      </footer>

      {showSearch && searchInput.length >= 1 && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSearch(false)} />
      )}
    </div>
  );
}
