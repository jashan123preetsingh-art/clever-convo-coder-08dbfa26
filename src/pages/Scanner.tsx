import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllStocks } from '@/data/mockData';
import { formatCurrency, formatPercent, formatVolume, formatMarketCap } from '@/utils/format';
import type { Stock } from '@/data/mockData';
import { motion, AnimatePresence } from 'framer-motion';

// ═══ QUALITY SCORE ENGINE ═══
interface QualityScore {
  total: number;
  grade: string;
  priceEvent: number;
  volume: number;
  candle: number;
  structure: number;
  liquidity: number;
  relStrength: number;
  sector: number;
  keyLevel: string;
  volumeDesc: string;
  candleDesc: string;
  structureDesc: string;
  risk: string;
  invalidation: string;
  freshness: string;
}

function computeQualityScore(stock: Stock): QualityScore {
  let priceEvent = 0, volume = 0, candle = 0, structure = 0, liquidity = 0, relStrength = 0, sector = 0;

  // Price Event (0-20): How significant is the price move?
  const absChange = Math.abs(stock.change_pct);
  if (absChange >= 10) priceEvent = 20;
  else if (absChange >= 5) priceEvent = 17;
  else if (absChange >= 3) priceEvent = 14;
  else if (absChange >= 2) priceEvent = 11;
  else if (absChange >= 1) priceEvent = 8;
  else priceEvent = 4;

  // Proximity to 52W high/low
  const distToHigh = stock.week_52_high > 0 ? ((stock.week_52_high - stock.ltp) / stock.week_52_high) * 100 : 50;
  const distToLow = stock.week_52_low > 0 ? ((stock.ltp - stock.week_52_low) / stock.week_52_low) * 100 : 50;
  if (distToHigh < 2) priceEvent = Math.max(priceEvent, 19);
  if (distToHigh < 5) priceEvent = Math.max(priceEvent, 16);

  // Volume (0-20): Volume relative to average
  const volRatio = (stock.avg_volume_10d && stock.avg_volume_10d > 0) ? stock.volume / stock.avg_volume_10d : 1;
  if (volRatio >= 5) volume = 20;
  else if (volRatio >= 3) volume = 17;
  else if (volRatio >= 2) volume = 14;
  else if (volRatio >= 1.5) volume = 11;
  else if (volRatio >= 1) volume = 7;
  else volume = 3;

  // Candle (0-15): Body vs range, wicks
  const bodyPct = stock.open > 0 ? Math.abs(stock.ltp - stock.open) / Math.max(stock.high - stock.low, 0.01) * 100 : 50;
  const isGreen = stock.ltp > stock.open;
  if (bodyPct >= 80) candle = 15;
  else if (bodyPct >= 60) candle = 12;
  else if (bodyPct >= 40) candle = 9;
  else candle = 5;

  const closeNearHigh = stock.high > stock.low ? (stock.ltp - stock.low) / (stock.high - stock.low) : 0.5;
  if (isGreen && closeNearHigh > 0.85) candle = Math.min(candle + 3, 15);

  // Structure (0-15): Trend alignment
  // Using 52W positioning as proxy
  const w52Range = stock.week_52_high - stock.week_52_low;
  const posIn52W = w52Range > 0 ? (stock.ltp - stock.week_52_low) / w52Range : 0.5;
  if (posIn52W >= 0.85) structure = 12;
  else if (posIn52W >= 0.65) structure = 10;
  else if (posIn52W >= 0.45) structure = 7;
  else structure = 4;
  if (stock.change_pct > 0 && posIn52W > 0.7) structure = Math.min(structure + 3, 15);

  // Liquidity (0-10): Volume adequacy
  if (stock.volume >= 10000000) liquidity = 10;
  else if (stock.volume >= 5000000) liquidity = 8;
  else if (stock.volume >= 1000000) liquidity = 6;
  else if (stock.volume >= 500000) liquidity = 4;
  else liquidity = 2;

  // Relative Strength (0-15): vs market
  const mktAvgChange = 0.5; // approximate
  const rsVsMarket = stock.change_pct - mktAvgChange;
  if (rsVsMarket >= 5) relStrength = 15;
  else if (rsVsMarket >= 3) relStrength = 12;
  else if (rsVsMarket >= 1) relStrength = 9;
  else if (rsVsMarket >= 0) relStrength = 6;
  else relStrength = 3;

  // Sector (0-5): Quality fundamentals
  if (stock.roe && stock.roe > 20) sector += 2;
  if (stock.debt_to_equity !== undefined && stock.debt_to_equity < 0.5) sector += 2;
  if (stock.promoter_holding && stock.promoter_holding > 50) sector += 1;
  sector = Math.min(sector, 5);

  const total = priceEvent + volume + candle + structure + liquidity + relStrength + sector;
  const grade = total >= 85 ? 'A+' : total >= 75 ? 'A' : total >= 65 ? 'B+' : total >= 55 ? 'B' : total >= 45 ? 'C+' : total >= 35 ? 'C' : 'D';

  // Descriptive analysis
  const keyLevel = distToHigh < 2 ? '52-Week High' : distToHigh < 5 ? 'Near 52W High' : distToLow < 5 ? 'Near 52W Low' : `${posIn52W > 0.5 ? 'Upper' : 'Lower'} Range`;
  const volumeDesc = volRatio >= 3 ? `Massive volume ${volRatio.toFixed(1)}x average` : volRatio >= 1.5 ? `Above average volume ${volRatio.toFixed(1)}x` : 'Normal volume';
  const candleDesc = bodyPct >= 80 ? (isGreen ? 'Bullish Marubozu' : 'Bearish Marubozu') : closeNearHigh > 0.85 ? 'Closing near high' : closeNearHigh < 0.15 ? 'Closing near low' : 'Mixed candle';
  const structureDesc = posIn52W >= 0.85 ? 'Strong uptrend, near highs' : posIn52W >= 0.65 ? 'Uptrend structure' : posIn52W <= 0.25 ? 'Downtrend, near lows' : 'Consolidation zone';
  const risk = absChange >= 10 ? 'Extended move — high risk' : distToHigh < 2 ? 'At resistance, potential reversal' : 'Moderate risk';
  const invalidation = stock.prev_close > 0 ? `₹${(stock.prev_close * 0.97).toFixed(2)} (-3% from prev close)` : '—';
  const freshness = absChange >= 3 && volRatio >= 1.5 ? 'Active breakout with volume — act now' : absChange >= 2 ? 'Fresh move detected' : 'Standard session';

  return { total, grade, priceEvent, volume, candle, structure, liquidity, relStrength, sector, keyLevel, volumeDesc, candleDesc, structureDesc, risk, invalidation, freshness };
}

