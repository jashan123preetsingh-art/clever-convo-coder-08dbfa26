import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, LayoutGrid, ScanSearch, Target, Layers, ArrowLeftRight, TrendingUp, Newspaper, Bot, Settings, ChevronLeft, ChevronRight, Gem } from 'lucide-react';
import useStore from '@/store/useStore';

const ICON_MAP: Record<string, React.ReactNode> = {
  '⌂': <Home className="w-4 h-4" />,
  '💼': <Briefcase className="w-4 h-4" />,
  '▦': <LayoutGrid className="w-4 h-4" />,
  '⊕': <ScanSearch className="w-4 h-4" />,
  '◎': <Target className="w-4 h-4" />,
  '◫': <Layers className="w-4 h-4" />,
  '⇄': <ArrowLeftRight className="w-4 h-4" />,
  '📈': <TrendingUp className="w-4 h-4" />,
  '◉': <Newspaper className="w-4 h-4" />,
  '💎': <Gem className="w-4 h-4" />,
  '🤖': <Bot className="w-4 h-4" />,
  '⚙️': <Settings className="w-4 h-4" />,
};

interface NavItem {
  path: string;
  label: string;
  shortcut: string;
  icon: string;
}

interface SidebarProps {
  navItems: NavItem[];
  isAdmin: boolean;
}

function Sidebar({ navItems, isAdmin }: SidebarProps) {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useStore();

  return (
    <aside className={`hidden md:flex ${sidebarOpen ? 'w-48' : 'w-14'} flex-shrink-0 flex-col transition-[width] duration-200 ease-out relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--sidebar-background))] via-[hsl(var(--sidebar-background))] to-[hsl(var(--sidebar-accent)/0.5)]" />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-sidebar-border/40 to-transparent" />

      <nav className="relative flex-1 py-4 px-2 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link key={item.path} to={item.path} aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] transition-colors duration-150 group relative
                ${isActive
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-sidebar-foreground hover:text-foreground hover:bg-secondary/30'}`}>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" />
              )}
              <span className={`w-5 flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {ICON_MAP[item.icon] || <Home className="w-4 h-4" />}
              </span>
              {sidebarOpen && (
                <>
                  <span className="flex-1 tracking-wide">{item.label}</span>
                  <span className="text-[8px] text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity font-mono">{item.shortcut}</span>
                </>
              )}
            </Link>
          );
        })}
        {isAdmin && (
          <Link to="/admin" aria-current={location.pathname === '/admin' ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] transition-colors duration-150 group relative
              ${location.pathname === '/admin'
                ? 'bg-primary/10 text-primary font-bold'
                : 'text-sidebar-foreground hover:text-foreground hover:bg-secondary/30'}`}>
            <span className="w-5 flex items-center justify-center flex-shrink-0">{ICON_MAP['⚙️']}</span>
            {sidebarOpen && <span className="flex-1 tracking-wide">Admin</span>}
          </Link>
        )}
      </nav>
      <div className="relative p-2.5 border-t border-sidebar-border/20">
        <button onClick={toggleSidebar} aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="w-full flex items-center justify-center gap-2 text-muted-foreground/50 hover:text-foreground text-[11px] transition-colors duration-150 py-2 rounded-xl hover:bg-secondary/30">
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {sidebarOpen && <span className="text-[10px]">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

export default memo(Sidebar);
