import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * TradingAgents — Institutional Multi-Agent Framework
 * Inspired by TauricResearch/TradingAgents multi-agent debate architecture
 * 
 * ARCHITECTURE:
 *   Analyst Team → Bull/Bear Debate → Decision Committee → Risk Manager
 *   Each agent cross-validates previous agents' claims against raw data.
 *
 * CORE ACCURACY PRINCIPLES:
 *   1. ONLY use live data provided — never hallucinate prices or levels
 *   2. When data is missing, say "N/A" — never fabricate
 *   3. All ₹ levels must come from calculations or the provided data
 *   4. Targets/SL must be within realistic ATR-based ranges
 *   5. Never claim certainty — always express as probability
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── DB Cache ────────────────────────────────────────────────
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getCacheKey(symbol: string, mode: string, optionsConfig?: any): string {
  const base = `${symbol.toUpperCase()}:${mode}`;
  if (mode === "options" && optionsConfig) {
    return `${base}:${optionsConfig.tradeType || ""}:${optionsConfig.rrFilter || ""}`;
  }
  return base;
}

async function getDBCache(cacheKey: string): Promise<any | null> {
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from("ai_analysis_cache")
      .select("result")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();
    return data?.result || null;
  } catch { return null; }
}

async function setDBCache(cacheKey: string, symbol: string, mode: string, result: any) {
  try {
    const sb = getSupabaseAdmin();
    await sb.from("ai_analysis_cache").upsert({
      cache_key: cacheKey,
      symbol,
      mode,
      result,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }, { onConflict: "cache_key" });
  } catch (e) { console.error("Cache write error:", e); }
}

// ── Model Selection (cost-optimized tiers) ──────────────────
const MODELS = {
  scalp:   { analysis: "google/gemini-3-flash-preview", decision: "google/gemini-3-flash-preview" },
  swing:   { research: "google/gemini-2.5-pro", debate: "google/gemini-3-flash-preview", decision: "google/gemini-2.5-pro" },
  invest:  { fundamentals: "google/gemini-2.5-pro", context: "google/gemini-2.5-pro", decision: "google/gemini-2.5-pro" },
  options: { analysis: "google/gemini-3-flash-preview", decision: "google/gemini-3-flash-preview" },
};

// ── ACCURACY RULES (injected into every prompt) ──────────
const ACCURACY_RULES = `
## MANDATORY ACCURACY RULES (NEVER VIOLATE)
1. **DATA GROUNDING**: Use ONLY the exact numbers provided below. Missing data → "data unavailable". NEVER fabricate.
2. **PRICE ANCHORING**: CMP is in the data. All S/R, targets, SL MUST derive from provided EMAs, pivots, S/D zones, Bollinger bands.
3. **NO HALLUCINATED LEVELS**: If you can't calculate from data, DON'T include it. Say "insufficient data".
4. **REALISTIC TARGETS**: Scalp: 0.5-1.5x ATR. Intraday: 1-2x ATR. Swing: 2-4x ATR. Invest: ±15-25% of CMP.
5. **PROBABILITY NOT CERTAINTY**: Use "likely", "probable" — NEVER "will", "guaranteed", "certain".
6. **SPLIT/BONUS AWARENESS**: CMP is current split-adjusted. NEVER reference old pre-split prices.
7. **HONEST CONFIDENCE**: Limited data → lower confidence. 85%+ requires 4+ factor confirmation.
8. **INDIAN MARKET CONTEXT**: NSE/BSE 9:15-15:30 IST. Weekly expiry Thursday. Monthly last Thursday. Use ₹.
9. **CROSS-VALIDATION**: If your target contradicts the ATR range or provided S/R levels, RECALCULATE. 
10. **NO ROUND-TRIP BIAS**: Don't assume the stock will return to a previous high. Analyze current structure only.`;

// ── Enhanced Technical Framework ────────────────────────────
const TECHNICAL_FRAMEWORK = `**TECHNICAL ANALYSIS FRAMEWORK** (analyze in exact priority order):

1. **PRICE ACTION & SUPPLY/DEMAND** (40% weight)
   - Trend structure: HH/HL (bullish) or LH/LL (bearish)
   - BOS (Break of Structure) / CHoCH (Change of Character) — identify from recent candles
   - Supply zones (institutional selling) with EXACT ₹ levels FROM DATA
   - Demand zones (institutional buying) with EXACT ₹ levels FROM DATA
   - Order blocks, FVGs (Fair Value Gaps), liquidity sweeps
   - Wyckoff phases: Accumulation, Markup, Distribution, Markdown

2. **MULTI-TIMEFRAME S/R** (25% weight)
   - Daily pivot + S1/S2/S3, R1/R2/R3 — USE EXACT VALUES PROVIDED
   - Swing highs/lows — USE EXACT VALUES PROVIDED
   - Round number psychology (₹100, ₹500, ₹1000 levels)
   - PDH/PDL/PDC — USE EXACT VALUES PROVIDED
   - Fibonacci retracements from recent swing (if calculable from data)

3. **EMA ALIGNMENT** (15% weight)
   - EMA 9/20/50/200 stack — USE EXACT VALUES
   - Price position vs EMAs — calculate % distance
   - Golden Cross (50>200) / Death Cross signals
   - Dynamic S/R from EMA touches

4. **VOLUME & MOMENTUM** (15% weight)
   - Volume-price confirmation/divergence — USE EXACT RATIO
   - RSI divergence (price making new high/low but RSI not confirming)
   - Bollinger squeeze/expansion — USE EXACT VALUES
    - Climactic volume, no-demand bars

5. **CANDLE PATTERNS** (5% weight — only at key S/R or S/D zones)
   - Engulfing, pin bars, inside bars AT confirmed levels only
   - Never trade a pattern in isolation`;

// ── AI Call Helpers ──────────────────────────────────────────
async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function callAIRaw(apiKey: string, system: string, user: string | Array<any>, model: string): Promise<string> {
  const messages = [{ role: "system", content: system }, { role: "user", content: user }];
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, temperature: 0.12 }),
    });
    if (resp.ok) {
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "No response";
    }
    if (resp.status === 429 && attempt < MAX_RETRIES) {
      await sleep(Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000);
      continue;
    }
    if (resp.status === 429) throw new Error("RATE_LIMITED");
    if (resp.status === 402) throw new Error("CREDITS_EXHAUSTED");
    const t = await resp.text();
    throw new Error(`AI error ${resp.status}: ${t}`);
  }
  throw new Error("Max retries exceeded");
}

