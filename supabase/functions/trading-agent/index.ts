import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * TradingAgents — Consolidated Multi-Agent Framework
 * 
 * CORE ACCURACY PRINCIPLES:
 *   1. ONLY use live data provided — never hallucinate prices or levels
 *   2. When data is missing, say "N/A" — never fabricate
 *   3. All ₹ levels must come from calculations or the provided data
 *   4. Targets/SL must be within realistic ATR-based ranges
 *   5. Never claim certainty — always express as probability
 *
 * TECHNICAL FRAMEWORK (all modes):
 *   1. Price Action + Supply/Demand zones
 *   2. Multi-TF Support & Resistance
 *   3. EMA alignment (9/20/50/200)
 *   4. Volume + VWAP + Bollinger
 *
 * FUNDAMENTALS: Excluded from Scalp/Intraday. Included in Swing/Invest/Options.
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

// ── Model Selection ──────────────────────────────────────
const MODELS = {
  scalp:   { analysis: "google/gemini-3-flash-preview", decision: "google/gemini-3-flash-preview" },
  swing:   { research: "google/gemini-2.5-pro", debate: "google/gemini-3-flash-preview", decision: "google/gemini-2.5-pro" },
  invest:  { fundamentals: "google/gemini-2.5-pro", context: "google/gemini-2.5-pro", decision: "google/gemini-2.5-pro" },
  options: { analysis: "google/gemini-3-flash-preview", decision: "google/gemini-3-flash-preview" },
};

// ── ACCURACY RULES (injected into every prompt) ──────────
const ACCURACY_RULES = `
## MANDATORY ACCURACY RULES (NEVER VIOLATE)
1. **DATA GROUNDING**: You MUST use ONLY the exact numbers provided in the data below. If a data point is missing or shows "N/A", say "data unavailable" — NEVER fabricate a number.
2. **PRICE ANCHORING**: The current CMP is provided in the data. All support, resistance, target, and stop-loss levels MUST be derived from the provided EMAs, pivots, swing points, S/D zones, or Bollinger bands. NEVER invent price levels.
3. **NO HALLUCINATED LEVELS**: If you cannot calculate a level from the provided data, do NOT include it. Say "insufficient data" instead.
4. **REALISTIC TARGETS**: For scalp/intraday: targets within 1-2x ATR. For swing: targets within 3-5x ATR. For invest: targets within ±15-30% of CMP based on fundamentals.
5. **PROBABILITY NOT CERTAINTY**: Use "likely", "probable", "expected" — NEVER "will", "guaranteed", "certain".
6. **SPLIT/BONUS AWARENESS**: The stock may have undergone splits or bonuses. The provided CMP is the current split-adjusted price. NEVER reference old pre-split prices from memory.
7. **HONEST CONFIDENCE**: If data is limited, lower your confidence score. A 90%+ confidence requires strong multi-factor confirmation.
8. **INDIAN MARKET CONTEXT**: NSE/BSE market hours 9:15 AM - 3:30 PM IST. Weekly expiry Thursday. Monthly expiry last Thursday. Use ₹ for all prices.`;

