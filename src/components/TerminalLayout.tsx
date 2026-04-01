import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { INDICES as MOCK_INDICES } from '@/data/mockData';
import { useIndices } from '@/hooks/useStockData';
import { useAuth } from '@/hooks/useAuth';
import { AlertBell } from '@/components/PriceAlerts';
import { useTheme } from '@/hooks/useTheme';
import CommandPalette from '@/components/CommandPalette';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import StatusBar from '@/components/layout/StatusBar';
import type { IndexData } from '@/types/stock';

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
  const { user, isAdmin, profile, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [time, setTime] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: liveIndices } = useIndices();
  const INDICES: IndexData[] = liveIndices?.length > 0 && !liveIndices[0]?.error ? liveIndices : MOCK_INDICES;

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

  const marketOpen = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false;
    const timeVal = now.getHours() * 60 + now.getMinutes();
    return timeVal >= 555 && timeVal <= 930;
  }, [time]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-semibold">Skip to content</a>

      <Header
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        indices={INDICES}
        marketOpen={marketOpen}
        time={time}
        theme={theme}
        toggleTheme={toggleTheme}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        user={user}
        profile={profile}
        isAdmin={isAdmin}
        signOut={signOut}
        alertBell={<AlertBell />}
      />

      <MobileNav
        navItems={NAV_ITEMS}
        indices={INDICES}
        isAdmin={isAdmin}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar navItems={NAV_ITEMS} isAdmin={isAdmin} />

        <main id="main-content" className="flex-1 overflow-y-auto bg-background" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>

      <StatusBar />

      {/* Bottom tab bar is inside MobileNav */}

      {showSearch && <div className="fixed inset-0 z-20" onClick={() => setShowSearch(false)} />}
      {userMenuOpen && <div className="fixed inset-0 z-[85]" onClick={() => setUserMenuOpen(false)} />}

      <CommandPalette />

      <Suspense fallback={null}>
        <AiAssistant />
      </Suspense>
    </div>
  );
}
