import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllStocks } from '@/data/mockData';
import { formatCurrency, formatPercent, formatVolume, formatMarketCap } from '@/utils/format';
import type { Stock } from '@/data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { stockApi } from '@/lib/api';

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
  const absChange = Math.abs(stock.change_pct);
  if (absChange >= 10) priceEvent = 20;
  else if (absChange >= 5) priceEvent = 17;
  else if (absChange >= 3) priceEvent = 14;
  else if (absChange >= 2) priceEvent = 11;
  else if (absChange >= 1) priceEvent = 8;
  else priceEvent = 4;

  const distToHigh = stock.week_52_high > 0 ? ((stock.week_52_high - stock.ltp) / stock.week_52_high) * 100 : 50;
  const distToLow = stock.week_52_low > 0 ? ((stock.ltp - stock.week_52_low) / stock.week_52_low) * 100 : 50;
  if (distToHigh < 2) priceEvent = Math.max(priceEvent, 19);
  if (distToHigh < 5) priceEvent = Math.max(priceEvent, 16);

  const volRatio = (stock.avg_volume_10d && stock.avg_volume_10d > 0) ? stock.volume / stock.avg_volume_10d : 1;
  if (volRatio >= 5) volume = 20;
  else if (volRatio >= 3) volume = 17;
  else if (volRatio >= 2) volume = 14;
  else if (volRatio >= 1.5) volume = 11;
  else if (volRatio >= 1) volume = 7;
  else volume = 3;

  const bodyPct = stock.open > 0 ? Math.abs(stock.ltp - stock.open) / Math.max(stock.high - stock.low, 0.01) * 100 : 50;
  const isGreen = stock.ltp > stock.open;
  if (bodyPct >= 80) candle = 15;
  else if (bodyPct >= 60) candle = 12;
  else if (bodyPct >= 40) candle = 9;
  else candle = 5;

  const closeNearHigh = stock.high > stock.low ? (stock.ltp - stock.low) / (stock.high - stock.low) : 0.5;
  if (isGreen && closeNearHigh > 0.85) candle = Math.min(candle + 3, 15);

  const w52Range = stock.week_52_high - stock.week_52_low;
  const posIn52W = w52Range > 0 ? (stock.ltp - stock.week_52_low) / w52Range : 0.5;
  if (posIn52W >= 0.85) structure = 12;
  else if (posIn52W >= 0.65) structure = 10;
  else if (posIn52W >= 0.45) structure = 7;
  else structure = 4;
  if (stock.change_pct > 0 && posIn52W > 0.7) structure = Math.min(structure + 3, 15);

  if (stock.volume >= 10000000) liquidity = 10;
  else if (stock.volume >= 5000000) liquidity = 8;
  else if (stock.volume >= 1000000) liquidity = 6;
  else if (stock.volume >= 500000) liquidity = 4;
  else liquidity = 2;

  const mktAvgChange = 0.5;
  const rsVsMarket = stock.change_pct - mktAvgChange;
  if (rsVsMarket >= 5) relStrength = 15;
  else if (rsVsMarket >= 3) relStrength = 12;
  else if (rsVsMarket >= 1) relStrength = 9;
  else if (rsVsMarket >= 0) relStrength = 6;
  else relStrength = 3;

  if (stock.roe && stock.roe > 20) sector += 2;
  if (stock.debt_to_equity !== undefined && stock.debt_to_equity < 0.5) sector += 2;
  if (stock.promoter_holding && stock.promoter_holding > 50) sector += 1;
  sector = Math.min(sector, 5);

  const total = priceEvent + volume + candle + structure + liquidity + relStrength + sector;
  const grade = total >= 85 ? 'A+' : total >= 75 ? 'A' : total >= 65 ? 'B+' : total >= 55 ? 'B' : total >= 45 ? 'C+' : total >= 35 ? 'C' : 'D';

  const keyLevel = distToHigh < 2 ? '52-Week High' : distToHigh < 5 ? 'Near 52W High' : distToLow < 5 ? 'Near 52W Low' : `${posIn52W > 0.5 ? 'Upper' : 'Lower'} Range`;
  const volumeDesc = volRatio >= 3 ? `Massive volume ${volRatio.toFixed(1)}x average` : volRatio >= 1.5 ? `Above average volume ${volRatio.toFixed(1)}x` : 'Normal volume';
  const candleDesc = bodyPct >= 80 ? (isGreen ? 'Bullish Marubozu' : 'Bearish Marubozu') : closeNearHigh > 0.85 ? 'Closing near high' : closeNearHigh < 0.15 ? 'Closing near low' : 'Mixed candle';
  const structureDesc = posIn52W >= 0.85 ? 'Strong uptrend, near highs' : posIn52W >= 0.65 ? 'Uptrend structure' : posIn52W <= 0.25 ? 'Downtrend, near lows' : 'Consolidation zone';
  const risk = absChange >= 10 ? 'Extended move — high risk' : distToHigh < 2 ? 'At resistance, potential reversal' : 'Moderate risk';
  const invalidation = stock.prev_close > 0 ? `₹${(stock.prev_close * 0.97).toFixed(2)} (-3% from prev close)` : '—';
  const freshness = absChange >= 3 && volRatio >= 1.5 ? 'Active breakout with volume — act now' : absChange >= 2 ? 'Fresh move detected' : 'Standard session';

  return { total, grade, priceEvent, volume, candle, structure, liquidity, relStrength, sector, keyLevel, volumeDesc, candleDesc, structureDesc, risk, invalidation, freshness };
}

