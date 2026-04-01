// ═══ SCAN PRESET DEFINITIONS ═══
// Extracted from Scanner.tsx for maintainability

export interface Condition {
  id: string;
  measure: string;
  operator: string;
  compareType: 'number' | 'measure';
  value: string;
  compareMeasure: string;
  multiplier: number;
}

export interface ScanPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  conditions: Omit<Condition, 'id'>[];
}

export const DEFAULT_SCANS: ScanPreset[] = [
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

  // ─── VWAP PROXY ───
  { id: 'vw1', name: 'VWAP Bounce – Bullish', description: 'Price dipped below session avg & bounced back', icon: '📐', category: 'vwap',
    conditions: [
      { measure: 'low', operator: '<', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 0.995 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.003 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.0 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.3 },
    ] },
  { id: 'vw2', name: 'VWAP Bounce – Bearish', description: 'Price spiked above session avg & rejected', icon: '📉', category: 'vwap',
    conditions: [
      { measure: 'high', operator: '>', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 1.005 },
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'open', multiplier: 0.997 },
      { measure: 'close', operator: '<', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.0 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.3 },
    ] },
  { id: 'vw3', name: 'VWAP Proxy Reclaim', description: 'Price reclaiming session average zone (proxy – no real VWAP)', icon: '🔄', category: 'vwap',
    conditions: [
      { measure: 'open', operator: '<', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 0.998 },
      { measure: 'close', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 1.005 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'vw4', name: 'VWAP Proxy Hold + Breakout', description: 'Held session avg support and breaking out (proxy – no real VWAP)', icon: '🚀', category: 'vwap',
    conditions: [
      { measure: 'low', operator: '>', compareType: 'measure', value: '', compareMeasure: 'prev_close', multiplier: 0.99 },
      { measure: 'close', operator: '>=', compareType: 'measure', value: '', compareMeasure: 'high', multiplier: 0.995 },
      { measure: 'change_pct', operator: '>', compareType: 'number', value: '1', compareMeasure: '', multiplier: 1 },
      { measure: 'volume', operator: '>', compareType: 'measure', value: '', compareMeasure: 'avg_volume_10d', multiplier: 1.5 },
    ] },
  { id: 'vw5', name: 'VWAP Proxy Rejection Short', description: 'Failed to hold above session avg – short setup (proxy – no real VWAP)', icon: '⬇️', category: 'vwap',
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

export const CATEGORIES = [
  { key: 'all', label: 'All Scans', icon: '◎', color: 'text-foreground' },
  { key: 'breakout', label: 'Breakouts', icon: '⚡', color: 'text-accent' },
  { key: 'orb', label: 'ORB', icon: '⏱️', color: 'text-[hsl(var(--terminal-cyan))]' },
  { key: 'ema', label: 'EMA / MA', icon: '📊', color: 'text-[hsl(var(--terminal-blue))]' },
  { key: 'momentum', label: 'Momentum', icon: '🟢', color: 'text-primary' },
  { key: 'candle', label: 'Candlestick', icon: '🕯️', color: 'text-[hsl(var(--terminal-purple))]' },
  { key: 'intraday', label: 'Intraday', icon: '📈', color: 'text-[hsl(var(--terminal-cyan))]' },
  { key: 'volume', label: 'Volume', icon: '🌊', color: 'text-[hsl(var(--terminal-blue))]' },
  { key: 'vwap', label: 'VWAP Proxy', icon: '📐', color: 'text-[hsl(var(--terminal-amber))]' },
  { key: 'swing', label: 'Swing', icon: '🔄', color: 'text-accent' },
  { key: 'quality', label: 'Quality', icon: '💎', color: 'text-[hsl(var(--terminal-purple))]' },
  { key: 'value', label: 'Value', icon: '🏷️', color: 'text-primary' },
  { key: 'price', label: 'Price', icon: '🪙', color: 'text-accent' },
];

export const CATEGORY_ACCENT: Record<string, string> = {
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

export const RESULT_COLUMNS = [
  { key: 'symbol', label: 'Stock', align: 'left' as const },
  { key: 'ltp', label: 'Price', align: 'right' as const },
  { key: 'change_pct', label: '% Chg', align: 'right' as const },
  { key: 'volume', label: 'Volume', align: 'right' as const },
  { key: 'market_cap', label: 'MCap', align: 'right' as const },
  { key: 'pe_ratio', label: 'P/E', align: 'right' as const },
  { key: 'roe', label: 'ROE', align: 'right' as const },
  { key: 'score', label: 'Score', align: 'right' as const },
];

export const EMA_MEASURES = new Set(['ema9', 'ema20', 'ema50', 'ema100', 'ema200', 'sma20', 'sma50', 'sma200']);

export function scanUsesEMA(conditions: Omit<Condition, 'id'>[]): boolean {
  return conditions.some(c => EMA_MEASURES.has(c.measure) || EMA_MEASURES.has(c.compareMeasure));
}
