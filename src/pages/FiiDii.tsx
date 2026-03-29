import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FII_DII_HISTORY, SECTOR_FII_ALLOCATION } from '@/data/mockData';
import { useFiiDiiData } from '@/hooks/useStockData';
import { formatCurrency } from '@/utils/format';

function CrValue({ value, prefix = '' }: { value: number; prefix?: string }) {
  const abs = Math.abs(value);
  const formatted = abs >= 1e7
    ? `₹${(abs / 1e7).toFixed(0)} Cr`
    : abs >= 1e5
    ? `₹${(abs / 1e5).toFixed(0)} L`
    : `₹${abs.toFixed(0)}`;
  const sign = value >= 0 ? '+' : '-';
  return (
    <span className={value >= 0 ? 'text-primary' : 'text-destructive'}>
      {prefix}{sign}{formatted}
    </span>
  );
}

function parseLiveData(liveData: any) {
  if (!liveData || !Array.isArray(liveData)) return null;
  const fii = liveData.find((d: any) => d.category?.includes('FII'));
  const dii = liveData.find((d: any) => d.category === 'DII');
  if (!fii && !dii) return null;
  return {
    date: fii?.date || dii?.date || '',
    fii_buy: parseFloat(fii?.buyValue || '0'),
    fii_sell: parseFloat(fii?.sellValue || '0'),
    fii_net: parseFloat(fii?.netValue || '0'),
    dii_buy: parseFloat(dii?.buyValue || '0'),
    dii_sell: parseFloat(dii?.sellValue || '0'),
    dii_net: parseFloat(dii?.netValue || '0'),
  };
}

