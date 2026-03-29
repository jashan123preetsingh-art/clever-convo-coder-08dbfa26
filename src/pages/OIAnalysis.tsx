import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { generateOptionsChain } from '@/data/mockData';
import { formatNumber, formatVolume } from '@/utils/format';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, AreaChart, Cell } from 'recharts';

const SYMBOLS = ['NIFTY', 'BANKNIFTY'] as const;

function MoodBadge({ pcr }: { pcr: number }) {
  const mood = pcr > 1.3 ? 'VERY BULLISH' : pcr > 1.0 ? 'BULLISH' : pcr > 0.8 ? 'NEUTRAL' : pcr > 0.6 ? 'BEARISH' : 'VERY BEARISH';
  const color = pcr > 1.0 ? 'text-primary bg-primary/10' : pcr > 0.8 ? 'text-accent bg-accent/10' : 'text-destructive bg-destructive/10';
  return <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${color}`}>{mood}</span>;
}

function MetricCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color?: string; icon?: string }) {
  return (
    <div className="bg-card rounded-lg p-3 border border-border/40">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-xs">{icon}</span>}
        <p className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className={`text-lg font-black font-data tracking-tight ${color || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[8px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function OIChangeHeatmap({ chain, symbol }: { chain: any[]; symbol: string }) {
  // Take strikes around ATM
  const underlyingValue = symbol === 'NIFTY' ? 22800 : 52200;
  const atmIdx = chain.findIndex(c => Math.abs(c.strike - underlyingValue) === Math.min(...chain.map(r => Math.abs(r.strike - underlyingValue))));
  const visible = chain.slice(Math.max(0, atmIdx - 10), atmIdx + 11);
  const maxChg = Math.max(...visible.map(c => Math.max(Math.abs(c.ce.chg_oi), Math.abs(c.pe.chg_oi))), 1);

  return (
    <div className="t-card overflow-hidden">
      <div className="px-3 pt-3 pb-2">
        <p className="text-[11px] font-bold text-foreground">OI Change Heatmap — {symbol}</p>
        <p className="text-[8px] text-muted-foreground">Green = OI build-up (bullish for puts, bearish for calls) • Red = OI unwinding</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-[8px]">
              <th className="p-1.5 text-center">CALL OI CHG</th>
              <th className="p-1.5 text-center">CALL OI</th>
              <th className="p-1.5 text-center bg-secondary/30 font-bold">STRIKE</th>
              <th className="p-1.5 text-center">PUT OI</th>
              <th className="p-1.5 text-center">PUT OI CHG</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => {
              const isATM = Math.abs(row.strike - underlyingValue) === Math.min(...visible.map((r: any) => Math.abs(r.strike - underlyingValue)));
              const ceIntensity = Math.min(Math.abs(row.ce.chg_oi) / maxChg, 1);
              const peIntensity = Math.min(Math.abs(row.pe.chg_oi) / maxChg, 1);
              const ceBg = row.ce.chg_oi >= 0
                ? `rgba(239, 68, 68, ${ceIntensity * 0.3})`
                : `rgba(34, 197, 94, ${ceIntensity * 0.3})`;
              const peBg = row.pe.chg_oi >= 0
                ? `rgba(34, 197, 94, ${peIntensity * 0.3})`
                : `rgba(239, 68, 68, ${peIntensity * 0.3})`;

              return (
                <tr key={i} className={`border-b border-border/10 ${isATM ? 'bg-accent/10' : ''}`}>
                  <td className="p-1.5 text-center font-data font-medium" style={{ background: ceBg }}>
                    <span className={row.ce.chg_oi >= 0 ? 'text-destructive' : 'text-primary'}>
                      {row.ce.chg_oi >= 0 ? '+' : ''}{formatVolume(row.ce.chg_oi)}
                    </span>
                  </td>
                  <td className="p-1.5 text-center text-muted-foreground font-data">{formatVolume(row.ce.oi)}</td>
                  <td className={`p-1.5 text-center font-bold font-data ${isATM ? 'text-accent' : 'text-foreground'} bg-secondary/20`}>
                    {formatNumber(row.strike)}
                  </td>
                  <td className="p-1.5 text-center text-muted-foreground font-data">{formatVolume(row.pe.oi)}</td>
                  <td className="p-1.5 text-center font-data font-medium" style={{ background: peBg }}>
                    <span className={row.pe.chg_oi >= 0 ? 'text-primary' : 'text-destructive'}>
                      {row.pe.chg_oi >= 0 ? '+' : ''}{formatVolume(row.pe.chg_oi)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OIAnalysis() {
  const [activeSymbol, setActiveSymbol] = useState<typeof SYMBOLS[number]>('NIFTY');

  const data = useMemo(() => generateOptionsChain(activeSymbol), [activeSymbol]);
  const { chain, underlyingValue, analytics } = data;

  // Build OI distribution chart data
  const atmIdx = chain.findIndex(c => Math.abs(c.strike - underlyingValue) === Math.min(...chain.map(r => Math.abs(r.strike - underlyingValue))));
  const visibleChain = chain.slice(Math.max(0, atmIdx - 12), atmIdx + 13);

  const oiDistribution = visibleChain.map(row => ({
    strike: row.strike,
    callOI: row.ce.oi,
    putOI: row.pe.oi,
    callChg: row.ce.chg_oi,
    putChg: row.pe.chg_oi,
    netOI: row.pe.oi - row.ce.oi,
  }));

  // Simulated PCR trend (last 10 sessions)
  const pcrTrend = useMemo(() => {
    const base = analytics.pcr;
    return Array.from({ length: 10 }, (_, i) => ({
      session: `D-${9 - i}`,
      pcr: +(base + (Math.random() - 0.5) * 0.4).toFixed(2),
      callOI: Math.round(analytics.totalCallOI * (0.85 + Math.random() * 0.3)),
      putOI: Math.round(analytics.totalPutOI * (0.85 + Math.random() * 0.3)),
    }));
  }, [analytics]);

  // OI buildup/unwinding interpretation
  const maxCallOIStrike = chain.reduce((max, c) => c.ce.oi > max.ce.oi ? c : max, chain[0]);
  const maxPutOIStrike = chain.reduce((max, c) => c.pe.oi > max.pe.oi ? c : max, chain[0]);
  const callOIBuildup = chain.filter(c => c.ce.chg_oi > 0).reduce((s, c) => s + c.ce.chg_oi, 0);
  const callOIUnwinding = chain.filter(c => c.ce.chg_oi < 0).reduce((s, c) => s + Math.abs(c.ce.chg_oi), 0);
  const putOIBuildup = chain.filter(c => c.pe.chg_oi > 0).reduce((s, c) => s + c.pe.chg_oi, 0);
  const putOIUnwinding = chain.filter(c => c.pe.chg_oi < 0).reduce((s, c) => s + Math.abs(c.pe.chg_oi), 0);

  return (
    <div className="p-4 max-w-[1800px] mx-auto space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-wide">OI ANALYSIS</h1>
            <p className="text-[9px] text-muted-foreground">Open Interest trends, OI Change Heatmap & PCR Charts for Index F&O</p>
          </div>
          <div className="flex items-center gap-1.5">
            {SYMBOLS.map(s => (
              <button key={s} onClick={() => setActiveSymbol(s)}
                className={`px-3.5 py-1.5 rounded text-[10px] font-bold border transition-all
                  ${activeSymbol === s ? 'bg-primary/15 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Key Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        <MetricCard icon="📊" label="PCR" value={analytics.pcr.toFixed(2)} color={analytics.pcr > 1 ? 'text-primary' : 'text-destructive'} />
        <MetricCard icon="🎯" label="Max Pain" value={formatNumber(analytics.maxPain)} color="text-accent" />
        <MetricCard icon="📞" label="Total Call OI" value={formatVolume(analytics.totalCallOI)} color="text-destructive" />
        <MetricCard icon="📱" label="Total Put OI" value={formatVolume(analytics.totalPutOI)} color="text-primary" />
        <MetricCard icon="🔴" label="Max Call OI @" value={formatNumber(maxCallOIStrike.strike)} sub="Resistance" color="text-destructive" />
        <MetricCard icon="🟢" label="Max Put OI @" value={formatNumber(maxPutOIStrike.strike)} sub="Support" color="text-primary" />
        <MetricCard icon="📈" label="Call Buildup" value={formatVolume(callOIBuildup)} sub={`Unwinding: ${formatVolume(callOIUnwinding)}`} />
        <MetricCard icon="📉" label="Put Buildup" value={formatVolume(putOIBuildup)} sub={`Unwinding: ${formatVolume(putOIUnwinding)}`} />
      </div>

      {/* Market Interpretation */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="t-card p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm">🧠</span>
          <span className="text-[11px] font-bold text-foreground">OI Interpretation</span>
          <MoodBadge pcr={analytics.pcr} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px]">
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="text-muted-foreground font-semibold mb-1">📊 PCR Analysis</p>
            <p className="text-foreground leading-relaxed">
              PCR at <span className="font-bold text-primary">{analytics.pcr.toFixed(2)}</span> — 
              {analytics.pcr > 1.2 ? ' Strong put writing indicating bullish sentiment. Writers are confident market won\'t fall.' :
               analytics.pcr > 0.8 ? ' Balanced OI suggesting range-bound movement. No clear directional bias.' :
               ' Heavy call writing indicating bearish pressure. Resistance building up.'}
            </p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="text-muted-foreground font-semibold mb-1">🎯 Key Levels</p>
            <p className="text-foreground leading-relaxed">
              Strong resistance at <span className="font-bold text-destructive">{formatNumber(maxCallOIStrike.strike)}</span> (max call OI).
              Support at <span className="font-bold text-primary">{formatNumber(maxPutOIStrike.strike)}</span> (max put OI).
              Max Pain: <span className="font-bold text-accent">{formatNumber(analytics.maxPain)}</span>.
            </p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="text-muted-foreground font-semibold mb-1">⚡ OI Activity</p>
            <p className="text-foreground leading-relaxed">
              {putOIBuildup > callOIBuildup
                ? `Put writing dominates with ${formatVolume(putOIBuildup)} buildup vs ${formatVolume(callOIBuildup)} call buildup. Bullish signal.`
                : `Call writing dominates with ${formatVolume(callOIBuildup)} buildup vs ${formatVolume(putOIBuildup)} put buildup. Bearish signal.`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Call vs Put OI Distribution */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="t-card p-4">
          <p className="text-[11px] font-bold text-foreground mb-1">Call vs Put OI Distribution</p>
          <p className="text-[8px] text-muted-foreground mb-3">Strikewise open interest comparison</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={oiDistribution} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
              <XAxis dataKey="strike" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatVolume(v)} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10 }}
                formatter={(value: number) => formatVolume(value)} />
              <ReferenceLine x={chain[atmIdx]?.strike} stroke="hsl(var(--accent))" strokeDasharray="3 3" label={{ value: 'ATM', fontSize: 8, fill: 'hsl(var(--accent))' }} />
              <Bar dataKey="callOI" name="Call OI" fill="hsl(var(--destructive)/0.6)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="putOI" name="Put OI" fill="hsl(var(--primary)/0.6)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* OI Change Chart */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="t-card p-4">
          <p className="text-[11px] font-bold text-foreground mb-1">OI Change by Strike</p>
          <p className="text-[8px] text-muted-foreground mb-3">Today's OI additions/reductions per strike</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={oiDistribution} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
              <XAxis dataKey="strike" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatVolume(v)} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10 }}
                formatter={(value: number) => formatVolume(value)} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground)/0.3)" />
              <Bar dataKey="callChg" name="Call OI Chg" radius={[2, 2, 0, 0]}>
                {oiDistribution.map((entry, idx) => (
                  <Cell key={idx} fill={entry.callChg >= 0 ? 'hsl(var(--destructive)/0.5)' : 'hsl(var(--primary)/0.5)'} />
                ))}
              </Bar>
              <Bar dataKey="putChg" name="Put OI Chg" radius={[2, 2, 0, 0]}>
                {oiDistribution.map((entry, idx) => (
                  <Cell key={idx} fill={entry.putChg >= 0 ? 'hsl(var(--primary)/0.5)' : 'hsl(var(--destructive)/0.5)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* PCR Trend + Net OI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* PCR Trend */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="t-card p-4">
          <p className="text-[11px] font-bold text-foreground mb-1">PCR Trend (10 Sessions)</p>
          <p className="text-[8px] text-muted-foreground mb-3">Put-Call Ratio over recent sessions</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={pcrTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="pcrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
              <XAxis dataKey="session" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} domain={[0.4, 1.8]} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10 }} />
              <ReferenceLine y={1.0} stroke="hsl(var(--accent)/0.5)" strokeDasharray="3 3" label={{ value: 'PCR=1', fontSize: 8, fill: 'hsl(var(--accent))' }} />
              <Area type="monotone" dataKey="pcr" name="PCR" stroke="hsl(var(--primary))" fill="url(#pcrGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Call vs Put OI Trend */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="t-card p-4">
          <p className="text-[11px] font-bold text-foreground mb-1">Call vs Put OI Trend</p>
          <p className="text-[8px] text-muted-foreground mb-3">Total Call & Put OI over sessions</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={pcrTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
              <XAxis dataKey="session" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatVolume(v)} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10 }}
                formatter={(value: number) => formatVolume(value)} />
              <Line type="monotone" dataKey="callOI" name="Call OI" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="putOI" name="Put OI" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* OI Change Heatmap */}
      <OIChangeHeatmap chain={chain} symbol={activeSymbol} />

      {/* Net OI Chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="t-card p-4">
        <p className="text-[11px] font-bold text-foreground mb-1">Net OI (Put - Call) by Strike</p>
        <p className="text-[8px] text-muted-foreground mb-3">Positive = Bullish bias, Negative = Bearish bias</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={oiDistribution} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
            <XAxis dataKey="strike" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatVolume(v)} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10 }}
              formatter={(value: number) => formatVolume(value)} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground)/0.3)" />
            <Bar dataKey="netOI" name="Net OI" radius={[2, 2, 0, 0]}>
              {oiDistribution.map((entry, idx) => (
                <Cell key={idx} fill={entry.netOI >= 0 ? 'hsl(var(--primary)/0.6)' : 'hsl(var(--destructive)/0.6)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
