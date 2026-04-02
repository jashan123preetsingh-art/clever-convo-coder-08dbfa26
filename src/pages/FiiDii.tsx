import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FII_DII_HISTORY, FII_DII_WEEKLY, FII_DII_MONTHLY, FII_DII_ANNUAL, SECTOR_FII_ALLOCATION, FNO_PARTICIPANT_DATA } from '@/data/mockData';
import { useFiiDiiData } from '@/hooks/useStockData';
import { formatCurrency } from '@/utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend, AreaChart, Area } from 'recharts';
import { Download, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import LiveRefreshBadge from '@/components/LiveRefreshBadge';

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

function formatCr(value: number, showSign = true) {
  const abs = Math.abs(value);
  const sign = showSign ? (value >= 0 ? '+' : '-') : (value < 0 ? '-' : '');
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L Cr`;
  return `${sign}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

type MainTab = 'fii-dii' | 'fno' | 'flow' | 'sectors';

export default function FiiDii() {
  const { data: liveData, isLoading, isFetching, refetch } = useFiiDiiData();
  const [mainTab, setMainTab] = useState<MainTab>('fii-dii');
  const [flowSubTab, setFlowSubTab] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('daily');
  const [flowFilter, setFlowFilter] = useState<'all' | 'bloodbath' | 'absorption' | 'divergence'>('all');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const liveParsed = useMemo(() => parseLiveData(liveData), [liveData]);
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
    let streak = 0, velocity = 0;
    for (const row of history) {
      if ((dir === 'buy' && row[key] >= 0) || (dir === 'sell' && row[key] < 0)) {
        streak++; velocity += row[key];
      } else break;
    }
    return { streak, dir, velocity };
  };

  const fiiStreak = calcStreak('fii_net');
  const diiStreak = calcStreak('dii_net');
  const fii5Day = history.slice(0, 5).reduce((s, r) => s + r.fii_net, 0);
  const fii5DayAvg = fii5Day / 5;

  // Flow analytics stats
  const totalSessions = history.length;
  const avgFiiDaily = history.reduce((s, r) => s + r.fii_net, 0) / totalSessions;
  const avgDiiDaily = history.reduce((s, r) => s + r.dii_net, 0) / totalSessions;
  const bloodbathDays = history.filter(r => r.fii_net <= -5000).length;

  // Filtered history
  const filteredHistory = useMemo(() => {
    switch (flowFilter) {
      case 'bloodbath': return history.filter(r => r.fii_net <= -5000);
      case 'absorption': return history.filter(r => r.dii_net >= 5000);
      case 'divergence': return history.filter(r => Math.abs(r.fii_net + r.dii_net) > 5000);
      default: return history;
    }
  }, [flowFilter, history]);

  const pagedHistory = filteredHistory.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredHistory.length / pageSize);

  // Concentration matrix
  const matrixData = history.slice(0, 45);
  const getMatrixColor = (value: number, type: 'fii' | 'dii') => {
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

  // CSV Download
  const downloadCSV = () => {
    const headers = 'Trading Date,FII Gross Buy,FII Gross Sell,FII Net,DII Gross Buy,DII Gross Sell,DII Net,Total Liquidity\n';
    const rows = filteredHistory.map(r =>
      `${r.date},${r.fii_buy},${r.fii_sell},${r.fii_net},${r.dii_buy},${r.dii_sell},${r.dii_net},${r.fii_net + r.dii_net}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fii_dii_data.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Chart data for flow analytics
  const chartData = useMemo(() =>
    [...history].reverse().map(r => ({
      date: r.date.replace('-2026', ''),
      fii: r.fii_net,
      dii: r.dii_net,
    })),
  [history]);

  const tabs: { key: MainTab; label: string; icon: string }[] = [
    { key: 'fii-dii', label: 'FII/DII Data', icon: '₹' },
    { key: 'fno', label: 'F&O Positions', icon: '📊' },
    { key: 'flow', label: 'Flow Analytics', icon: '📈' },
    { key: 'sectors', label: 'Sectors', icon: '🏢' },
  ];

  const fno = FNO_PARTICIPANT_DATA;

  return (
    <div className="p-4 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight">FII & DII Data</h1>
          <p className="text-[10px] text-muted-foreground">
            INSTITUTIONAL MONEY MATRIX
            {liveParsed && <span className="text-primary ml-2">● LIVE · {liveParsed.date}</span>}
            {!liveParsed && !isLoading && <span className="text-accent ml-2">● Sample Data</span>}
            {isLoading && <span className="text-accent animate-pulse ml-2">Loading…</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveRefreshBadge intervalSeconds={30} onRefresh={() => refetch()} isFetching={isFetching} />
          <span className={`px-3 py-1.5 rounded-md text-[10px] font-bold border ${
            combined < 0 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-primary/10 text-primary border-primary/20'
          }`}>
            {combined < 0 ? 'NET SELLING' : 'NET BUYING'}
          </span>
        </div>
        </span>
      </div>

      {/* Tab Navigation - Bottom style like reference */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:backdrop-blur-none md:border-0 md:z-auto">
        <div className="flex justify-center gap-0.5 p-1.5 md:p-0 md:justify-start md:bg-secondary/30 md:rounded-lg md:w-fit md:border md:border-border/30">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setMainTab(t.key)}
              className={`px-4 py-2.5 md:py-2 rounded-md text-[11px] font-semibold transition-all tracking-wide flex items-center gap-1.5
                ${mainTab === t.key ? 'bg-destructive/10 text-destructive shadow-sm md:bg-card md:text-foreground md:shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ TAB 1: FII/DII DATA ═══════════ */}
      {mainTab === 'fii-dii' && (
        <div className="space-y-4 pb-16 md:pb-0">
          {/* Main FII/DII Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 t-card p-5 border-l-4 border-l-accent">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Latest Extracted Session</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-primary">✓ Cash Synced</span>
                    <span className="text-[9px] text-primary">✓ F&O Synced</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{liveParsed?.date || latestRow.date}</p>
                </div>
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
                <div className="h-2.5 rounded-full overflow-hidden flex">
                  <div className={`${latestRow.fii_net < 0 ? 'bg-destructive' : 'bg-primary'} transition-all`} style={{ width: `${fiiPct}%` }} />
                  <div className={`${latestRow.dii_net > 0 ? 'bg-primary' : 'bg-destructive'} transition-all`} style={{ width: `${diiPct}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border/30">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Combined Liquidity {combined < 0 ? 'Drain' : 'Inflow'}</span>
                <span className={`text-lg font-black ${combined < 0 ? 'text-destructive' : 'text-primary'}`}>
                  {formatCr(combined)}
                </span>
              </div>
            </motion.div>

            {/* Streaks & Velocity */}
            <div className="space-y-3">
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                className="t-card p-4 border-l-4 border-l-destructive">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Current FII Streak</p>
                  <p className="text-[9px] text-muted-foreground">Streak Velocity</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-lg font-black font-mono ${fiiStreak.dir === 'sell' ? 'text-destructive' : 'text-primary'}`}>
                    • {fiiStreak.streak} Days {fiiStreak.dir === 'sell' ? 'Selling' : 'Buying'}
                  </p>
                  <p className={`text-sm font-black font-mono ${fiiStreak.velocity < 0 ? 'text-destructive' : 'text-primary'}`}>
                    {formatCr(fiiStreak.velocity)}
                  </p>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                className="t-card p-4">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-1">5-Day FII Net Velocity</p>
                <p className={`text-xl font-black font-mono ${fii5Day < 0 ? 'text-destructive' : 'text-primary'}`}>
                  {formatCr(fii5Day)}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  Avg daily {fii5DayAvg < 0 ? 'selling' : 'buying'}: <span className="text-foreground font-semibold">{formatCr(fii5DayAvg)}/day</span> over the last 5 sessions.
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                className="t-card p-4 border-l-4 border-l-primary">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Current DII Streak</p>
                  <p className="text-[9px] text-muted-foreground">Streak Velocity</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-lg font-black font-mono ${diiStreak.dir === 'buy' ? 'text-primary' : 'text-destructive'}`}>
                    • {diiStreak.streak} Days {diiStreak.dir === 'buy' ? 'Buying' : 'Selling'}
                  </p>
                  <p className={`text-sm font-black font-mono ${diiStreak.velocity > 0 ? 'text-primary' : 'text-destructive'}`}>
                    {diiStreak.velocity > 0 ? '++' : ''}{formatCr(diiStreak.velocity)}
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Cumulative Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { label: 'FII 5-Yr Cumulative', value: -1101000, sub: 'Historical allocation extraction', format: 'lakh' },
              { label: 'DII 5-Yr Cumulative', value: 2045000, sub: 'The domestic fortress', format: 'lakh' },
              { label: 'SIP Monthly Run-Rate', value: 26500, sub: 'Retail structural backbone', format: 'fixed' },
              { label: 'FII NSE500 Ownership', value: 16.1, sub: 'Down from 28% peak', format: 'pct' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }} className="t-card p-4">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-1">{item.label}</p>
                {item.format === 'pct' ? (
                  <p className="text-xl font-black text-foreground font-mono">{item.value}%</p>
                ) : item.format === 'fixed' ? (
                  <p className="text-xl font-black text-foreground font-mono">₹{item.value.toLocaleString('en-IN')} Cr</p>
                ) : (
                  <p className={`text-xl font-black font-mono ${item.value >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {item.value < 0 ? '-' : '+'}₹{(Math.abs(item.value) / 100).toFixed(2)}L Cr
                  </p>
                )}
                <p className="text-[8px] text-muted-foreground mt-1">{item.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Concentration Matrices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="t-card p-4">
              <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-1">FII {matrixData.length}-Day Concentration Matrix</h3>
              <p className="text-[9px] text-muted-foreground mb-3">Visualizing the sell-off depth and density</p>
              <div className="flex flex-wrap gap-1">
                {matrixData.map((row, i) => (
                  <div key={i} className={`w-5 h-5 rounded-sm ${getMatrixColor(row.fii_net, 'fii')} cursor-pointer group relative`}>
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-border rounded px-2 py-1 text-[8px] whitespace-nowrap z-20 shadow-lg">
                      <p className="text-muted-foreground">{row.date}</p>
                      <p className={row.fii_net < 0 ? 'text-destructive' : 'text-primary'}>{formatCr(row.fii_net)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[8px] text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-destructive" /><div className="w-3 h-3 rounded-sm bg-destructive/80" /><div className="w-3 h-3 rounded-sm bg-destructive/50" /> EXTREME DUMP (≤ -5k+ Cr)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-primary/50" /><div className="w-3 h-3 rounded-sm bg-primary/80" /><div className="w-3 h-3 rounded-sm bg-primary" /> (≥ +5k+ Cr) HEAVY BUYING</div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="t-card p-4">
              <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-1">DII {matrixData.length}-Day Buffer Matrix</h3>
              <p className="text-[9px] text-muted-foreground mb-3">Visualizing domestic absorption</p>
              <div className="flex flex-wrap gap-1">
                {matrixData.map((row, i) => (
                  <div key={i} className={`w-5 h-5 rounded-sm ${getMatrixColor(row.dii_net, 'dii')} cursor-pointer group relative`}>
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-border rounded px-2 py-1 text-[8px] whitespace-nowrap z-20 shadow-lg">
                      <p className="text-muted-foreground">{row.date}</p>
                      <p className={row.dii_net > 0 ? 'text-primary' : 'text-destructive'}>{formatCr(row.dii_net)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[8px] text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted" /><div className="w-3 h-3 rounded-sm bg-destructive/50" /> LIGHT ACTIVITY (± 1k Cr)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-primary/80" /><div className="w-3 h-3 rounded-sm bg-primary" /> (≥ +5k+ Cr) ACCUMULATION</div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 2: F&O POSITIONS ═══════════ */}
      {mainTab === 'fno' && (
        <div className="space-y-4 pb-16 md:pb-0">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="t-card p-6 border-l-4 border-l-primary text-center">
            <h2 className="text-xl font-black text-foreground mb-2">Derivatives Positioning (F&O)</h2>
            <p className="text-[11px] text-muted-foreground max-w-2xl mx-auto">
              Participant-wise Open Interest analysis across Index Futures, Stock Futures, Index Calls & Puts. Decode the institutional sentiment through long/short ratios.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="t-card p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <h3 className="text-[12px] font-bold text-foreground">📊 Open Interest Breakdown</h3>
                <span className="px-2 py-0.5 rounded-md bg-secondary/60 border border-border/30 text-[9px] font-medium text-muted-foreground">
                  Data for: {fno.date}
                </span>
              </div>
              <span className="px-3 py-1 rounded-md bg-destructive/10 text-destructive text-[10px] font-bold border border-destructive/20">
                {fno.sentiment}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground mb-5">Long vs Short positioning · Institutional sentiment derived from ratio analysis</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* FII Positioning */}
              <div className="p-4 rounded-lg bg-secondary/20 border border-destructive/20">
                <p className="text-[11px] font-bold text-destructive uppercase tracking-wider mb-4">FII / FPI Positioning</p>
                <div className="space-y-4">
                  {[
                    { label: 'INDEX FUTURES', data: fno.fii.index_futures },
                    { label: 'STOCK FUTURES', data: fno.fii.stock_futures },
                    { label: 'INDEX CALLS (LONG = BULLISH)', data: fno.fii.index_calls },
                    { label: 'INDEX PUTS (LONG = BEARISH)', data: fno.fii.index_puts },
                  ].map((item, i) => {
                    const total = item.data.long + item.data.short;
                    const longPct = (item.data.long / total) * 100;
                    return (
                      <div key={i}>
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">{item.label}</p>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-destructive font-bold">Long: {item.data.long.toLocaleString('en-IN')}</span>
                          <span className="text-primary font-bold">Short: {item.data.short.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden flex bg-secondary">
                          <div className="bg-destructive/70 transition-all" style={{ width: `${longPct}%` }} />
                          <div className="bg-primary/70 transition-all" style={{ width: `${100 - longPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DII Positioning */}
              <div className="p-4 rounded-lg bg-secondary/20 border border-primary/20">
                <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-4">DII / DOMESTIC</p>
                <div className="space-y-4">
                  {[
                    { label: 'INDEX FUTURES', data: fno.dii.index_futures },
                    { label: 'STOCK FUTURES', data: fno.dii.stock_futures },
                  ].map((item, i) => {
                    const total = item.data.long + item.data.short;
                    const longPct = (item.data.long / total) * 100;
                    return (
                      <div key={i}>
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">{item.label}</p>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-primary font-bold">Long: {item.data.long.toLocaleString('en-IN')}</span>
                          <span className="text-destructive font-bold">Short: {item.data.short.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden flex bg-secondary">
                          <div className="bg-primary/70 transition-all" style={{ width: `${longPct}%` }} />
                          <div className="bg-destructive/70 transition-all" style={{ width: `${100 - longPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="p-3 rounded-lg bg-secondary/40 border border-border/20 text-[9px] text-muted-foreground mt-2">
                    DIIs primarily use index futures for hedging. Options writing is minimal compared to FII participation.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Historical F&O Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="t-card p-5">
            <h3 className="text-[12px] font-bold text-foreground mb-4">📈 Historical Institutional Positioning (Net Contracts)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${v > 0 ? '+' : ''}${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '10px' }}
                    formatter={(v: number) => formatCr(v)} />
                  <Area type="monotone" dataKey="fii" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.15)" strokeWidth={2} name="FII Net" />
                  <Area type="monotone" dataKey="dii" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="DII Net" />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══════════ TAB 3: FLOW ANALYTICS ═══════════ */}
      {mainTab === 'flow' && (
        <div className="space-y-4 pb-16 md:pb-0">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="t-card p-5 border-l-4 border-l-primary text-center">
            <h2 className="text-lg font-black text-foreground mb-1">Historical Flow Analytics</h2>
            <p className="text-[10px] text-muted-foreground max-w-2xl mx-auto">
              Visualize institutional flow trends and explore the complete data matrix. Filter, sort, and track FII/DII activities across daily, weekly, monthly, and annual timeframes.
            </p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="t-card p-4 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Total Sessions</p>
              <p className="text-2xl font-black text-foreground">{totalSessions}</p>
              <p className="text-[8px] text-muted-foreground">in daily archive</p>
            </div>
            <div className="t-card p-4 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Avg FII Daily Net</p>
              <p className={`text-lg font-black font-mono ${avgFiiDaily < 0 ? 'text-destructive' : 'text-primary'}`}>{formatCr(avgFiiDaily)}</p>
              <p className="text-[8px] text-muted-foreground">across all sessions</p>
            </div>
            <div className="t-card p-4 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Avg DII Daily Net</p>
              <p className={`text-lg font-black font-mono ${avgDiiDaily > 0 ? 'text-primary' : 'text-destructive'}`}>{formatCr(avgDiiDaily)}</p>
              <p className="text-[8px] text-muted-foreground">across all sessions</p>
            </div>
            <div className="t-card p-4 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-1">FII Bloodbath Days</p>
              <p className="text-2xl font-black text-destructive">{bloodbathDays}</p>
              <p className="text-[8px] text-muted-foreground">sessions &lt; -₹5k Cr</p>
            </div>
          </div>

          {/* Flow Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-card p-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={0}>
                  <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" interval={2} />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '10px' }}
                    formatter={(v: number) => formatCr(v)} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Bar dataKey="fii" fill="hsl(var(--destructive) / 0.7)" name="FII/FPI Net Flow" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="dii" fill="hsl(var(--primary) / 0.7)" name="DII Net Flow" radius={[2, 2, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[8px] text-muted-foreground text-right mt-1">Hover bars for exact metrics.</p>
          </motion.div>

          {/* Sub-tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-0.5 bg-secondary/30 p-0.5 rounded-lg border border-border/30">
              {(['daily', 'weekly', 'monthly', 'annual'] as const).map(t => (
                <button key={t} onClick={() => { setFlowSubTab(t); setPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all
                    ${flowSubTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t === 'daily' ? 'Daily Flows' : t === 'weekly' ? 'Weekly (12W)' : t === 'monthly' ? 'Monthly (24M)' : 'Annual Tracker'}
                </button>
              ))}
            </div>

            {flowSubTab === 'daily' && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5 bg-secondary/30 p-0.5 rounded-lg border border-border/30">
                  {([
                    { key: 'all', label: 'All Data' },
                    { key: 'bloodbath', label: 'FII Bloodbath (< -₹5k Cr)' },
                    { key: 'absorption', label: 'DII Absorption (> +₹5k Cr)' },
                    { key: 'divergence', label: 'Extreme Divergence' },
                  ] as const).map(f => (
                    <button key={f.key} onClick={() => { setFlowFilter(f.key); setPage(1); }}
                      className={`px-2.5 py-1 rounded-md text-[9px] font-semibold transition-all
                        ${flowFilter === f.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20 hover:bg-primary/20 transition-all">
                  <Download size={12} /> Download CSV
                </button>
              </div>
            )}
          </div>

          {/* Daily Table */}
          {flowSubTab === 'daily' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left p-2.5 text-muted-foreground font-semibold w-8"></th>
                      <th className="text-left p-2.5 text-muted-foreground font-semibold">Trading Date</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">FII Gross Buy</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">FII Gross Sell</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">FII Net</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">DII Gross Buy</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">DII Gross Sell</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">DII Net</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">Total Liquidity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedHistory.map((row, i) => {
                      const combinedNet = row.fii_net + row.dii_net;
                      const globalIdx = (page - 1) * pageSize + i;
                      const isExpanded = expandedRow === globalIdx;
                      const fiiBuySellRatio = (row.fii_buy / row.fii_sell).toFixed(2);
                      const diiBuySellRatio = (row.dii_buy / row.dii_sell).toFixed(2);
                      const fiiGrossTurnover = row.fii_buy + row.fii_sell;

                      return (
                        <React.Fragment key={i}>
                          <tr className="border-b border-border/20 hover:bg-secondary/20 transition-colors cursor-pointer"
                            onClick={() => setExpandedRow(isExpanded ? null : globalIdx)}>
                            <td className="p-2.5 text-center">
                              {isExpanded ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
                            </td>
                            <td className="p-2.5 text-muted-foreground font-medium flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${row.fii_net < -5000 ? 'bg-destructive' : row.fii_net < -1000 ? 'bg-accent' : 'bg-primary'}`} />
                              {row.date}
                            </td>
                            <td className="p-2.5 text-right text-primary font-medium tabular-nums">+₹{row.fii_buy.toLocaleString('en-IN')} Cr</td>
                            <td className="p-2.5 text-right text-destructive font-medium tabular-nums">-₹{row.fii_sell.toLocaleString('en-IN')} Cr</td>
                            <td className={`p-2.5 text-right font-bold tabular-nums ${row.fii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              {formatCr(row.fii_net)}
                              <div className="h-1 rounded-full mt-1 overflow-hidden bg-secondary">
                                <div className={`h-full rounded-full ${row.fii_net >= 0 ? 'bg-primary/60' : 'bg-destructive/60'}`}
                                  style={{ width: `${Math.min(Math.abs(row.fii_net) / 120, 100)}%` }} />
                              </div>
                            </td>
                            <td className="p-2.5 text-right text-primary font-medium tabular-nums">+₹{row.dii_buy.toLocaleString('en-IN')} Cr</td>
                            <td className="p-2.5 text-right text-destructive font-medium tabular-nums">-₹{row.dii_sell.toLocaleString('en-IN')} Cr</td>
                            <td className={`p-2.5 text-right font-bold tabular-nums ${row.dii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              {formatCr(row.dii_net)}
                            </td>
                            <td className={`p-2.5 text-right font-bold tabular-nums ${combinedNet >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              {formatCr(combinedNet)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-secondary/10">
                              <td colSpan={9} className="p-3">
                                <div className="flex items-center gap-6 text-[9px]">
                                  <div><span className="text-muted-foreground">FII Buy/Sell Ratio</span><br/><span className="font-bold text-foreground">{fiiBuySellRatio}x</span></div>
                                  <div><span className="text-muted-foreground">DII Buy/Sell Ratio</span><br/><span className="font-bold text-foreground">{diiBuySellRatio}x</span></div>
                                  <div><span className="text-muted-foreground">FII Gross Turnover</span><br/><span className="font-bold text-primary">{formatCr(fiiGrossTurnover, false)}</span></div>
                                  <div><span className="text-muted-foreground">Net Liquidity</span><br/><span className={`font-bold ${combinedNet >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCr(combinedNet)}</span></div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {/* Sum row */}
                    <tr className="border-t-2 border-border bg-secondary/20 font-bold">
                      <td className="p-2.5" />
                      <td className="p-2.5 text-muted-foreground">∑ {filteredHistory.length} days</td>
                      <td className="p-2.5 text-right text-primary tabular-nums">{formatCr(filteredHistory.reduce((s, r) => s + r.fii_buy, 0), false)}</td>
                      <td className="p-2.5 text-right text-destructive tabular-nums">{formatCr(-filteredHistory.reduce((s, r) => s + r.fii_sell, 0))}</td>
                      <td className={`p-2.5 text-right tabular-nums ${filteredHistory.reduce((s, r) => s + r.fii_net, 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCr(filteredHistory.reduce((s, r) => s + r.fii_net, 0))}
                      </td>
                      <td className="p-2.5 text-right text-primary tabular-nums">{formatCr(filteredHistory.reduce((s, r) => s + r.dii_buy, 0), false)}</td>
                      <td className="p-2.5 text-right text-destructive tabular-nums">{formatCr(-filteredHistory.reduce((s, r) => s + r.dii_sell, 0))}</td>
                      <td className={`p-2.5 text-right tabular-nums ${filteredHistory.reduce((s, r) => s + r.dii_net, 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCr(filteredHistory.reduce((s, r) => s + r.dii_net, 0))}
                      </td>
                      <td className={`p-2.5 text-right tabular-nums ${filteredHistory.reduce((s, r) => s + r.fii_net + r.dii_net, 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCr(filteredHistory.reduce((s, r) => s + r.fii_net + r.dii_net, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-border">
                  <p className="text-[9px] text-muted-foreground">Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredHistory.length)} of {filteredHistory.length} rows</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-2 py-1 rounded text-[9px] text-muted-foreground hover:bg-secondary disabled:opacity-40">Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button key={i} onClick={() => setPage(i + 1)}
                        className={`w-6 h-6 rounded text-[9px] font-medium transition-all ${page === i + 1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}>
                        {i + 1}
                      </button>
                    ))}
                    <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-2 py-1 rounded text-[9px] text-muted-foreground hover:bg-secondary disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Weekly Table */}
          {flowSubTab === 'weekly' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left p-2.5 text-muted-foreground font-semibold">Week Ending</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">FII Net</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">DII Net</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">Combined Liquidity</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">Weekly Trend Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FII_DII_WEEKLY.map((row, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-secondary/20">
                        <td className="p-2.5 text-muted-foreground font-medium">{row.week}</td>
                        <td className={`p-2.5 text-right font-bold tabular-nums ${row.fii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCr(row.fii_net)}</td>
                        <td className={`p-2.5 text-right font-bold tabular-nums ${row.dii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCr(row.dii_net)}</td>
                        <td className={`p-2.5 text-right font-bold tabular-nums ${row.combined >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCr(row.combined)}</td>
                        <td className="p-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${row.combined >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                            {row.signal}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Monthly Table */}
          {flowSubTab === 'monthly' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left p-2.5 text-muted-foreground font-semibold">Month & Year</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">FII Net</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">DII Net</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">Net Money Printer</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">Nifty Market Chg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FII_DII_MONTHLY.map((row, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-secondary/20">
                        <td className="p-2.5 text-muted-foreground font-medium">{row.month}</td>
                        <td className={`p-2.5 text-right font-bold tabular-nums ${row.fii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCr(row.fii_net)}</td>
                        <td className={`p-2.5 text-right font-bold tabular-nums ${row.dii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCr(row.dii_net)}</td>
                        <td className={`p-2.5 text-right font-bold tabular-nums ${row.combined >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCr(row.combined)}</td>
                        <td className={`p-2.5 text-right font-bold tabular-nums ${row.nifty_chg >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {row.nifty_chg >= 0 ? '+' : ''}{row.nifty_chg}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Annual Table */}
          {flowSubTab === 'annual' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left p-2.5 text-muted-foreground font-semibold">Calendar Year</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">FII Equities Net</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">DII Equities Net</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">Total Institutional Flow</th>
                      <th className="text-right p-2.5 text-muted-foreground font-semibold">Domestic Multiplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FII_DII_ANNUAL.map((row, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-secondary/20">
                        <td className="p-2.5 text-muted-foreground font-medium">{row.year}</td>
                        <td className={`p-2.5 text-right font-bold tabular-nums ${row.fii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCr(row.fii_net)}</td>
                        <td className={`p-2.5 text-right font-bold tabular-nums ${row.dii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCr(row.dii_net)}</td>
                        <td className={`p-2.5 text-right font-bold tabular-nums ${row.combined >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCr(row.combined)}</td>
                        <td className="p-2.5 text-right font-bold text-foreground tabular-nums">
                          {row.multiplier ? `${row.multiplier}x` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ═══════════ TAB 4: SECTORS ═══════════ */}
      {mainTab === 'sectors' && (
        <div className="space-y-4 pb-16 md:pb-0">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="t-card p-5 border-l-4 border-l-primary">
            <h2 className="text-lg font-black text-foreground mb-1">Sector-Wise FII / FPI Allocation</h2>
            <p className="text-[10px] text-muted-foreground">
              Source: NSDL Fortnightly FPI Reports · BSE 22-Sector Classification · Updated twice a month
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {SECTOR_FII_ALLOCATION.map((sec, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="t-card p-4 hover:border-border/60 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-foreground underline underline-offset-2 decoration-muted-foreground/30 group-hover:decoration-primary transition-all">{sec.name}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sec.fortnight_flow >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>
                    {sec.fortnight_flow >= 0 ? '▲' : '▼'} {formatCr(sec.fortnight_flow)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[8px] text-muted-foreground mb-3">
                  <span>{sec.aum_pct}% of AUM</span>
                  <span>FII Own: {sec.fii_own}%</span>
                </div>

                {/* Mini sparkline area */}
                <div className="h-8 mb-3 rounded overflow-hidden bg-secondary/20">
                  <div className="w-full h-full flex items-end">
                    {Array.from({ length: 15 }, (_, j) => {
                      const val = Math.sin(j * 0.5 + i) * 30 + 50 + sec.momentum * 5;
                      return <div key={j} className={`flex-1 ${sec.fortnight_flow >= 0 ? 'bg-primary/30' : 'bg-destructive/30'}`} style={{ height: `${Math.max(val, 10)}%` }} />;
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[8px]">
                  <div>
                    <p className="text-muted-foreground uppercase tracking-wider">1Y Structural Flow</p>
                    <p className={`font-bold ${sec.flow_1y >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCr(sec.flow_1y)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase tracking-wider">Momentum Alpha</p>
                    <p className={`font-bold ${sec.momentum >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      <span className={sec.momentum >= 0 ? '' : 'text-destructive'}>{sec.momentum >= 0 ? 'outperforming' : 'underperforming'}</span>
                      <br />({sec.momentum >= 0 ? '+' : ''}{sec.momentum}%)
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-[9px] text-muted-foreground mt-2">
            <div className="flex items-center gap-1"><span className="text-primary font-bold">NET INFLOW (FORTNIGHT)</span></div>
            <div className="flex items-center gap-1"><span className="text-destructive font-bold">NET OUTFLOW (FORTNIGHT)</span></div>
            <span className="ml-auto">Data updates every ~15 days. Last update date shown in card header.</span>
          </div>
        </div>
      )}
    </div>
  );
}