// ── Shared Technical Framework ────────────────────────────
const TECHNICAL_FRAMEWORK = `**TECHNICAL ANALYSIS FRAMEWORK** (analyze in this exact order of priority):

1. **PRICE ACTION & SUPPLY/DEMAND** (highest weight)
   - Trend structure: HH/HL (bullish) or LH/LL (bearish), BOS (Break of Structure), CHoCH (Change of Character)
   - Supply zones (institutional selling areas) with exact ₹ levels FROM THE DATA
   - Demand zones (institutional buying areas) with exact ₹ levels FROM THE DATA
   - Order blocks, breaker blocks, Fair Value Gaps (FVGs)
   - Liquidity sweeps, stop hunts, springs/upthrusts (Wyckoff)

2. **MULTI-TIMEFRAME SUPPORT & RESISTANCE**
   - Daily pivot (S1/S2/S3, R1/R2/R3) — USE THE EXACT VALUES PROVIDED
   - Key horizontal S/R from swing points — USE THE EXACT VALUES PROVIDED
   - Round number psychology levels (e.g. ₹1000, ₹500)
   - PDH/PDL/PDC (Previous Day High/Low/Close) — USE THE EXACT VALUES PROVIDED

3. **EMA ALIGNMENT**
   - EMA 9/20/50/200 stack (bullish: 9>20>50>200, bearish: reverse) — USE THE EXACT VALUES PROVIDED
   - Price position vs key EMAs — calculate from provided data
   - Golden Cross / Death Cross signals
   - Dynamic support/resistance from EMAs

4. **VOLUME & VWAP**
   - Volume-price confirmation or divergence — USE THE EXACT VOLUME RATIO PROVIDED
   - VWAP position and deviation
   - Volume ratio vs 20-day average
   - Climactic volume, no-demand/no-supply bars
   - Bollinger Band squeeze/expansion — USE THE EXACT BOLLINGER VALUES PROVIDED

5. **CANDLE PATTERNS** (only at key S/R or S/D zones — never in isolation)`;

// ── AI Call Helpers ──────────────────────────────────────────
async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function callAIRaw(apiKey: string, system: string, user: string | Array<any>, model: string): Promise<string> {
  const messages = [{ role: "system", content: system }, { role: "user", content: user }];
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, temperature: 0.15 }),
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

// ── Stock Data Fetcher ──────────────────────────────────────
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
    
    let lastClose = null;
    let prevClose = null;
    for (let i = closes.length - 1; i >= 0; i--) {
      if (closes[i] != null && closes[i] > 0) {
        if (lastClose === null) { lastClose = closes[i]; }
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

    // RSI calculation
    let rsiGains = 0, rsiLosses = 0;
    const rsiPeriod = Math.min(14, closes.length - 1);
    for (let i = closes.length - rsiPeriod; i < closes.length; i++) {
      const diff = (closes[i] || 0) - (closes[i - 1] || 0);
      if (diff > 0) rsiGains += diff;
      else rsiLosses += Math.abs(diff);
    }
    const avgGain = rsiGains / rsiPeriod;
    const avgLoss = rsiLosses / rsiPeriod;
    const rsi14 = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

    const supplyDemandZones: string[] = [];
    for (let i = Math.max(2, closes.length - 20); i < closes.length - 1; i++) {
      const body = Math.abs((closes[i] || 0) - (opens[i] || 0));
      const range = (highs[i] || 0) - (lows[i] || 0);
      if (range > 0 && body > range * 0.6) {
        const isBullish = (closes[i] || 0) > (opens[i] || 0);
        const volSpike = (volumes[i] || 0) > (avgVol * 1.3);
        if (isBullish && volSpike) {
          supplyDemandZones.push(`Demand: ₹${lows[i]?.toFixed(2)}-₹${opens[i]?.toFixed(2)}`);
        } else if (!isBullish && volSpike) {
          supplyDemandZones.push(`Supply: ₹${opens[i]?.toFixed(2)}-₹${highs[i]?.toFixed(2)}`);
        }
      }
    }

    const swingPoints: string[] = [];
    for (let i = Math.max(2, closes.length - 18); i < closes.length - 2; i++) {
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        swingPoints.push(`SwingHigh: ₹${highs[i]?.toFixed(2)}`);
      }
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        swingPoints.push(`SwingLow: ₹${lows[i]?.toFixed(2)}`);
      }
    }

    const lastHigh = highs[highs.length - 1] || 0;
    const lastLow = lows[lows.length - 1] || 0;
    const pivot = (lastHigh + lastLow + lastClose) / 3;

    const bb20 = closes.slice(-20);
    const bbMid = bb20.reduce((a: number, b: number) => a + (b || 0), 0) / 20;
    const bbStd = Math.sqrt(bb20.reduce((sum: number, v: number) => sum + ((v || 0) - bbMid) ** 2, 0) / 20);

    return {
      symbol, price: lastClose, change, changePct, prevClose,
      high: meta.regularMarketDayHigh, low: meta.regularMarketDayLow,
      volume: todayVol, avgVolume: avgVol,
      sma20, sma50, high52, low52,
      ema9, ema20, ema50, ema200,
      atr14, rsi14, volRatio, pdh, pdl, pdc,
      pivot, s1: 2 * pivot - lastHigh, s2: pivot - (lastHigh - lastLow),
      r1: 2 * pivot - lastLow, r2: pivot + (lastHigh - lastLow),
      bollingerUpper: bbMid + 2 * bbStd, bollingerMid: bbMid, bollingerLower: bbMid - 2 * bbStd,
      supplyDemandZones: supplyDemandZones.slice(-4),
      swingPoints: swingPoints.slice(-6),
      recentCandles,
      recentCloses: closes.slice(-20), recentVolumes: volumes.slice(-10),
    };
  } catch { return null; }
}