async function callAI(apiKey: string, system: string, user: string, model: string): Promise<string> {
  return callAIRaw(apiKey, system, user, model);
}

async function callAIWithImage(apiKey: string, system: string, userText: string, imageUrl: string, model: string): Promise<string> {
  return callAIRaw(apiKey, system, [
    { type: "text", text: userText },
    { type: "image_url", image_url: { url: imageUrl } },
  ], model);
}

// ── Section Parser ──────────────────────────────────────────
function parseSections(text: string, sectionMap: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const parts = text.split(/(?=^##\s)/m);
  for (const part of parts) {
    const headerMatch = part.match(/^##\s*(.+)/m);
    if (!headerMatch) continue;
    const headerText = headerMatch[1].trim().toUpperCase();
    const content = part.replace(/^##\s*.+\n?/, "").trim();
    for (const [pattern, agentKey] of Object.entries(sectionMap)) {
      if (headerText.includes(pattern.toUpperCase())) {
        result[agentKey] = content;
        break;
      }
    }
  }
  return result;
}

function ensureKeys(parsed: Record<string, string>, keys: string[], fullText: string): Record<string, string> {
  const result = { ...parsed };
  const missingKeys = keys.filter(k => !result[k] || result[k].length < 20);
  if (missingKeys.length > 0 && Object.keys(parsed).length === 0) {
    result[keys[0]] = fullText;
    for (let i = 1; i < keys.length; i++) {
      result[keys[i]] = result[keys[i]] || "See above section for combined analysis.";
    }
  }
  return result;
}

// ── Enhanced Stock Data Fetcher ─────────────────────────────
async function fetchStockData(symbol: string, range = "3mo") {
  const ySymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;
  try {
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ySymbol}?interval=1d&range=${range}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const closes = result.indicators?.quote?.[0]?.close || [];
    const highs = result.indicators?.quote?.[0]?.high || [];
    const lows = result.indicators?.quote?.[0]?.low || [];
    const opens = result.indicators?.quote?.[0]?.open || [];
    const volumes = result.indicators?.quote?.[0]?.volume || [];
    
    let lastClose = null, prevClose = null;
    for (let i = closes.length - 1; i >= 0; i--) {
      if (closes[i] != null && closes[i] > 0) {
        if (lastClose === null) lastClose = closes[i];
        else if (prevClose === null) { prevClose = closes[i]; break; }
      }
    }
    if (lastClose === null) lastClose = meta.regularMarketPrice || meta.previousClose || 0;
    if (prevClose === null) prevClose = meta.previousClose || meta.chartPreviousClose || lastClose;
    
    const change = lastClose - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const sma20 = closes.slice(-20).reduce((a: number, b: number) => a + (b || 0), 0) / 20;
    const sma50 = closes.slice(-50).reduce((a: number, b: number) => a + (b || 0), 0) / Math.min(50, closes.length);
    const avgVol = volumes.slice(-10).reduce((a: number, b: number) => a + (b || 0), 0) / 10;
    const high52 = Math.max(...closes.filter((c: any) => c));
    const low52 = Math.min(...closes.filter((c: any) => c && c > 0));

    const calcEMA = (arr: number[], period: number) => {
      if (arr.length < period) return null;
      const k = 2 / (period + 1);
      let e = arr.slice(0, period).reduce((a: number, b: number) => a + (b || 0), 0) / period;
      for (let i = period; i < arr.length; i++) e = (arr[i] || 0) * k + e * (1 - k);
      return e;
    };
    const ema9 = calcEMA(closes, 9);
    const ema20 = calcEMA(closes, 20);
    const ema50 = calcEMA(closes, 50);
    const ema200 = calcEMA(closes, 200);




    const recentCandles = [];
    for (let i = Math.max(0, closes.length - 10); i < closes.length; i++) {
      recentCandles.push({ o: opens[i], h: highs[i], l: lows[i], c: closes[i], v: volumes[i] });
    }

    // ATR calculation
    const atrPeriod = Math.min(14, closes.length - 1);
    let atrSum = 0;
    for (let i = closes.length - atrPeriod; i < closes.length; i++) {
      const tr = Math.max(
        (highs[i] || 0) - (lows[i] || 0),
        Math.abs((highs[i] || 0) - (closes[i - 1] || 0)),
        Math.abs((lows[i] || 0) - (closes[i - 1] || 0))
      );
      atrSum += tr;
    }
    const atr14 = atrSum / atrPeriod;

    const todayVol = volumes[volumes.length - 1] || 0;
    const volRatio = avgVol > 0 ? (todayVol / avgVol).toFixed(2) : "N/A";
    const pdh = highs[highs.length - 2] || 0;
    const pdl = lows[lows.length - 2] || 0;
    const pdc = closes[closes.length - 2] || 0;

    // RSI
    let rsiGains = 0, rsiLosses = 0;
    const rsiPeriod = Math.min(14, closes.length - 1);
    for (let i = closes.length - rsiPeriod; i < closes.length; i++) {
      const diff = (closes[i] || 0) - (closes[i - 1] || 0);
      if (diff > 0) rsiGains += diff; else rsiLosses += Math.abs(diff);
    }
    const avgGain = rsiGains / rsiPeriod;
    const avgLoss = rsiLosses / rsiPeriod;
    const rsi14 = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

    // RSI divergence detection
    let rsiDivergence = "None";
    if (closes.length >= 20) {
      const recentHigh = Math.max(...closes.slice(-10).filter(Boolean));
      const prevHigh = Math.max(...closes.slice(-20, -10).filter(Boolean));
      if (recentHigh > prevHigh && rsi14 < 60) rsiDivergence = "Bearish (price HH, RSI not confirming)";
      const recentLow = Math.min(...closes.slice(-10).filter(c => c > 0));
      const prevLow = Math.min(...closes.slice(-20, -10).filter(c => c > 0));
      if (recentLow < prevLow && rsi14 > 40) rsiDivergence = "Bullish (price LL, RSI not confirming)";
    }

    // Enhanced S/D zones with strength scoring
    const supplyDemandZones: string[] = [];
    for (let i = Math.max(2, closes.length - 25); i < closes.length - 1; i++) {
      const body = Math.abs((closes[i] || 0) - (opens[i] || 0));
      const range = (highs[i] || 0) - (lows[i] || 0);
      if (range > 0 && body > range * 0.55) {
        const isBullish = (closes[i] || 0) > (opens[i] || 0);
        const volSpike = (volumes[i] || 0) > (avgVol * 1.2);
        const strength = volSpike ? "●●●" : ((volumes[i] || 0) > avgVol ? "●●" : "●");
        if (isBullish && volSpike) {
          supplyDemandZones.push(`Demand ${strength}: ₹${lows[i]?.toFixed(2)}-₹${opens[i]?.toFixed(2)}`);
        } else if (!isBullish && volSpike) {
          supplyDemandZones.push(`Supply ${strength}: ₹${opens[i]?.toFixed(2)}-₹${highs[i]?.toFixed(2)}`);
        }
      }
    }

    // Swing points
    const swingPoints: string[] = [];
    for (let i = Math.max(2, closes.length - 20); i < closes.length - 2; i++) {
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        swingPoints.push(`SwingHigh: ₹${highs[i]?.toFixed(2)}`);
      }
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        swingPoints.push(`SwingLow: ₹${lows[i]?.toFixed(2)}`);
      }
    }

    // Trend structure
    let trendStructure = "Unclear";
    if (closes.length >= 10) {
      const recent5 = closes.slice(-5).filter(Boolean);
      const prev5 = closes.slice(-10, -5).filter(Boolean);
      const recentAvg = recent5.reduce((a: number, b: number) => a + b, 0) / recent5.length;
      const prevAvg = prev5.reduce((a: number, b: number) => a + b, 0) / prev5.length;
      const pctChange = ((recentAvg - prevAvg) / prevAvg) * 100;
      if (pctChange > 3) trendStructure = "Strong Uptrend (HH/HL)";
      else if (pctChange > 1) trendStructure = "Mild Uptrend";
      else if (pctChange < -3) trendStructure = "Strong Downtrend (LH/LL)";
      else if (pctChange < -1) trendStructure = "Mild Downtrend";
      else trendStructure = "Sideways/Consolidation";
    }

    // Pivot calculations
    const lastHigh = highs[highs.length - 1] || 0;
    const lastLow = lows[lows.length - 1] || 0;
    const pivot = (lastHigh + lastLow + lastClose) / 3;

    // Bollinger Bands
    const bb20 = closes.slice(-20);
    const bbMid = bb20.reduce((a: number, b: number) => a + (b || 0), 0) / 20;
    const bbStd = Math.sqrt(bb20.reduce((sum: number, v: number) => sum + ((v || 0) - bbMid) ** 2, 0) / 20);
    const bbWidth = lastClose > 0 ? ((2 * bbStd * 2) / lastClose * 100).toFixed(2) : "N/A";

    // Distance from 52W high/low
    const distFrom52H = high52 > 0 ? (((lastClose - high52) / high52) * 100).toFixed(1) : "N/A";
    const distFrom52L = low52 > 0 ? (((lastClose - low52) / low52) * 100).toFixed(1) : "N/A";

    return {
      symbol, price: lastClose, change, changePct, prevClose,
      high: meta.regularMarketDayHigh, low: meta.regularMarketDayLow,
      volume: todayVol, avgVolume: avgVol,
      sma20, sma50, high52, low52,
      ema9, ema20, ema50, ema200,
      atr14, rsi14, volRatio, pdh, pdl, pdc,
      rsiDivergence, trendStructure,
      bbWidth, distFrom52H, distFrom52L,
      pivot, s1: 2 * pivot - lastHigh, s2: pivot - (lastHigh - lastLow),
      r1: 2 * pivot - lastLow, r2: pivot + (lastHigh - lastLow),
      bollingerUpper: bbMid + 2 * bbStd, bollingerMid: bbMid, bollingerLower: bbMid - 2 * bbStd,
      supplyDemandZones: supplyDemandZones.slice(-6),
      swingPoints: swingPoints.slice(-8),
      recentCandles,
      recentCloses: closes.slice(-20), recentVolumes: volumes.slice(-10),
    };
  } catch { return null; }
}

// ════════════════════════════════════════════════════════════
// CONSOLIDATED PIPELINE PROMPTS
// ════════════════════════════════════════════════════════════

// ── SCALP: Call 1 ──
const SCALP_ANALYSIS_SYSTEM = `You are a **World-Class Intraday Price Action Specialist** at a proprietary trading desk managing ₹500 Cr+ in daily volume. PURELY technical — NO fundamentals.

${ACCURACY_RULES}

${TECHNICAL_FRAMEWORK}

Provide TWO sections:

## TECHNICAL ANALYSIS

Analyze ONLY from provided data, in priority order:
- **Trend Structure**: State the current structure (HH/HL or LH/LL) from the trend data provided
- **Price Action & S/D Zones**: Use EXACT S/D zones and swing points from data. Note BOS/CHoCH if visible.
- **Key S/R Levels**: EXACT PDH/PDL/PDC, pivot, S1/S2, R1/R2 from data. Don't invent levels.
- **EMA Stack**: Compare EXACT EMA 9/20/50 values. State which are above/below price with % distance.
- **Volume & VWAP**: EXACT volume ratio. Above/below 1.0x average. Note if climactic.
- **RSI**: EXACT value. Divergence status. Overbought (>70), oversold (<30), neutral.
- **Bollinger**: EXACT values. Band width for squeeze/expansion detection.
- **Trade Setup**: Entry, target, SL ALL derived from above levels. Targets within 0.5-1.5x ATR.

## SENTIMENT

- Bias with specific reasoning from EMA + volume + S/D + RSI alignment
- Confidence with factor count: High (4+ factors align) / Medium (2-3) / Low (1 or conflicting)

Total under 500 words. EVERY ₹ level MUST come from the provided data.`;

const SCALP_ANALYSIS_CHART_SYSTEM = `You are a **World-Class Intraday Chart Reading Specialist**. PURELY technical.

${ACCURACY_RULES}

${TECHNICAL_FRAMEWORK}

Analyze the uploaded chart AND numerical data. Provide TWO sections:

## TECHNICAL ANALYSIS

Cross-reference chart with numerical data:
1. S/D zones visible on chart — confirm with provided zone data
2. Key S/R from chart — confirm with pivot/swing data
3. EMA alignment from chart — confirm with exact EMA values
4. Volume from chart — confirm with provided vol ratio
5. Candlestick patterns AT key levels only
6. Trade setup with entry/target/SL from confirmed levels (within 1-1.5x ATR)

## SENTIMENT

Quick sentiment from price action and volume. State confidence level with factor count.

Total under 500 words.`;

// ── SCALP: Call 2 ──
const SCALP_DECISION_SYSTEM = `You are a combined **Elite Scalp Trader + Risk Manager** at a top Indian proprietary desk.

${ACCURACY_RULES}

CRITICAL: Before making a trade decision, CROSS-VALIDATE every level against the raw data provided. If any level in the analysis doesn't match the data, RECALCULATE it.

## TRADE DECISION

**BIAS**: Bullish / Bearish / Neutral (with confidence % — explain which factors support it)
**ACTION**: BUY / SELL / NO TRADE

**TRADE PLAN:**
| Parameter | Value | Source |
|-----------|-------|--------|
| Entry ₹ | Exact trigger — at S/R or S/D from data | Which level? |
| Entry Type | Market / Limit / Stop-Limit | |
| Target 1 ₹ | Next S/R from data (book 50%) — within 1x ATR | Which level? |
| Target 2 ₹ | Extended target (trail rest) — within 1.5x ATR | Which level? |
| Stop Loss ₹ | Below demand / above supply from data | Which zone? |
| Risk:Reward | Calculate from actual ₹ levels — minimum 1:1.5 | |
| Trade Duration | 10-30 min / 30-60 min / 1-3 hours | |
| Position Size | 2-5% of capital | |
| Trailing Stop | How to trail after T1 | |

**ENTRY CONFIRMATION**: What price action signal MUST appear before entry?
**INVALIDATION**: What kills this setup? Specific level from data.

## RISK CHECK

**Trade Quality Score**: 1-10
- Score breakdown: S/D zone quality (0-2), EMA confluence (0-2), volume confirmation (0-2), R:R quality (0-2), structural SL (0-2)
- ATR reality check: Is ₹ target within ATR range from entry?
- If R:R < 1.5, REJECT the trade automatically.
**VERDICT**: APPROVED / APPROVED WITH ADJUSTMENTS / REJECTED

Be DECISIVE. Total under 400 words.`;

// ── SWING: Call 1 (Analyst Team — inspired by TauricResearch) ──
const SWING_RESEARCH_SYSTEM = `You are a **Professional Trading Firm Analyst Team** (4 specialized analysts working together):
- **Technical Analyst**: Price action, S/D, S/R, EMA, volume expert
- **Sentiment Analyst**: Market mood, institutional positioning
- **News Analyst**: Macro context, sector trends, catalysts  
- **Fundamentals Analyst**: Valuation, financial health

${ACCURACY_RULES}

Provide FOUR sections (each analyst's report):

## TECHNICAL ANALYSIS

${TECHNICAL_FRAMEWORK}

Apply framework for swing analysis using ONLY provided data:
- **Trend Structure**: Current trend from data (HH/HL, LH/LL, or consolidation)
- **S/D Zones**: EXACT ₹ levels from data with strength rating (●/●●/●●●)
- **Multi-TF S/R**: EXACT pivots, swing points from data
- **EMA alignment**: EXACT EMA 9/20/50/200 values with % distance from price
- **Volume**: EXACT volume ratio, climactic/dry-up assessment
- **RSI**: EXACT value + divergence status from data
- **Bollinger**: Width for volatility regime
Keep under 250 words.

## SENTIMENT

- Institutional vs retail positioning from volume patterns and S/D zone behavior
- Market mood from trend structure (accumulation/distribution/markup/markdown)
- Smart money indicators from volume spikes at key levels
Keep under 150 words.

## NEWS

- Recent sector/company developments from your knowledge
- Clearly label EVERYTHING not from provided data as "based on general knowledge"
- Macro environment impact
Keep under 150 words.

## FUNDAMENTALS

- Use any provided fundamental data (PE, PB, ROE, D/E)
- If not provided, use general knowledge but label as "estimated"
- Sector comparison
Keep under 200 words.

Be specific with numbers. Every ₹ level must trace to the data.`;

const SWING_RESEARCH_CHART_SYSTEM = `You are a **Professional Trading Firm Analyst Team**. Analyze the uploaded chart AND numerical data.

${ACCURACY_RULES}

Provide FOUR sections:

## TECHNICAL ANALYSIS
Chart reading using PA/SD/SR/EMA/Volume framework. Cross-reference chart patterns with exact numerical data.

## SENTIMENT
Market mood, positioning from price action and volume patterns.

## NEWS
Recent catalysts — label as "general knowledge" if not in provided data.

## FUNDAMENTALS
Key ratios from provided data; label estimates clearly.

Total under 700 words.`;

// ── SWING: Call 2 (Bull/Bear Debate — TauricResearch inspired) ──
const SWING_DEBATE_SYSTEM = `You are a **Research Debate Panel** with 3 adversarial researchers. This is a STRUCTURED DEBATE — each side must COUNTER the other's strongest point.

${ACCURACY_RULES}

Based on the analysis provided:

## BULL CASE

Build the STRONGEST possible bull case using ONLY evidence from the analysis:
- Which S/D zones (with exact ₹) support upside? How many times were they tested?
- Is EMA alignment bullish? State exact values and % distance.
- Volume confirmation? Is smart money accumulating?
- RSI supportive?  
- Upside targets — ONLY from provided S/R levels and within ATR range
- **Counter the bear's strongest argument**: Why is the biggest risk manageable?
Keep under 200 words.

## BEAR CASE

Build the STRONGEST possible bear case using ONLY evidence from the analysis:
- Which supply zones (with exact ₹) threaten? Is price approaching them?
- Is EMA alignment breaking down? Exact values.
- Volume divergence? Is distribution happening?
- RSI overbought or showing bearish divergence?
- Downside targets — ONLY from provided S/R levels
- **Counter the bull's strongest argument**: Why is the upside case flawed?
Keep under 200 words.

## RESEARCH VERDICT

As the Research Manager, evaluate OBJECTIVELY:
- Which side has MORE data-backed evidence? Count the confirming factors for each.
- Final bias with confidence % based on factor count (not gut feeling)
- What single data point would FLIP the thesis?
- Assign a conviction score: 1-10 (7+ requires 4+ factors aligned)
Keep under 200 words.`;

// ── SWING: Call 3 (Decision Committee — TauricResearch inspired) ──
const SWING_DECISION_SYSTEM = `You are a **Trading Decision Committee** at a SEBI-registered PMS firm managing ₹500 Cr+.

${ACCURACY_RULES}

CRITICAL: Cross-validate ALL price levels from earlier analysis against the raw data. Reject any hallucinated levels.

Provide FIVE sections:

## TRADER DECISION

- **Action**: Strong Buy / Buy / Hold / Sell / Strong Sell — justify with factor count
- **Entry Price**: at demand zone or key S/R — specify WHICH level from data
- **Target Price**: next supply/resistance — specify WHICH level from data, within 2-4x ATR
- **Stop Loss**: below demand/support — specify WHICH level, must be structural (not arbitrary ₹)
- **Risk:Reward**: calculated from actual ₹ levels — minimum 1:2 for swing
- **Position Size**: 3-8% of portfolio (higher only with 8+ conviction)
- **Holding Duration**: specify with reasoning (e.g., "2-4 weeks until R2 target")
- **Key Catalysts**: data-backed triggers
- **Exit Strategy**: trailing stop % or specific condition

## AGGRESSIVE RISK
Argue FOR trade execution. Cite SPECIFIC data points (exact ₹, ratios). Under 120 words.

## CONSERVATIVE RISK
Focus on downside. Cite SPECIFIC risk levels from data. Under 120 words.

## NEUTRAL RISK
Balance both. Suggest position size adjustment. Under 120 words.

## PORTFOLIO MANAGER
Final decision after reviewing all risk perspectives:
- **Decision**: APPROVE or REJECT — with clear reasoning
- **Final Action**: Strong Buy / Buy / Hold / Sell / Strong Sell
- **Position Size**: Final recommendation (reduced if conservative risk is compelling)
- **Risk Score**: 1-10 (honest — 7+ only with 4+ multi-factor confirmation)
- **Confidence**: % (honest — 80%+ only with strong EMA + S/D + Volume + RSI alignment)
- **Trailing Stop Strategy**: specific ₹ levels from data
- **Summary**: 2-3 sentences with SPECIFIC data references (not generic statements)

Total under 700 words.`;

// ── INVEST: Call 1 ──
const INVEST_FUNDAMENTALS_SYSTEM = `You are a **Warren Buffett-style Investment Research Team** at a top Indian AMC managing ₹10,000 Cr+.

${ACCURACY_RULES}

ADDITIONAL INVEST-MODE RULES:
- CMP is the live split-adjusted price. NEVER anchor to pre-split/old prices.
- Intrinsic value estimates within ±25% of CMP unless you have exceptional DCF justification.
- Use sector PE/PB comparisons but label as benchmarks.
- Be SKEPTICAL by default — most stocks DON'T deserve a "BUY" rating.

Provide TWO sections:

## FUNDAMENTAL ANALYSIS

Analyze as if buying the ENTIRE BUSINESS:
1. **Economic Moat**: Brand, network effects, switching costs, cost advantages — most Indian mid/small caps have NARROW or NO moat. Be honest.
2. **Management Quality**: Capital allocation history, promoter holding trends, governance red flags
3. **Financial Fortress**: D/E ratio, interest coverage, FCF consistency, ROE/ROCE vs cost of equity
4. **Earnings Power**: Revenue/profit CAGR from available data, margin trajectory, cyclicality
5. **Valuation Assessment**: PE, PB, EV/EBITDA vs sector averages — is current price justified by earnings?
6. **Circle of Competence**: Business predictability and simplicity

Use PROVIDED data where available. Label general knowledge clearly.
Keep under 350 words.

## MOAT ANALYSIS

Rate each (None / Narrow / Wide) with EVIDENCE:
1. **Brand Power**: Does it have REAL pricing power? (Can raise prices without losing customers?)
2. **Network Effects**: Does value ACTUALLY increase with users?
3. **Switching Costs**: Quantifiable cost to switch (in ₹ or time)
4. **Cost Advantages**: Scale or process advantages with numbers
5. **Efficient Scale**: Natural monopoly/oligopoly evidence?

**Overall Moat**: None / Narrow / Wide — default to Narrow unless clear evidence for Wide
**Moat Trend**: Strengthening / Stable / Weakening
Keep under 200 words.`;

// ── INVEST: Call 2 ──
const INVEST_CONTEXT_SYSTEM = `You are a **Long-term Investment Context Team** at a SEBI-registered PMS.

${ACCURACY_RULES}

Provide FOUR sections:

## TECHNICAL ANALYSIS

${TECHNICAL_FRAMEWORK}

Long-term perspective using ONLY provided data:
- Price position vs EMA 50/200 with % distance — from data
- Distance from 52W high/low — from data
- Major S/R from provided swing points
- Volume trend from provided data
- Is the stock in a long-term uptrend, downtrend, or base-building?
Keep under 200 words.

## NEWS

Long-term macro outlook, regulatory environment — label as "general knowledge".
Keep under 150 words.

## BULL CASE

STRONGEST case for buying and HOLDING 3-10 years:
- Cite specific data points where available
- Be REALISTIC — not every stock is a multibagger
- What would make this a 5x in 10 years? Is it probable?
Keep under 200 words.

## BEAR CASE

What could DESTROY this investment over 5-10 years?
- Honest assessment: disruption risk, governance concerns, cyclicality
- What's the realistic downside scenario? (-30%? -50%?)
Keep under 200 words.`;

// ── INVEST: Call 3 ──
const INVEST_DECISION_SYSTEM = `You are a **Long-term Investment Decision Board** at a top Indian AMC managing ₹10,000 Cr+.

${ACCURACY_RULES}

CRITICAL GROUNDING RULES FOR INVEST MODE:
- CMP is the current split-adjusted market price. Use it as anchor.
- Fair Value within ±25% of CMP unless exceptional reasoning.
- Buy Zone: typically 5-15% below CMP for quality stocks.
- Expected CAGR: 12-18% for quality large caps, 15-22% for quality mid caps. DON'T promise 25%+ without evidence.
- Be SELECTIVE — most stocks deserve "HOLD" or "WATCHLIST", not "BUY".

Provide TWO sections:

## INVESTMENT COMMITTEE

- **Investment Grade**: A+ / A / B / C / D — A+ is RARE (only for exceptional moat + growth + valuation)
- **Moat Verdict**: Wide / Narrow / None — most are Narrow
- **Quality Score**: 1-10 — 8+ only for consistently excellent companies
- **Fair Value Estimate**: ₹ per share — MUST be within ±25% of CMP, show your logic
- **Margin of Safety**: current % discount/premium vs fair value
- **Conviction**: High / Medium / Low — High only with multi-factor confirmation
- **Recommended Action**: Buy / Accumulate on Dips / Hold / Avoid
- **Investment Horizon**: specify years
Keep under 200 words.

## PORTFOLIO ARCHITECT

- **Decision**: INVEST / WATCHLIST / PASS — be selective, PASS is the most common
- **Action**: Buy Now / Accumulate Below ₹X / Wait — X within 5-15% of CMP
- **Target Allocation**: max 5% for single stock, 2-3% for high-risk
- **Investment Horizon**: X-Y years
- **Expected CAGR**: be realistic (12-18% for most)
- **Risk Score**: 1-10
- **Confidence**: %
- **Buy Zone**: ₹X - ₹Y — MUST be near CMP (within 15%)
- **Exit Criteria**: specific thesis breakers (not vague)
- **Key Quote**: One relevant investing principle

Keep under 250 words.`;

// ── OPTIONS: Call 1 ──
const OPTIONS_ANALYSIS_SYSTEM = `You are an **Elite Options Analyst** at a top Indian F&O prop desk.

${ACCURACY_RULES}

${TECHNICAL_FRAMEWORK}

Cover ALL:

## OI Analysis
1. OI Build-up Classification from price + volume data
2. PCR assessment from price action context
3. Max Pain estimation from S/R levels — label as "estimated"
4. OI Concentration from S/R — label as "estimated"
5. Writers vs Buyers assessment from volume patterns
6. Expected move from ATR — use EXACT ATR value

## Greeks & IV
1. IV assessment from Bollinger width and ATR/price ratio
2. Volatility regime: high/low/normal based on ATR vs price %
3. Event risk assessment

## Technical Analysis
Apply PA/SD/SR/EMA/Volume framework:
- S/D zones for strike selection — EXACT ₹ from data
- Key S/R for directional bias — EXACT ₹
- EMA alignment for trend
- Expected range based on ATR

Keep under 600 words.`;

const OPTIONS_DECISION_SYSTEM = `You are an **Elite Options Strategist & Trader** at a top Indian F&O desk.

${ACCURACY_RULES}

## Recommended Strategies
2-3 strategies with different risk profiles:
- **Aggressive** (directional, high R:R)
- **Moderate** (spreads, balanced)
- **Conservative** (premium selling)

For EACH: Strategy name, exact legs (strikes near CMP), net premium estimate, max profit/loss, R:R, holding, SL, target.
Strikes must be realistic round numbers near CMP.

## Risk Assessment
- Risk score 1-10 per strategy
- Max drawdown, exit rules
- Position sizing (max 2-3% per trade)

## Final Trade Decision
**PRIMARY TRADE:**
- Strategy, direction, legs with realistic strikes
- R:R from actual levels
- Entry, SL, Target from confirmed data
- Confidence %, Risk Score

**ALTERNATIVE** (lower-risk)

NSE lots: NIFTY=25, BANKNIFTY=15. Under 800 words.`;

// ════════════════════════════════════════════════════════════
// PIPELINE RUNNERS
// ════════════════════════════════════════════════════════════

function fmt(v: any, decimals = 2): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return 'N/A';
  return v.toFixed(decimals);
}