// ═══ MEASURES & SCANS ═══
const MEASURES = [
  { key: 'close', label: 'Close', group: 'Price' },
  { key: 'open', label: 'Open', group: 'Price' },
  { key: 'high', label: 'High', group: 'Price' },
  { key: 'low', label: 'Low', group: 'Price' },
  { key: 'change_pct', label: '% Change', group: 'Price' },
  { key: 'volume', label: 'Volume', group: 'Volume' },
  { key: 'avg_volume_10d', label: 'Avg Volume (10d)', group: 'Volume' },
  { key: 'market_cap', label: 'Market Cap (Cr)', group: 'Fundamentals' },
  { key: 'pe_ratio', label: 'P/E Ratio', group: 'Fundamentals' },
  { key: 'roe', label: 'ROE %', group: 'Fundamentals' },
  { key: 'roce', label: 'ROCE %', group: 'Fundamentals' },
  { key: 'debt_to_equity', label: 'Debt/Equity', group: 'Fundamentals' },
  { key: 'dividend_yield', label: 'Dividend Yield %', group: 'Fundamentals' },
  { key: 'promoter_holding', label: 'Promoter Holding %', group: 'Fundamentals' },
  { key: 'week_52_high', label: '52W High', group: 'Price Levels' },
  { key: 'week_52_low', label: '52W Low', group: 'Price Levels' },
  { key: 'prev_close', label: 'Previous Close', group: 'Price' },
];

const OPERATORS = [
  { key: '>', label: 'greater than' },
  { key: '<', label: 'less than' },
  { key: '>=', label: '≥' },
  { key: '<=', label: '≤' },
  { key: '==', label: 'equal to' },
];

interface Condition {
  id: string;
  measure: string;
  operator: string;
  compareType: 'number' | 'measure';
  value: string;
  compareMeasure: string;
  multiplier: number;
}

interface ScanPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'breakout' | 'momentum' | 'value' | 'quality' | 'volume' | 'price';
  conditions: Omit<Condition, 'id'>[];
}