// ════════════════════════════════════════════════════════════
// CONSOLIDATED PIPELINE PROMPTS
// ════════════════════════════════════════════════════════════

// ── SCALP: Call 1 ──
const SCALP_ANALYSIS_SYSTEM = `You are a **World-Class Intraday Price Action Specialist** at a proprietary trading desk managing ₹500 Cr+ in daily volume. Your analysis is PURELY technical — NO fundamentals.

${ACCURACY_RULES}

${TECHNICAL_FRAMEWORK}

Provide TWO sections:

## TECHNICAL ANALYSIS

Analyze ONLY from the provided data, in priority order:
- **Price Action & S/D Zones**: Use the exact S/D zones and swing points from data. Identify trend structure (HH/HL or LH/LL). Note BOS/CHoCH only if visible in recent candles.
- **Key S/R Levels**: Use EXACT PDH/PDL/PDC, pivot, S1/S2, R1/R2 from the data. Don't invent levels.
- **EMA Stack**: Compare the EXACT EMA 9/20/50 values. State which are above/below price.
- **Volume & VWAP**: Use the EXACT volume ratio. Note if it's above/below 1.0x average.
- **RSI**: Use the EXACT RSI value from data. State if overbought (>70), oversold (<30), or neutral.
- **Bollinger**: Use EXACT upper/mid/lower values. Note if price is near bands.
- **Trade Setup**: Entry, target, SL derived from the above levels. Target within 1-2x ATR.

## SENTIMENT

- Bias based on EMA alignment + volume + price position
- Confidence: High (multi-factor alignment) / Medium (partial) / Low (conflicting signals)

Total under 500 words. EVERY price level must come from the provided data.`;

const SCALP_ANALYSIS_CHART_SYSTEM = `You are a **World-Class Intraday Chart Reading Specialist**. PURELY technical — NO fundamentals.

${ACCURACY_RULES}

${TECHNICAL_FRAMEWORK}

Analyze the uploaded chart AND numerical data. Provide TWO sections:

## TECHNICAL ANALYSIS

Read the chart AND cross-reference with the numerical data provided:
1. S/D zones visible on chart — confirm with provided zone data
2. Key S/R from chart — confirm with provided pivot/swing data
3. EMA alignment from chart — confirm with exact EMA values
4. Volume analysis from chart — confirm with provided vol ratio
5. Candlestick patterns AT key levels only
6. Trade setup with entry/target/SL from confirmed levels

## SENTIMENT

Quick sentiment from price action and volume behavior. State confidence level.

Total under 500 words.`;