function fmtInt(v: any): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return 'N/A';
  return v.toLocaleString();
}

function buildDataContext(stockData: any, mode: string): string {
  if (!stockData) return "";
  const price = stockData.price;
  if (price == null || price <= 0) return "Price data unavailable.";

  const base = `CMP (Current Market Price): ₹${fmt(price)}, Change: ${fmt(stockData.changePct)}%
Trend Structure: ${stockData.trendStructure || 'N/A'}
RSI(14): ${fmt(stockData.rsi14)} | RSI Divergence: ${stockData.rsiDivergence || 'None'}
MACD: ${stockData.macdLine != null ? fmt(stockData.macdLine) : 'N/A'} | Signal: ${stockData.macdSignal || 'N/A'}
EMA 9: ₹${fmt(stockData.ema9)} (${stockData.ema9 ? ((price - stockData.ema9) / stockData.ema9 * 100).toFixed(1) + '% from CMP' : 'N/A'})
EMA 20: ₹${fmt(stockData.ema20)} (${stockData.ema20 ? ((price - stockData.ema20) / stockData.ema20 * 100).toFixed(1) + '%' : 'N/A'})
EMA 50: ₹${fmt(stockData.ema50)} (${stockData.ema50 ? ((price - stockData.ema50) / stockData.ema50 * 100).toFixed(1) + '%' : 'N/A'})
EMA 200: ₹${fmt(stockData.ema200)} (${stockData.ema200 ? ((price - stockData.ema200) / stockData.ema200 * 100).toFixed(1) + '%' : 'N/A'})
SMA 20: ₹${fmt(stockData.sma20)}, SMA 50: ₹${fmt(stockData.sma50)}
Pivot: ₹${fmt(stockData.pivot)}, S1: ₹${fmt(stockData.s1)}, S2: ₹${fmt(stockData.s2)}, R1: ₹${fmt(stockData.r1)}, R2: ₹${fmt(stockData.r2)}
Bollinger: Lower ₹${fmt(stockData.bollingerLower)} / Mid ₹${fmt(stockData.bollingerMid)} / Upper ₹${fmt(stockData.bollingerUpper)} | Width: ${stockData.bbWidth || 'N/A'}%
Volume: ${fmtInt(stockData.volume)}, Avg Vol(10D): ${fmtInt(stockData.avgVolume)}, Vol Ratio: ${stockData.volRatio ?? 'N/A'}x
ATR(14): ₹${fmt(stockData.atr14)} (${price > 0 ? (stockData.atr14 / price * 100).toFixed(2) : 'N/A'}% of CMP — this defines realistic target range)
52-Week: ₹${fmt(stockData.low52)} – ₹${fmt(stockData.high52)} | From 52WH: ${stockData.distFrom52H || 'N/A'}% | From 52WL: ${stockData.distFrom52L || 'N/A'}%
S/D Zones: ${stockData.supplyDemandZones?.join(", ") || "None detected"}
Swing S/R: ${stockData.swingPoints?.join(", ") || "None detected"}`;

  if (mode === "scalp") {
    return `${base}
PDH: ₹${fmt(stockData.pdh)}, PDL: ₹${fmt(stockData.pdl)}, PDC: ₹${fmt(stockData.pdc)}
Last 5 Candles:
${stockData.recentCandles?.slice(-5)?.map((c: any, i: number) => `  [${i+1}] O:₹${fmt(c.o)} H:₹${fmt(c.h)} L:₹${fmt(c.l)} C:₹${fmt(c.c)} V:${fmtInt(c.v || 0)}`).join("\n") || "N/A"}`;
  }

  return base;
}

