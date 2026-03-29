import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useStore from '@/store/useStore';
import { INDICES, getAllStocks } from '@/data/mockData';
import { formatPercent } from '@/utils/format';
import { useStockSearch } from '@/hooks/useStockData';

const NAV_ITEMS = [
  { path: '/', label: 'DASHBOARD', shortcut: 'F1', icon: 'DH' },
  { path: '/heatmap', label: 'HEATMAP', shortcut: 'F2', icon: 'HM' },
  { path: '/scanner', label: 'SCANNER', shortcut: 'F3', icon: 'SC' },
  { path: '/screener', label: 'SCREENER', shortcut: 'F4', icon: 'SR' },
  { path: '/options', label: 'OPTIONS', shortcut: 'F5', icon: 'OC' },
  { path: '/sectors', label: 'SECTORS', shortcut: 'F6', icon: 'SE' },
  { path: '/fii-dii', label: 'FII/DII', shortcut: 'F7', icon: 'FD' },
  { path: '/news', label: 'NEWS & CAL', shortcut: 'F8', icon: 'NC' },
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
    ? getAllStocks().filter(s => s.symbol.toLowerCase().includes(searchInput.toLowerCase()) || s.name.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 8)
    : [];

  const combinedResults = searchResults?.length > 0 ? searchResults.slice(0, 8) : localStockResults;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top Header */}
      <header className="h-10 bg-terminal-header border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-primary to-terminal-cyan flex items-center justify-center">
              <span className="text-[8px] font-black text-primary-foreground">SP</span>
            </div>
            <span className="text-xs font-bold text-foreground tracking-wider">STOCKPULSE</span>
          </div>
          <div className="w-px h-4 bg-border" />
          {/* Global Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search stocks... ( / )"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              className="bg-secondary border border-border rounded-sm px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground w-44 focus:outline-none focus:border-primary focus:w-56 transition-all"
            />
            {showSearch && searchInput.length >= 1 && combinedResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-sm shadow-lg z-50 max-h-64 overflow-y-auto">
                {combinedResults.map((stock: any, i: number) => (
                  <button key={i} onClick={() => handleSearchSelect(stock.symbol)}
                    className="w-full text-left flex items-center justify-between px-3 py-2 hover:bg-secondary transition-colors border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">{stock.symbol}</p>
                      <p className="text-[9px] text-muted-foreground truncate max-w-[150px]">{stock.name}</p>
                    </div>
                    <span className="text-[8px] text-muted-foreground">{stock.exchange || 'NSE'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-4 bg-border" />
          {/* Ticker */}
          <div className="flex items-center gap-6">
            {INDICES.map((idx, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground font-semibold">{idx.symbol}</span>
                <span className="text-foreground">{Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                <span className={idx.change_pct >= 0 ? 'text-primary' : 'text-destructive'}>
                  {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isMarketOpen() ? 'bg-primary animate-pulse-green' : 'bg-muted-foreground'}`} />
            <span className="text-[10px] text-muted-foreground">{isMarketOpen() ? 'MKT OPEN' : 'MKT CLOSED'}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <span className="text-[10px] text-muted-foreground">{time.toLocaleTimeString('en-IN', { hour12: false })} IST</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-40' : 'w-12'} flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200`}>
          <nav className="flex-1 py-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-2 px-2 py-1.5 text-[11px] transition-all duration-100 border-l-2
                    ${isActive ? 'border-primary bg-primary/5 text-primary' : 'border-transparent text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'}`}>
                  <span className={`w-5 text-center text-[10px] font-bold flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {item.icon}
                  </span>
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 tracking-wide text-[10px]">{item.label}</span>
                      <span className="text-[8px] text-muted-foreground">{item.shortcut}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="p-2 border-t border-sidebar-border">
            <button onClick={toggleSidebar}
              className="w-full flex items-center gap-2 text-muted-foreground hover:text-foreground text-[10px] transition-colors py-1">
              <span className="text-xs">{sidebarOpen ? '«' : '»'}</span>
              {sidebarOpen && <span>COLLAPSE</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="min-h-full">{children}</div>
        </main>
      </div>

      {/* Bottom Status */}
      <footer className="h-6 bg-terminal-header border-t border-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[9px] text-muted-foreground">DATA:LIVE</span>
          </div>
          <span className="text-[9px] text-muted-foreground">NSE+BSE</span>
          <span className="text-[9px] text-muted-foreground">STOCKS:2000+</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </span>
          <span className="text-[9px] text-primary">STOCKPULSE v3.0</span>
        </div>
      </footer>

      {/* Click-away for search */}
      {showSearch && searchInput.length >= 1 && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSearch(false)} />
      )}
    </div>
  );
}