// ── SCALP: Call 2 ──
const SCALP_DECISION_SYSTEM = `You are a combined **Elite Scalp Trader + Risk Manager** at a top Indian proprietary desk.

${ACCURACY_RULES}

## TRADE DECISION

**BIAS**: Bullish / Bearish / Neutral (with confidence %)
**ACTION**: BUY / SELL / NO TRADE

**TRADE PLAN:**
| Parameter | Value |
|-----------|-------|
| Entry ₹ | Exact trigger — MUST be at a level from the provided S/R or S/D data |
| Entry Type | Market / Limit / Stop-Limit |
| Target 1 ₹ | Next S/R level from data (book 50%) — within 1x ATR |
| Target 2 ₹ | Extended target from data (trail remaining) — within 2x ATR |
| Stop Loss ₹ | Below demand / above supply from data |
| Risk:Reward | Calculate from actual ₹ levels — minimum 1:1.5 |
| Trade Duration | 10-30 min / 30-60 min / 1-3 hours |
| Position Size | 2-5% of capital |
| Trailing Stop | How to trail after T1 |

**ENTRY CONFIRMATION**: What price action signal MUST appear?
**INVALIDATION**: What kills this setup?

## RISK CHECK

**Trade Quality Score**: 1-10
- S/D zone quality, EMA confluence, volume confirmation
- Is SL at a structural level? (not arbitrary ₹ amount)
- R:R calculated from actual levels
- ATR check: is target realistic given today's volatility?
**VERDICT**: APPROVED / APPROVED WITH ADJUSTMENTS / REJECTED

Be DECISIVE. Total under 400 words.`;

// ── SWING: Call 1 ──
const SWING_RESEARCH_SYSTEM = `You are a **Professional Trading Firm Research Team** managing institutional money.

${ACCURACY_RULES}

Provide FOUR sections:

## TECHNICAL ANALYSIS

${TECHNICAL_FRAMEWORK}

Apply framework for swing/position analysis using ONLY provided data:
- Price Action: trend structure, S/D zones from data with exact ₹ levels
- Multi-TF S/R: use exact pivots, swing points from data
- EMA alignment: use exact EMA 9/20/50/200 values from data
- Volume: use exact volume ratio from data
- RSI: use exact RSI value from data
- Bollinger: use exact band values from data
Keep under 250 words.

## SENTIMENT

- Institutional vs retail positioning based on volume patterns
- Market mood from price action structure
Keep under 150 words.

## NEWS

- Use your knowledge of recent developments for this company/sector
- But clearly label anything not from provided data as "based on general knowledge"
Keep under 150 words.

## FUNDAMENTALS

- Use any fundamental data provided (PE, PB, ROE, etc.)
- If not provided, use general knowledge but label as "estimated/general knowledge"
- Compare with sector averages
Keep under 200 words.

Be specific with numbers. Every ₹ level must trace to the data.`;

const SWING_RESEARCH_CHART_SYSTEM = `You are a **Professional Trading Firm Research Team**. Analyze the uploaded chart AND numerical data.

${ACCURACY_RULES}

Provide FOUR sections:

## TECHNICAL ANALYSIS
Chart reading using PA/SD/SR/EMA/Volume framework. Cross-reference chart patterns with exact numerical data provided.

## SENTIMENT
Market mood, positioning from price action and volume.

## NEWS
Recent catalysts — label as "general knowledge" if not in provided data.

## FUNDAMENTALS
Key ratios from provided data; label estimates clearly.

Total under 700 words.`;

// ── SWING: Call 2 ──
const SWING_DEBATE_SYSTEM = `You are a **Research Debate Panel** — Bull Researcher, Bear Researcher, and Research Manager.

${ACCURACY_RULES}

Based on the analysis provided:

## BULL CASE

Build the STRONGEST bull case ONLY from evidence in the analysis:
- Which S/D zones and S/R levels support upside?
- Is EMA alignment bullish? What do exact values show?
- Volume confirmation? Is RSI supportive?
- Upside targets — use only levels from the provided data
Keep under 200 words.

## BEAR CASE

Build the STRONGEST bear case ONLY from evidence in the analysis:
- Which supply zones and resistance levels threaten?
- Is EMA alignment breaking down? What do exact values show?
- Volume divergence? Is RSI warning?
- Downside targets — use only levels from the provided data
Keep under 200 words.

## RESEARCH VERDICT

Evaluate both sides objectively:
- Which side has stronger data-backed evidence?
- Clear bias with confidence %, key deciding factors
- What would change the thesis?
Keep under 200 words.`;