async function runScalpPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any, chartImage?: string) {
  const M = MODELS.scalp;
  const analysisResult = chartImage
    ? await callAIWithImage(apiKey, SCALP_ANALYSIS_CHART_SYSTEM, `Scalp/intraday analysis for ${symbol}.\n${dataCtx}`, chartImage, M.analysis)
    : await callAI(apiKey, SCALP_ANALYSIS_SYSTEM, `Scalp/intraday analysis for ${symbol}.\n${dataCtx}`, M.analysis);

  const agents1 = ensureKeys(
    parseSections(analysisResult, { "TECHNICAL": "market", "SENTIMENT": "sentiment" }),
    ["market", "sentiment"], analysisResult
  );

  await sleep(300);

  const decisionResult = await callAI(apiKey, SCALP_DECISION_SYSTEM,
    `Make scalp/intraday call for ${symbol}.\nANALYSIS:\n${analysisResult}\n\nRAW DATA (for cross-validation):\n${dataCtx}`, M.decision);

  const agents2 = ensureKeys(
    parseSections(decisionResult, { "TRADE": "traderDecision", "RISK": "riskCheck" }),
    ["traderDecision", "riskCheck"], decisionResult
  );

  return { agents: { ...agents1, ...agents2 } };
}

async function runSwingPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any, chartImage?: string) {
  const M = MODELS.swing;
  // Call 1: Analyst Team
  const researchResult = chartImage
    ? await callAIWithImage(apiKey, SWING_RESEARCH_CHART_SYSTEM, `Full analysis for ${symbol}.\n${dataCtx}`, chartImage, M.research)
    : await callAI(apiKey, SWING_RESEARCH_SYSTEM, `Full analysis for ${symbol}.\n${dataCtx}`, M.research);

  const agents1 = ensureKeys(
    parseSections(researchResult, { "TECHNICAL": "market", "SENTIMENT": "sentiment", "NEWS": "news", "FUNDAMENTAL": "fundamentals" }),
    ["market", "sentiment", "news", "fundamentals"], researchResult
  );

  await sleep(300);

  // Call 2: Bull/Bear Debate (adversarial)
  const debateResult = await callAI(apiKey, SWING_DEBATE_SYSTEM,
    `Research debate for ${symbol}.\nFULL ANALYSIS:\n${researchResult}\n\nRAW DATA (for fact-checking):\n${dataCtx}`, M.debate);

  const agents2 = ensureKeys(
    parseSections(debateResult, { "BULL": "bullCase", "BEAR": "bearCase", "RESEARCH": "researchManager" }),
    ["bullCase", "bearCase", "researchManager"], debateResult
  );

  await sleep(300);

  // Call 3: Decision Committee + Risk Manager + Portfolio Manager
  const decisionResult = await callAI(apiKey, SWING_DECISION_SYSTEM,
    `Final trading decision for ${symbol}.\nRESEARCH:\n${researchResult}\nDEBATE:\n${debateResult}\n\nRAW DATA (cross-validate ALL levels):\n${dataCtx}`, M.decision);

  const agents3 = ensureKeys(
    parseSections(decisionResult, { "TRADER": "traderDecision", "AGGRESSIVE": "aggressiveRisk", "CONSERVATIVE": "conservativeRisk", "NEUTRAL": "neutralRisk", "PORTFOLIO": "portfolioManager" }),
    ["traderDecision", "aggressiveRisk", "conservativeRisk", "neutralRisk", "portfolioManager"], decisionResult
  );

  return { agents: { ...agents1, ...agents2, ...agents3 } };
}

