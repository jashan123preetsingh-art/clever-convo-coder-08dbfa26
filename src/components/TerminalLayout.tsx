import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '@/store/useStore';
import { INDICES as MOCK_INDICES } from '@/data/mockData';
import { formatPercent } from '@/utils/format';
import { useIndices, useStockSearch } from '@/hooks/useStockData';
import { useAuth } from '@/hooks/useAuth';
import { AlertBell } from '@/components/PriceAlerts';
import { useTheme } from '@/hooks/useTheme';
import CommandPalette from '@/components/CommandPalette';

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
  { path: '/trading-agent', label: 'AI Agent', shortcut: 'F9', icon: '🤖' },
];

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useStore();
  const { user, isAdmin, profile, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [time, setTime] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: liveIndices } = useIndices();
  const INDICES = liveIndices?.length > 0 && !liveIndices[0]?.error ? liveIndices : MOCK_INDICES;

  // Use live search instead of filtering entire getAllStocks() on every keystroke
  const { data: searchResults } = useStockSearch(searchInput);

  // Update clock every 30s instead of every 1s — no one needs second precision
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

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

  const combinedResults = searchInput.length >= 1
    ? getAllStocks().filter(s => s.symbol.toLowerCase().includes(searchInput.toLowerCase()) || s.name.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 10)
    : [];
  const marketOpen = isMarketOpen();

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ═══ Premium Top Bar ═══ */}
      <header className="h-12 md:h-12 bg-card/70 glass border-b border-border/30 flex items-center justify-between px-3 md:px-5 flex-shrink-0 z-30">
        <div className="flex items-center gap-3 md:gap-5">
          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          {/* Logo - refined */}
          <Link to="/" className="flex items-center gap-2 md:gap-3 group">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--terminal-cyan))] flex items-center justify-center shadow-lg shadow-primary/15 group-hover:shadow-primary/25 transition-shadow">
              <span className="text-[9px] md:text-[10px] font-black text-primary-foreground tracking-tight">TA</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[13px] font-black text-foreground tracking-wide leading-none">Trade Arsenal</span>
              <span className="text-[8px] text-primary font-semibold tracking-[0.15em] leading-none mt-0.5">TERMINAL</span>
            </div>
          </Link>

          <div className="w-px h-6 bg-border/30 hidden md:block" />

          {/* Search - refined */}
          <div className="relative z-[70]">
            <div className="flex items-center bg-secondary/40 border border-border/30 rounded-xl px-3 md:px-3.5 py-2 gap-2 focus-within:border-primary/30 focus-within:bg-secondary/60 focus-within:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.1)] transition-all duration-300">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search stocks..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                className="bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/60 w-20 sm:w-40 focus:w-40 sm:focus:w-56 focus:outline-none transition-all duration-300" />
              <kbd className="hidden lg:inline text-[8px] text-muted-foreground/60 bg-background/40 px-1.5 py-0.5 rounded-md border border-border/30 font-mono">/</kbd>
            </div>
            {showSearch && searchInput.length >= 1 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-card/95 glass border border-border/40 rounded-2xl shadow-2xl z-[80] overflow-hidden max-h-[60vh] overflow-y-auto">
                {combinedResults.length > 0 ? combinedResults.map((stock: any, i: number) => (
                  <button key={`${stock.symbol}-${i}`} type="button" onMouseDown={(e) => { e.preventDefault(); handleSearchSelect(stock.symbol); }}
                    className="w-full text-left flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors border-b border-border/10 last:border-0 group">
                    <div>
                      <p className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">{stock.symbol}</p>
                      <p className="text-[9px] text-muted-foreground truncate max-w-[160px]">{stock.name}</p>
                    </div>
                    <span className="text-[8px] text-muted-foreground/60 bg-secondary/60 px-2 py-0.5 rounded-md">{stock.exchange || 'NSE'}</span>
                  </button>
                )) : (
                  <div className="px-4 py-4 text-[10px] text-muted-foreground">No matching stocks found</div>
                )}
              </motion.div>
            )}
          </div>

          <div className="w-px h-5 bg-border/30 hidden lg:block" />

          {/* Index ticker */}
          <div className="hidden lg:flex items-center gap-6">
            {INDICES.map((idx, i) => (
              <div key={i} className="flex items-center gap-2 font-data text-[11px]">
                <span className="text-muted-foreground/60 font-medium">{idx.symbol}</span>
                <span className="text-foreground font-bold">{Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span className={`font-bold ${idx.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Command palette trigger */}
          <button onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/30 border border-border/20 hover:border-border/40 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all duration-200">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[9px] font-mono">⌘K</span>
          </button>

          <AlertBell />

          {/* Theme toggle */}
          <button onClick={toggleTheme}
            className="w-8 h-8 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center text-sm"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Market status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/20 border border-border/20">
            <span className={`w-2 h-2 rounded-full ${marketOpen ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]' : 'bg-muted-foreground/40'}`} />
            <span className={`text-[9px] font-bold tracking-wider ${marketOpen ? 'text-primary' : 'text-muted-foreground'}`}>
              {marketOpen ? 'LIVE' : 'CLOSED'}
            </span>
            <span className="text-[9px] text-muted-foreground/50 font-data">{time.toLocaleTimeString('en-IN', { hour12: false })}</span>
          </div>

          {/* User avatar */}
          <div className="relative">
            <button onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center text-primary text-[11px] font-bold hover:border-primary/30 hover:shadow-[0_0_12px_hsl(var(--primary)/0.1)] transition-all duration-200">
              {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-card/95 glass border border-border/40 rounded-2xl shadow-2xl z-[90] overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/20">
                    <p className="text-[12px] font-bold text-foreground truncate">{profile?.full_name || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[8px] px-2 py-0.5 rounded-md font-bold ${profile?.plan === 'premium' ? 'bg-accent/10 text-accent' : profile?.plan === 'pro' ? 'bg-[hsl(var(--terminal-blue)/0.1)] text-[hsl(var(--terminal-blue))]' : 'bg-secondary text-muted-foreground'}`}>
                        {(profile?.plan || 'free').toUpperCase()}
                      </span>
                      {isAdmin && <span className="text-[8px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive font-bold">ADMIN</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => { navigate('/admin'); setUserMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[11px] text-foreground hover:bg-primary/5 transition-colors flex items-center gap-2.5">
                      <span className="text-sm">⚙️</span> Admin Panel
                    </button>
                  )}
                  <button onClick={() => { signOut(); setUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-[11px] text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-2.5">
                    <span className="text-sm">↪</span> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Mobile navigation overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
            <motion.nav initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute left-0 top-12 w-72 h-[calc(100%-3rem)] bg-card/95 glass border-r border-border/30 overflow-y-auto z-50">
              <div className="py-4 px-3 space-y-1">
                <div className="mb-4 px-3 space-y-2">
                  {INDICES.map((idx, i) => (
                    <div key={i} className="flex items-center justify-between font-data text-[10px]">
                      <span className="text-muted-foreground">{idx.symbol}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-bold">{Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        <span className={`font-bold ${idx.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/20 mb-3" />
                {NAV_ITEMS.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] transition-all duration-200
                        ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-secondary/30'}`}>
                      <span className="w-5 text-center text-[15px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] transition-all
                      ${location.pathname === '/admin' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-secondary/30'}`}>
                    <span className="w-5 text-center text-[15px]">⚙️</span>
                    <span>Admin</span>
                  </Link>
                )}
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
        {/* ═══ Premium Desktop Sidebar ═══ */}
        <aside className={`hidden md:flex ${sidebarOpen ? 'w-48' : 'w-14'} flex-shrink-0 bg-[hsl(var(--sidebar-background))] border-r border-sidebar-border/40 flex-col transition-all duration-300 ease-out`}>
          <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] transition-all duration-200 group relative
                    ${isActive
                      ? 'bg-primary/8 text-primary font-bold'
                      : 'text-sidebar-foreground hover:text-foreground hover:bg-secondary/30'}`}>
                  {isActive && (
                    <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]" />
                  )}
                  <span className={`w-5 text-center text-[14px] flex-shrink-0 transition-all duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                    {item.icon}
                  </span>
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 tracking-wide">{item.label}</span>
                      <span className="text-[8px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity font-mono">{item.shortcut}</span>
                    </>
                  )}
                </Link>
              );
            })}
            {isAdmin && (
              <Link to="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] transition-all duration-200 group relative
                  ${location.pathname === '/admin'
                    ? 'bg-primary/8 text-primary font-bold'
                    : 'text-sidebar-foreground hover:text-foreground hover:bg-secondary/30'}`}>
                <span className="w-5 text-center text-[14px] flex-shrink-0">⚙️</span>
                {sidebarOpen && <span className="flex-1 tracking-wide">Admin</span>}
              </Link>
            )}
          </nav>
          <div className="p-2.5 border-t border-sidebar-border/30">
            <button onClick={toggleSidebar}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground/60 hover:text-foreground text-[11px] transition-all py-2 rounded-xl hover:bg-secondary/30">
              <span className="text-sm">{sidebarOpen ? '◂' : '▸'}</span>
              {sidebarOpen && <span className="text-[10px]">Collapse</span>}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
            className="min-h-full">
            {children}
          </motion.div>
        </main>
      </div>

      {/* ═══ Status Bar ═══ */}
      <footer className="h-7 bg-card/40 glass border-t border-border/20 items-center justify-between px-5 flex-shrink-0 hidden md:flex">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.4)]" />
            <span className="text-[9px] text-muted-foreground/60 font-medium font-data">CONNECTED</span>
          </div>
          <span className="text-[9px] text-muted-foreground/40">NSE · BSE</span>
          <span className="text-[9px] text-muted-foreground/40">{getAllStocks().length} stocks</span>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-[9px] text-muted-foreground/40">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-[9px] text-primary/60 font-semibold">Trade Arsenal v3.2</span>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex-shrink-0 bg-card/80 glass border-t border-border/30 flex items-center justify-around px-1 py-2 safe-area-bottom">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link key={item.path} to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-0 relative
                ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              {isActive && <motion.div layoutId="mobile-nav" className="absolute -top-2 w-8 h-0.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]" />}
              <span className="text-[15px]">{item.icon}</span>
              <span className="text-[8px] font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {showSearch && <div className="fixed inset-0 z-20" onClick={() => setShowSearch(false)} />}
      {userMenuOpen && <div className="fixed inset-0 z-[85]" onClick={() => setUserMenuOpen(false)} />}

      <CommandPalette />

      <Suspense fallback={null}>
        <AiAssistant />
      </Suspense>
    </div>
  );
}