// ── SWING: Call 3 ──
const SWING_DECISION_SYSTEM = `You are a **Trading Decision Committee** at a SEBI-registered PMS firm.

${ACCURACY_RULES}

Provide FIVE sections:

## TRADER DECISION

- **Action**: Strong Buy / Buy / Hold / Sell / Strong Sell
- **Entry Price**: at demand zone or key S/R — from provided data
- **Target Price**: next supply zone or resistance — from provided data
- **Stop Loss**: below demand zone or key support — from provided data
- **Risk:Reward**: calculated from actual ₹ levels
- **Position Size**: 3-10% of portfolio
- **Holding Duration**: specify (e.g., "2-4 weeks")
- **Key Catalysts**: data-backed triggers
- **Exit Strategy**: trailing stop or specific conditions

## AGGRESSIVE RISK
Argue FOR trade execution. Reference specific data points. Under 120 words.

## CONSERVATIVE RISK
Focus on downside. Reference specific risk levels from data. Under 120 words.

## NEUTRAL RISK
Balance both views with practical adjustments. Under 120 words.

## PORTFOLIO MANAGER
Final decision:
- **Decision**: APPROVE or REJECT
- **Final Action**: Strong Buy / Buy / Hold / Sell / Strong Sell
- **Position Size**: Final recommendation
- **Risk Score**: 1-10 (honest — 7+ only with multi-factor confirmation)
- **Confidence**: % (honest — 80%+ only with strong alignment)
- **Trailing Stop Strategy**: based on specific levels from data
- **Summary**: 2-3 sentence rationale referencing specific data

Total under 700 words.`;

// ── INVEST: Call 1 ──
const INVEST_FUNDAMENTALS_SYSTEM = `You are a **Warren Buffett-style Investment Research Team** at a top Indian AMC.

${ACCURACY_RULES}

ADDITIONAL INVEST-MODE RULES:
- The stock's CMP is the live split-adjusted price from the data. NEVER anchor to pre-split/old prices.
- Intrinsic value estimates must be within ±30% of CMP unless you have clear DCF justification.
- Use sector PE/PB comparisons from your knowledge but label them as benchmarks.

Provide TWO sections:

## FUNDAMENTAL ANALYSIS

Analyze as if buying the ENTIRE BUSINESS:
1. **Economic Moat**: Brand, network effects, switching costs, cost advantages — be honest, most Indian mid/small caps have NARROW or NO moat
2. **Management Quality**: Capital allocation, promoter holding trends
3. **Financial Fortress**: D/E ratio assessment, FCF consistency, ROE/ROCE benchmarking
4. **Earnings Power**: Revenue/profit growth trend from available data
5. **Valuation Assessment**: PE, PB vs sector averages — is current price reasonable?
6. **Circle of Competence**: Business simplicity

Use PROVIDED fundamental data where available. Label general knowledge clearly.
Keep under 350 words.

## MOAT ANALYSIS

Rate each (None / Narrow / Wide) — be HONEST, most companies are Narrow at best:
1. **Brand Power**: Real pricing power evidence
2. **Network Effects**: Does value actually increase with users?
3. **Switching Costs**: Quantifiable cost to switch
4. **Cost Advantages**: Scale or process advantages
5. **Efficient Scale**: Natural monopoly/oligopoly?

**Overall Moat Rating**: None / Narrow / Wide — be conservative
**Moat Trend**: Strengthening / Stable / Weakening
Keep under 200 words.`;

