import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllStocks } from '@/data/mockData';


const ACTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂', path: '/', category: 'Navigation' },
  { id: 'heatmap', label: 'Heatmap', icon: '▦', path: '/heatmap', category: 'Navigation' },
  { id: 'scanner', label: 'Scanner', icon: '⊕', path: '/scanner', category: 'Navigation' },
  { id: 'options', label: 'Options Chain', icon: '◎', path: '/options', category: 'Navigation' },
  { id: 'sectors', label: 'Sectors', icon: '◫', path: '/sectors', category: 'Navigation' },
  { id: 'fii-dii', label: 'FII / DII Flows', icon: '⇄', path: '/fii-dii', category: 'Navigation' },
  { id: 'oi', label: 'OI Analysis', icon: '📈', path: '/oi-analysis', category: 'Navigation' },
  { id: 'news', label: 'Market News', icon: '◉', path: '/news', category: 'Navigation' },
  { id: 'commodities', label: 'Commodities', icon: '💎', path: '/commodities', category: 'Navigation' },
  { id: 'forex', label: 'Forex & Crypto', icon: '💱', path: '/forex', category: 'Navigation' },
  { id: 'calendar', label: 'Economic Calendar', icon: '📅', path: '/calendar', category: 'Navigation' },
  { id: 'ipo', label: 'IPO Tracker', icon: '🚀', path: '/ipo', category: 'Navigation' },
  { id: 'agent', label: 'AI Trading Agent', icon: '🤖', path: '/trading-agent', category: 'Navigation' },
];

const SHORTCUTS = [
  { keys: ['F1'], action: 'Dashboard' },
  { keys: ['F2'], action: 'Heatmap' },
  { keys: ['F3'], action: 'Scanner' },
  { keys: ['F4'], action: 'Options' },
  { keys: ['F5'], action: 'Sectors' },
  { keys: ['F6'], action: 'FII/DII' },
  { keys: ['F7'], action: 'OI Analysis' },
  { keys: ['F8'], action: 'News' },
  { keys: ['F9'], action: 'AI Agent' },
  { keys: ['/', 'Ctrl+K'], action: 'Search / Command Palette' },
  { keys: ['?'], action: 'Show Shortcuts' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const navigate = useNavigate();
  

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setShowShortcuts(false);
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          setOpen(prev => !prev ? true : prev);
        }
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const localStocks = query.length >= 1
    ? getAllStocks().filter(s =>
        s.symbol.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const stockResults = localStocks.slice(0, 6);

  const filteredActions = ACTIONS.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery('');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
          onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {!showShortcuts ? (
              <>
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                  <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input autoFocus type="text" placeholder="Search stocks, navigate pages..."
                    value={query} onChange={e => setQuery(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
                  <kbd className="text-[8px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border/50 font-mono">ESC</kbd>
                </div>

                <div className="max-h-[50vh] overflow-y-auto py-1">
                  {/* Stock results */}
                  {stockResults.length > 0 && (
                    <div className="px-2 py-1">
                      <p className="text-[9px] text-muted-foreground px-2 py-1 uppercase tracking-wider font-semibold">Stocks</p>
                      {stockResults.map(stock => (
                        <button key={stock.symbol} onClick={() => handleSelect(`/stock/${stock.symbol}`)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary/60 transition-colors text-left">
                          <div>
                            <span className="text-[11px] font-semibold text-foreground">{stock.symbol}</span>
                            <span className="text-[9px] text-muted-foreground ml-2 truncate">{stock.name}</span>
                          </div>
                          <span className="text-[8px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{stock.exchange || 'NSE'}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Navigation */}
                  {filteredActions.length > 0 && (
                    <div className="px-2 py-1">
                      <p className="text-[9px] text-muted-foreground px-2 py-1 uppercase tracking-wider font-semibold">Navigation</p>
                      {filteredActions.map(action => (
                        <button key={action.id} onClick={() => handleSelect(action.path)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary/60 transition-colors text-left">
                          <span className="text-sm w-5 text-center">{action.icon}</span>
                          <span className="text-[11px] text-foreground font-medium">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {query && stockResults.length === 0 && filteredActions.length === 0 && (
                    <div className="py-8 text-center text-[10px] text-muted-foreground">No results found</div>
                  )}

                  {!query && (
                    <div className="px-3 py-2">
                      <button onClick={() => setShowShortcuts(true)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary/60 transition-colors text-left">
                        <span className="text-sm w-5 text-center">⌨️</span>
                        <span className="text-[11px] text-foreground font-medium">View Keyboard Shortcuts</span>
                        <kbd className="ml-auto text-[8px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border/50 font-mono">?</kbd>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Shortcuts overlay */
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[12px] font-bold text-foreground">⌨️ Keyboard Shortcuts</h3>
                  <button onClick={() => setShowShortcuts(false)} className="text-[10px] text-muted-foreground hover:text-foreground">← Back</button>
                </div>
                <div className="space-y-1.5">
                  {SHORTCUTS.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-secondary/30">
                      <span className="text-[10px] text-foreground">{s.action}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map(k => (
                          <kbd key={k} className="text-[9px] text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/50 font-mono">{k}</kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 bg-secondary/20">
              <div className="flex items-center gap-3 text-[8px] text-muted-foreground">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
              <span className="text-[8px] text-primary font-semibold">Trade Arsenal</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
