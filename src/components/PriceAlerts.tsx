import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { formatCurrency } from '@/utils/format';

export function AlertBell() {
  const [open, setOpen] = useState(false);
  const { activeAlerts, triggeredAlerts, removeAlert } = usePriceAlerts();
  const [showCreate, setShowCreate] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const { addAlert } = usePriceAlerts();

  const totalActive = activeAlerts.length;

  const handleCreate = () => {
    if (!symbol || !targetPrice) return;
    addAlert({ symbol: symbol.toUpperCase(), condition, target_price: parseFloat(targetPrice) });
    setSymbol('');
    setTargetPrice('');
    setShowCreate(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {totalActive > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent text-[8px] text-accent-foreground font-bold flex items-center justify-center">
            {totalActive}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[85]" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-lg z-[90] overflow-hidden">
              <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">🔔 Price Alerts</span>
                <button onClick={() => setShowCreate(!showCreate)}
                  className="text-[9px] font-semibold text-primary hover:text-primary/80">
                  {showCreate ? 'Cancel' : '+ New Alert'}
                </button>
              </div>

              {showCreate && (
                <div className="px-3 py-2.5 border-b border-border/50 space-y-2">
                  <input placeholder="Symbol (e.g. RELIANCE)" value={symbol} onChange={e => setSymbol(e.target.value)}
                    className="w-full bg-secondary/50 border border-border/50 rounded px-2.5 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40" />
                  <div className="flex gap-2">
                    <select value={condition} onChange={e => setCondition(e.target.value as 'above' | 'below')}
                      className="bg-secondary/50 border border-border/50 rounded px-2 py-1.5 text-[10px] text-foreground outline-none">
                      <option value="above">Above ▲</option>
                      <option value="below">Below ▼</option>
                    </select>
                    <input placeholder="₹ Price" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} type="number"
                      className="flex-1 bg-secondary/50 border border-border/50 rounded px-2.5 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40" />
                  </div>
                  <button onClick={handleCreate}
                    className="w-full py-1.5 rounded text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    Set Alert
                  </button>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto">
                {activeAlerts.length === 0 && triggeredAlerts.length === 0 ? (
                  <div className="py-6 text-center text-[10px] text-muted-foreground">
                    No alerts set yet
                  </div>
                ) : (
                  <>
                    {activeAlerts.map(alert => (
                      <div key={alert.id} className="flex items-center justify-between px-3 py-2 hover:bg-secondary/30 border-b border-border/10 group">
                        <div>
                          <p className="text-[10px] font-semibold text-foreground">{alert.symbol}</p>
                          <p className="text-[8px] text-muted-foreground">
                            {alert.condition === 'above' ? '▲ Above' : '▼ Below'} {formatCurrency(alert.target_price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">ACTIVE</span>
                          <button onClick={() => removeAlert(alert.id)}
                            className="opacity-0 group-hover:opacity-100 text-[9px] text-muted-foreground hover:text-destructive transition-all">✕</button>
                        </div>
                      </div>
                    ))}
                    {triggeredAlerts.map(alert => (
                      <div key={alert.id} className="flex items-center justify-between px-3 py-2 hover:bg-secondary/30 border-b border-border/10 opacity-60 group">
                        <div>
                          <p className="text-[10px] font-semibold text-foreground">{alert.symbol}</p>
                          <p className="text-[8px] text-muted-foreground">
                            {alert.condition === 'above' ? '▲ Above' : '▼ Below'} {formatCurrency(alert.target_price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold">TRIGGERED</span>
                          <button onClick={() => removeAlert(alert.id)}
                            className="opacity-0 group-hover:opacity-100 text-[9px] text-muted-foreground hover:text-destructive transition-all">✕</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
