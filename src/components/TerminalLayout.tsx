import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useStore from '@/store/useStore';
import { INDICES, getAllStocks } from '@/data/mockData';
import { formatPercent } from '@/utils/format';
import { useStockSearch } from '@/hooks/useStockData';
import { useAuth } from '@/hooks/useAuth';

const AiAssistant = lazy(() => import('@/components/AiAssistant'));

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
  const { user, isAdmin, profile, signOut } = useAuth();
  const [time, setTime] = useState(new Date());
  const [searchInput, setSearchInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: searchResults } = useStockSearch(searchInput);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowSearch(true);
        }
      }
      if (e.key === 'Escape') { setShowSearch(false); setUserMenuOpen(false); }
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
      <header className="h-11 md:h-11 bg-card/80 glass border-b border-border/40 flex items-center justify-between px-2 md:px-4 flex-shrink-0 z-30">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 md:gap-2.5 group">
            <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--terminal-cyan))] flex items-center justify-center shadow-sm">
              <span className="text-[8px] md:text-[9px] font-black text-primary-foreground tracking-tight">SP</span>
            </div>
            <span className="text-[12px] md:text-[13px] font-black text-foreground tracking-wide hidden sm:block">StockPulse</span>
          </Link>

          <div className="w-px h-5 bg-border/50 hidden md:block" />

          {/* Search */}
          <div className="relative z-[70]">
            <div className="flex items-center bg-secondary/60 border border-border/50 rounded-md px-2 md:px-3 py-1.5 gap-1.5 md:gap-2 focus-within:border-primary/40 focus-within:bg-secondary transition-all">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                className="bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground w-20 sm:w-36 focus:w-36 sm:focus:w-52 focus:outline-none transition-all" />
              <kbd className="hidden lg:inline text-[8px] text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded border border-border/50 font-mono">/</kbd>
            </div>
            {showSearch && searchInput.length >= 1 && (
              <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 bg-card border border-border/60 rounded-lg shadow-lg z-[80] overflow-hidden max-h-[60vh] overflow-y-auto" style={{ boxShadow: 'var(--shadow-elevated)' }}>
                {combinedResults.length > 0 ? combinedResults.map((stock: any, i: number) => (
                  <button key={`${stock.symbol}-${i}`} type="button" onMouseDown={(e) => { e.preventDefault(); handleSearchSelect(stock.symbol); }}
                    className="w-full text-left flex items-center justify-between px-3.5 py-2.5 hover:bg-secondary/60 transition-colors border-b border-border/20 last:border-0">
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">{stock.symbol}</p>
                      <p className="text-[9px] text-muted-foreground truncate max-w-[140px] sm:max-w-[160px]">{stock.name}</p>
                    </div>
                    <span className="text-[8px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{stock.exchange || 'NSE'}</span>
                  </button>
                )) : (
                  <div className="px-3.5 py-3 text-[10px] text-muted-foreground">No matching stocks found</div>
                )}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-border/50 hidden lg:block" />

          {/* Index ticker - hidden on mobile */}
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

        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${marketOpen ? 'bg-primary animate-pulse' : 'bg-muted-foreground/50'}`} />
            <span className={`text-[9px] md:text-[10px] font-medium ${marketOpen ? 'text-primary' : 'text-muted-foreground'}`}>
              {marketOpen ? 'LIVE' : 'CLOSED'}
            </span>
          </div>
          <span className="text-[9px] md:text-[10px] text-muted-foreground font-data hidden sm:inline">{time.toLocaleTimeString('en-IN', { hour12: false })} IST</span>

          {/* User menu */}
          <div className="relative">
            <button onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors">
              {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-[90] overflow-hidden">
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-[11px] font-semibold text-foreground truncate">{profile?.full_name || 'User'}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{user?.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-semibold ${profile?.plan === 'premium' ? 'bg-terminal-amber/10 text-terminal-amber' : profile?.plan === 'pro' ? 'bg-terminal-blue/10 text-terminal-blue' : 'bg-secondary text-muted-foreground'}`}>
                      {(profile?.plan || 'free').toUpperCase()}
                    </span>
                    {isAdmin && <span className="text-[8px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-semibold">ADMIN</span>}
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => { navigate('/admin'); setUserMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-[11px] text-foreground hover:bg-secondary/60 transition-colors flex items-center gap-2">
                    ⚙️ Admin Panel
                  </button>
                )}
                <button onClick={() => { signOut(); setUserMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-[11px] text-destructive hover:bg-secondary/60 transition-colors flex items-center gap-2">
                  ↪ Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile navigation overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <nav className="absolute left-0 top-11 w-64 h-[calc(100%-2.75rem)] bg-card border-r border-border overflow-y-auto z-50 animate-in slide-in-from-left duration-200">
            <div className="py-3 px-3 space-y-0.5">
              {/* Mobile index ticker */}
              <div className="mb-3 px-2 space-y-1.5">
                {INDICES.map((idx, i) => (
                  <div key={i} className="flex items-center justify-between font-data text-[10px]">
                    <span className="text-muted-foreground">{idx.symbol}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground font-semibold">{Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      <span className={`font-semibold ${idx.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mb-2" />
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[12px] transition-all
                      ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground/70 hover:text-foreground hover:bg-secondary/40'}`}>
                    <span className="w-5 text-center text-[14px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[12px] transition-all
                    ${location.pathname === '/admin' ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground/70 hover:text-foreground hover:bg-secondary/40'}`}>
                  <span className="w-5 text-center text-[14px]">⚙️</span>
                  <span>Admin</span>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ═══ Desktop Sidebar ═══ */}
        <aside className={`hidden md:flex ${sidebarOpen ? 'w-44' : 'w-[52px]'} flex-shrink-0 bg-[hsl(var(--sidebar-background))] border-r border-sidebar-border/60 flex-col transition-all duration-300 ease-out`}>
          <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[11px] transition-all duration-200 group relative
                    ${isActive
                      ? 'bg-primary/10 text-primary font-semibold shadow-[inset_3px_0_0_hsl(var(--primary))] shadow-[0_0_15px_hsl(var(--primary)/0.06)]'
                      : 'text-sidebar-foreground hover:text-foreground hover:bg-secondary/40'}`}>
                  <span className={`w-5 text-center text-[13px] flex-shrink-0 transition-all duration-200 ${isActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105'}`}>
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
            {isAdmin && (
              <Link to="/admin"
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[11px] transition-all duration-200 group relative
                  ${location.pathname === '/admin'
                    ? 'bg-primary/10 text-primary font-semibold shadow-[inset_3px_0_0_hsl(var(--primary))]'
                    : 'text-sidebar-foreground hover:text-foreground hover:bg-secondary/40'}`}>
                <span className="w-5 text-center text-[13px] flex-shrink-0">⚙️</span>
                {sidebarOpen && <span className="flex-1 tracking-wide">Admin</span>}
              </Link>
            )}
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

      {/* ═══ Status Bar - hidden on mobile ═══ */}
      <footer className="h-7 bg-card/60 glass border-t border-border/40 items-center justify-between px-4 flex-shrink-0 hidden md:flex">
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

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex-shrink-0 bg-card/90 glass border-t border-border/40 flex items-center justify-around px-1 py-1.5 safe-area-bottom">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link key={item.path} to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-all min-w-0
                ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className="text-[14px]">{item.icon}</span>
              <span className="text-[8px] font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {showSearch && (
        <div className="fixed inset-0 z-20" onClick={() => setShowSearch(false)} />
      )}

      {userMenuOpen && (
        <div className="fixed inset-0 z-[85]" onClick={() => setUserMenuOpen(false)} />
      )}

      <Suspense fallback={null}>
        <AiAssistant />
      </Suspense>
    </div>
  );
}
