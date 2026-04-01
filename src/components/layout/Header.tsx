import React, { useMemo, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Sun, Moon, Settings, LogOut } from 'lucide-react';
import { useStockSearch } from '@/hooks/useStockData';
import type { IndexData, SearchResult } from '@/types/stock';

interface HeaderProps {
  searchInput: string;
  setSearchInput: (v: string) => void;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  indices: IndexData[];
  marketOpen: boolean;
  time: string;
  theme: string;
  toggleTheme: () => void;
  userMenuOpen: boolean;
  setUserMenuOpen: (v: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  user: { email?: string } | null;
  profile: { full_name?: string | null; plan?: string | null } | null;
  isAdmin: boolean;
  signOut: () => void;
  alertBell: React.ReactNode;
}

function Header({
  searchInput, setSearchInput, showSearch, setShowSearch,
  indices, marketOpen, time, theme, toggleTheme,
  userMenuOpen, setUserMenuOpen, mobileMenuOpen, setMobileMenuOpen,
  user, profile, isAdmin, signOut, alertBell,
}: HeaderProps) {
  const navigate = useNavigate();
  const { data: searchResults } = useStockSearch(searchInput);

  const combinedResults = useMemo<SearchResult[]>(() => {
    if (!searchInput || searchInput.length < 1) return [];
    if (Array.isArray(searchResults) && searchResults.length > 0) return searchResults.slice(0, 10);
    return [];
  }, [searchInput, searchResults]);

  const handleSearchSelect = useCallback((symbol: string) => {
    navigate(`/stock/${symbol}`);
    setSearchInput('');
    setShowSearch(false);
  }, [navigate, setSearchInput, setShowSearch]);

  return (
    <header className="h-12 md:h-12 bg-card/90 border-b border-border/20 flex items-center justify-between px-3 md:px-5 flex-shrink-0 z-30">
      <div className="flex items-center gap-3 md:gap-5">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} className="md:hidden p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground transition-colors duration-150">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <Link to="/" className="flex items-center gap-2 md:gap-3 group">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--terminal-cyan))] flex items-center justify-center shadow-lg shadow-primary/15">
            <span className="text-[9px] md:text-[10px] font-black text-primary-foreground tracking-tight">TA</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-[13px] font-black text-foreground tracking-wide leading-none">Trade Arsenal</span>
            <span className="text-[8px] text-primary font-semibold tracking-[0.15em] leading-none mt-0.5">TERMINAL</span>
          </div>
        </Link>

        <div className="w-px h-6 bg-border/30 hidden md:block" />

        {/* Search */}
        <div className="relative z-[70]">
          <div className="flex items-center bg-secondary/40 border border-border/30 rounded-xl px-3 md:px-3.5 py-2 gap-2 focus-within:border-primary/30 focus-within:bg-secondary/60 transition-colors duration-150">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search stocks..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              className="bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/60 w-20 sm:w-40 focus:w-40 sm:focus:w-56 focus:outline-none transition-[width] duration-200" />
            <kbd className="hidden lg:inline text-[8px] text-muted-foreground/60 bg-background/40 px-1.5 py-0.5 rounded-md border border-border/30 font-mono">/</kbd>
          </div>
          {showSearch && searchInput.length >= 1 && (
            <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-card border border-border/40 rounded-2xl shadow-2xl z-[80] overflow-hidden max-h-[60vh] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              {combinedResults.length > 0 ? combinedResults.map((stock, i) => (
                <button key={`${stock.symbol}-${i}`} type="button" onMouseDown={(e) => { e.preventDefault(); handleSearchSelect(stock.symbol); }}
                  className="w-full text-left flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors duration-100 border-b border-border/10 last:border-0 group">
                  <div>
                    <p className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors duration-100">{stock.symbol}</p>
                    <p className="text-[9px] text-muted-foreground truncate max-w-[160px]">{stock.name}</p>
                  </div>
                  <span className="text-[8px] text-muted-foreground/60 bg-secondary/60 px-2 py-0.5 rounded-md">{stock.exchange || 'NSE'}</span>
                </button>
              )) : (
                <div className="px-4 py-4 text-[10px] text-muted-foreground">No matching stocks found</div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-border/30 hidden lg:block" />

        {/* Index ticker */}
        <div className="hidden lg:flex items-center gap-6">
          {indices.map((idx, i) => (
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
        <button onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          aria-label="Open command palette"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/30 border border-border/20 hover:border-border/40 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors duration-150">
          <Search className="w-3 h-3" />
          <span className="text-[9px] font-mono">⌘K</span>
        </button>

        {alertBell}

        <button onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors duration-150 flex items-center justify-center"
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/20 border border-border/20">
          <span className={`w-2 h-2 rounded-full ${marketOpen ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
          <span className={`text-[9px] font-bold tracking-wider ${marketOpen ? 'text-primary' : 'text-muted-foreground'}`}>
            {marketOpen ? 'LIVE' : 'CLOSED'}
          </span>
          <span className="text-[9px] text-muted-foreground/50 font-data">{time}</span>
        </div>

        {/* User avatar */}
        <div className="relative">
          <button onClick={() => setUserMenuOpen(!userMenuOpen)} aria-label="User menu"
            className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/15 flex items-center justify-center text-primary text-[11px] font-bold hover:border-primary/30 transition-colors duration-150">
            {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border/40 rounded-2xl shadow-2xl z-[90] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
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
                  className="w-full text-left px-4 py-2.5 text-[11px] text-foreground hover:bg-primary/5 transition-colors duration-100 flex items-center gap-2.5">
                  <Settings className="w-3.5 h-3.5" /> Admin Panel
                </button>
              )}
              <button onClick={() => { signOut(); setUserMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-[11px] text-destructive hover:bg-destructive/5 transition-colors duration-100 flex items-center gap-2.5">
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default memo(Header);
