import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, LayoutGrid, ScanSearch, Target, Layers, ArrowLeftRight, TrendingUp, Newspaper, Bot, Settings, Gem, DollarSign, CalendarDays, Rocket } from 'lucide-react';
import type { IndexData } from '@/types/stock';

const ICON_MAP: Record<string, React.ReactNode> = {
  '⌂': <Home className="w-[18px] h-[18px]" />,
  '💼': <Briefcase className="w-[18px] h-[18px]" />,
  '▦': <LayoutGrid className="w-[18px] h-[18px]" />,
  '⊕': <ScanSearch className="w-[18px] h-[18px]" />,
  '◎': <Target className="w-[18px] h-[18px]" />,
  '◫': <Layers className="w-[18px] h-[18px]" />,
  '⇄': <ArrowLeftRight className="w-[18px] h-[18px]" />,
  '📈': <TrendingUp className="w-[18px] h-[18px]" />,
  '◉': <Newspaper className="w-[18px] h-[18px]" />,
  '💎': <Gem className="w-[18px] h-[18px]" />,
  '🤖': <Bot className="w-[18px] h-[18px]" />,
  '⚙️': <Settings className="w-[18px] h-[18px]" />,
};

interface NavItem {
  path: string;
  label: string;
  shortcut: string;
  icon: string;
}

interface MobileNavProps {
  navItems: NavItem[];
  indices: IndexData[];
  isAdmin: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
}

function MobileNav({ navItems, indices, isAdmin, mobileMenuOpen, setMobileMenuOpen }: MobileNavProps) {
  const location = useLocation();

  return (
    <>
      {/* Slide-out menu — CSS transitions instead of framer-motion */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-background/70 transition-opacity duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            className="absolute left-0 top-12 w-72 h-[calc(100%-3rem)] bg-card border-r border-border/30 overflow-y-auto z-50 animate-in slide-in-from-left duration-200"
            aria-label="Mobile navigation"
          >
            <div className="py-4 px-3 space-y-1">
              <div className="mb-4 px-3 space-y-2">
                {indices.map((idx, i) => (
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
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] transition-colors duration-150
                      ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-secondary/30'}`}>
                    <span className="w-5 flex items-center justify-center">{ICON_MAP[item.icon] || <Home className="w-[18px] h-[18px]" />}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] transition-colors duration-150
                    ${location.pathname === '/admin' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-secondary/30'}`}>
                  <span className="w-5 flex items-center justify-center">{ICON_MAP['⚙️']}</span>
                  <span>Admin</span>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Bottom tab bar — no layoutId animation, pure CSS */}
      <nav className="md:hidden flex-shrink-0 bg-card/97 border-t border-border/20 flex items-center justify-around px-1 py-2 safe-area-bottom" aria-label="Bottom navigation">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link key={item.path} to={item.path} aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors duration-150 min-w-0 relative
                ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              {isActive && <div className="absolute -top-2 w-8 h-0.5 rounded-full bg-primary" />}
              <span>{ICON_MAP[item.icon] || <Home className="w-[18px] h-[18px]" />}</span>
              <span className={`text-[8px] font-medium truncate ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default memo(MobileNav);