async function runInvestPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any) {
  const M = MODELS.invest;

  const fundResult = await callAI(apiKey, INVEST_FUNDAMENTALS_SYSTEM,
    `Deep fundamental analysis of ${symbol} for long-term investment.\n${dataCtx}`, M.fundamentals);

  const agents1 = ensureKeys(
    parseSections(fundResult, { "FUNDAMENTAL": "fundamentals", "MOAT": "moat" }),
    ["fundamentals", "moat"], fundResult
  );

  await sleep(300);

  const contextResult = await callAI(apiKey, INVEST_CONTEXT_SYSTEM,
    `Long-term context for ${symbol}.\nFUNDAMENTALS:\n${fundResult}\n${dataCtx}`, M.context);

  const agents2 = ensureKeys(
    parseSections(contextResult, { "TECHNICAL": "market", "NEWS": "news", "BULL": "bullCase", "BEAR": "bearCase" }),
    ["market", "news", "bullCase", "bearCase"], contextResult
  );

  await sleep(300);

  const decisionResult = await callAI(apiKey, INVEST_DECISION_SYSTEM,
    `Final investment decision for ${symbol}.\nCMP: ₹${stockData?.price?.toFixed(2) || 'N/A'}\n52W: ₹${stockData?.low52?.toFixed(2) || 'N/A'} – ₹${stockData?.high52?.toFixed(2) || 'N/A'}\nATR: ₹${stockData?.atr14?.toFixed(2) || 'N/A'}\nFUNDAMENTALS & MOAT:\n${fundResult}\nCONTEXT:\n${contextResult}`, M.decision);

  const agents3 = ensureKeys(
    parseSections(decisionResult, { "INVESTMENT COMMITTEE": "investmentManager", "PORTFOLIO ARCHITECT": "portfolioArchitect" }),
    ["investmentManager", "portfolioArchitect"], decisionResult
  );

  return { agents: { ...agents1, ...agents2, ...agents3 } };
}

