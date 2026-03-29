import React, { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { generateOptionsChain, getStock } from '@/data/mockData';
import { formatCurrency, formatVolume, formatNumber } from '@/utils/format';

const FNO = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BAJFINANCE', 'TATAMOTORS', 'ITC', 'LT'];

interface StrategyLeg {
  type: 'CE' | 'PE';
  action: 'BUY' | 'SELL';
  strike: number;
  premium: number;
  lots: number;
}

const STRATEGIES = [
  { name: 'Bull Call Spread', legs: (atm: number, sd: number) => [
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 0 },
    { type: 'CE' as const, action: 'SELL' as const, strikeOffset: 2 },
  ]},
  { name: 'Bear Put Spread', legs: (atm: number, sd: number) => [
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: 0 },
    { type: 'PE' as const, action: 'SELL' as const, strikeOffset: -2 },
  ]},
  { name: 'Iron Condor', legs: (atm: number, sd: number) => [
    { type: 'CE' as const, action: 'SELL' as const, strikeOffset: 3 },
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 5 },
    { type: 'PE' as const, action: 'SELL' as const, strikeOffset: -3 },
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: -5 },
  ]},
  { name: 'Long Straddle', legs: () => [
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 0 },
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: 0 },
  ]},
  { name: 'Short Straddle', legs: () => [
    { type: 'CE' as const, action: 'SELL' as const, strikeOffset: 0 },
    { type: 'PE' as const, action: 'SELL' as const, strikeOffset: 0 },
  ]},
  { name: 'Long Strangle', legs: () => [
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 3 },
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: -3 },
  ]},
];