export default function FiiDii() {
  const { data: liveData, isLoading } = useFiiDiiData();
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'sectors'>('live');

  const liveParsed = useMemo(() => parseLiveData(liveData), [liveData]);

  // Use live if available, fallback to mock
  const latestRow = liveParsed || FII_DII_HISTORY[0];
  const history = FII_DII_HISTORY;

  const combined = latestRow.fii_net + latestRow.dii_net;
  const fiiAbs = Math.abs(latestRow.fii_net);
  const diiAbs = Math.abs(latestRow.dii_net);
  const totalAbs = fiiAbs + diiAbs || 1;
  const fiiPct = Math.round((fiiAbs / totalAbs) * 100);
  const diiPct = 100 - fiiPct;

  // Streak calculation
  const calcStreak = (key: 'fii_net' | 'dii_net') => {
    const dir = history[0][key] >= 0 ? 'buy' : 'sell';
    let streak = 0;
    let velocity = 0;
    for (const row of history) {
      if ((dir === 'buy' && row[key] >= 0) || (dir === 'sell' && row[key] < 0)) {
        streak++;
        velocity += row[key];
      } else break;
    }
    return { streak, dir, velocity };
  };

  const fiiStreak = calcStreak('fii_net');
  const diiStreak = calcStreak('dii_net');

  // 5-day velocity
  const fii5Day = history.slice(0, 5).reduce((s, r) => s + r.fii_net, 0);
  const fii5DayAvg = fii5Day / 5;

  // Period totals
  const periodTotals = history.reduce((acc, row) => ({
    fii: acc.fii + row.fii_net,
    dii: acc.dii + row.dii_net,
  }), { fii: 0, dii: 0 });

  // Concentration matrix (last 45 days or available)
  const matrixData = history.slice(0, 45);

  const getMatrixColor = (value: number, type: 'fii' | 'dii') => {
    const abs = Math.abs(value);
    if (type === 'fii') {
      if (value <= -5000) return 'bg-destructive';
      if (value <= -3000) return 'bg-destructive/80';
      if (value <= -1000) return 'bg-destructive/50';
      if (value < 0) return 'bg-destructive/25';
      if (value >= 5000) return 'bg-primary';
      if (value >= 3000) return 'bg-primary/80';
      if (value >= 1000) return 'bg-primary/50';
      return 'bg-primary/25';
    } else {
      if (value >= 5000) return 'bg-primary';
      if (value >= 3000) return 'bg-primary/80';
      if (value >= 1000) return 'bg-primary/50';
      if (value > 0) return 'bg-primary/25';
      if (value <= -3000) return 'bg-destructive/80';
      if (value <= -1000) return 'bg-destructive/50';
      return 'bg-destructive/25';
    }
  };

  return (
    <div className="p-4 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-foreground tracking-tight">FII & DII Data</h1>
          <p className="text-[10px] text-muted-foreground">
            Institutional Money Matrix
            {liveParsed && <span className="text-primary ml-2">● Live from NSE</span>}
            {isLoading && <span className="text-accent animate-pulse ml-2">Loading…</span>}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-md text-[10px] font-bold border ${
          combined < 0
            ? 'bg-destructive/8 text-destructive border-destructive/20'
            : 'bg-primary/8 text-primary border-primary/20'
        }`}>
          {combined < 0 ? 'NET SELLING' : 'NET BUYING'}
        </span>
      </div>

      {/* Main FII/DII Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Latest Session - Main Card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 t-card p-5 border-l-3 border-l-accent">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Latest Extracted Session</p>
              <p className="text-xs text-muted-foreground mt-0.5">{liveParsed?.date || latestRow.date}</p>
            </div>
            <p className="text-[8px] text-muted-foreground">📡 Source: NSE TRDREQ Daily Reports</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-5">
            <div>
              <p className="text-[9px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">FII / FPI NET</p>
              <p className={`text-3xl font-black tracking-tight ${latestRow.fii_net < 0 ? 'text-destructive' : 'text-primary'}`}>
                {latestRow.fii_net < 0 ? '-' : '+'}₹{Math.abs(latestRow.fii_net).toLocaleString('en-IN')} Cr
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">DII NET</p>
              <p className={`text-3xl font-black tracking-tight ${latestRow.dii_net > 0 ? 'text-primary' : 'text-destructive'}`}>
                {latestRow.dii_net > 0 ? '+' : '-'}₹{Math.abs(latestRow.dii_net).toLocaleString('en-IN')} Cr
              </p>
            </div>
          </div>

          {/* Proportion Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[9px] font-bold mb-1.5">
              <span className="text-destructive">FII {latestRow.fii_net < 0 ? 'SELLING' : 'BUYING'}: {fiiPct}%</span>
              <span className="text-primary">DII {latestRow.dii_net > 0 ? 'SUPPORT' : 'SELLING'}: {diiPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex">
              <div className={`${latestRow.fii_net < 0 ? 'bg-destructive' : 'bg-primary'} transition-all`} style={{ width: `${fiiPct}%` }} />
              <div className={`${latestRow.dii_net > 0 ? 'bg-primary' : 'bg-destructive'} transition-all`} style={{ width: `${diiPct}%` }} />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border/30">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Combined Liquidity {combined < 0 ? 'Drain' : 'Inflow'}</span>
            <span className={`text-lg font-black ${combined < 0 ? 'text-destructive' : 'text-primary'}`}>
              {combined < 0 ? '-' : '+'}₹{Math.abs(combined).toLocaleString('en-IN')} Cr
            </span>
          </div>
        </motion.div>

        {/* Right Column - Streaks & Velocity */}
        <div className="space-y-3">
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="t-card p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Current FII Streak</p>
              <p className="text-[9px] text-muted-foreground">Streak Velocity</p>
            </div>
            <div className="flex items-center justify-between">
              <p className={`text-xl font-black ${fiiStreak.dir === 'sell' ? 'text-destructive' : 'text-primary'}`}>
                • {fiiStreak.streak} Days {fiiStreak.dir === 'sell' ? 'Selling' : 'Buying'}
              </p>
              <p className={`text-sm font-black ${fiiStreak.velocity < 0 ? 'text-destructive' : 'text-primary'}`}>
                {fiiStreak.velocity < 0 ? '-' : '+'}₹{Math.abs(fiiStreak.velocity).toLocaleString('en-IN')} Cr
              </p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="t-card p-4">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-1">5-Day FII Net Velocity</p>
            <p className={`text-xl font-black ${fii5Day < 0 ? 'text-destructive' : 'text-primary'}`}>
              {fii5Day < 0 ? '-' : '+'}₹{Math.abs(fii5Day).toLocaleString('en-IN')} Cr
            </p>
            <p className="text-[9px] text-muted-foreground mt-1">
              Avg daily {fii5DayAvg < 0 ? 'selling' : 'buying'}: <span className="text-foreground font-semibold">{fii5DayAvg < 0 ? '-' : '+'}₹{Math.abs(fii5DayAvg).toFixed(0)} Cr/day</span> over the last 5 sessions.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="t-card p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Current DII Streak</p>
              <p className="text-[9px] text-muted-foreground">Streak Velocity</p>
            </div>
            <div className="flex items-center justify-between">
              <p className={`text-xl font-black ${diiStreak.dir === 'buy' ? 'text-primary' : 'text-destructive'}`}>
                • {diiStreak.streak} Days {diiStreak.dir === 'buy' ? 'Buying' : 'Selling'}
              </p>
              <p className={`text-sm font-black ${diiStreak.velocity > 0 ? 'text-primary' : 'text-destructive'}`}>
                {diiStreak.velocity > 0 ? '+' : ''}₹{Math.abs(diiStreak.velocity).toLocaleString('en-IN')} Cr
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Period Cumulative Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: 'FII Period Cumulative', value: periodTotals.fii, sub: 'Historical allocation extraction' },
          { label: 'DII Period Cumulative', value: periodTotals.dii, sub: 'The domestic fortress' },
          { label: 'SIP Monthly Run-Rate', value: 26500, sub: 'Retail structural backbone', fixed: true },
          { label: 'FII NSE500 Ownership', value: 16.1, sub: 'Down from 28% peak', isPct: true },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }} className="t-card p-4">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-1">{item.label}</p>
            {item.isPct ? (
              <p className="text-xl font-black text-foreground">{item.value}%</p>
            ) : item.fixed ? (
              <p className="text-xl font-black text-foreground">₹{item.value.toLocaleString('en-IN')} Cr</p>
            ) : (
              <p className={`text-xl font-black ${item.value >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {item.value < 0 ? '-' : '+'}₹{Math.abs(item.value).toLocaleString('en-IN')} Cr
              </p>
            )}
            <p className="text-[8px] text-muted-foreground mt-1">{item.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Concentration Matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="t-card p-4">
          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-1">FII {matrixData.length}-Day Concentration Matrix</h3>
          <p className="text-[9px] text-muted-foreground mb-3">Visualizing the sell-off depth and density</p>
          <div className="flex flex-wrap gap-1">
            {matrixData.map((row, i) => (
              <div key={i} className={`w-5 h-5 rounded-sm ${getMatrixColor(row.fii_net, 'fii')} cursor-pointer group relative`}>
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-border rounded px-2 py-1 text-[8px] whitespace-nowrap z-20 shadow-lg">
                  <p className="text-muted-foreground">{row.date}</p>
                  <p className={row.fii_net < 0 ? 'text-destructive' : 'text-primary'}>{formatCurrency(row.fii_net, true)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[8px] text-muted-foreground">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-destructive" /> Extreme Dump (≤ -5k+ Cr)</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-primary" /> (≥ +5k+ Cr) Heavy Buying</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="t-card p-4">
          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-1">DII {matrixData.length}-Day Buffer Matrix</h3>
          <p className="text-[9px] text-muted-foreground mb-3">Visualizing domestic absorption</p>
          <div className="flex flex-wrap gap-1">
            {matrixData.map((row, i) => (
              <div key={i} className={`w-5 h-5 rounded-sm ${getMatrixColor(row.dii_net, 'dii')} cursor-pointer group relative`}>
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-border rounded px-2 py-1 text-[8px] whitespace-nowrap z-20 shadow-lg">
                  <p className="text-muted-foreground">{row.date}</p>
                  <p className={row.dii_net > 0 ? 'text-primary' : 'text-destructive'}>{formatCurrency(row.dii_net, true)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[8px] text-muted-foreground">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted" /> Light Activity (± 1k Cr)</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-primary" /> (≥ +5k+ Cr) Accumulation</div>
          </div>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-0.5 bg-secondary/30 p-0.5 rounded-lg w-fit border border-border/30">
        {(['live', 'history', 'sectors'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-md text-[10px] font-semibold transition-all tracking-wide
              ${activeTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'live' ? '⚡ Daily Flow' : t === 'history' ? '📊 History' : '🏢 Sectors'}
          </button>
        ))}
      </div>

      {/* Daily Flow Bar Chart */}
      {activeTab === 'live' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-card p-4">
          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-4">Daily Net Flow (FII vs DII)</h3>
          <div className="flex items-end gap-1 h-48">
            {history.slice(0, 30).reverse().map((row, i) => {
              const maxVal = Math.max(...history.slice(0, 30).map(r => Math.max(Math.abs(r.fii_net), Math.abs(r.dii_net))));
              const fiiH = (Math.abs(row.fii_net) / maxVal) * 100;
              const diiH = (Math.abs(row.dii_net) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="flex gap-px w-full justify-center" style={{ height: '100%' }}>
                    <div className={`w-2.5 rounded-t-sm transition-all ${row.fii_net >= 0 ? 'bg-primary/70' : 'bg-destructive/70'}`}
                      style={{ height: `${fiiH}%`, alignSelf: 'flex-end' }} />
                    <div className={`w-2.5 rounded-t-sm transition-all ${row.dii_net >= 0 ? 'bg-[hsl(var(--terminal-blue)/0.7)]' : 'bg-accent/50'}`}
                      style={{ height: `${diiH}%`, alignSelf: 'flex-end' }} />
                  </div>
                  <span className="text-[6px] text-muted-foreground">{row.date.slice(5)}</span>
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-card border border-border rounded-lg p-2 text-[9px] z-20 whitespace-nowrap shadow-xl">
                    <p className="text-foreground font-bold mb-1">{row.date}</p>
                    <p className={row.fii_net >= 0 ? 'text-primary' : 'text-destructive'}>FII: {formatCurrency(row.fii_net, true)}</p>
                    <p className={row.dii_net >= 0 ? 'text-[hsl(var(--terminal-blue))]' : 'text-accent'}>DII: {formatCurrency(row.dii_net, true)}</p>
                    <p className={`border-t border-border/30 mt-1 pt-1 ${row.fii_net + row.dii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      Net: {formatCurrency(row.fii_net + row.dii_net, true)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-6 mt-3 justify-center text-[9px]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-primary/70 rounded-sm" /> FII Buy</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-destructive/70 rounded-sm" /> FII Sell</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-[hsl(var(--terminal-blue)/0.7)] rounded-sm" /> DII Buy</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-accent/50 rounded-sm" /> DII Sell</div>
          </div>
        </motion.div>
      )}

      {/* History Table */}
      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-card overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Daily Flow History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left p-2.5 text-muted-foreground font-semibold">Date</th>
                  <th className="text-right p-2.5 text-muted-foreground font-semibold">FII Buy</th>
                  <th className="text-right p-2.5 text-muted-foreground font-semibold">FII Sell</th>
                  <th className="text-right p-2.5 text-muted-foreground font-semibold">FII Net</th>
                  <th className="text-right p-2.5 text-muted-foreground font-semibold">DII Buy</th>
                  <th className="text-right p-2.5 text-muted-foreground font-semibold">DII Sell</th>
                  <th className="text-right p-2.5 text-muted-foreground font-semibold">DII Net</th>
                  <th className="text-right p-2.5 text-muted-foreground font-semibold">Combined</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => {
                  const combinedNet = row.fii_net + row.dii_net;
                  return (
                    <tr key={i} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                      <td className="p-2.5 text-muted-foreground font-medium">{row.date}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{formatCurrency(row.fii_buy, true)}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{formatCurrency(row.fii_sell, true)}</td>
                      <td className={`p-2.5 text-right font-bold ${row.fii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCurrency(row.fii_net, true)}
                        <div className="h-1 rounded-full mt-1 overflow-hidden bg-secondary">
                          <div className={`h-full rounded-full ${row.fii_net >= 0 ? 'bg-primary/60' : 'bg-destructive/60'}`}
                            style={{ width: `${Math.min(Math.abs(row.fii_net) / 80, 100)}%` }} />
                        </div>
                      </td>
                      <td className="p-2.5 text-right text-muted-foreground">{formatCurrency(row.dii_buy, true)}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{formatCurrency(row.dii_sell, true)}</td>
                      <td className={`p-2.5 text-right font-bold ${row.dii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCurrency(row.dii_net, true)}
                      </td>
                      <td className={`p-2.5 text-right font-bold ${combinedNet >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCurrency(combinedNet, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Sector Allocation */}
      {activeTab === 'sectors' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-card p-4">
          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-4">Sector-Wise FII / FPI Allocation</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {SECTOR_FII_ALLOCATION.map((sec, i) => (
              <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border/30 hover:border-border/60 transition-all">
                <p className="text-[9px] text-muted-foreground mb-1 font-medium">{sec.name}</p>
                <p className="text-sm font-bold text-foreground">{sec.fii_pct.toFixed(1)}%</p>
                <div className="h-1.5 bg-background rounded-full mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(sec.fii_pct, 100)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.03 }}
                    className="h-full bg-[hsl(var(--terminal-blue))] rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
