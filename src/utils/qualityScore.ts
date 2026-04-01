// ═══ QUALITY SCORE ENGINE ═══
// Extracted from Scanner.tsx for reusability

import type { Stock } from '@/data/mockData';

export interface QualityScore {
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

export function computeQualityScore(stock: Stock): QualityScore {
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