async function runOptionsPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any, optionsConfig?: { riskReward?: string; tradeType?: string }) {
  const M = MODELS.options;
  const rrFilter = optionsConfig?.riskReward || "1:2";
  const tradeType = optionsConfig?.tradeType || "all";
  const configCtx = `\nR:R preference: minimum ${rrFilter}\nTrade type: ${tradeType === 'all' ? 'Intraday, Swing, Till Expiry' : tradeType}\nDate: ${new Date().toISOString().split('T')[0]}`;

  try {
    const analysisResult = await callAI(apiKey, OPTIONS_ANALYSIS_SYSTEM,
      `Complete options analysis for ${symbol}.\n${configCtx}\n${dataCtx}`, M.analysis);

    await sleep(200);

    const decisionResult = await callAI(apiKey, OPTIONS_DECISION_SYSTEM,
      `Options strategy for ${symbol}.\nANALYSIS:\n${analysisResult}\nR:R filter: ${rrFilter}\nTrade types: ${tradeType}\n${dataCtx}${configCtx}`, M.decision);

    return { agents: { oiAnalysis: analysisResult, optionsTrader: decisionResult } };
  } catch (err) {
    console.error("Options pipeline error, using fallback:", err);
    return generateOptionsFallback(symbol, stockData, rrFilter, tradeType);
  }
}

