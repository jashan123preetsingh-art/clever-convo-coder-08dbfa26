import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Briefcase, LayoutGrid, ScanSearch, Target, Layers, ArrowLeftRight, TrendingUp, Newspaper, Bot, Settings } from 'lucide-react';
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

export default function MobileNav({ navItems, indices, isAdmin, mobileMenuOpen, setMobileMenuOpen }: MobileNavProps) {
  const location = useLocation();

  return (
    <>
      {/* Slide-out menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
            <motion.nav initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute left-0 top-12 w-72 h-[calc(100%-3rem)] bg-card/95 glass border-r border-border/30 overflow-y-auto z-50"
              aria-label="Mobile navigation">
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
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] transition-all duration-200
                        ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-secondary/30'}`}>
                      <span className="w-5 flex items-center justify-center">{ICON_MAP[item.icon] || <Home className="w-[18px] h-[18px]" />}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] transition-all
                      ${location.pathname === '/admin' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-secondary/30'}`}>
                    <span className="w-5 flex items-center justify-center">{ICON_MAP['⚙️']}</span>
                    <span>Admin</span>
                  </Link>
                )}
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <nav className="md:hidden flex-shrink-0 bg-gradient-to-t from-card/95 to-card/70 glass border-t border-border/20 flex items-center justify-around px-1 py-2 safe-area-bottom" aria-label="Bottom navigation">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link key={item.path} to={item.path} aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0 relative
                ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {isActive && <motion.div layoutId="mobile-nav" className="absolute -top-2 w-8 h-0.5 rounded-full bg-gradient-to-r from-primary to-[hsl(var(--terminal-cyan))] shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />}
              <span>{ICON_MAP[item.icon] || <Home className="w-[18px] h-[18px]" />}</span>
              <span className={`text-[8px] font-medium truncate ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