const DEFAULT_SCANS: ScanPreset[] = [
  // ─── BREAKOUT ───
  { id: 'b1', name: 'Intraday Breakout – Gap Up', description: 'Open > Prev Close + Volume surge', icon: '⚡', category: 'breakout',
    conditions: [
      { measure: 'open', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.01 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '1', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'b2', name: 'Intraday Breakout – New High', description: 'Price crossing today\'s high with volume', icon: '🔥', category: 'breakout',
    conditions: [
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'high', multiplier: 0.995 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'b3', name: 'Intraday Breakdown – Gap Down', description: 'Open < Prev Close, selling volume', icon: '💥', category: 'breakout',
    conditions: [
      { measure: 'open', operator: '<', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 0.99 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
      { measure: 'change_pct', operator: '<', compareType: 'number', value: '-1', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'b4', name: 'Swing Breakout – Near 52W High', description: 'Within 3% of 52-week high + volume', icon: '🚀', category: 'breakout',
    conditions: [
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'week_52_high', multiplier: 0.97 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.3 },
    ] },
  { id: 'b5', name: 'Swing Breakout – 52W High', description: 'Making new 52-week highs', icon: '🏔️', category: 'breakout',
    conditions: [
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'week_52_high', multiplier: 1.0 },
    ] },
  { id: 'b6', name: 'Swing Reversal – Near 52W Low', description: 'Near 52W low with bounce + volume', icon: '📈', category: 'breakout',
    conditions: [
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'week_52_low', multiplier: 1.05 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '1', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'b7', name: 'Volume Explosion (3x+)', description: 'Massive volume spike – potential breakout', icon: '🌊', category: 'breakout',
    conditions: [
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 3 },
    ] },

  // ─── MOMENTUM ───
  { id: 's1', name: 'Top Gainers (>3%)', description: 'Strong bullish momentum today', icon: '🟢', category: 'momentum',
    conditions: [{ measure: 'change_pct', operator: '>', compareType: 'number', value: '3', compareMeasure: '', multiplier: 1 }] },
  { id: 's2', name: 'Top Losers (<-2%)', description: 'Bearish pressure today', icon: '🔴', category: 'momentum',
    conditions: [{ measure: 'change_pct', operator: '<', compareType: 'number', value: '-2', compareMeasure: '', multiplier: 1 }] },
  { id: 's3', name: 'Strong Rally (>5%)', description: 'Stocks surging 5%+', icon: '🔥', category: 'momentum',
    conditions: [{ measure: 'change_pct', operator: '>', compareType: 'number', value: '5', compareMeasure: '', multiplier: 1 }] },

  // ─── VOLUME ───
  { id: 's5', name: 'Volume Breakout (2x)', description: 'Double average volume', icon: '📊', category: 'volume',
    conditions: [{ measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 2 }] },
  { id: 's7', name: 'Low Volume', description: 'Below half of average volume', icon: '🔇', category: 'volume',
    conditions: [{ measure: 'volume', operator: '<', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 0.5 }] },

  // ─── QUALITY ───
  { id: 's8', name: 'High ROE (>20%)', description: 'Superior return on equity', icon: '💎', category: 'quality',
    conditions: [{ measure: 'roe', operator: '>', compareType: 'number', value: '20', compareMeasure: '', multiplier: 1 }] },
  { id: 's9', name: 'Quality Compounders', description: 'ROE>15, ROCE>15, Low Debt', icon: '⭐', category: 'quality',
    conditions: [
      { measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'roce', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 's10', name: 'Debt Free', description: 'Near-zero debt', icon: '🏦', category: 'quality',
    conditions: [{ measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.1', compareMeasure: '', multiplier: 1 }] },
  { id: 's11', name: 'Promoter Conviction', description: 'Promoter holding > 60%', icon: '🛡️', category: 'quality',
    conditions: [{ measure: 'promoter_holding', operator: '>', compareType: 'number', value: '60', compareMeasure: '', multiplier: 1 }] },

  // ─── VALUE ───
  { id: 's12', name: 'Low PE Stocks', description: 'P/E under 15', icon: '🏷️', category: 'value',
    conditions: [{ measure: 'pe_ratio', operator: '<', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 }] },
  { id: 's13', name: 'High Dividend', description: 'Yield above 3%', icon: '💰', category: 'value',
    conditions: [{ measure: 'dividend_yield', operator: '>', compareType: 'number', value: '3', compareMeasure: '', multiplier: 1 }] },
  { id: 's14', name: 'Value + Quality', description: 'PE<20, ROE>15, Low Debt', icon: '🎯', category: 'value',
    conditions: [
      { measure: 'pe_ratio', operator: '<', compareType: 'number', value: '20', compareMeasure: '', multiplier: 1 },
      { measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },

  // ─── PRICE ───
  { id: 's16', name: 'Penny Stocks (<₹50)', description: 'Low-price stocks', icon: '🪙', category: 'price',
    conditions: [{ measure: 'close', operator: '<', compareType: 'number', value: '50', compareMeasure: '', multiplier: 1 }] },
  { id: 's17', name: 'Blue Chips (>₹2000)', description: 'Premium large caps', icon: '💠', category: 'price',
    conditions: [{ measure: 'close', operator: '>', compareType: 'number', value: '2000', compareMeasure: '', multiplier: 1 }] },
];

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '◎' },
  { key: 'breakout', label: 'Breakouts', icon: '⚡' },
  { key: 'momentum', label: 'Momentum', icon: '🟢' },
  { key: 'volume', label: 'Volume', icon: '📊' },
  { key: 'quality', label: 'Quality', icon: '💎' },
  { key: 'value', label: 'Value', icon: '🏷️' },
  { key: 'price', label: 'Price', icon: '🪙' },
];

const RESULT_COLUMNS = [
  { key: 'symbol', label: 'Stock', align: 'left' as const },
  { key: 'ltp', label: 'Price', align: 'right' as const },
  { key: 'change_pct', label: '% Chg', align: 'right' as const },
  { key: 'volume', label: 'Volume', align: 'right' as const },
  { key: 'market_cap', label: 'MCap', align: 'right' as const },
  { key: 'pe_ratio', label: 'P/E', align: 'right' as const },
  { key: 'roe', label: 'ROE', align: 'right' as const },
  { key: 'score', label: 'Score', align: 'right' as const },
];

const PAGE_SIZE = 50;

function getStockValue(stock: Stock, key: string): number | null {
  if (key === 'close') return stock.ltp;
  if (key === 'score') return computeQualityScore(stock).total;
  return (stock as any)[key] ?? null;
}

function makeId() { return Math.random().toString(36).slice(2, 9); }

function newCondition(): Condition {
  return { id: makeId(), measure: 'change_pct', operator: '>', compareType: 'number', value: '2', compareMeasure: '', multiplier: 1 };
}

function runConditions(conditions: Omit<Condition, 'id'>[], logicMode: 'all' | 'any' = 'all'): Stock[] {
  const stocks = getAllStocks();
  return stocks.filter(stock => {
    const checker = (cond: Omit<Condition, 'id'>) => {
      const leftVal = getStockValue(stock, cond.measure);
      if (leftVal === null) return false;
      let rightVal: number;
      if (cond.compareType === 'number') {
        rightVal = parseFloat(cond.value);
        if (isNaN(rightVal)) return false;
      } else {
        const base = getStockValue(stock, cond.compareMeasure);
        if (base === null) return false;
        rightVal = base * cond.multiplier;
      }
      switch (cond.operator) {
        case '>': return leftVal > rightVal;
        case '<': return leftVal < rightVal;
        case '>=': return leftVal >= rightVal;
        case '<=': return leftVal <= rightVal;
        case '==': return Math.abs(leftVal - rightVal) < 0.01;
        default: return false;
      }
    };
    return logicMode === 'all' ? conditions.every(checker) : conditions.some(checker);
  });
}

// ═══ GRADE BADGE ═══
function GradeBadge({ grade, size = 'sm' }: { grade: string; size?: 'sm' | 'lg' }) {
  const colors: Record<string, string> = {
    'A+': 'bg-primary/15 text-primary border-primary/30',
    'A': 'bg-primary/12 text-primary border-primary/25',
    'B+': 'bg-[hsl(var(--terminal-blue)/0.12)] text-[hsl(var(--terminal-blue))] border-[hsl(var(--terminal-blue)/0.25)]',
    'B': 'bg-[hsl(var(--terminal-blue)/0.08)] text-[hsl(var(--terminal-blue))] border-[hsl(var(--terminal-blue)/0.15)]',
    'C+': 'bg-accent/12 text-accent border-accent/25',
    'C': 'bg-accent/8 text-accent border-accent/15',
    'D': 'bg-destructive/12 text-destructive border-destructive/25',
  };
  const cls = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-[9px]';
  return (
    <span className={`inline-flex items-center justify-center rounded-md font-black border ${cls} ${colors[grade] || 'bg-secondary text-muted-foreground border-border'}`}>
      {grade}
    </span>
  );
}

// ═══ SCORE BAR ═══
function ScoreBar({ label, score, maxScore }: { label: string; score: number; maxScore: number }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const color = pct >= 70 ? 'bg-[hsl(var(--terminal-purple))]' : pct >= 40 ? 'bg-[hsl(var(--terminal-blue))]' : 'bg-destructive/60';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] text-muted-foreground w-16 text-right shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-2 bg-secondary/60 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`} />
      </div>
      <span className="text-[8px] text-foreground font-bold w-8 font-data">{score}/{maxScore}</span>
    </div>
  );
}

// ═══ BREAKOUT DETAIL CARD ═══
function BreakoutDetailCard({ stock, onClose }: { stock: Stock; onClose: () => void }) {
  const qs = computeQualityScore(stock);
  const volRatio = (stock.avg_volume_10d && stock.avg_volume_10d > 0) ? stock.volume / stock.avg_volume_10d : 1;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="t-card overflow-hidden border-l-2 border-l-primary">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/stock/${stock.symbol}`} className="hover:text-primary transition-colors">
            <span className="text-lg font-black text-foreground">{stock.symbol}</span>
            <p className="text-[9px] text-muted-foreground">{stock.name}</p>
          </Link>
          <div className="text-[9px] text-muted-foreground">{stock.sector}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right font-data">
            <span className="text-lg font-black text-foreground">{formatCurrency(stock.ltp)}</span>
            <span className={`text-sm font-bold ml-2 ${stock.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
              ▲ {formatPercent(stock.change_pct)}
            </span>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-muted-foreground">Volume</p>
            <p className="text-[10px] font-bold text-foreground font-data">{volRatio.toFixed(1)}x avg</p>
            <div className="w-16 h-1.5 rounded-full bg-secondary mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-[hsl(var(--terminal-blue))]" style={{ width: `${Math.min(volRatio * 20, 100)}%` }} />
            </div>
          </div>
          <GradeBadge grade={qs.grade} size="lg" />
          <span className="text-lg font-black text-foreground font-data">{qs.total}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg ml-2">✕</button>
        </div>
      </div>

      {/* Freshness tag */}
      <div className="px-5 py-2 bg-primary/5 border-b border-border/20">
        <span className="text-[10px] text-primary font-bold">● {qs.freshness}</span>
      </div>

      {/* Summary */}
      <div className="px-5 py-3 border-b border-border/20">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="text-foreground font-semibold">{stock.symbol}</span> matched "Breakout" — {stock.change_pct >= 0 ? 'up' : 'down'} {Math.abs(stock.change_pct).toFixed(1)}% today with {volRatio.toFixed(1)}x relative volume.
          Currently at {qs.keyLevel} (₹{stock.ltp.toFixed(2)}).
          {qs.candleDesc}. {qs.structureDesc}.
        </p>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-3 border-b border-border/20">
        <div className="p-3 border-r border-border/20">
          <p className="text-[8px] text-muted-foreground mb-0.5">🎯 Key Level</p>
          <p className="text-[11px] font-bold text-foreground">{qs.keyLevel}</p>
          <p className="text-[9px] text-muted-foreground">₹{stock.ltp.toFixed(2)}</p>
        </div>
        <div className="p-3 border-r border-border/20">
          <p className="text-[8px] text-muted-foreground mb-0.5">📊 Volume</p>
          <p className="text-[11px] font-bold text-foreground">{qs.volumeDesc}</p>
          <p className="text-[9px] text-muted-foreground">{formatVolume(stock.volume)} shares</p>
        </div>
        <div className="p-3">
          <p className="text-[8px] text-muted-foreground mb-0.5">🕯️ Candle</p>
          <p className="text-[11px] font-bold text-foreground">{qs.candleDesc}</p>
          <p className="text-[9px] text-muted-foreground">Body {((Math.abs(stock.ltp - stock.open) / Math.max(stock.high - stock.low, 0.01)) * 100).toFixed(0)}% of range</p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-border/20">
        <div className="p-3 border-r border-border/20">
          <p className="text-[8px] text-muted-foreground mb-0.5">▲ Resistance</p>
          <p className="text-[11px] font-bold text-destructive">₹{stock.week_52_high.toFixed(2)} (52W High)</p>
          <p className="text-[9px] text-muted-foreground">{((stock.week_52_high - stock.ltp) / stock.ltp * 100).toFixed(1)}% above</p>
        </div>
        <div className="p-3">
          <p className="text-[8px] text-muted-foreground mb-0.5">♥ Support</p>
          <p className="text-[11px] font-bold text-primary">₹{stock.prev_close.toFixed(2)} (Prev Close)</p>
          <p className="text-[9px] text-muted-foreground">{((stock.ltp - stock.prev_close) / stock.prev_close * 100).toFixed(1)}% below</p>
        </div>
      </div>

      {/* Quality Score Breakdown */}
      <div className="px-5 py-3 border-b border-border/20">
        <p className="text-[10px] font-bold text-foreground mb-2 flex items-center gap-2">
          ⭐ Quality Score <GradeBadge grade={qs.grade} /> <span className="font-data">{qs.total}/100</span>
        </p>
        <div className="space-y-1.5">
          <ScoreBar label="Price Event" score={qs.priceEvent} maxScore={20} />
          <ScoreBar label="Volume" score={qs.volume} maxScore={20} />
          <ScoreBar label="Candle" score={qs.candle} maxScore={15} />
          <ScoreBar label="Structure" score={qs.structure} maxScore={15} />
          <ScoreBar label="Liquidity" score={qs.liquidity} maxScore={10} />
          <ScoreBar label="Rel Strength" score={qs.relStrength} maxScore={15} />
          <ScoreBar label="Sector" score={qs.sector} maxScore={5} />
        </div>
      </div>

      {/* Risk Footer */}
      <div className="px-5 py-3 bg-secondary/20 space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold text-accent">⚠ Risk</span>
          <span className="text-[9px] text-muted-foreground">{qs.risk}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold text-destructive">🚫 Invalidation</span>
          <span className="text-[9px] text-muted-foreground">{qs.invalidation}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ═══ MAIN COMPONENT ═══
export default function Scanner() {
  const [tab, setTab] = useState<'feeds' | 'custom'>('feeds');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeScan, setActiveScan] = useState<ScanPreset | null>(null);
  const [scanResults, setScanResults] = useState<Stock[] | null>(null);
  const [expandedStock, setExpandedStock] = useState<string | null>(null);

  const [conditions, setConditions] = useState<Condition[]>([newCondition()]);
  const [logicMode, setLogicMode] = useState<'all' | 'any'>('all');
  const [customResults, setCustomResults] = useState<Stock[] | null>(null);
  const [hasRunCustom, setHasRunCustom] = useState(false);

  const [sortKey, setSortKey] = useState('change_pct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const scanCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DEFAULT_SCANS.forEach(s => { counts[s.id] = runConditions(s.conditions).length; });
    return counts;
  }, []);

  const filteredScans = useMemo(() => {
    if (selectedCategory === 'all') return DEFAULT_SCANS;
    return DEFAULT_SCANS.filter(s => s.category === selectedCategory);
  }, [selectedCategory]);

  const selectScan = useCallback((scan: ScanPreset) => {
    setActiveScan(scan);
    setScanResults(runConditions(scan.conditions));
    setPage(0); setSearch(''); setSortKey('change_pct'); setSortDir('desc'); setExpandedStock(null);
  }, []);

  const runCustomScan = useCallback(() => {
    const conds = conditions.map(({ id, ...rest }) => rest);
    setCustomResults(runConditions(conds, logicMode));
    setHasRunCustom(true); setPage(0); setSearch(''); setExpandedStock(null);
  }, [conditions, logicMode]);

  const activeResults = tab === 'feeds' ? scanResults : customResults;

  const sortedResults = useMemo(() => {
    if (!activeResults) return null;
    return [...activeResults].sort((a, b) => {
      const av = getStockValue(a, sortKey) || 0;
      const bv = getStockValue(b, sortKey) || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [activeResults, sortKey, sortDir]);

  const filteredResults = useMemo(() => {
    if (!sortedResults) return null;
    if (!search) return sortedResults;
    return sortedResults.filter(s =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [sortedResults, search]);

  const totalPages = filteredResults ? Math.ceil(filteredResults.length / PAGE_SIZE) : 0;
  const pagedResults = filteredResults?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }, [sortKey]);

  const addCondition = useCallback(() => {
    setConditions(prev => [...prev, { id: makeId(), measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 }]);
  }, []);
  const removeCondition = useCallback((id: string) => {
    setConditions(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);
  }, []);
  const updateCondition = useCallback((id: string, updates: Partial<Condition>) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const exportCSV = useCallback(() => {
    if (!filteredResults) return;
    const header = RESULT_COLUMNS.map(c => c.label).join(',');
    const rows = filteredResults.map(s => {
      const qs = computeQualityScore(s);
      return [s.symbol, s.ltp, s.change_pct, s.volume, s.market_cap, s.pe_ratio || '', s.roe || '', `${qs.total} (${qs.grade})`].join(',');
    });
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `scan_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filteredResults]);

  const groups = [...new Set(MEASURES.map(m => m.group))];

  const conditionText = (c: Condition) => {
    const m = MEASURES.find(x => x.key === c.measure)?.label || c.measure;
    const op = OPERATORS.find(o => o.key === c.operator)?.label || c.operator;
    if (c.compareType === 'number') return `${m} ${op} ${c.value}`;
    const cm = MEASURES.find(x => x.key === c.compareMeasure)?.label || c.compareMeasure;
    return `${m} ${op} ${c.multiplier !== 1 ? `${c.multiplier}× ` : ''}${cm}`;
  };

  const showResults = (tab === 'feeds' && scanResults) || (tab === 'custom' && hasRunCustom);

  return (
    <div className="p-4 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Scanner</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Scan {getAllStocks().length} stocks · {DEFAULT_SCANS.length} algorithms · 7-pillar quality scoring</p>
        </div>
        <div className="flex gap-0.5 bg-secondary/50 p-0.5 rounded-lg border border-border/50">
          <button onClick={() => setTab('feeds')}
            className={`px-4 py-2 rounded-md text-[10px] font-semibold transition-all ${tab === 'feeds' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            Pre-built Scans
          </button>
          <button onClick={() => setTab('custom')}
            className={`px-4 py-2 rounded-md text-[10px] font-semibold transition-all ${tab === 'custom' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            Custom Builder
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'feeds' ? (
          <motion.div key="feeds" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {/* Categories */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setSelectedCategory(c.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border whitespace-nowrap transition-all
                    ${selectedCategory === c.key
                      ? 'bg-primary/10 text-primary border-primary/30 glow-primary'
                      : 'bg-card text-muted-foreground border-border/50 hover:text-foreground hover:border-border'}`}>
                  <span>{c.icon}</span> {c.label}
                </button>
              ))}
            </div>

            {/* Scan Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-4">
              {filteredScans.map(scan => (
                <motion.button key={scan.id} onClick={() => selectScan(scan)}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className={`text-left p-3 rounded-lg border transition-all
                    ${activeScan?.id === scan.id
                      ? 'bg-primary/5 border-primary/30 glow-primary'
                      : 'bg-card border-border/40 hover:border-border/80'}`}>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-lg">{scan.icon}</span>
                    <span className={`text-[10px] font-bold font-data px-2 py-0.5 rounded-full
                      ${scanCounts[scan.id] > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {scanCounts[scan.id]}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-foreground mb-0.5">{scan.name}</p>
                  <p className="text-[8px] text-muted-foreground leading-relaxed">{scan.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="custom" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="t-card overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">Build Custom Scan</span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground">Match</span>
                  <select value={logicMode} onChange={e => setLogicMode(e.target.value as 'all' | 'any')}
                    className="bg-secondary border border-border rounded-md px-2 py-1 text-[10px] text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary/30">
                    <option value="all">ALL conditions</option>
                    <option value="any">ANY condition</option>
                  </select>
                </div>
              </div>

              <div className="p-4 space-y-2.5">
                {conditions.map((cond, idx) => (
                  <div key={cond.id} className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] text-muted-foreground w-5 text-right font-data">{idx + 1}.</span>
                    <select value={cond.measure} onChange={e => updateCondition(cond.id, { measure: e.target.value })}
                      className="bg-secondary border border-border rounded-md px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-[140px]">
                      {groups.map(g => (
                        <optgroup key={g} label={g}>
                          {MEASURES.filter(m => m.group === g).map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <select value={cond.operator} onChange={e => updateCondition(cond.id, { operator: e.target.value })}
                      className="bg-secondary border border-border rounded-md px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-[120px]">
                      {OPERATORS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                    <select value={cond.compareType} onChange={e => updateCondition(cond.id, { compareType: e.target.value as 'number' | 'measure' })}
                      className="bg-secondary border border-border rounded-md px-2 py-1.5 text-[10px] text-foreground focus:outline-none">
                      <option value="number">Number</option>
                      <option value="measure">Measure</option>
                    </select>
                    {cond.compareType === 'number' ? (
                      <input type="number" step="any" value={cond.value}
                        onChange={e => updateCondition(cond.id, { value: e.target.value })}
                        className="bg-secondary border border-border rounded-md px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 w-20 font-data" />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input type="number" step="any" value={cond.multiplier}
                          onChange={e => updateCondition(cond.id, { multiplier: parseFloat(e.target.value) || 1 })}
                          className="bg-secondary border border-border rounded-md px-2 py-1.5 text-[10px] text-foreground focus:outline-none w-14 font-data" />
                        <span className="text-[10px] text-muted-foreground">×</span>
                        <select value={cond.compareMeasure} onChange={e => updateCondition(cond.id, { compareMeasure: e.target.value })}
                          className="bg-secondary border border-border rounded-md px-2.5 py-1.5 text-[10px] text-foreground focus:outline-none min-w-[120px]">
                          {groups.map(g => (
                            <optgroup key={g} label={g}>
                              {MEASURES.filter(m => m.group === g).map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    )}
                    {conditions.length > 1 && (
                      <button onClick={() => removeCondition(cond.id)}
                        className="text-destructive/40 hover:text-destructive text-sm transition-colors ml-1">✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-border/40 flex items-center gap-3">
                <button onClick={addCondition}
                  className="w-7 h-7 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center text-sm font-bold">+</button>
                <button onClick={runCustomScan}
                  className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-all shadow-sm glow-primary">
                  Run Scan
                </button>
                <span className="text-[9px] text-muted-foreground">
                  {conditions.length} condition{conditions.length > 1 ? 's' : ''} · {getAllStocks().length} stocks
                </span>
              </div>
            </div>

            {hasRunCustom && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {conditions.map(c => (
                  <span key={c.id} className="px-2 py-0.5 rounded-md text-[9px] bg-primary/8 text-primary border border-primary/15 font-medium">
                    {conditionText(c)}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ RESULTS ═══ */}
      {showResults && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[13px] font-bold text-foreground">
                {tab === 'feeds' && activeScan ? `${activeScan.icon} ${activeScan.name}` : 'Scan Results'}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">{filteredResults?.length || 0} stocks matched · Click any row for detailed analysis</p>
            </div>
            <div className="flex items-center gap-2">
              {filteredResults && filteredResults.length > 0 && (
                <button onClick={exportCSV}
                  className="px-3 py-1.5 rounded-md text-[10px] font-medium bg-card text-muted-foreground border border-border/50 hover:text-foreground transition-all">
                  Export CSV
                </button>
              )}
              <input type="text" placeholder="Filter..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="bg-secondary/60 border border-border/50 rounded-md px-3 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground w-36 focus:outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
          </div>

          {/* Expanded Detail Card */}
          <AnimatePresence>
            {expandedStock && pagedResults && (
              <div className="mb-3">
                <BreakoutDetailCard
                  stock={pagedResults.find(s => s.symbol === expandedStock) || getAllStocks().find(s => s.symbol === expandedStock)!}
                  onClose={() => setExpandedStock(null)}
                />
              </div>
            )}
          </AnimatePresence>

          {pagedResults && pagedResults.length > 0 ? (
            <div className="t-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-secondary/30 border-b border-border/40">
                      <th className="px-3 py-2.5 text-left text-[9px] font-semibold text-muted-foreground w-8">#</th>
                      {RESULT_COLUMNS.map(col => (
                        <th key={col.key} onClick={() => handleSort(col.key)}
                          className={`px-3 py-2.5 text-[9px] font-semibold cursor-pointer select-none transition-colors hover:text-foreground
                            ${col.align === 'right' ? 'text-right' : 'text-left'}
                            ${sortKey === col.key ? 'text-primary' : 'text-muted-foreground'}`}>
                          {col.label} {sortKey === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedResults.map((stock, idx) => {
                      const qs = computeQualityScore(stock);
                      const isExpanded = expandedStock === stock.symbol;
                      return (
                        <tr key={stock.symbol}
                          onClick={() => setExpandedStock(isExpanded ? null : stock.symbol)}
                          className={`border-b border-border/10 cursor-pointer transition-colors
                            ${isExpanded ? 'bg-primary/5' : 'hover:bg-secondary/20'}`}>
                          <td className="px-3 py-2.5 text-muted-foreground text-[9px] font-data">{page * PAGE_SIZE + idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <GradeBadge grade={qs.grade} />
                              <div>
                                <Link to={`/stock/${stock.symbol}`} onClick={e => e.stopPropagation()}
                                  className="font-semibold text-foreground text-[11px] hover:text-primary transition-colors">{stock.symbol}</Link>
                                <p className="text-[8px] text-muted-foreground hidden sm:block">{stock.sector}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right text-foreground font-medium font-data">{formatCurrency(stock.ltp)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold font-data
                              ${stock.change_pct >= 0 ? 'bg-primary/8 text-primary' : 'bg-destructive/8 text-destructive'}`}>
                              {stock.change_pct >= 0 ? '+' : ''}{formatPercent(stock.change_pct)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground font-data">{formatVolume(stock.volume)}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground font-data">{formatMarketCap(stock.market_cap)}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground font-data">{stock.pe_ratio && stock.pe_ratio > 0 ? stock.pe_ratio.toFixed(1) : '—'}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`font-data ${(stock.roe || 0) >= 15 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                              {stock.roe ? `${stock.roe}%` : '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`text-[10px] font-bold font-data ${qs.total >= 65 ? 'text-primary' : qs.total >= 45 ? 'text-accent' : 'text-muted-foreground'}`}>
                              {qs.total}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-3 border-t border-border/20">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="px-3 py-1 rounded-md text-[9px] font-medium bg-secondary text-muted-foreground border border-border/50 hover:text-foreground disabled:opacity-30">← Prev</button>
                  <span className="text-[9px] text-muted-foreground font-data">{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded-md text-[9px] font-medium bg-secondary text-muted-foreground border border-border/50 hover:text-foreground disabled:opacity-30">Next →</button>
                </div>
              )}
            </div>
          ) : (
            <div className="t-card p-12 text-center">
              <p className="text-[11px] text-muted-foreground">No stocks match this scan criteria.</p>
            </div>
          )}
        </motion.div>
      )}

      {tab === 'feeds' && !scanResults && (
        <div className="t-card p-14 text-center">
          <div className="text-3xl mb-3">⊕</div>
          <p className="text-[12px] text-muted-foreground font-medium">Select a scan above to see results</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">or switch to Custom Builder to create your own</p>
        </div>
      )}
    </div>
  );
}