function generateOptionsFallback(symbol: string, stockData: any, rrFilter: string, tradeType: string) {
  const price = stockData?.price || 0;
  const sma20 = stockData?.sma20 || price;
  const sma50 = stockData?.sma50 || price;
  const high52 = stockData?.high52 || price * 1.2;
  const low52 = stockData?.low52 || price * 0.8;
  const trend = price > sma20 && price > sma50 ? "BULLISH" : price < sma20 && price < sma50 ? "BEARISH" : "NEUTRAL";
  const nearSupport = Math.round(Math.min(sma20, sma50, low52 * 1.05));
  const nearResist = Math.round(Math.max(sma20, sma50, high52 * 0.95));
  const ceStrike = Math.ceil(price / 50) * 50;
  const peStrike = Math.floor(price / 50) * 50;

  return {
    agents: {
      oiAnalysis: `## OI Analysis — ${symbol} (Estimated)\n\n**Trend**: ${trend} | Price ₹${price.toFixed(0)} vs SMA20 ₹${sma20.toFixed(0)}\n**Resistance**: ₹${nearResist} | **Support**: ₹${nearSupport}\n**Max Pain**: ₹${ceStrike}\n\n*Data-driven estimate. Re-run for full AI analysis.*`,
      optionsTrader: `## Trade Decision — ${symbol}\n\n**Direction**: ${trend}\n**Strategy**: ${trend === "BULLISH" ? "Bull Call Spread" : trend === "BEARISH" ? "Bear Put Spread" : "Iron Condor"}\n**Strikes**: ${trend === "BULLISH" ? `Buy ${ceStrike} CE / Sell ${ceStrike + 100} CE` : `Sell ${ceStrike} CE + Sell ${peStrike} PE`}\n**R:R**: ${rrFilter}\n**Confidence**: 65% | **Risk**: 5/10\n\n⚠️ *Estimated from price data. Re-run for full AI analysis.*`,
    },
  };
}