// ── INVEST: Call 2 ──
const INVEST_CONTEXT_SYSTEM = `You are a **Long-term Investment Context Team** at a SEBI-registered PMS.

${ACCURACY_RULES}

Provide FOUR sections:

## TECHNICAL ANALYSIS

${TECHNICAL_FRAMEWORK}

Long-term perspective using ONLY provided data:
- Price position relative to EMA 50/200 from data
- Distance from 52W high/low from data
- Major S/R levels from provided swing points
- Volume trend from provided data
Keep under 200 words.

## NEWS

Long-term macro outlook, regulatory environment — label as "general knowledge" where applicable.
Keep under 150 words.

## BULL CASE

STRONGEST case for buying and HOLDING 3-10 years:
- Must cite specific data points where available
- Be realistic — not every stock is a multibagger
Keep under 200 words.

## BEAR CASE

What could DESTROY this investment over 5-10 years?
- Honest assessment of disruption, governance, cyclicality risks
Keep under 200 words.`;

// ── INVEST: Call 3 ──
const INVEST_DECISION_SYSTEM = `You are a **Long-term Investment Decision Board** at a top Indian AMC managing ₹10,000 Cr+.

${ACCURACY_RULES}

CRITICAL GROUNDING RULES FOR INVEST MODE:
- The CMP from the data is the current split-adjusted market price. Use it as your anchor.
- Fair Value Estimate must be justified and within ±30% of CMP unless you have exceptional reasoning.
- Buy Zone must be realistic — typically 5-15% below CMP for quality stocks.
- Expected CAGR should be honest: 12-18% for quality large caps, 15-25% for quality mid caps. Don't promise 30%+ unless there's clear evidence.

Provide TWO sections:

## INVESTMENT COMMITTEE

- **Investment Grade**: A+ / A / B / C / D — be HONEST, most stocks are B or C
- **Moat Verdict**: Wide / Narrow / None — most are Narrow
- **Quality Score**: 1-10 — 8+ only for consistently excellent companies
- **Fair Value Estimate**: ₹ per share — MUST be within ±30% of CMP
- **Margin of Safety**: current % discount/premium vs your fair value
- **Conviction**: High / Medium / Low — High only with multi-factor confirmation
- **Recommended Action**: Buy / Accumulate on Dips / Hold / Avoid
- **Investment Horizon**: specify years
Keep under 200 words.

## PORTFOLIO ARCHITECT

- **Decision**: INVEST / WATCHLIST / PASS — be selective
- **Action**: Buy Now / Accumulate Below ₹X / Wait — X must be realistic
- **Target Allocation**: % of portfolio — max 5% for single stock
- **Investment Horizon**: X-Y years
- **Expected CAGR**: % — be realistic (12-20% for most quality stocks)
- **Risk Score**: 1-10
- **Confidence**: % — be honest
- **Buy Zone**: ₹X - ₹Y — must be near CMP, not arbitrary
- **Exit Criteria**: specific thesis breakers
- **Key Quote**: One relevant investing principle

Keep under 250 words.`;

// ── OPTIONS: Call 1 ──
const OPTIONS_ANALYSIS_SYSTEM = `You are an **Elite Options Analyst** at a top Indian F&O prop desk.

${ACCURACY_RULES}

${TECHNICAL_FRAMEWORK}

Cover ALL with clear section headers:

## OI Analysis
1. OI Build-up Classification based on price + volume from data
2. PCR assessment from price action context
3. Max Pain estimation from provided data
4. OI Concentration: estimate from S/R levels — label as "estimated"
5. Writers vs Buyers assessment from volume patterns
6. Expected move range from ATR — use EXACT ATR value from data

## Greeks & IV
1. IV assessment from Bollinger width and recent volatility
2. Volatility regime: high/low/normal based on ATR vs price
3. Event risk assessment based on market context
Note: Exact Greeks require live options data. Label estimates clearly.

## Technical Analysis
Apply PA/SD/SR/EMA/Volume framework from provided data:
- S/D zones for strike selection — use EXACT levels from data
- Key S/R for directional bias — use EXACT levels from data
- EMA alignment for trend — use EXACT values from data
- Expected range based on ATR — use EXACT ATR from data

Keep total under 600 words.`;

