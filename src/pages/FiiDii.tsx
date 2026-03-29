import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FII_DII_HISTORY, SECTOR_FII_ALLOCATION } from '@/data/mockData';
import { useFiiDiiData } from '@/hooks/useStockData';
import { formatCurrency } from '@/utils/format';

export default function FiiDii() {
  const { data: liveData, isLoading } = useFiiDiiData();
  const [view, setView] = useState<'daily' | 'cumulative'>('daily');

  // Use live data if available, fallback to mock
  const hasLiveData = liveData && !liveData?.error && Array.isArray(liveData);

  const latest = FII_DII_HISTORY[0];
  const combined = latest.fii_net + latest.dii_net;

  return (
    <div className="p-3 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-sm font-bold text-foreground tracking-wide">FII & DII DATA</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Institutional Money Matrix | {hasLiveData ? '● LIVE from NSE' : 'Historical data'}
            {isLoading && <span className="text-terminal-amber animate-pulse ml-1">Loading live...</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-secondary p-0.5 rounded-sm">
            {(['daily', 'cumulative'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-2.5 py-1 rounded-sm text-[9px] font-semibold ${view === v ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {v.toUpperCase()}
              </button>
            ))}
          </div>
          <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${latest.fii_net < 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            {latest.fii_net < 0 ? 'AGGRESSIVE SELLING' : 'NET BUYING'}
          </span>
        </div>
      </div>

      {/* Latest Session */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="t-card p-4 mb-3">
        <p className="text-[9px] text-muted-foreground mb-3">Latest Session: {latest.date}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-[9px] text-muted-foreground mb-1">FII / FPI Net</p>
            <p className={`text-2xl font-bold ${latest.fii_net < 0 ? 'text-destructive' : 'text-primary'}`}>{formatCurrency(latest.fii_net, true)}</p>
            <div className="flex gap-2 mt-1 text-[8px] text-muted-foreground">
              <span>Buy: {formatCurrency(latest.fii_buy, true)}</span>
              <span>Sell: {formatCurrency(latest.fii_sell, true)}</span>
            </div>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground mb-1">DII Net</p>
            <p className={`text-2xl font-bold ${latest.dii_net > 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(latest.dii_net, true)}</p>
            <div className="flex gap-2 mt-1 text-[8px] text-muted-foreground">
              <span>Buy: {formatCurrency(latest.dii_buy, true)}</span>
              <span>Sell: {formatCurrency(latest.dii_sell, true)}</span>
            </div>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground mb-1">Combined Liquidity</p>
            <p className={`text-2xl font-bold ${combined >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(combined, true)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground mb-1">FII Streak</p>
            {(() => {
              let streak = 0;
              const dir = FII_DII_HISTORY[0].fii_net >= 0 ? 'buy' : 'sell';
              for (const row of FII_DII_HISTORY) {
                if ((dir === 'buy' && row.fii_net >= 0) || (dir === 'sell' && row.fii_net < 0)) streak++;
                else break;
              }
              return (
                <>
                  <p className={`text-2xl font-bold ${dir === 'sell' ? 'text-destructive' : 'text-primary'}`}>{streak} Days</p>
                  <p className={`text-[9px] ${dir === 'sell' ? 'text-destructive/60' : 'text-primary/60'}`}>Consecutive {dir === 'sell' ? 'Selling' : 'Buying'}</p>
                </>
              );
            })()}
          </div>
        </div>
      </motion.div>

      {/* Cumulative Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        {(() => {
          const totals = FII_DII_HISTORY.reduce((acc, row) => ({
            fii: acc.fii + row.fii_net,
            dii: acc.dii + row.dii_net,
            fii_buy: acc.fii_buy + row.fii_buy,
            dii_buy: acc.dii_buy + row.dii_buy,
          }), { fii: 0, dii: 0, fii_buy: 0, dii_buy: 0 });

          return [
            { label: 'FII Net (Period)', value: totals.fii, color: totals.fii >= 0 ? 'text-primary' : 'text-destructive' },
            { label: 'DII Net (Period)', value: totals.dii, color: totals.dii >= 0 ? 'text-primary' : 'text-destructive' },
            { label: 'FII Gross Buy', value: totals.fii_buy, color: 'text-terminal-blue' },
            { label: 'DII Gross Buy', value: totals.dii_buy, color: 'text-terminal-cyan' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="t-card p-3">
              <p className="text-[9px] text-muted-foreground mb-1">{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>{formatCurrency(item.value, true)}</p>
            </motion.div>
          ));
        })()}
      </div>

      {/* Bar Chart Visualization */}
      <div className="t-card p-3 mb-3">
        <h3 className="text-[11px] font-semibold text-foreground mb-3">DAILY NET FLOW (FII vs DII)</h3>
        <div className="flex items-end gap-1 h-40">
          {FII_DII_HISTORY.slice().reverse().map((row, i) => {
            const maxVal = Math.max(...FII_DII_HISTORY.map(r => Math.max(Math.abs(r.fii_net), Math.abs(r.dii_net))));
            const fiiH = (Math.abs(row.fii_net) / maxVal) * 100;
            const diiH = (Math.abs(row.dii_net) / maxVal) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div className="flex gap-px w-full justify-center" style={{ height: '100%' }}>
                  <div className={`w-2 rounded-t-sm ${row.fii_net >= 0 ? 'bg-primary/60' : 'bg-destructive/60'}`} style={{ height: `${fiiH}%`, alignSelf: 'flex-end' }} />
                  <div className={`w-2 rounded-t-sm ${row.dii_net >= 0 ? 'bg-terminal-blue/60' : 'bg-terminal-amber/60'}`} style={{ height: `${diiH}%`, alignSelf: 'flex-end' }} />
                </div>
                <span className="text-[7px] text-muted-foreground">{row.date.slice(5)}</span>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-card border border-border rounded p-1.5 text-[8px] z-10 whitespace-nowrap shadow-lg">
                  <p className="text-foreground font-semibold">{row.date}</p>
                  <p className={row.fii_net >= 0 ? 'text-primary' : 'text-destructive'}>FII: {formatCurrency(row.fii_net, true)}</p>
                  <p className={row.dii_net >= 0 ? 'text-terminal-blue' : 'text-terminal-amber'}>DII: {formatCurrency(row.dii_net, true)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center text-[8px]">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-primary/60 rounded-sm" /> FII Buy</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-destructive/60 rounded-sm" /> FII Sell</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-terminal-blue/60 rounded-sm" /> DII Buy</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-terminal-amber/60 rounded-sm" /> DII Sell</div>
        </div>
      </div>

      {/* History Table */}
      <div className="t-card overflow-hidden mb-3">
        <div className="p-2 border-b border-border">
          <h3 className="text-[11px] font-semibold text-foreground">DAILY FLOW HISTORY</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-muted-foreground">Date</th>
                <th className="text-right p-2 text-muted-foreground">FII Buy</th>
                <th className="text-right p-2 text-muted-foreground">FII Sell</th>
                <th className="text-right p-2 text-muted-foreground">FII Net</th>
                <th className="text-right p-2 text-muted-foreground">DII Buy</th>
                <th className="text-right p-2 text-muted-foreground">DII Sell</th>
                <th className="text-right p-2 text-muted-foreground">DII Net</th>
                <th className="text-right p-2 text-muted-foreground">Combined</th>
              </tr>
            </thead>
            <tbody>
              {FII_DII_HISTORY.map((row, i) => {
                const combinedNet = row.fii_net + row.dii_net;
                return (
                  <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                    <td className="p-2 text-muted-foreground">{row.date}</td>
                    <td className="p-2 text-right text-muted-foreground">{formatCurrency(row.fii_buy, true)}</td>
                    <td className="p-2 text-right text-muted-foreground">{formatCurrency(row.fii_sell, true)}</td>
                    <td className={`p-2 text-right font-semibold ${row.fii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(row.fii_net, true)}</td>
                    <td className="p-2 text-right text-muted-foreground">{formatCurrency(row.dii_buy, true)}</td>
                    <td className="p-2 text-right text-muted-foreground">{formatCurrency(row.dii_sell, true)}</td>
                    <td className={`p-2 text-right font-semibold ${row.dii_net >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(row.dii_net, true)}</td>
                    <td className={`p-2 text-right font-semibold ${combinedNet >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(combinedNet, true)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sector Allocation */}
      <div className="t-card p-3">
        <h3 className="text-[11px] font-semibold text-foreground mb-3">SECTOR-WISE FII / FPI ALLOCATION</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {SECTOR_FII_ALLOCATION.map((sec, i) => (
            <div key={i} className="p-2 rounded bg-secondary border border-border/50">
              <p className="text-[9px] text-muted-foreground mb-1">{sec.name}</p>
              <p className="text-[11px] font-bold text-foreground">{sec.fii_pct.toFixed(1)}%</p>
              <div className="h-1.5 bg-background rounded-full mt-1.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(sec.fii_pct, 100)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.03 }}
                  className="h-full bg-terminal-blue rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
