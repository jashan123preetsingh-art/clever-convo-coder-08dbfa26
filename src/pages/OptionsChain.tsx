import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useOptionsChain } from '@/hooks/useStockData';
import { formatCurrency, formatVolume, formatNumber } from '@/utils/format';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Loader2, Sparkles, Target, Search } from 'lucide-react';

const FNO = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BAJFINANCE', 'TATAMOTORS', 'ITC', 'LT'];

const LOT_SIZES: Record<string, number> = {
  NIFTY: 25, BANKNIFTY: 15, RELIANCE: 250, TCS: 150, HDFCBANK: 550,
  INFY: 400, ICICIBANK: 700, SBIN: 1500, BAJFINANCE: 125, TATAMOTORS: 1400, ITC: 1600, LT: 150,
};

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface StrategyLeg {
  id: string;
  type: 'CE' | 'PE';
  action: 'BUY' | 'SELL';
  strike: number;
  premium: number;
  lots: number;
}

const PRESET_STRATEGIES = [
  // ── BULLISH ──
  { name: 'Bull Call Spread', category: 'Bullish', desc: 'Buy ITM/ATM CE, Sell OTM CE — limited risk bullish', legs: () => [
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 0 },
    { type: 'CE' as const, action: 'SELL' as const, strikeOffset: 3 },
  ]},
  { name: 'Bull Put Spread', category: 'Bullish', desc: 'Sell ATM PE, Buy OTM PE — credit spread', legs: () => [
    { type: 'PE' as const, action: 'SELL' as const, strikeOffset: 0 },
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: -3 },
  ]},
  { name: 'Call Ratio Back Spread', category: 'Bullish', desc: 'Sell 1 ATM CE, Buy 2 OTM CE — explosive upside', legs: () => [
    { type: 'CE' as const, action: 'SELL' as const, strikeOffset: 0, lots: 1 },
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 3, lots: 2 },
  ]},
  // ── BEARISH ──
  { name: 'Bear Put Spread', category: 'Bearish', desc: 'Buy ATM PE, Sell OTM PE — limited risk bearish', legs: () => [
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: 0 },
    { type: 'PE' as const, action: 'SELL' as const, strikeOffset: -3 },
  ]},
  { name: 'Bear Call Spread', category: 'Bearish', desc: 'Sell ATM CE, Buy OTM CE — credit spread', legs: () => [
    { type: 'CE' as const, action: 'SELL' as const, strikeOffset: 0 },
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 3 },
  ]},
  { name: 'Put Ratio Back Spread', category: 'Bearish', desc: 'Sell 1 ATM PE, Buy 2 OTM PE — explosive downside', legs: () => [
    { type: 'PE' as const, action: 'SELL' as const, strikeOffset: 0, lots: 1 },
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: -3, lots: 2 },
  ]},
  // ── NEUTRAL ──
  { name: 'Iron Condor', category: 'Neutral', desc: 'Sell OTM CE+PE, Buy further OTM wings — range-bound', legs: () => [
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: -6 },
    { type: 'PE' as const, action: 'SELL' as const, strikeOffset: -3 },
    { type: 'CE' as const, action: 'SELL' as const, strikeOffset: 3 },
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 6 },
  ]},
  { name: 'Short Straddle', category: 'Neutral', desc: 'Sell ATM CE + PE — max theta decay', legs: () => [
    { type: 'CE' as const, action: 'SELL' as const, strikeOffset: 0 },
    { type: 'PE' as const, action: 'SELL' as const, strikeOffset: 0 },
  ]},
  { name: 'Short Strangle', category: 'Neutral', desc: 'Sell OTM CE + PE — wider breakeven', legs: () => [
    { type: 'CE' as const, action: 'SELL' as const, strikeOffset: 3 },
    { type: 'PE' as const, action: 'SELL' as const, strikeOffset: -3 },
  ]},
  { name: 'Iron Butterfly', category: 'Neutral', desc: 'Sell ATM straddle, buy OTM wings — capped risk', legs: () => [
    { type: 'CE' as const, action: 'SELL' as const, strikeOffset: 0 },
    { type: 'PE' as const, action: 'SELL' as const, strikeOffset: 0 },
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 5 },
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: -5 },
  ]},
  { name: 'Jade Lizard', category: 'Neutral', desc: 'Short put + short call spread — no upside risk', legs: () => [
    { type: 'PE' as const, action: 'SELL' as const, strikeOffset: -2 },
    { type: 'CE' as const, action: 'SELL' as const, strikeOffset: 3 },
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 5 },
  ]},
  // ── VOLATILITY ──
  { name: 'Long Straddle', category: 'Volatility', desc: 'Buy ATM CE + PE — big move expected', legs: () => [
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 0 },
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: 0 },
  ]},
  { name: 'Long Strangle', category: 'Volatility', desc: 'Buy OTM CE + PE — cheaper big move bet', legs: () => [
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 3 },
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: -3 },
  ]},
  { name: 'Strip', category: 'Volatility', desc: 'Buy 1 ATM CE + 2 ATM PE — bearish bias volatility', legs: () => [
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 0, lots: 1 },
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: 0, lots: 2 },
  ]},
  { name: 'Strap', category: 'Volatility', desc: 'Buy 2 ATM CE + 1 ATM PE — bullish bias volatility', legs: () => [
    { type: 'CE' as const, action: 'BUY' as const, strikeOffset: 0, lots: 2 },
    { type: 'PE' as const, action: 'BUY' as const, strikeOffset: 0, lots: 1 },
  ]},
];