const OPTIONS_DECISION_SYSTEM = `You are an **Elite Options Strategist & Trader** at a top Indian F&O desk.

${ACCURACY_RULES}

Based on the analysis:

## Recommended Strategies
2-3 strategies with different risk profiles:
- **Aggressive** (directional, high risk/reward)
- **Moderate** (spreads, balanced)
- **Conservative** (premium selling, income)

For EACH: Strategy name, exact legs (strikes must be near CMP from data), net premium estimate, max profit/loss, R:R, holding duration, SL, target.
Strikes must be realistic round numbers near the CMP from data.

## Risk Assessment
- Risk score 1-10 for each strategy — be honest
- Max drawdown, exit rules
- Position sizing (max 2-3% of capital per trade)

## Final Trade Decision
**PRIMARY TRADE:**
- Strategy, direction, complete leg details with realistic strikes
- R:R calculated from actual levels
- Entry, SL, Target — all from confirmed data levels
- Confidence % (honest), Risk Score

**ALTERNATIVE** (lower-risk option)

Use NSE lot sizes (NIFTY=25, BANKNIFTY=15). Keep under 800 words.`;

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
  if (price == null || price <= 0) return "Price data unavailable — analysis may be limited.";

  const base = `CMP (Current Market Price): ₹${fmt(price)}, Change: ${fmt(stockData.changePct)}%
RSI(14): ${fmt(stockData.rsi14)}
EMA 9: ₹${fmt(stockData.ema9)}, EMA 20: ₹${fmt(stockData.ema20)}, EMA 50: ₹${fmt(stockData.ema50)}, EMA 200: ₹${fmt(stockData.ema200)}
SMA 20: ₹${fmt(stockData.sma20)}, SMA 50: ₹${fmt(stockData.sma50)}
Pivot: ₹${fmt(stockData.pivot)}, S1: ₹${fmt(stockData.s1)}, S2: ₹${fmt(stockData.s2)}, R1: ₹${fmt(stockData.r1)}, R2: ₹${fmt(stockData.r2)}
Bollinger: Lower ₹${fmt(stockData.bollingerLower)} / Mid ₹${fmt(stockData.bollingerMid)} / Upper ₹${fmt(stockData.bollingerUpper)}
Volume: ${fmtInt(stockData.volume)}, Avg Vol(10D): ${fmtInt(stockData.avgVolume)}, Vol Ratio: ${stockData.volRatio ?? 'N/A'}x
ATR(14): ₹${fmt(stockData.atr14)} (daily volatility measure)
52-Week Range: ₹${fmt(stockData.low52)} – ₹${fmt(stockData.high52)}
S/D Zones (computed): ${stockData.supplyDemandZones?.join(", ") || "None detected"}
Swing S/R (computed): ${stockData.swingPoints?.join(", ") || "None detected"}`;

  if (mode === "scalp") {
    return `${base}
PDH (Previous Day High): ₹${fmt(stockData.pdh)}, PDL: ₹${fmt(stockData.pdl)}, PDC: ₹${fmt(stockData.pdc)}
Last 5 Candles:
${stockData.recentCandles?.slice(-5)?.map((c: any, i: number) => `  [${i+1}] O:₹${fmt(c.o)} H:₹${fmt(c.h)} L:₹${fmt(c.l)} C:₹${fmt(c.c)} V:${fmtInt(c.v || 0)}`).join("\n") || "N/A"}`;
  }

  return base;
}