// ═══ SCAN ENGINE ═══
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
  category: string;
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
  { id: 'b2', name: 'Intraday Breakout – New High', description: 'Price crossing today high with volume', icon: '🔥', category: 'breakout',
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
  { id: 'b5', name: '52 Week High Breakout', description: 'Making new 52-week highs today', icon: '🏔️', category: 'breakout',
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
  { id: 'b8', name: '30 Day Range Breakout', description: 'Price breaking 30-day consolidation range', icon: '📐', category: 'breakout',
    conditions: [
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.03 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 2 },
    ] },
  { id: 'b9', name: 'BTST – Gap Up Opening', description: 'Buy Today Sell Tomorrow – strong close for gap up', icon: '🎯', category: 'breakout',
    conditions: [
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'high', multiplier: 0.99 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '2', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },

  // ─── ORB PROXY ───
  { id: 'orb1', name: '15 Min ORB Proxy – Bullish', description: 'Opening range breakout proxy: strong expansion from open, close near high, with volume', icon: '⏱️', category: 'orb',
    conditions: [
      { measure: 'high', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.01 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.006 },
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'high', multiplier: 0.995 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'orb2', name: '15 Min ORB Proxy – Bearish', description: 'Opening range breakdown proxy: strong expansion below open, close near low, with volume', icon: '⏱️', category: 'orb',
    conditions: [
      { measure: 'low', operator: '<', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 0.99 },
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 0.994 },
      { measure: 'close', operator: '<=', compareType: 'measure', value: '', compareMeasure: 'low', multiplier: 1.005 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'orb3', name: '30 Min ORB Proxy – Bullish', description: 'Stronger opening range breakout proxy with broader session expansion', icon: '🕐', category: 'orb',
    conditions: [
      { measure: 'high', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.015 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.008 },
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'high', multiplier: 0.996 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.8 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '0.8', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'orb4', name: '30 Min ORB Proxy – Bearish', description: 'Stronger opening range breakdown proxy with broad selling pressure', icon: '🕐', category: 'orb',
    conditions: [
      { measure: 'low', operator: '<', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 0.985 },
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 0.992 },
      { measure: 'close', operator: '<=', compareType: 'measure', value: '', compareMeasure: 'low', multiplier: 1.004 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.8 },
      { measure: 'change_pct', operator: '<', compareType: 'number', value: '-0.8', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'orb5', name: 'ORB Proxy + Volume Breakout', description: 'Session expansion with close near high and 2x volume confirmation', icon: '💹', category: 'orb',
    conditions: [
      { measure: 'high', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.015 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.01 },
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'high', multiplier: 0.995 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 2 },
    ] },

  // ─── EMA (real EMA data) ───
  { id: 'ema1', name: 'Golden Crossover', description: 'EMA 50 crossing above EMA 200 — bullish', icon: '✨', category: 'ema',
    conditions: [
      { measure: 'ema50', operator: '>', compareType: 'measure', value: '', compareMeasure: 'ema200', multiplier: 1.0 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'ema50', multiplier: 1.0 },
    ] },
  { id: 'ema2', name: 'Death Crossover', description: 'EMA 50 below EMA 200 — bearish', icon: '💀', category: 'ema',
    conditions: [
      { measure: 'ema50', operator: '<', compareType: 'measure', value: '', compareMeasure: 'ema200', multiplier: 1.0 },
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'ema50', multiplier: 1.0 },
    ] },
  { id: 'ema3', name: 'EMA 20 > EMA 50 Crossover', description: 'Short-term trend turning bullish', icon: '📊', category: 'ema',
    conditions: [
      { measure: 'ema20', operator: '>', compareType: 'measure', value: '', compareMeasure: 'ema50', multiplier: 1.0 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'ema20', multiplier: 1.0 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.2 },
    ] },
  { id: 'ema4', name: 'Price Above All EMAs', description: 'Above EMA 20, 50, 100, 200 — strong uptrend', icon: '🟢', category: 'ema',
    conditions: [
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'ema20', multiplier: 1.0 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'ema50', multiplier: 1.0 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'ema200', multiplier: 1.0 },
    ] },
  { id: 'ema5', name: 'Price Below All EMAs', description: 'Below all key EMAs — strong downtrend', icon: '🔴', category: 'ema',
    conditions: [
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'ema20', multiplier: 1.0 },
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'ema50', multiplier: 1.0 },
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'ema200', multiplier: 1.0 },
    ] },
  { id: 'ema6', name: 'EMA 20 Bounce', description: 'Price bouncing off EMA 20 support with volume', icon: '↗️', category: 'ema',
    conditions: [
      { measure: 'low', operator: '<', compareType: 'measure', value: '', compareMeasure: 'ema20', multiplier: 1.01 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'ema20', multiplier: 1.0 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'ema7', name: 'Bullish EMA Stack', description: 'EMA 20 > 50 > 100 > 200 alignment — momentum', icon: '📈', category: 'ema',
    conditions: [
      { measure: 'ema20', operator: '>', compareType: 'measure', value: '', compareMeasure: 'ema50', multiplier: 1.0 },
      { measure: 'ema50', operator: '>', compareType: 'measure', value: '', compareMeasure: 'ema100', multiplier: 1.0 },
      { measure: 'ema100', operator: '>', compareType: 'measure', value: '', compareMeasure: 'ema200', multiplier: 1.0 },
    ] },

  // ─── MOMENTUM ───
  { id: 's1', name: 'Top Gainers (>3%)', description: 'Strong bullish momentum today', icon: '🟢', category: 'momentum',
    conditions: [{ measure: 'change_pct', operator: '>', compareType: 'number', value: '3', compareMeasure: '', multiplier: 1 }] },
  { id: 's2', name: 'Top Losers (<-2%)', description: 'Bearish pressure today', icon: '🔴', category: 'momentum',
    conditions: [{ measure: 'change_pct', operator: '<', compareType: 'number', value: '-2', compareMeasure: '', multiplier: 1 }] },
  { id: 's3', name: 'Strong Rally (>5%)', description: 'Stocks surging 5%+', icon: '🔥', category: 'momentum',
    conditions: [{ measure: 'change_pct', operator: '>', compareType: 'number', value: '5', compareMeasure: '', multiplier: 1 }] },
  { id: 'm4', name: 'Blasting Momentum', description: 'Huge move with massive volume – trending stocks', icon: '💨', category: 'momentum',
    conditions: [
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '4', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 2 },
    ] },
  { id: 'm5', name: 'Intraday Rockers', description: 'Big intraday range with volume – day traders delight', icon: '🎸', category: 'momentum',
    conditions: [
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '3', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'm6', name: 'Momentum Stocks', description: 'Consistent upward momentum with volume', icon: '⚡', category: 'momentum',
    conditions: [
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '2', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.3 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.0 },
    ] },

  // ─── VOLUME ───
  { id: 's5', name: 'Volume Breakout (2x)', description: 'Double average volume', icon: '📊', category: 'volume',
    conditions: [{ measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 2 }] },
  { id: 's7', name: 'Low Volume', description: 'Below half of average volume', icon: '🔇', category: 'volume',
    conditions: [{ measure: 'volume', operator: '<', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 0.5 }] },
  { id: 'v3', name: 'Volume Shockers (5x)', description: 'Exploding volume 5x average – unusual activity', icon: '🌊', category: 'volume',
    conditions: [{ measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 5 }] },
  { id: 'v4', name: 'Volume Buzzer', description: 'Rising volume day-over-day with price action', icon: '🔔', category: 'volume',
    conditions: [
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '1', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'v5', name: 'Swing Breakout + Volume', description: 'Breakout with high volume confirmation', icon: '📈', category: 'volume',
    conditions: [
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '2', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 2 },
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'high', multiplier: 0.98 },
    ] },

  // ─── CANDLESTICK ───
  { id: 'c1', name: 'Bullish Marubozu', description: 'Strong green candle, close near high', icon: '🟩', category: 'candle',
    conditions: [
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '2', compareMeasure: '', multiplier: 1 },
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'high', multiplier: 0.995 },
    ] },
  { id: 'c2', name: 'Bearish Marubozu', description: 'Strong red candle, close near low', icon: '🟥', category: 'candle',
    conditions: [
      { measure: 'change_pct', operator: '<', compareType: 'number', value: '-2', compareMeasure: '', multiplier: 1 },
      { measure: 'close', operator: '<=', compareType: 'measure', value: '', compareMeasure: 'low', multiplier: 1.005 },
    ] },
  { id: 'c3', name: 'Hammer Pattern', description: 'Long lower wick, small body – potential reversal', icon: '🔨', category: 'candle',
    conditions: [
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.0 },
      { measure: 'low', operator: '<', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 0.98 },
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'high', multiplier: 0.99 },
    ] },
  { id: 'c4', name: 'Shooting Star', description: 'Long upper wick – bearish reversal signal', icon: '⭐', category: 'candle',
    conditions: [
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.0 },
      { measure: 'high', operator: '>', compareType: 'measure', value: '', compareMeasure: 'close', multiplier: 1.02 },
      { measure: 'close', operator: '<=', compareType: 'measure', value: '', compareMeasure: 'low', multiplier: 1.01 },
    ] },
  { id: 'c5', name: 'Bullish Engulfing', description: 'Today body engulfs yesterday – bullish', icon: '🟢', category: 'candle',
    conditions: [
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '1.5', compareMeasure: '', multiplier: 1 },
      { measure: 'open', operator: '<', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.0 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.01 },
    ] },
  { id: 'c6', name: 'Dark Cloud Cover', description: 'Bearish reversal pattern', icon: '🌑', category: 'candle',
    conditions: [
      { measure: 'open', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.005 },
      { measure: 'change_pct', operator: '<', compareType: 'number', value: '-1', compareMeasure: '', multiplier: 1 },
    ] },

  // ─── INTRADAY ───
  { id: 'i1', name: 'Intraday Breakout + Volume', description: 'Rising price with rising volume intraday', icon: '📈', category: 'intraday',
    conditions: [
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.005 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'i2', name: 'Intraday Reversal', description: 'Opened down but recovering – reversal signal', icon: '🔄', category: 'intraday',
    conditions: [
      { measure: 'open', operator: '<', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 0.99 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.01 },
    ] },
  { id: 'i3', name: 'Narrow Range Day (NR7)', description: 'Smallest range – volatility contraction', icon: '◇', category: 'intraday',
    conditions: [
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '-0.5', compareMeasure: '', multiplier: 1 },
      { measure: 'change_pct', operator: '<', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'i4', name: 'Wide Range Day', description: 'High intraday range – strong move', icon: '↔️', category: 'intraday',
    conditions: [
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '3', compareMeasure: '', multiplier: 1 },
    ] },

  // ─── QUALITY ───
  { id: 's8', name: 'High ROE (>20%)', description: 'Superior return on equity', icon: '💎', category: 'quality',
    conditions: [{ measure: 'roe', operator: '>', compareType: 'number', value: '20', compareMeasure: '', multiplier: 1 }] },
  { id: 's9', name: 'Quality Compounders', description: 'ROE>15, ROCE>15, Low Debt', icon: '⭐', category: 'quality',
    conditions: [
      { measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'roce', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 's10', name: 'Debt Free Companies', description: 'Near-zero debt on books', icon: '🏦', category: 'quality',
    conditions: [{ measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.1', compareMeasure: '', multiplier: 1 }] },
  { id: 's11', name: 'Promoter Conviction (>60%)', description: 'Strong promoter holding', icon: '🛡️', category: 'quality',
    conditions: [{ measure: 'promoter_holding', operator: '>', compareType: 'number', value: '60', compareMeasure: '', multiplier: 1 }] },
  { id: 'q5', name: 'Negative Working Capital', description: 'Operational efficiency leaders', icon: '💡', category: 'quality',
    conditions: [
      { measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.3', compareMeasure: '', multiplier: 1 },
    ] },

  // ─── VALUE ───
  { id: 's12', name: 'Low PE Stocks (<15)', description: 'Value picks with low P/E', icon: '🏷️', category: 'value',
    conditions: [{ measure: 'pe_ratio', operator: '<', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 }] },
  { id: 's13', name: 'High Dividend (>3%)', description: 'Dividend yield above 3%', icon: '💰', category: 'value',
    conditions: [{ measure: 'dividend_yield', operator: '>', compareType: 'number', value: '3', compareMeasure: '', multiplier: 1 }] },
  { id: 's14', name: 'Value + Quality', description: 'PE<20, ROE>15, Low Debt', icon: '🎯', category: 'value',
    conditions: [
      { measure: 'pe_ratio', operator: '<', compareType: 'number', value: '20', compareMeasure: '', multiplier: 1 },
      { measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'v6', name: 'Undervalued Near High', description: 'Low PE stocks nearing 52W high', icon: '💎', category: 'value',
    conditions: [
      { measure: 'pe_ratio', operator: '<', compareType: 'number', value: '20', compareMeasure: '', multiplier: 1 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'week_52_high', multiplier: 0.9 },
    ] },
  { id: 'v7', name: 'Potential Multibagger', description: 'Growth + momentum + quality combined', icon: '👑', category: 'value',
    conditions: [
      { measure: 'roe', operator: '>', compareType: 'number', value: '18', compareMeasure: '', multiplier: 1 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '0', compareMeasure: '', multiplier: 1 },
      { measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'v8', name: 'Mighty Midcap Stocks', description: 'Mid-caps with robust fundamentals', icon: '💪', category: 'value',
    conditions: [
      { measure: 'market_cap', operator: '>', compareType: 'number', value: '5000', compareMeasure: '', multiplier: 1 },
      { measure: 'market_cap', operator: '<', compareType: 'number', value: '50000', compareMeasure: '', multiplier: 1 },
      { measure: 'roe', operator: '>', compareType: 'number', value: '12', compareMeasure: '', multiplier: 1 },
    ] },
  { id: 'v9', name: 'Stellar Smallcap Stocks', description: 'High-performing small-caps', icon: '🌟', category: 'value',
    conditions: [
      { measure: 'market_cap', operator: '<', compareType: 'number', value: '5000', compareMeasure: '', multiplier: 1 },
      { measure: 'roe', operator: '>', compareType: 'number', value: '15', compareMeasure: '', multiplier: 1 },
      { measure: 'debt_to_equity', operator: '<', compareType: 'number', value: '0.5', compareMeasure: '', multiplier: 1 },
    ] },

  // ─── VWAP ───
  { id: 'vw1', name: 'VWAP Bounce – Bullish', description: 'Price dipped below VWAP & bounced back with volume', icon: '📐', category: 'vwap',
    conditions: [
      { measure: 'low', operator: '<', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 0.995 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.003 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.0 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.3 },
    ] },
  { id: 'vw2', name: 'VWAP Bounce – Bearish', description: 'Price spiked above VWAP & rejected down', icon: '📉', category: 'vwap',
    conditions: [
      { measure: 'high', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.005 },
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 0.997 },
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.0 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.3 },
    ] },
  { id: 'vw3', name: 'VWAP Reclaim', description: 'Price reclaiming VWAP zone with strong volume', icon: '🔄', category: 'vwap',
    conditions: [
      { measure: 'open', operator: '<', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 0.998 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.005 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'vw4', name: 'VWAP Hold + Breakout', description: 'Held VWAP support and breaking out with momentum', icon: '🚀', category: 'vwap',
    conditions: [
      { measure: 'low', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 0.99 },
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'high', multiplier: 0.995 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '1', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'vw5', name: 'VWAP Rejection Short', description: 'Failed to hold above VWAP – short setup', icon: '⬇️', category: 'vwap',
    conditions: [
      { measure: 'open', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.002 },
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 0.998 },
      { measure: 'change_pct', operator: '<', compareType: 'number', value: '-0.5', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.3 },
    ] },

  // ─── SWING ───
  { id: 'sw1', name: 'Swing Trading – Large Cap', description: 'RSI sweet spot + volume on large caps', icon: '🔄', category: 'swing',
    conditions: [
      { measure: 'market_cap', operator: '>', compareType: 'number', value: '20000', compareMeasure: '', multiplier: 1 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '1', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.3 },
    ] },
  { id: 'sw2', name: 'Swing Fake and Move', description: 'Fakeout reversal with volume confirmation', icon: '🎭', category: 'swing',
    conditions: [
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.01 },
      { measure: 'low', operator: '<', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 0.995 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.3 },
    ] },
  { id: 'sw3', name: 'One Day Holding', description: 'Buy today sell tomorrow setup', icon: '📅', category: 'swing',
    conditions: [
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '2', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'sw4', name: 'Short Term Breakouts', description: 'Stocks breaking out above recent highs', icon: '🚀', category: 'swing',
    conditions: [
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.02 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'sw5', name: 'Swing High Volume', description: 'Institutional interest – high volume swings', icon: '🏛️', category: 'swing',
    conditions: [
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 2.5 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '1.5', compareMeasure: '', multiplier: 1 },
      { measure: 'market_cap', operator: '>', compareType: 'number', value: '1000', compareMeasure: '', multiplier: 1 },
    ] },

  // ─── PRICE ───
  { id: 's16', name: 'Penny Stocks (<₹50)', description: 'Low-price speculative stocks', icon: '🪙', category: 'price',
    conditions: [{ measure: 'close', operator: '<', compareType: 'number', value: '50', compareMeasure: '', multiplier: 1 }] },
  { id: 's17', name: 'Blue Chips (>₹2000)', description: 'Premium large cap stocks', icon: '💠', category: 'price',
    conditions: [{ measure: 'close', operator: '>', compareType: 'number', value: '2000', compareMeasure: '', multiplier: 1 }] },
  { id: 'p3', name: 'Mid-Range (₹100-₹500)', description: 'Affordable mid-range stocks', icon: '🔷', category: 'price',
    conditions: [
      { measure: 'close', operator: '>', compareType: 'number', value: '100', compareMeasure: '', multiplier: 1 },
      { measure: 'close', operator: '<', compareType: 'number', value: '500', compareMeasure: '', multiplier: 1 },
    ] },
];

const CATEGORIES = [
  { key: 'all', label: 'All Scans', icon: '◎', color: 'text-foreground' },
  { key: 'breakout', label: 'Breakouts', icon: '⚡', color: 'text-accent' },
  { key: 'orb', label: 'ORB', icon: '⏱️', color: 'text-[hsl(var(--terminal-cyan))]' },
  { key: 'ema', label: 'EMA / MA', icon: '📊', color: 'text-[hsl(var(--terminal-blue))]' },
  { key: 'momentum', label: 'Momentum', icon: '🟢', color: 'text-primary' },
  { key: 'candle', label: 'Candlestick', icon: '🕯️', color: 'text-[hsl(var(--terminal-purple))]' },
  { key: 'intraday', label: 'Intraday', icon: '📈', color: 'text-[hsl(var(--terminal-cyan))]' },
  { key: 'volume', label: 'Volume', icon: '🌊', color: 'text-[hsl(var(--terminal-blue))]' },
  { key: 'vwap', label: 'VWAP', icon: '📐', color: 'text-[hsl(var(--terminal-amber))]' },
  { key: 'swing', label: 'Swing', icon: '🔄', color: 'text-accent' },
  { key: 'quality', label: 'Quality', icon: '💎', color: 'text-[hsl(var(--terminal-purple))]' },
  { key: 'value', label: 'Value', icon: '🏷️', color: 'text-primary' },
  { key: 'price', label: 'Price', icon: '🪙', color: 'text-accent' },
];

const CATEGORY_ACCENT: Record<string, string> = {
  breakout: 'border-l-[hsl(var(--terminal-amber))]',
  orb: 'border-l-[hsl(var(--terminal-cyan))]',
  ema: 'border-l-[hsl(var(--terminal-blue))]',
  momentum: 'border-l-primary',
  candle: 'border-l-[hsl(var(--terminal-purple))]',
  intraday: 'border-l-[hsl(var(--terminal-cyan))]',
  volume: 'border-l-[hsl(var(--terminal-blue))]',
  vwap: 'border-l-[hsl(var(--terminal-amber))]',
  swing: 'border-l-[hsl(var(--terminal-amber))]',
  quality: 'border-l-[hsl(var(--terminal-purple))]',
  value: 'border-l-primary',
  price: 'border-l-[hsl(var(--terminal-amber))]',
};

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

function runConditions(conditions: Omit<Condition, 'id'>[]): Stock[] {
  const stocks = getAllStocks();
  return stocks.filter(stock => {
    return conditions.every(cond => {
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
    });
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
  const color = pct >= 70 ? 'bg-primary' : pct >= 40 ? 'bg-[hsl(var(--terminal-blue))]' : 'bg-destructive/60';
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
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.99 }}
      className="t-card overflow-hidden border-l-2 border-l-primary">
      <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-4">
          <Link to={`/stock/${stock.symbol}`} className="hover:text-primary transition-colors">
            <span className="text-lg font-black text-foreground">{stock.symbol}</span>
            <p className="text-[9px] text-muted-foreground">{stock.name}</p>
          </Link>
          <span className="text-[9px] text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">{stock.sector}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right font-data">
            <span className="text-lg font-black text-foreground">{formatCurrency(stock.ltp)}</span>
            <span className={`text-sm font-bold ml-2 ${stock.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {stock.change_pct >= 0 ? '▲' : '▼'} {formatPercent(stock.change_pct)}
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
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg ml-2 hover:bg-secondary/60 w-7 h-7 rounded-md flex items-center justify-center transition-colors">✕</button>
        </div>
      </div>

      <div className="px-5 py-2 bg-primary/5 border-b border-border/20">
        <span className="text-[10px] text-primary font-bold">● {qs.freshness}</span>
      </div>

      <div className="px-5 py-3 border-b border-border/20">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="text-foreground font-semibold">{stock.symbol}</span> — {stock.change_pct >= 0 ? 'up' : 'down'} {Math.abs(stock.change_pct).toFixed(1)}% with {volRatio.toFixed(1)}x relative volume.
          {qs.keyLevel} · {qs.candleDesc} · {qs.structureDesc}.
        </p>
      </div>

      <div className="grid grid-cols-3 border-b border-border/20">
        {[
          { icon: '🎯', label: 'Key Level', val: qs.keyLevel, sub: `₹${stock.ltp.toFixed(2)}` },
          { icon: '📊', label: 'Volume', val: qs.volumeDesc, sub: `${formatVolume(stock.volume)} shares` },
          { icon: '🕯️', label: 'Candle', val: qs.candleDesc, sub: `Body ${((Math.abs(stock.ltp - stock.open) / Math.max(stock.high - stock.low, 0.01)) * 100).toFixed(0)}% of range` },
        ].map((item, i) => (
          <div key={i} className={`p-3 ${i < 2 ? 'border-r border-border/20' : ''}`}>
            <p className="text-[8px] text-muted-foreground mb-0.5">{item.icon} {item.label}</p>
            <p className="text-[11px] font-bold text-foreground">{item.val}</p>
            <p className="text-[9px] text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

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

      <div className="px-5 py-3 bg-secondary/20 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-accent">⚠ Risk</span>
          <span className="text-[9px] text-muted-foreground">{qs.risk}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-destructive">🚫 Invalidation</span>
          <span className="text-[9px] text-muted-foreground">{qs.invalidation}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ═══ MAIN COMPONENT ═══
export default function Scanner() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeScan, setActiveScan] = useState<ScanPreset | null>(null);
  const [scanResults, setScanResults] = useState<Stock[] | null>(null);
  const [expandedStock, setExpandedStock] = useState<string | null>(null);
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

  const sortedResults = useMemo(() => {
    if (!scanResults) return null;
    return [...scanResults].sort((a, b) => {
      const av = getStockValue(a, sortKey) || 0;
      const bv = getStockValue(b, sortKey) || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [scanResults, sortKey, sortDir]);

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

  // Stats bar
  const totalStocks = getAllStocks().length;
  const topScanCount = useMemo(() => {
    let max = 0; let maxName = '';
    Object.entries(scanCounts).forEach(([id, c]) => { if (c > max) { max = c; maxName = DEFAULT_SCANS.find(s => s.id === id)?.name || ''; } });
    return { count: max, name: maxName };
  }, [scanCounts]);

  return (
    <div className="p-4 max-w-[1600px] mx-auto space-y-4">
      {/* ═══ Premium Header ═══ */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-[hsl(var(--terminal-cyan)/0.1)] flex items-center justify-center border border-primary/20">
              <span className="text-sm">⊕</span>
            </span>
            Scanner
          </h1>
          <p className="text-[10px] text-muted-foreground mt-1 ml-11">
            {totalStocks} stocks · {DEFAULT_SCANS.length} algorithms · {CATEGORIES.length - 1} categories · 7-pillar quality scoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-card rounded-lg px-3 py-2 border border-border/40 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-live" />
            <span className="text-[9px] text-muted-foreground font-medium">Most Active: </span>
            <span className="text-[9px] text-primary font-bold">{topScanCount.name}</span>
            <span className="text-[9px] text-foreground font-bold font-data">({topScanCount.count})</span>
          </div>
        </div>
      </motion.div>

      {/* ═══ Category Tabs ═══ */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((c, i) => {
          const count = c.key === 'all' ? DEFAULT_SCANS.length : DEFAULT_SCANS.filter(s => s.category === c.key).length;
          const isActive = selectedCategory === c.key;
          return (
            <motion.button key={c.key} onClick={() => setSelectedCategory(c.key)}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-semibold border whitespace-nowrap transition-all duration-200
                ${isActive
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.1)]'
                  : 'bg-card/80 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/60 hover:bg-card'}`}>
              <span className="text-sm">{c.icon}</span>
              <span>{c.label}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-primary/15 text-primary' : 'bg-secondary/80 text-muted-foreground/70'}`}>{count}</span>
            </motion.button>
          );
        })}
      </div>

      {/* ═══ Scan Cards Grid ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        <AnimatePresence mode="popLayout">
          {filteredScans.map((scan, i) => {
            const count = scanCounts[scan.id] || 0;
            const isActive = activeScan?.id === scan.id;
            const accent = CATEGORY_ACCENT[scan.category] || 'border-l-primary';
            return (
              <motion.button key={scan.id} onClick={() => selectScan(scan)}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, delay: i * 0.015 }}
                className={`text-left p-3 rounded-lg border border-l-[3px] transition-all duration-200 group relative overflow-hidden
                  ${accent}
                  ${isActive
                    ? 'bg-primary/5 border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.08)]'
                    : 'bg-card/80 border-border/30 hover:bg-card hover:border-border/60'}`}>
                {/* Subtle top gradient */}
                <div className={`absolute inset-x-0 top-0 h-px ${isActive ? 'bg-gradient-to-r from-transparent via-primary/40 to-transparent' : 'bg-transparent'}`} />

                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-base group-hover:scale-110 transition-transform duration-200">{scan.icon}</span>
                  <span className={`text-[10px] font-black font-data px-2 py-0.5 rounded-full transition-colors
                    ${count > 0
                      ? isActive ? 'bg-primary/15 text-primary' : 'bg-primary/8 text-primary'
                      : 'bg-secondary/60 text-muted-foreground/50'}`}>
                    {count}
                  </span>
                </div>
                <p className={`text-[10px] font-bold mb-0.5 transition-colors ${isActive ? 'text-primary' : 'text-foreground group-hover:text-foreground'}`}>
                  {scan.name}
                </p>
                <p className="text-[8px] text-muted-foreground/80 leading-relaxed line-clamp-2">{scan.description}</p>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ═══ RESULTS ═══ */}
      <AnimatePresence>
        {scanResults && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 rounded-full bg-primary" />
                <div>
                  <h2 className="text-[13px] font-black text-foreground flex items-center gap-2">
                    {activeScan?.icon} {activeScan?.name}
                    <span className="text-[10px] font-bold text-primary font-data bg-primary/8 px-2 py-0.5 rounded-full">
                      {filteredResults?.length || 0} matches
                    </span>
                  </h2>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Click any row for detailed quality analysis</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {filteredResults && filteredResults.length > 0 && (
                  <button onClick={exportCSV}
                    className="px-3 py-1.5 rounded-md text-[10px] font-medium bg-card text-muted-foreground border border-border/40 hover:text-foreground hover:border-border/60 transition-all flex items-center gap-1.5">
                    <span className="text-xs">↓</span> Export
                  </button>
                )}
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Filter results..." value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0); }}
                    className="bg-card border border-border/40 rounded-md pl-8 pr-3 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground w-40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-all" />
                </div>
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
              <div className="t-card-static overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-secondary/20 border-b border-border/40">
                        <th className="px-3 py-2.5 text-left text-[9px] font-semibold text-muted-foreground w-8">#</th>
                        {RESULT_COLUMNS.map(col => (
                          <th key={col.key} onClick={() => handleSort(col.key)}
                            className={`px-3 py-2.5 text-[9px] font-semibold cursor-pointer select-none transition-colors hover:text-foreground
                              ${col.align === 'right' ? 'text-right' : 'text-left'}
                              ${sortKey === col.key ? 'text-primary' : 'text-muted-foreground'}`}>
                            {col.label} {sortKey === col.key && <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>}
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
                            className={`border-b border-border/10 cursor-pointer transition-all duration-150
                              ${isExpanded ? 'bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'hover:bg-secondary/20 hover:shadow-[inset_3px_0_0_hsl(var(--primary)/0.3)]'}`}>
                            <td className="px-3 py-2.5 text-muted-foreground/60 text-[9px] font-data">{page * PAGE_SIZE + idx + 1}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <GradeBadge grade={qs.grade} />
                                <div>
                                  <Link to={`/stock/${stock.symbol}`} onClick={e => e.stopPropagation()}
                                    className="font-bold text-foreground text-[11px] hover:text-primary transition-colors">{stock.symbol}</Link>
                                  <p className="text-[8px] text-muted-foreground/70 hidden sm:block">{stock.sector}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-foreground font-medium font-data">{formatCurrency(stock.ltp)}</td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold font-data
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
                              <span className={`text-[10px] font-black font-data ${qs.total >= 65 ? 'text-primary' : qs.total >= 45 ? 'text-accent' : 'text-muted-foreground'}`}>
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
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/20 bg-secondary/10">
                    <span className="text-[9px] text-muted-foreground font-data">
                      Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredResults!.length)} of {filteredResults!.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        className="px-3 py-1.5 rounded-md text-[9px] font-medium bg-card text-muted-foreground border border-border/40 hover:text-foreground disabled:opacity-30 transition-all">
                        ← Prev
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                        return (
                          <button key={pageNum} onClick={() => setPage(pageNum)}
                            className={`w-7 h-7 rounded-md text-[9px] font-bold font-data transition-all
                              ${page === pageNum ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}>
                            {pageNum + 1}
                          </button>
                        );
                      })}
                      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        className="px-3 py-1.5 rounded-md text-[9px] font-medium bg-card text-muted-foreground border border-border/40 hover:text-foreground disabled:opacity-30 transition-all">
                        Next →
                      </button>
                    </div>
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
      </AnimatePresence>

      {/* Empty State */}
      {!scanResults && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="t-card p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/3 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-[hsl(var(--terminal-cyan)/0.05)] flex items-center justify-center mx-auto mb-4 border border-primary/10">
              <span className="text-3xl">⊕</span>
            </div>
            <p className="text-sm font-bold text-foreground mb-1">Select a scan to get started</p>
            <p className="text-[10px] text-muted-foreground max-w-md mx-auto">
              Choose from {DEFAULT_SCANS.length} pre-built algorithms across {CATEGORIES.length - 1} categories.
              Each result includes a 7-pillar quality score for actionable insights.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