function OIBar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-16 h-1.5 bg-background rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export default function OptionsChain() {
  const { symbol: paramSymbol } = useParams();
  const [symbol, setSymbol] = useState(paramSymbol || 'NIFTY');
  const [strikeRange, setStrikeRange] = useState(15);
  const [activeView, setActiveView] = useState<'chain' | 'strategy' | 'custom' | 'ai'>('chain');

  // Preset strategy
  const [selectedPreset, setSelectedPreset] = useState(0);

  // Custom strategy builder
  const [customLegs, setCustomLegs] = useState<StrategyLeg[]>([]);

  // AI Strategy state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [riskReward, setRiskReward] = useState('1:2');
  const [optionsTradeType, setOptionsTradeType] = useState('all');

  // ── Live API data ──
  const { data: apiData, isLoading, isError, dataUpdatedAt } = useOptionsChain(symbol);

  // Generate realistic fallback chain using Black-Scholes approximation
  const fallbackData = useMemo(() => {
    const spotPrices: Record<string, number> = {
      NIFTY: 22650, BANKNIFTY: 51400, RELIANCE: 1280, TCS: 3450, HDFCBANK: 1820,
      INFY: 1520, ICICIBANK: 1350, SBIN: 780, BAJFINANCE: 8200, TATAMOTORS: 650, ITC: 430, LT: 3400,
    };
    const lotSizes: Record<string, number> = {
      NIFTY: 25, BANKNIFTY: 15, RELIANCE: 250, TCS: 150, HDFCBANK: 550,
      INFY: 400, ICICIBANK: 700, SBIN: 1500, BAJFINANCE: 125, TATAMOTORS: 1400, ITC: 1600, LT: 150,
    };
    const spot = spotPrices[symbol] || 1000;
    const strikeDiff = symbol === 'NIFTY' ? 50 : symbol === 'BANKNIFTY' ? 100 : Math.max(5, Math.round(spot * 0.01 / 5) * 5);
    const atmStrike = Math.round(spot / strikeDiff) * strikeDiff;
    const T = 7 / 365; // ~7 days to expiry (weekly)
    const r = 0.065; // risk-free rate
    const baseIV = symbol === 'NIFTY' ? 0.13 : symbol === 'BANKNIFTY' ? 0.16 : 0.25;

    // Simple Black-Scholes approximation
    const normCDF = (x: number) => { const t = 1 / (1 + 0.2316419 * Math.abs(x)); const d = 0.3989423 * Math.exp(-x * x / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };
    const bsCall = (S: number, K: number, vol: number) => {
      if (vol <= 0 || T <= 0) return Math.max(S - K, 0);
      const d1 = (Math.log(S / K) + (r + vol * vol / 2) * T) / (vol * Math.sqrt(T));
      const d2 = d1 - vol * Math.sqrt(T);
      return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
    };
    const bsPut = (S: number, K: number, vol: number) => bsCall(S, K, vol) - S + K * Math.exp(-r * T);

    // Seed-based pseudo-random for consistency within symbol
    let seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const seededRand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

    const strikes: any[] = [];
    for (let i = -20; i <= 20; i++) {
      const strike = atmStrike + i * strikeDiff;
      if (strike <= 0) continue;
      const dist = Math.abs(i);
      // IV smile: higher IV for OTM options
      const ivSmile = baseIV * (1 + 0.008 * dist * dist);
      const ceIV = ivSmile * (0.95 + seededRand() * 0.1);
      const peIV = ivSmile * (0.95 + seededRand() * 0.1);

      const ceLTP = Math.max(0.05, Math.round(bsCall(spot, strike, ceIV) * 100) / 100);
      const peLTP = Math.max(0.05, Math.round(bsPut(spot, strike, peIV) * 100) / 100);

      // Realistic OI: peaks at round numbers, higher for OTM, bell-curve near ATM
      const roundBonus = strike % (strikeDiff * 5) === 0 ? 2.5 : 1;
      const ceOIBase = dist <= 2 ? 80000 : dist <= 5 ? 120000 : dist <= 10 ? 60000 : 20000;
      const peOIBase = dist <= 2 ? 70000 : dist <= 5 ? 110000 : dist <= 10 ? 55000 : 18000;
      // Calls have more OI above spot, puts below
      const ceBias = i > 0 ? 1.5 : 0.6;
      const peBias = i < 0 ? 1.5 : 0.6;
      const ceOI = Math.round(ceOIBase * ceBias * roundBonus * (0.7 + seededRand() * 0.6));
      const peOI = Math.round(peOIBase * peBias * roundBonus * (0.7 + seededRand() * 0.6));
      const ceVol = Math.round(ceOI * (0.05 + seededRand() * 0.15));
      const peVol = Math.round(peOI * (0.05 + seededRand() * 0.15));

      strikes.push({
        strike,
        ce: { oi: ceOI, chg_oi: Math.round((seededRand() - 0.45) * ceOI * 0.05), volume: ceVol, iv: Math.round(ceIV * 10000) / 100, ltp: ceLTP, change: Math.round((seededRand() - 0.5) * ceLTP * 0.15 * 100) / 100, bid: Math.round((ceLTP * 0.98) * 100) / 100, ask: Math.round((ceLTP * 1.02) * 100) / 100 },
        pe: { oi: peOI, chg_oi: Math.round((seededRand() - 0.45) * peOI * 0.05), volume: peVol, iv: Math.round(peIV * 10000) / 100, ltp: peLTP, change: Math.round((seededRand() - 0.5) * peLTP * 0.15 * 100) / 100, bid: Math.round((peLTP * 0.98) * 100) / 100, ask: Math.round((peLTP * 1.02) * 100) / 100 },
      });
    }

    // Max Pain calculation
    let minPain = Infinity, maxPainStrike = atmStrike;
    for (const row of strikes) {
      let pain = 0;
      for (const r of strikes) {
        if (r.strike < row.strike) pain += r.ce.oi * (row.strike - r.strike);
        if (r.strike > row.strike) pain += r.pe.oi * (r.strike - row.strike);
      }
      if (pain < minPain) { minPain = pain; maxPainStrike = row.strike; }
    }

    const totalCallOI = strikes.reduce((s, r) => s + r.ce.oi, 0);
    const totalPutOI = strikes.reduce((s, r) => s + r.pe.oi, 0);
    const totalCallVol = strikes.reduce((s, r) => s + r.ce.volume, 0);
    const totalPutVol = strikes.reduce((s, r) => s + r.pe.volume, 0);

    // Generate realistic expiry dates (next 4 Thursdays)
    const expiries: string[] = [];
    const d = new Date();
    for (let w = 0; w < 4; w++) {
      const target = new Date(d);
      target.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7) + w * 7);
      expiries.push(target.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
    }

    return {
      chain: strikes, underlyingValue: spot, expiryDates: expiries,
      timestamp: new Date().toLocaleString('en-IN'),
      analytics: { totalCallOI, totalPutOI, pcr: Math.round(totalPutOI / totalCallOI * 100) / 100, maxPain: maxPainStrike, totalCallVol, totalPutVol },
      live: false,
    };
  }, [symbol]);

  const effectiveData = (apiData && apiData.chain && apiData.chain.length > 0) ? apiData : fallbackData;
  const chain = effectiveData?.chain || [];
  const underlyingValue = effectiveData?.underlyingValue || 0;
  const expiryDates = effectiveData?.expiryDates || [];
  const analytics = effectiveData?.analytics || { totalCallOI: 0, totalPutOI: 0, pcr: 0, maxPain: 0, totalCallVol: 0, totalPutVol: 0 };
  const isLive = effectiveData?.live === true;
  const timestamp = effectiveData?.timestamp || '';

  const atmStrike = chain.length > 0 ? chain.reduce((closest: any, item: any) =>
    Math.abs(item.strike - underlyingValue) < Math.abs(closest.strike - underlyingValue) ? item : closest, chain[0])?.strike : 0;

  const atmIndex = chain.findIndex((c: any) => c.strike === atmStrike);
  const filtered = atmIndex >= 0 ? chain.slice(Math.max(0, atmIndex - strikeRange), Math.min(chain.length, atmIndex + strikeRange + 1)) : chain;
  const maxOI = Math.max(...filtered.map((c: any) => Math.max(c.ce.oi, c.pe.oi)), 1);
  const maxCallOI = chain.length > 0 ? chain.reduce((max: any, c: any) => c.ce.oi > (max.ce?.oi || 0) ? c : max, chain[0]) : null;
  const maxPutOI = chain.length > 0 ? chain.reduce((max: any, c: any) => c.pe.oi > (max.pe?.oi || 0) ? c : max, chain[0]) : null;
  const strikeDiff = chain.length > 1 ? Math.abs(chain[1].strike - chain[0].strike) : 50;

  const strikes = chain.map((c: any) => c.strike);

  // ── Preset strategy legs ──
  const presetLegs = useMemo(() => {
    if (chain.length === 0 || atmIndex < 0) return [];
    const strat = PRESET_STRATEGIES[selectedPreset];
    const legDefs = strat.legs();
    return legDefs.map((leg: any, i: number) => {
      const strike = atmStrike + leg.strikeOffset * strikeDiff;
      const row = chain.find((c: any) => c.strike === strike) || chain[atmIndex];
      const premium = leg.type === 'CE' ? row.ce.ltp : row.pe.ltp;
      return { id: `preset-${i}`, type: leg.type, action: leg.action, strike, premium, lots: leg.lots || 1 } as StrategyLeg;
    });
  }, [selectedPreset, atmStrike, chain, atmIndex, strikeDiff]);

  const activeLegs = activeView === 'custom' ? customLegs : presetLegs;

  const lotSize = LOT_SIZES[symbol] || 25;

  // ── Payoff calculation (in ₹, lot-size aware) ──
  const payoffData = useMemo(() => {
    if (activeLegs.length === 0) return [];
    const points: { price: number; pnl: number }[] = [];
    const range = strikeDiff * 15;
    const step = strikeDiff / 4; // finer resolution
    for (let price = underlyingValue - range; price <= underlyingValue + range; price += step) {
      let pnl = 0;
      activeLegs.forEach(leg => {
        const intrinsic = leg.type === 'CE' ? Math.max(price - leg.strike, 0) : Math.max(leg.strike - price, 0);
        const legPnl = leg.action === 'BUY' ? intrinsic - leg.premium : leg.premium - intrinsic;
        pnl += legPnl * leg.lots * lotSize;
      });
      points.push({ price: Math.round(price), pnl: Math.round(pnl) });
    }
    return points;
  }, [activeLegs, underlyingValue, strikeDiff, lotSize]);

  const maxProfit = payoffData.length > 0 ? Math.max(...payoffData.map(p => p.pnl)) : 0;
  const maxLoss = payoffData.length > 0 ? Math.min(...payoffData.map(p => p.pnl)) : 0;
  const breakevens = useMemo(() => {
    if (payoffData.length === 0) return [];
    const pnlRange = Math.max(Math.abs(maxProfit), Math.abs(maxLoss), 1);
    // Ignore zero crossings that are just noise (< 1% of P&L range)
    const noiseThreshold = pnlRange * 0.01;

    const rawBks: number[] = [];
    for (let i = 1; i < payoffData.length; i++) {
      const prev = payoffData[i - 1];
      const curr = payoffData[i];
      // Only count crossings where at least one side has meaningful P&L
      if (prev.pnl * curr.pnl < 0 && (Math.abs(prev.pnl) > noiseThreshold || Math.abs(curr.pnl) > noiseThreshold)) {
        const ratio = Math.abs(prev.pnl) / (Math.abs(prev.pnl) + Math.abs(curr.pnl));
        const exact = prev.price + ratio * (curr.price - prev.price);
        rawBks.push(Math.round(exact));
      }
    }

    // Deduplicate: merge breakevens within 1 strike distance
    const deduped: number[] = [];
    for (const bk of rawBks) {
      if (deduped.length === 0 || Math.abs(bk - deduped[deduped.length - 1]) > strikeDiff * 0.8) {
        deduped.push(bk);
      }
    }
    return deduped;
  }, [payoffData, maxProfit, maxLoss, strikeDiff]);
  const netPremium = activeLegs.reduce((sum, l) => sum + (l.action === 'BUY' ? -l.premium : l.premium) * l.lots * lotSize, 0);

  // ── Custom leg management ──
  const addCustomLeg = useCallback(() => {
    if (chain.length === 0) return;
    const row = chain[atmIndex];
    setCustomLegs(prev => [...prev, {
      id: Date.now().toString(),
      type: 'CE',
      action: 'BUY',
      strike: atmStrike,
      premium: row.ce.ltp,
      lots: 1,
    }]);
  }, [atmStrike, chain, atmIndex]);

  const updateCustomLeg = useCallback((id: string, updates: Partial<StrategyLeg>) => {
    setCustomLegs(prev => prev.map(leg => {
      if (leg.id !== id) return leg;
      const updated = { ...leg, ...updates };
      if (updates.strike !== undefined || updates.type !== undefined) {
        const row = chain.find((c: any) => c.strike === updated.strike);
        if (row) {
          updated.premium = updated.type === 'CE' ? row.ce.ltp : row.pe.ltp;
        }
      }
      return updated;
    }));
  }, [chain]);

  const removeCustomLeg = useCallback((id: string) => {
    setCustomLegs(prev => prev.filter(l => l.id !== id));
  }, []);

  const loadPresetToCustom = useCallback((presetIdx: number) => {
    if (chain.length === 0) return;
    const strat = PRESET_STRATEGIES[presetIdx];
    const legDefs = strat.legs();
    const newLegs = legDefs.map((leg: any, i: number) => {
      const strike = atmStrike + leg.strikeOffset * strikeDiff;
      const row = chain.find((c: any) => c.strike === strike) || chain[atmIndex];
      const premium = leg.type === 'CE' ? row.ce.ltp : row.pe.ltp;
      return { id: `custom-${Date.now()}-${i}`, type: leg.type, action: leg.action, strike, premium, lots: leg.lots || 1 } as StrategyLeg;
    });
    setCustomLegs(newLegs);
  }, [atmStrike, strikeDiff, chain, atmIndex]);

  // ── AI Strategy ──
  const runAiStrategy = async () => {
    if (!symbol.trim()) { toast.error('Select a symbol first'); return; }
    setAiLoading(true);
    setAiResult(null);
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/trading-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase().trim(),
          mode: 'options',
          optionsConfig: { riskReward, tradeType: optionsTradeType },
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error('AI is busy. Please wait 30 seconds and try again.', { duration: 6000 });
        } else if (resp.status === 402) {
          toast.error('AI credits temporarily unavailable.', { duration: 6000 });
        } else {
          toast.error('AI analysis failed. Please try again.');
        }
        return;
      }

      const data = await resp.json();
      // Combine all agent outputs into a single report
      const agents = data.agents || {};
      let report = '';
      const agentOrder = ['oiAnalysis', 'greeksIV', 'technical', 'strategy', 'riskAssessment', 'optionsTrader'];
      const labels: Record<string, string> = {
        oiAnalysis: '📊 Market & OI Analysis',
        greeksIV: '🔬 Greeks & IV',
        technical: '🎯 Strike Selection',
        strategy: '🏗️ Strategy Builder',
        riskAssessment: '🛡️ Risk Assessment',
        optionsTrader: '💎 Strategy & Trade Decision',
      };
      for (const key of agentOrder) {
        if (agents[key]) {
          report += `## ${labels[key] || key}\n\n${agents[key]}\n\n---\n\n`;
        }
      }
      setAiResult(report || 'No analysis generated.');
      toast.success(`AI Options analysis complete for ${symbol}`);
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setAiLoading(false);
    }
  };

  // Last updated time display
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

  return (
    <div className="p-3 max-w-[1800px] mx-auto">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-sm font-bold text-foreground tracking-wide">OPTIONS DESK</h1>
          <p className="text-[9px] text-muted-foreground">
            Chain, OI Analysis & Strategy Builder
            {isLive && <span className="ml-2 text-primary">● Live</span>}
            {lastUpdated && <span className="ml-2 text-muted-foreground/60">Updated {lastUpdated}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(['chain', 'strategy', 'custom', 'ai'] as const).map(view => (
            <button key={view} onClick={() => setActiveView(view)}
              className={`px-3 py-1.5 rounded text-[10px] font-semibold border transition-all
                ${activeView === view ? 'bg-primary/15 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}>
              {view === 'chain' ? '📊 CHAIN' : view === 'strategy' ? '📐 PRESETS' : view === 'custom' ? '🔧 CUSTOM' : '🤖 AI STRATEGY'}
            </button>
          ))}
          <Link to={`/stock/${symbol}`} className="t-btn text-[9px] ml-1">STOCK →</Link>
        </div>
      </div>

      {/* ── Symbol selector ── */}
      <div className="flex gap-1 flex-wrap mb-2">
        {FNO.map(s => (
          <button key={s} onClick={() => setSymbol(s)}
            className={`px-2.5 py-1 rounded text-[9px] font-semibold border transition-all
              ${symbol === s ? 'bg-primary/15 text-primary border-primary/25' : 'bg-card text-muted-foreground border-border/50 hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && !effectiveData?.chain?.length && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Loading options data...</span>
        </div>
      )}

      {!isLive && chain.length > 0 && (
        <div className="text-center py-1 mb-1">
          <span className="text-[9px] text-muted-foreground/60 bg-secondary/50 px-2 py-0.5 rounded">
            Showing estimated data · Live NSE feed unavailable
          </span>
        </div>
      )}

      {chain.length > 0 && (
        <>
          {/* ── Analytics strip ── */}
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-px bg-border rounded overflow-hidden mb-2">
            {[
              { label: 'SPOT', value: formatCurrency(underlyingValue), cls: 'text-foreground' },
              { label: 'MAX PAIN', value: formatNumber(analytics.maxPain), cls: 'text-[hsl(var(--terminal-amber))]' },
              { label: 'PCR', value: analytics.pcr.toFixed(2), cls: analytics.pcr > 1 ? 'text-primary' : 'text-destructive' },
              { label: 'CALL OI', value: formatVolume(analytics.totalCallOI), cls: 'text-destructive' },
              { label: 'PUT OI', value: formatVolume(analytics.totalPutOI), cls: 'text-primary' },
              { label: 'MAX CALL OI', value: formatNumber(maxCallOI?.strike), cls: 'text-destructive' },
              { label: 'MAX PUT OI', value: formatNumber(maxPutOI?.strike), cls: 'text-primary' },
              { label: 'SIGNAL', value: analytics.pcr > 1.2 ? 'BULLISH' : analytics.pcr > 0.8 ? 'NEUTRAL' : 'BEARISH',
                cls: analytics.pcr > 1.2 ? 'text-primary' : analytics.pcr > 0.8 ? 'text-[hsl(var(--terminal-amber))]' : 'text-destructive' },
            ].map((item, i) => (
              <div key={i} className="bg-card p-2 text-center">
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className={`text-[11px] font-bold ${item.cls}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* ══════════════════ CHAIN VIEW ══════════════════ */}
          {activeView === 'chain' && (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-4 text-[9px]">
                  <span className="text-destructive font-medium">Resistance @ {formatNumber(maxCallOI?.strike)}</span>
                  <span className="text-primary font-medium">Support @ {formatNumber(maxPutOI?.strike)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-muted-foreground">Strikes:</span>
                  {[10, 15, 25].map(n => (
                    <button key={n} onClick={() => setStrikeRange(n)}
                      className={`text-[9px] px-2 py-0.5 rounded transition-all ${strikeRange === n ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="t-card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th colSpan={5} className="text-center bg-destructive/5 text-destructive border-r border-border py-1.5 text-[9px]">CALLS (CE)</th>
                        <th className="text-center bg-secondary/50 text-foreground border-r border-border py-1.5 text-[9px]">STRIKE</th>
                        <th colSpan={5} className="text-center bg-primary/5 text-primary py-1.5 text-[9px]">PUTS (PE)</th>
                      </tr>
                      <tr className="border-b border-border text-muted-foreground text-[8px]">
                        <th className="p-1.5 text-right">OI</th><th className="p-1.5 text-right">CHG</th><th className="p-1.5 text-right">IV</th><th className="p-1.5 text-right border-r border-border/50">LTP</th><th className="p-1.5 border-r border-border">BAR</th>
                        <th className="p-1.5 text-center bg-secondary/30 border-r border-border font-bold">STRIKE</th>
                        <th className="p-1.5">BAR</th><th className="p-1.5 text-right">LTP</th><th className="p-1.5 text-right">IV</th><th className="p-1.5 text-right">CHG</th><th className="p-1.5 text-right">OI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row: any, i: number) => {
                        const isATM = row.strike === atmStrike;
                        const isITMCall = row.strike < underlyingValue;
                        return (
                          <tr key={i} className={`border-b border-border/20 transition-colors
                            ${isATM ? 'bg-[hsl(var(--terminal-amber))]/8' : 'hover:bg-secondary/20'}
                            ${isITMCall ? 'bg-destructive/3' : ''}`}>
                            <td className="p-1.5 text-right text-muted-foreground">{formatVolume(row.ce.oi)}</td>
                            <td className={`p-1.5 text-right ${row.ce.chg_oi >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatVolume(row.ce.chg_oi)}</td>
                            <td className="p-1.5 text-right text-muted-foreground">{row.ce.iv ? `${row.ce.iv}%` : '—'}</td>
                            <td className="p-1.5 text-right text-foreground font-medium border-r border-border/50">{row.ce.ltp.toFixed(2)}</td>
                            <td className="p-1.5 border-r border-border"><OIBar value={row.ce.oi} max={maxOI} color="bg-destructive/70" /></td>
                            <td className={`p-1.5 text-center font-bold border-r border-border text-[11px]
                              ${isATM ? 'text-[hsl(var(--terminal-amber))] bg-[hsl(var(--terminal-amber))]/10' : 'text-foreground bg-secondary/20'}`}>
                              {formatNumber(row.strike)}
                            </td>
                            <td className="p-1.5"><OIBar value={row.pe.oi} max={maxOI} color="bg-primary/70" /></td>
                            <td className="p-1.5 text-right text-foreground font-medium">{row.pe.ltp.toFixed(2)}</td>
                            <td className="p-1.5 text-right text-muted-foreground">{row.pe.iv ? `${row.pe.iv}%` : '—'}</td>
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
          )}

          {/* ══════════════════ PRESET STRATEGY VIEW ══════════════════ */}
          {activeView === 'strategy' && (
            <div className="space-y-2">
              <div className="t-card">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">Select Strategy</p>
                {['Bullish', 'Bearish', 'Neutral', 'Volatility'].map(cat => {
                  const strats = PRESET_STRATEGIES.map((s, i) => ({ ...s, idx: i })).filter(s => s.category === cat);
                  if (strats.length === 0) return null;
                  const catColors: Record<string, string> = { Bullish: 'text-primary', Bearish: 'text-destructive', Neutral: 'text-accent', Volatility: 'text-yellow-400' };
                  return (
                    <div key={cat} className="mb-2.5">
                      <p className={`text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5 ${catColors[cat] || 'text-muted-foreground'}`}>{cat}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                        {strats.map(strat => (
                          <button key={strat.idx} onClick={() => setSelectedPreset(strat.idx)}
                            className={`text-left px-3 py-2 rounded border transition-all
                              ${selectedPreset === strat.idx ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'}`}>
                            <p className="text-[10px] font-semibold">{strat.name}</p>
                            <p className="text-[8px] opacity-70 mt-0.5">{strat.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <StrategyDisplay legs={activeLegs} netPremium={netPremium} maxProfit={maxProfit} maxLoss={maxLoss}
                breakevens={breakevens} payoffData={payoffData} underlyingValue={underlyingValue} strikeDiff={strikeDiff} lotSize={lotSize} symbol={symbol} />
            </div>
          )}

          {/* ══════════════════ CUSTOM STRATEGY BUILDER ══════════════════ */}
          {activeView === 'custom' && (
            <div className="space-y-2">
              <div className="t-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Custom Strategy Builder</p>
                  <span className="text-[8px] text-muted-foreground">Build any multi-leg strategy</span>
                </div>

                <div className="flex gap-1 flex-wrap mb-3">
                  <span className="text-[8px] text-muted-foreground self-center mr-1">Load preset:</span>
                  {PRESET_STRATEGIES.map((s, i) => (
                    <button key={i} onClick={() => loadPresetToCustom(i)}
                      className="px-2 py-0.5 rounded text-[8px] bg-secondary text-muted-foreground border border-border/50 hover:text-foreground hover:border-border transition-all">
                      {s.name}
                    </button>
                  ))}
                </div>

                {customLegs.length > 0 ? (
                  <div className="overflow-x-auto mb-3">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-[8px]">
                          <th className="p-1.5 text-left">Action</th>
                          <th className="p-1.5 text-left">Type</th>
                          <th className="p-1.5 text-left">Strike</th>
                          <th className="p-1.5 text-right">Premium</th>
                          <th className="p-1.5 text-right">Lots</th>
                          <th className="p-1.5 text-right">Cost/Credit</th>
                          <th className="p-1.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {customLegs.map(leg => (
                          <tr key={leg.id} className="border-b border-border/20">
                            <td className="p-1.5">
                              <select value={leg.action} onChange={e => updateCustomLeg(leg.id, { action: e.target.value as 'BUY' | 'SELL' })}
                                className={`bg-transparent border border-border rounded px-2 py-1 text-[10px] font-semibold focus:outline-none focus:border-primary/50 ${leg.action === 'BUY' ? 'text-primary' : 'text-destructive'}`}>
                                <option value="BUY">BUY</option>
                                <option value="SELL">SELL</option>
                              </select>
                            </td>
                            <td className="p-1.5">
                              <select value={leg.type} onChange={e => updateCustomLeg(leg.id, { type: e.target.value as 'CE' | 'PE' })}
                                className="bg-transparent border border-border rounded px-2 py-1 text-[10px] text-foreground focus:outline-none focus:border-primary/50">
                                <option value="CE">CE (Call)</option>
                                <option value="PE">PE (Put)</option>
                              </select>
                            </td>
                            <td className="p-1.5">
                              <select value={leg.strike} onChange={e => updateCustomLeg(leg.id, { strike: Number(e.target.value) })}
                                className="bg-transparent border border-border rounded px-2 py-1 text-[10px] text-foreground focus:outline-none focus:border-primary/50 max-h-48">
                                {strikes.map((s: number) => (
                                  <option key={s} value={s}>{formatNumber(s)} {s === atmStrike ? '(ATM)' : ''}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-1.5 text-right text-foreground">₹{leg.premium.toFixed(2)}</td>
                            <td className="p-1.5 text-right">
                              <input type="number" min={1} max={100} value={leg.lots}
                                onChange={e => updateCustomLeg(leg.id, { lots: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="bg-transparent border border-border rounded px-2 py-1 text-[10px] text-foreground w-14 text-right focus:outline-none focus:border-primary/50" />
                            </td>
                            <td className={`p-1.5 text-right font-semibold ${leg.action === 'BUY' ? 'text-destructive' : 'text-primary'}`}>
                              {leg.action === 'BUY' ? '-' : '+'}₹{(leg.premium * leg.lots * lotSize).toFixed(0)}
                            </td>
                            <td className="p-1.5">
                              <button onClick={() => removeCustomLeg(leg.id)} className="text-destructive/60 hover:text-destructive text-sm transition-colors">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-[10px]">
                    No legs added yet. Click "Add Leg" or load a preset above.
                  </div>
                )}

                <button onClick={addCustomLeg}
                  className="px-4 py-1.5 rounded text-[10px] font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                  + Add Leg
                </button>
              </div>

              {customLegs.length > 0 && (
                <StrategyDisplay legs={activeLegs} netPremium={netPremium} maxProfit={maxProfit} maxLoss={maxLoss}
                  breakevens={breakevens} payoffData={payoffData} underlyingValue={underlyingValue} strikeDiff={strikeDiff} lotSize={lotSize} symbol={symbol} />
              )}
            </div>
          )}

          {/* ══════════════════ AI STRATEGY VIEW ══════════════════ */}
          {activeView === 'ai' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-card/50 border border-[hsl(var(--terminal-purple))]/20 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-[hsl(var(--terminal-purple))]/10">
                    <Sparkles className="w-5 h-5 text-[hsl(var(--terminal-purple))]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground mb-1">AI Options Strategy</h3>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      AI analyzes OI patterns, Greeks, IV surface, and constructs optimal strategies with risk-reward filtering for <span className="text-foreground font-semibold">{symbol}</span>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 block">Min Risk:Reward</label>
                    <div className="flex gap-1.5">
                      {['1:1.5', '1:2', '1:3', '1:4'].map(rr => (
                        <button key={rr} onClick={() => setRiskReward(rr)}
                          className={`px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all ${riskReward === rr ? 'bg-[hsl(var(--terminal-purple))]/15 border-[hsl(var(--terminal-purple))]/40 text-[hsl(var(--terminal-purple))]' : 'bg-secondary/30 border-border/20 text-muted-foreground hover:text-foreground'}`}>
                          {rr}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 block">Trade Type</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[{ k: 'all', l: 'All' }, { k: 'intraday', l: 'Intraday' }, { k: 'swing', l: 'Swing' }, { k: 'expiry', l: 'Till Expiry' }].map(t => (
                        <button key={t.k} onClick={() => setOptionsTradeType(t.k)}
                          className={`px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all ${optionsTradeType === t.k ? 'bg-[hsl(var(--terminal-purple))]/15 border-[hsl(var(--terminal-purple))]/40 text-[hsl(var(--terminal-purple))]' : 'bg-secondary/30 border-border/20 text-muted-foreground hover:text-foreground'}`}>
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={runAiStrategy}
                  disabled={aiLoading}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-[hsl(var(--terminal-purple))] to-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI Analyzing {symbol}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Strategy for {symbol}
                    </>
                  )}
                </button>

                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-[8px] px-2 py-1 rounded-lg bg-[hsl(var(--terminal-purple))]/10 text-[hsl(var(--terminal-purple))] border border-[hsl(var(--terminal-purple))]/20 font-semibold">📊 OI Analysis</span>
                  <span className="text-[8px] px-2 py-1 rounded-lg bg-[hsl(var(--terminal-purple))]/10 text-[hsl(var(--terminal-purple))] border border-[hsl(var(--terminal-purple))]/20 font-semibold">🔬 Greeks & IV</span>
                  <span className="text-[8px] px-2 py-1 rounded-lg bg-[hsl(var(--terminal-purple))]/10 text-[hsl(var(--terminal-purple))] border border-[hsl(var(--terminal-purple))]/20 font-semibold">🏗️ Strategy Builder</span>
                  <span className="text-[8px] px-2 py-1 rounded-lg bg-[hsl(var(--terminal-purple))]/10 text-[hsl(var(--terminal-purple))] border border-[hsl(var(--terminal-purple))]/20 font-semibold">🛡️ Risk-Reward</span>
                </div>
              </div>

              {/* AI Result */}
              {aiResult && (
                <div className="rounded-xl bg-card/50 border border-border/20 p-4">
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:text-[11px] [&_p]:leading-relaxed [&_li]:text-[11px] [&_strong]:text-foreground [&_h2]:text-xs [&_h3]:text-[11px] [&_h2]:text-[hsl(var(--terminal-purple))] [&_hr]:border-border/20">
                    <ReactMarkdown>{aiResult}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Shared strategy display component ──
function StrategyDisplay({ legs, netPremium, maxProfit, maxLoss, breakevens, payoffData, underlyingValue, strikeDiff, lotSize, symbol }: {
  legs: StrategyLeg[];
  netPremium: number;
  maxProfit: number;
  maxLoss: number;
  breakevens: number[];
  payoffData: { price: number; pnl: number }[];
  underlyingValue: number;
  strikeDiff: number;
  lotSize: number;
  symbol: string;
}) {
  if (legs.length === 0) return null;

  const fmt = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
    if (abs >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
  };

  return (
    <>
      <div className="t-card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/20 border-b border-border/20">
          <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">Strategy Legs</span>
          <span className="text-[8px] text-muted-foreground">Lot Size: <span className="text-foreground font-bold">{lotSize}</span> × {symbol}</span>
        </div>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-secondary/30 text-muted-foreground text-[8px]">
              <th className="p-2 text-left">Action</th><th className="p-2 text-left">Type</th><th className="p-2 text-right">Strike</th><th className="p-2 text-right">Premium</th><th className="p-2 text-right">Lots</th><th className="p-2 text-right">Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {legs.map((leg) => {
              const value = leg.premium * leg.lots * lotSize;
              return (
                <tr key={leg.id} className="border-t border-border/20">
                  <td className={`p-2 font-bold ${leg.action === 'BUY' ? 'text-primary' : 'text-destructive'}`}>{leg.action}</td>
                  <td className="p-2 text-foreground">{leg.type}</td>
                  <td className="p-2 text-right text-foreground font-medium">{formatNumber(leg.strike)}</td>
                  <td className="p-2 text-right text-foreground">₹{leg.premium.toFixed(2)}</td>
                  <td className="p-2 text-right text-muted-foreground">{leg.lots}</td>
                  <td className={`p-2 text-right font-bold ${leg.action === 'BUY' ? 'text-destructive' : 'text-primary'}`}>
                    {leg.action === 'BUY' ? '-' : '+'}{fmt(value)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Net Premium', value: `${netPremium >= 0 ? '+' : ''}${fmt(netPremium)}`, cls: netPremium >= 0 ? 'text-primary' : 'text-destructive' },
          { label: 'Max Profit', value: maxProfit > 9999999 ? '∞' : fmt(maxProfit), cls: 'text-primary' },
          { label: 'Max Loss', value: fmt(Math.abs(maxLoss)), cls: 'text-destructive' },
          { label: 'Breakeven', value: breakevens.length > 0 ? breakevens.map(b => formatNumber(b)).join(', ') : '—', cls: 'text-[hsl(var(--terminal-amber))]' },
        ].map((card, i) => (
          <div key={i} className="t-card text-center py-3">
            <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
            <p className={`text-[13px] font-bold ${card.cls}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {payoffData.length > 0 && (
        <div className="t-card">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">Payoff Diagram</p>
          <div className="h-52 flex items-end gap-px">
            {payoffData.map((point, i) => {
              const maxAbs = Math.max(Math.abs(maxProfit), Math.abs(maxLoss)) || 1;
              const normalizedPnl = point.pnl / maxAbs;
              const isPositive = point.pnl >= 0;
              const height = Math.abs(normalizedPnl) * 45;
              const isSpot = Math.abs(point.price - underlyingValue) < strikeDiff;

              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                  <div className="w-full flex flex-col items-center justify-end" style={{ height: '90%' }}>
                    <div className="w-full flex flex-col justify-end items-center" style={{ height: '50%' }}>
                      {isPositive && (
                        <div className={`w-full rounded-t-sm ${isSpot ? 'bg-[hsl(var(--terminal-amber))]' : 'bg-primary/60'}`}
                          style={{ height: `${height}%` }} />
                      )}
                    </div>
                    <div className="w-full h-px bg-border/50" />
                    <div className="w-full flex flex-col justify-start items-center" style={{ height: '50%' }}>
                      {!isPositive && (
                        <div className={`w-full rounded-b-sm ${isSpot ? 'bg-[hsl(var(--terminal-amber))]' : 'bg-destructive/60'}`}
                          style={{ height: `${height}%` }} />
                      )}
                    </div>
                  </div>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-card border border-border rounded px-1.5 py-0.5 text-[8px] text-foreground whitespace-nowrap z-10 shadow-lg">
                    {point.price}: {point.pnl >= 0 ? '+' : ''}{fmt(point.pnl)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] text-muted-foreground mt-1.5">
            <span>{payoffData[0]?.price}</span>
            <span className="text-[hsl(var(--terminal-amber))] font-medium">SPOT: {formatNumber(Math.round(underlyingValue))}</span>
            <span>{payoffData[payoffData.length - 1]?.price}</span>
          </div>
        </div>
      )}
    </>
  );
}