function OIBar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-14 h-1.5 bg-background rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export default function OptionsChain() {
  const { symbol: paramSymbol } = useParams();
  const [symbol, setSymbol] = useState(paramSymbol || 'NIFTY');
  const [strikeRange, setStrikeRange] = useState(15);
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'chain' | 'strategy'>('chain');
  const [selectedStrategy, setSelectedStrategy] = useState(0);

  const data = generateOptionsChain(symbol);
  const { chain, underlyingValue, expiryDates, analytics } = data;

  if (!selectedExpiry && expiryDates.length) setSelectedExpiry(expiryDates[0]);

  const atmStrike = chain.reduce((closest, item) =>
    Math.abs(item.strike - underlyingValue) < Math.abs(closest.strike - underlyingValue) ? item : closest, chain[0])?.strike;

  const atmIndex = chain.findIndex(c => c.strike === atmStrike);
  const filtered = atmIndex >= 0 ? chain.slice(Math.max(0, atmIndex - strikeRange), Math.min(chain.length, atmIndex + strikeRange + 1)) : chain;
  const maxOI = Math.max(...filtered.map(c => Math.max(c.ce.oi, c.pe.oi)), 1);
  const maxCallOI = chain.reduce((max, c) => c.ce.oi > (max.ce?.oi || 0) ? c : max, chain[0]);
  const maxPutOI = chain.reduce((max, c) => c.pe.oi > (max.pe?.oi || 0) ? c : max, chain[0]);

  const strikeDiff = chain.length > 1 ? Math.abs(chain[1].strike - chain[0].strike) : 50;

  // Strategy Builder
  const strategyLegs = useMemo(() => {
    const strat = STRATEGIES[selectedStrategy];
    const legDefs = strat.legs(atmStrike, strikeDiff);
    return legDefs.map(leg => {
      const strike = atmStrike + leg.strikeOffset * strikeDiff;
      const row = chain.find(c => c.strike === strike) || chain[atmIndex];
      const premium = leg.type === 'CE' ? row.ce.ltp : row.pe.ltp;
      return { type: leg.type, action: leg.action, strike, premium, lots: 1 } as StrategyLeg;
    });
  }, [selectedStrategy, atmStrike, chain, atmIndex, strikeDiff]);

  const payoffData = useMemo(() => {
    const points: { price: number; pnl: number }[] = [];
    const range = strikeDiff * 15;
    for (let price = underlyingValue - range; price <= underlyingValue + range; price += strikeDiff / 2) {
      let pnl = 0;
      strategyLegs.forEach(leg => {
        const intrinsic = leg.type === 'CE' ? Math.max(price - leg.strike, 0) : Math.max(leg.strike - price, 0);
        const legPnl = leg.action === 'BUY' ? intrinsic - leg.premium : leg.premium - intrinsic;
        pnl += legPnl * leg.lots;
      });
      points.push({ price: Math.round(price), pnl: Math.round(pnl * 100) / 100 });
    }
    return points;
  }, [strategyLegs, underlyingValue, strikeDiff]);

  const maxProfit = Math.max(...payoffData.map(p => p.pnl));
  const maxLoss = Math.min(...payoffData.map(p => p.pnl));
  const breakevens = payoffData.filter((p, i) => i > 0 && (payoffData[i - 1].pnl * p.pnl < 0)).map(p => p.price);
  const netPremium = strategyLegs.reduce((sum, l) => sum + (l.action === 'BUY' ? -l.premium : l.premium), 0);

  return (
    <div className="p-3 max-w-[1800px] mx-auto">
      <div className="t-card overflow-hidden mb-2">
        <div className="flex items-center justify-between px-3 py-2">
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-wide">OPTIONS CHAIN & STRATEGY BUILDER</h1>
            <p className="text-[9px] text-muted-foreground mt-0.5">OI, Max Pain, PCR & Payoff Builder • <a href="https://www.sensibull.com" target="_blank" rel="noopener noreferrer" className="text-terminal-blue hover:underline">Sensibull</a></p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 bg-background rounded p-0.5">
              <button onClick={() => setActiveView('chain')} className={`px-2.5 py-1 rounded text-[9px] font-semibold ${activeView === 'chain' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>CHAIN</button>
              <button onClick={() => setActiveView('strategy')} className={`px-2.5 py-1 rounded text-[9px] font-semibold ${activeView === 'strategy' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>STRATEGY</button>
            </div>
            <Link to={`/stock/${symbol}`} className="t-btn text-[9px]">STOCK</Link>
          </div>
        </div>
      </div>

      {/* Symbol Selector */}
      <div className="t-card px-3 py-2 mb-2">
        <div className="flex gap-1 flex-wrap">
          {FNO.map(s => (
            <button key={s} onClick={() => setSymbol(s)}
              className={`px-2 py-0.5 rounded text-[9px] font-semibold border transition-all ${symbol === s ? 'bg-primary/15 text-primary border-primary/25' : 'bg-background text-muted-foreground border-border hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-px bg-border rounded overflow-hidden mb-2">
        {[
          { label: 'SPOT', value: formatCurrency(underlyingValue), cls: 'text-foreground' },
          { label: 'MAX PAIN', value: formatNumber(analytics.maxPain), cls: 'text-terminal-amber' },
          { label: 'PCR', value: analytics.pcr.toFixed(2), cls: analytics.pcr > 1 ? 'text-primary' : 'text-destructive' },
          { label: 'CALL OI', value: formatVolume(analytics.totalCallOI), cls: 'text-destructive' },
          { label: 'PUT OI', value: formatVolume(analytics.totalPutOI), cls: 'text-primary' },
          { label: 'CALL VOL', value: formatVolume(analytics.totalCallVolume), cls: 'text-muted-foreground' },
          { label: 'PUT VOL', value: formatVolume(analytics.totalPutVolume), cls: 'text-muted-foreground' },
          { label: 'MAX CALL OI', value: formatNumber(maxCallOI?.strike), cls: 'text-destructive' },
        ].map((item, i) => (
          <div key={i} className="bg-card p-2 text-center">
            <p className="text-[8px] text-muted-foreground">{item.label}</p>
            <p className={`text-[11px] font-bold ${item.cls}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {activeView === 'chain' ? (
        <>
          {/* OI Analysis */}
          <div className="t-card px-3 py-2 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-[9px]">
                <span className="text-destructive">MAX CALL OI @ {formatNumber(maxCallOI?.strike)} (RES)</span>
                <span className="text-primary">MAX PUT OI @ {formatNumber(maxPutOI?.strike)} (SUP)</span>
                <span className={analytics.pcr > 1 ? 'text-primary' : 'text-destructive'}>
                  PCR {analytics.pcr > 1.2 ? 'BULLISH' : analytics.pcr > 0.8 ? 'NEUTRAL' : 'BEARISH'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground">STRIKES:</span>
                {[10, 15, 25].map(n => (
                  <button key={n} onClick={() => setStrikeRange(n)}
                    className={`text-[9px] px-1.5 py-0.5 rounded ${strikeRange === n ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Expiry */}
          <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
            {expiryDates.map(exp => (
              <button key={exp} onClick={() => setSelectedExpiry(exp)}
                className={`px-2.5 py-1 rounded text-[9px] font-semibold whitespace-nowrap border transition-all ${selectedExpiry === exp ? 'bg-terminal-blue/15 text-terminal-blue border-terminal-blue/25' : 'bg-card text-muted-foreground border-border hover:text-foreground'}`}>
                {exp}
              </button>
            ))}
          </div>

          {/* Chain Table */}
          <div className="t-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    <th colSpan={5} className="text-center bg-destructive/5 text-destructive border-r border-border py-1">CALLS (CE)</th>
                    <th className="text-center bg-terminal-header text-foreground border-r border-border py-1">STRIKE</th>
                    <th colSpan={5} className="text-center bg-primary/5 text-primary py-1">PUTS (PE)</th>
                  </tr>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-1.5">OI</th><th className="p-1.5">CHG</th><th className="p-1.5">IV</th><th className="p-1.5 border-r border-border">LTP</th><th className="p-1.5 border-r border-border">OI BAR</th>
                    <th className="p-1.5 text-center bg-terminal-header border-r border-border">STRIKE</th>
                    <th className="p-1.5">OI BAR</th><th className="p-1.5">LTP</th><th className="p-1.5">IV</th><th className="p-1.5">CHG</th><th className="p-1.5">OI</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const isATM = row.strike === atmStrike;
                    return (
                      <tr key={i} className={`border-b border-border/30 ${isATM ? 'bg-terminal-amber/5' : 'hover:bg-secondary/30'}`}>
                        <td className="p-1.5 text-right text-muted-foreground">{formatVolume(row.ce.oi)}</td>
                        <td className={`p-1.5 text-right ${row.ce.chg_oi >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatVolume(row.ce.chg_oi)}</td>
                        <td className="p-1.5 text-right text-muted-foreground">{row.ce.iv}%</td>
                        <td className="p-1.5 text-right text-foreground border-r border-border">{row.ce.ltp.toFixed(2)}</td>
                        <td className="p-1.5 border-r border-border"><OIBar value={row.ce.oi} max={maxOI} color="bg-destructive" /></td>
                        <td className={`p-1.5 text-center font-bold border-r border-border ${isATM ? 'text-terminal-amber bg-terminal-amber/10' : 'text-foreground'}`}>
                          {formatNumber(row.strike)}
                        </td>
                        <td className="p-1.5"><OIBar value={row.pe.oi} max={maxOI} color="bg-primary" /></td>
                        <td className="p-1.5 text-right text-foreground">{row.pe.ltp.toFixed(2)}</td>
                        <td className="p-1.5 text-right text-muted-foreground">{row.pe.iv}%</td>
                        <td className={`p-1.5 text-right ${row.pe.chg_oi >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatVolume(row.pe.chg_oi)}</td>
                        <td className="p-1.5 text-right text-muted-foreground">{formatVolume(row.pe.oi)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Strategy Builder */
        <div className="space-y-2">
          <div className="t-card p-3">
            <h3 className="text-[10px] font-semibold text-muted-foreground mb-2 tracking-wide">SELECT STRATEGY</h3>
            <div className="flex gap-1 flex-wrap">
              {STRATEGIES.map((strat, i) => (
                <button key={i} onClick={() => setSelectedStrategy(i)}
                  className={`px-2.5 py-1 rounded text-[9px] font-semibold border transition-all ${selectedStrategy === i ? 'bg-primary/15 text-primary border-primary/25' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}>
                  {strat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Legs */}
          <div className="t-card p-3">
            <h3 className="text-[10px] font-semibold text-muted-foreground mb-2 tracking-wide">{STRATEGIES[selectedStrategy].name} — LEGS</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-1.5 text-left">Action</th><th className="p-1.5 text-left">Type</th><th className="p-1.5 text-right">Strike</th><th className="p-1.5 text-right">Premium</th><th className="p-1.5 text-right">Cost/Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {strategyLegs.map((leg, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className={`p-1.5 font-semibold ${leg.action === 'BUY' ? 'text-primary' : 'text-destructive'}`}>{leg.action}</td>
                      <td className="p-1.5 text-foreground">{leg.type}</td>
                      <td className="p-1.5 text-right text-foreground">{formatNumber(leg.strike)}</td>
                      <td className="p-1.5 text-right text-foreground">₹{leg.premium.toFixed(2)}</td>
                      <td className={`p-1.5 text-right font-semibold ${leg.action === 'BUY' ? 'text-destructive' : 'text-primary'}`}>
                        {leg.action === 'BUY' ? '-' : '+'}₹{leg.premium.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strategy Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="t-card p-2 text-center">
              <p className="text-[8px] text-muted-foreground">Net Premium</p>
              <p className={`text-[12px] font-bold ${netPremium >= 0 ? 'text-primary' : 'text-destructive'}`}>{netPremium >= 0 ? '+' : ''}₹{netPremium.toFixed(2)}</p>
            </div>
            <div className="t-card p-2 text-center">
              <p className="text-[8px] text-muted-foreground">Max Profit</p>
              <p className="text-[12px] font-bold text-primary">{maxProfit === Infinity ? '∞' : `₹${maxProfit.toFixed(2)}`}</p>
            </div>
            <div className="t-card p-2 text-center">
              <p className="text-[8px] text-muted-foreground">Max Loss</p>
              <p className="text-[12px] font-bold text-destructive">₹{Math.abs(maxLoss).toFixed(2)}</p>
            </div>
            <div className="t-card p-2 text-center">
              <p className="text-[8px] text-muted-foreground">Breakeven</p>
              <p className="text-[12px] font-bold text-terminal-amber">{breakevens.map(b => formatNumber(b)).join(', ') || '—'}</p>
            </div>
          </div>

          {/* Payoff Chart */}
          <div className="t-card p-3">
            <h3 className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-wide">PAYOFF DIAGRAM</h3>
            <div className="h-48 flex items-end gap-px">
              {payoffData.map((point, i) => {
                const maxAbs = Math.max(Math.abs(maxProfit), Math.abs(maxLoss)) || 1;
                const normalizedPnl = point.pnl / maxAbs;
                const isPositive = point.pnl >= 0;
                const height = Math.abs(normalizedPnl) * 45;
                const isSpot = Math.abs(point.price - underlyingValue) < strikeDiff;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                    {/* Bar */}
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: '90%' }}>
                      <div className="w-full flex flex-col justify-end items-center" style={{ height: '50%' }}>
                        {isPositive && (
                          <div
                            className={`w-full rounded-t-sm ${isSpot ? 'bg-terminal-amber' : 'bg-primary/60'}`}
                            style={{ height: `${height}%` }}
                          />
                        )}
                      </div>
                      <div className="w-full h-px bg-border/50" />
                      <div className="w-full flex flex-col justify-start items-center" style={{ height: '50%' }}>
                        {!isPositive && (
                          <div
                            className={`w-full rounded-b-sm ${isSpot ? 'bg-terminal-amber' : 'bg-destructive/60'}`}
                            style={{ height: `${height}%` }}
                          />
                        )}
                      </div>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-card border border-border rounded px-1.5 py-0.5 text-[8px] text-foreground whitespace-nowrap z-10">
                      {point.price}: {point.pnl >= 0 ? '+' : ''}₹{point.pnl.toFixed(0)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
              <span>{payoffData[0]?.price}</span>
              <span className="text-terminal-amber">SPOT: {formatNumber(Math.round(underlyingValue))}</span>
              <span>{payoffData[payoffData.length - 1]?.price}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