// ════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, chartImage, mode = "swing", optionsConfig } = await req.json();
    if (!symbol) {
      return new Response(JSON.stringify({ error: "Symbol required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = getCacheKey(symbol, mode, optionsConfig);
    if (!chartImage) {
      const cached = await getDBCache(cacheKey);
      if (cached) {
        console.log(`TradingAgents [${mode}] DB CACHE HIT for ${symbol}`);
        return new Response(
          JSON.stringify({ ...cached, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log(`TradingAgents [${mode}] started for ${symbol}${chartImage ? ' (chart)' : ''}`);

    const dataRange = mode === "invest" ? "1y" : "3mo";
    let stockData = await fetchStockData(symbol, dataRange);
    if (!stockData && dataRange === "3mo") {
      stockData = await fetchStockData(symbol, "1y");
    }
    if (stockData && (stockData.price == null || stockData.price <= 0)) {
      console.warn(`Invalid price for ${symbol}, stockData.price = ${stockData.price}`);
      stockData = null;
    }
    const dataCtx = stockData
      ? `Stock: ${symbol}\n${buildDataContext(stockData, mode)}`
      : `Stock: ${symbol} (limited data — use your knowledge but label ALL levels as 'estimated')`;

    let result;
    if (mode === "scalp") {
      result = await runScalpPipeline(LOVABLE_API_KEY, symbol, dataCtx, stockData, chartImage);
    } else if (mode === "invest") {
      result = await runInvestPipeline(LOVABLE_API_KEY, symbol, dataCtx, stockData);
    } else if (mode === "options") {
      result = await runOptionsPipeline(LOVABLE_API_KEY, symbol, dataCtx, stockData, optionsConfig);
    } else {
      result = await runSwingPipeline(LOVABLE_API_KEY, symbol, dataCtx, stockData, chartImage);
    }

    console.log(`TradingAgents [${mode}] complete for ${symbol}`);

    if (!chartImage) {
      await setDBCache(cacheKey, symbol, mode, result);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("TradingAgents error:", msg);

    if (msg === "RATE_LIMITED") {
      return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (msg === "CREDITS_EXHAUSTED") {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