async function runScalpPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any, chartImage?: string) {
  const M = MODELS.scalp;

  const analysisResult = chartImage
    ? await callAIWithImage(apiKey, SCALP_ANALYSIS_CHART_SYSTEM, `Scalp/intraday analysis for ${symbol}. ${dataCtx}`, chartImage, M.analysis)
    : await callAI(apiKey, SCALP_ANALYSIS_SYSTEM, `Scalp/intraday analysis for ${symbol}. ${dataCtx}`, M.analysis);

  const agents1 = ensureKeys(
    parseSections(analysisResult, { "TECHNICAL": "market", "SENTIMENT": "sentiment" }),
    ["market", "sentiment"], analysisResult
  );

  await sleep(400);

  const decisionResult = await callAI(apiKey, SCALP_DECISION_SYSTEM,
    `Make scalp/intraday call for ${symbol}.\nANALYSIS:\n${analysisResult}\nDATA: ${dataCtx}`, M.decision);

  const agents2 = ensureKeys(
    parseSections(decisionResult, { "TRADE": "traderDecision", "RISK": "riskCheck" }),
    ["traderDecision", "riskCheck"], decisionResult
  );

  return { agents: { ...agents1, ...agents2 } };
}

async function runSwingPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any, chartImage?: string) {
  const M = MODELS.swing;

  const researchResult = chartImage
    ? await callAIWithImage(apiKey, SWING_RESEARCH_CHART_SYSTEM, `Full analysis for ${symbol}. ${dataCtx}`, chartImage, M.research)
    : await callAI(apiKey, SWING_RESEARCH_SYSTEM, `Full analysis for ${symbol}. ${dataCtx}`, M.research);

  const agents1 = ensureKeys(
    parseSections(researchResult, { "TECHNICAL": "market", "SENTIMENT": "sentiment", "NEWS": "news", "FUNDAMENTAL": "fundamentals" }),
    ["market", "sentiment", "news", "fundamentals"], researchResult
  );

  await sleep(400);

  const debateResult = await callAI(apiKey, SWING_DEBATE_SYSTEM,
    `Research debate for ${symbol}.\nFULL ANALYSIS:\n${researchResult}`, M.debate);

  const agents2 = ensureKeys(
    parseSections(debateResult, { "BULL": "bullCase", "BEAR": "bearCase", "RESEARCH": "researchManager" }),
    ["bullCase", "bearCase", "researchManager"], debateResult
  );

  await sleep(400);

  const decisionResult = await callAI(apiKey, SWING_DECISION_SYSTEM,
    `Final trading decision for ${symbol}.\nRESEARCH:\n${researchResult}\nDEBATE:\n${debateResult}`, M.decision);

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

  await sleep(400);

  const contextResult = await callAI(apiKey, INVEST_CONTEXT_SYSTEM,
    `Long-term context for ${symbol}.\nFUNDAMENTALS:\n${fundResult}\n${dataCtx}`, M.context);

  const agents2 = ensureKeys(
    parseSections(contextResult, { "TECHNICAL": "market", "NEWS": "news", "BULL": "bullCase", "BEAR": "bearCase" }),
    ["market", "news", "bullCase", "bearCase"], contextResult
  );

  await sleep(400);

  const decisionResult = await callAI(apiKey, INVEST_DECISION_SYSTEM,
    `Final investment decision for ${symbol}.\nCMP: ₹${stockData?.price?.toFixed(2) || 'N/A'}\n52W: ₹${stockData?.low52?.toFixed(2) || 'N/A'} – ₹${stockData?.high52?.toFixed(2) || 'N/A'}\nFUNDAMENTALS & MOAT:\n${fundResult}\nCONTEXT:\n${contextResult}`, M.decision);

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
  const configCtx = `\nRisk:Reward preference: minimum ${rrFilter}\nTrade type: ${tradeType === 'all' ? 'Intraday, Swing, Till Expiry' : tradeType}\nDate: ${new Date().toISOString().split('T')[0]}`;

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
    const dataCtx = stockData ? `Stock: ${symbol}\n${buildDataContext(stockData, mode)}` : `Stock: ${symbol} (limited data — use your knowledge of ${symbol} on NSE India but label all levels as 'estimated')`;

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
