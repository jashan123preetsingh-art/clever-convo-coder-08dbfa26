import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * TradingAgents — Consolidated Multi-Agent Framework
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

// ── Model Selection (cost-optimized) ──────────────────────
const MODELS = {
  scalp:   { analysis: "google/gemini-3-flash-preview", decision: "google/gemini-3-flash-preview" },
  swing:   { research: "google/gemini-3-flash-preview", debate: "google/gemini-3-flash-preview", decision: "google/gemini-3-flash-preview" },
  invest:  { fundamentals: "google/gemini-2.5-pro", context: "google/gemini-2.5-pro", decision: "google/gemini-2.5-pro" },
  options: { analysis: "google/gemini-3-flash-preview", decision: "google/gemini-3-flash-preview" },
};

// ── Shared Technical Framework ────────────────────────────
const TECHNICAL_FRAMEWORK = `**TECHNICAL ANALYSIS FRAMEWORK** (analyze in this exact order of priority):

1. **PRICE ACTION & SUPPLY/DEMAND** (highest weight)
   - Trend structure: HH/HL (bullish) or LH/LL (bearish), BOS (Break of Structure), CHoCH (Change of Character)
   - Supply zones (institutional selling areas) with exact ₹ levels
   - Demand zones (institutional buying areas) with exact ₹ levels
   - Order blocks, breaker blocks, Fair Value Gaps (FVGs)
   - Liquidity sweeps, stop hunts, springs/upthrusts (Wyckoff)

2. **MULTI-TIMEFRAME SUPPORT & RESISTANCE**
   - Daily pivot (S1/S2/S3, R1/R2/R3)
   - Key horizontal S/R from price history
   - Round number psychology levels (e.g. ₹1000, ₹500)
   - PDH/PDL/PDC (Previous Day High/Low/Close)

3. **EMA ALIGNMENT**
   - EMA 9/20/50/200 stack (bullish: 9>20>50>200, bearish: reverse)
   - Price position vs key EMAs
   - Golden Cross / Death Cross signals
   - Dynamic support/resistance from EMAs

4. **VOLUME & VWAP**
   - Volume-price confirmation or divergence
   - VWAP position and deviation
   - Volume ratio vs 20-day average
   - Climactic volume, no-demand/no-supply bars
   - Bollinger Band squeeze/expansion

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
      body: JSON.stringify({ model, messages, stream: false }),
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
    
    // Find last valid (non-null) close price — Yahoo sometimes returns nulls
    let lastClose = null;
    let prevClose = null;
    for (let i = closes.length - 1; i >= 0; i--) {
      if (closes[i] != null && closes[i] > 0) {
        if (lastClose === null) { lastClose = closes[i]; }
        else if (prevClose === null) { prevClose = closes[i]; break; }
      }
    }
    
    // If we still can't find valid prices, use meta regularMarketPrice
    if (lastClose === null) lastClose = meta.regularMarketPrice || meta.previousClose || 0;
    if (prevClose === null) prevClose = meta.previousClose || meta.chartPreviousClose || lastClose;
    
    const change = lastClose - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const sma20 = closes.slice(-20).reduce((a: number, b: number) => a + (b || 0), 0) / 20;
    const sma50 = closes.slice(-50).reduce((a: number, b: number) => a + (b || 0), 0) / Math.min(50, closes.length);
    const avgVol = volumes.slice(-10).reduce((a: number, b: number) => a + (b || 0), 0) / 10;
    const high52 = Math.max(...closes.filter((c: any) => c));
    const low52 = Math.min(...closes.filter((c: any) => c && c > 0));

    // EMA calculations
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

    // Supply/Demand zone detection
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

    // Swing points for S/R
    const swingPoints: string[] = [];
    for (let i = Math.max(2, closes.length - 18); i < closes.length - 2; i++) {
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        swingPoints.push(`SwingHigh: ₹${highs[i]?.toFixed(2)}`);
      }
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        swingPoints.push(`SwingLow: ₹${lows[i]?.toFixed(2)}`);
      }
    }

    // Pivot calculations
    const lastHigh = highs[highs.length - 1] || 0;
    const lastLow = lows[lows.length - 1] || 0;
    const pivot = (lastHigh + lastLow + lastClose) / 3;

    // Bollinger Bands
    const bb20 = closes.slice(-20);
    const bbMid = bb20.reduce((a: number, b: number) => a + (b || 0), 0) / 20;
    const bbStd = Math.sqrt(bb20.reduce((sum: number, v: number) => sum + ((v || 0) - bbMid) ** 2, 0) / 20);

    return {
      symbol, price: lastClose, change, changePct, prevClose,
      high: meta.regularMarketDayHigh, low: meta.regularMarketDayLow,
      volume: todayVol, avgVolume: avgVol,
      sma20, sma50, high52, low52,
      ema9, ema20, ema50, ema200,
      atr14, volRatio, pdh, pdl, pdc,
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
// CONSOLIDATED PIPELINE PROMPTS — PA/SD/SR/EMA/Volume Framework
// ════════════════════════════════════════════════════════════

// ── SCALP: Call 1 — Price Action + Volume (NO fundamentals) ──
const SCALP_ANALYSIS_SYSTEM = `You are a **World-Class Intraday Price Action Specialist**. Your analysis is PURELY technical — NO fundamentals.

${TECHNICAL_FRAMEWORK}

Provide TWO sections:

## TECHNICAL ANALYSIS

Analyze in priority order:
- **Price Action & S/D Zones**: Trend structure (HH/HL or LH/LL), BOS/CHoCH, order blocks, FVGs, liquidity sweeps
- **Key S/R Levels**: PDH/PDL/PDC, pivot levels, round numbers, swing highs/lows
- **EMA Stack**: 9/20/50 alignment, price position vs EMAs, dynamic S/R
- **Volume & VWAP**: Vol ratio, VWAP position, climactic vs dry volume, Bollinger squeeze
- **Candle Patterns**: ONLY at key S/D or S/R zones
- **Trade Setup**: Entry trigger, exact ₹ levels for entry/target/SL

## SENTIMENT

- Market mood from price action behavior
- Institutional vs retail positioning hints from volume patterns
- Overall bias with confidence level

Total under 500 words. Every claim must reference specific ₹ levels.`;

const SCALP_ANALYSIS_CHART_SYSTEM = `You are a **World-Class Intraday Chart Reading Specialist**. PURELY technical — NO fundamentals.

${TECHNICAL_FRAMEWORK}

Analyze the uploaded chart AND numerical data. Provide TWO sections:

## TECHNICAL ANALYSIS

Read the chart for (in priority order):
1. Supply/Demand zones, order blocks, FVGs with ₹ levels
2. Key S/R: swing highs/lows, pivot, PDH/PDL
3. EMA alignment from chart
4. Volume analysis: spikes, absorption, climactic action
5. Candlestick patterns AT key levels only
6. Trade setup with exact entry/target/SL ₹ levels

## SENTIMENT

Quick sentiment from price action and volume behavior.

Total under 500 words. Every claim must reference specific ₹ levels.`;

// ── SCALP: Call 2 — Trade Decision + Risk (NO fundamentals) ──
const SCALP_DECISION_SYSTEM = `You are a combined **Elite Scalp Trader + Risk Manager**. PURELY technical decisions — NO fundamental analysis.

## TRADE DECISION

**BIAS**: Bullish / Bearish / Neutral (with confidence %)
**ACTION**: BUY / SELL / NO TRADE

**TRADE PLAN:**
| Parameter | Value |
|-----------|-------|
| Entry ₹ | Exact trigger (at demand/supply zone or S/R) |
| Entry Type | Market / Limit / Stop-Limit |
| Target 1 ₹ | Next S/R level (book 50%) |
| Target 2 ₹ | Extended target (trail remaining) |
| Stop Loss ₹ | Below demand zone / above supply zone |
| Risk:Reward | Minimum 1:1.5 |
| Trade Duration | 10-30 min / 30-60 min / 1-3 hours |
| Position Size | 2-5% of capital |
| Trailing Stop | How to trail after T1 |

**ENTRY CONFIRMATION**: What price action signal MUST appear? (e.g., bullish engulfing at demand zone)
**INVALIDATION**: What kills this setup?

## RISK CHECK

**Trade Quality Score**: 1-10
- S/D zone quality, EMA confluence, volume confirmation
- Stop-loss at structural level (not arbitrary)
- R:R assessment, ATR-based volatility
**VERDICT**: APPROVED / APPROVED WITH ADJUSTMENTS / REJECTED

Be DECISIVE. Total under 400 words.`;

// ── SWING: Call 1 — Research Team (includes fundamentals) ──
const SWING_RESEARCH_SYSTEM = `You are a **Professional Trading Firm Research Team**. Provide FOUR sections:

## TECHNICAL ANALYSIS

${TECHNICAL_FRAMEWORK}

Apply this framework for swing/position analysis:
- Price Action: trend structure, S/D zones with ₹ levels, order blocks
- Multi-TF S/R: daily pivots, weekly levels, key horizontals
- EMA 9/20/50/200 alignment, golden/death cross
- Volume profile, VWAP, Bollinger position
Keep under 250 words.

## SENTIMENT

- Retail & institutional sentiment, FII/DII activity
- Options PCR indication, market mood
Keep under 150 words.

## NEWS

- Recent news, sector trends, regulatory changes
- Global macro, event risks
Keep under 150 words.

## FUNDAMENTALS

- PE, PB, ROE, ROCE, D/E ratio
- Promoter holding, revenue/profit growth, FCF, dividend yield
- Analyst targets and consensus
Keep under 200 words.

Be specific with numbers and ₹ levels throughout.`;

const SWING_RESEARCH_CHART_SYSTEM = `You are a **Professional Trading Firm Research Team**. Analyze the uploaded chart AND numerical data. Provide FOUR sections:

## TECHNICAL ANALYSIS
Chart reading using PA/SD/SR/EMA/Volume framework: trend structure, S/D zones, EMA alignment, volume analysis. Use ₹ levels from chart.

## SENTIMENT
Market mood, retail vs institutional positioning, PCR indication.

## NEWS
Recent catalysts, sector trends, macro factors.

## FUNDAMENTALS
Key ratios: PE, PB, ROE, ROCE, D/E, promoter holding, growth.

Total under 700 words.`;

// ── SWING: Call 2 — Bull vs Bear Debate ──────────────────
const SWING_DEBATE_SYSTEM = `You are a **Research Debate Panel** — Bull Researcher, Bear Researcher, and Research Manager. Based on the analysis:

## BULL CASE

Build the STRONGEST bull case using:
- Price Action: S/D zones, trend structure supporting upside
- Key support levels holding, EMA alignment bullish
- Volume confirming, fundamental catalysts
- Upside targets with ₹ levels
Keep under 200 words.

## BEAR CASE

Build the STRONGEST bear case:
- Supply zones overhead, trend structure weakening
- Key resistance levels, EMA breakdown
- Volume divergence, fundamental concerns
- Downside targets with ₹ levels
Keep under 200 words.

## RESEARCH VERDICT

Evaluate both sides objectively:
- Which has stronger price action evidence?
- Clear bias, conviction level, key factors
Keep under 200 words.`;

// ── SWING: Call 3 — Trader + Risk Panel + Portfolio Manager ─
const SWING_DECISION_SYSTEM = `You are a **Trading Decision Committee**. Based on all analysis, provide FIVE sections:

## TRADER DECISION

As the Swing/Position Trader:
- **Action**: Strong Buy / Buy / Hold / Sell / Strong Sell
- **Entry Price**: at demand zone or key S/R ₹ level
- **Target Price**: next supply zone or resistance ₹
- **Stop Loss**: below demand zone or key support ₹
- **Position Size**: 3-10% of portfolio
- **Holding Duration**: specify (e.g., "2-4 weeks")
- **Key Catalysts**: price action + fundamental triggers
- **Exit Strategy**: trailing stop or conditions

## AGGRESSIVE RISK

Argue FOR trade execution. S/D zone quality, EMA confluence, volume support. Under 120 words.

## CONSERVATIVE RISK

Focus on downside protection, supply zones above, suggest hedges. Under 120 words.

## NEUTRAL RISK

Balance both views with practical adjustments. Under 120 words.

## PORTFOLIO MANAGER

Final decision-maker:
- **Decision**: APPROVE or REJECT
- **Final Action**: Strong Buy / Buy / Hold / Sell / Strong Sell
- **Holding Duration**: Confirm or adjust
- **Position Size**: Final recommendation
- **Risk Score**: 1-10
- **Confidence**: percentage
- **Trailing Stop Strategy**: based on S/D zones or EMA
- **Summary**: 2-3 sentence rationale

Total under 700 words.`;

// ── INVEST: Call 1 — Deep Fundamentals + Moat ──────────────
const INVEST_FUNDAMENTALS_SYSTEM = `You are a **Warren Buffett-style Investment Research Team**. Provide TWO sections:

## FUNDAMENTAL ANALYSIS

Analyze as if buying the ENTIRE BUSINESS:
1. **Economic Moat**: Brand, network effects, switching costs, cost advantages
2. **Management Quality**: Capital allocation, insider buying, promoter holding
3. **Financial Fortress**: D/E < 0.5, consistent FCF, ROE > 15%, ROCE > 15%
4. **Earnings Power**: Consistent growth, predictable business
5. **Intrinsic Value**: DCF, earnings yield, margin of safety
6. **Circle of Competence**: Simple to understand?

Key metrics: PE, PB, ROE, ROCE, D/E, Dividend Yield, FCF Yield, Revenue/Profit CAGR, Promoter Holding, Pledge %.
Keep under 350 words.

## MOAT ANALYSIS

Rate each (None / Narrow / Wide):
1. **Brand Power**: Pricing power, recognition
2. **Network Effects**: Value increases with users?
3. **Switching Costs**: How hard to switch?
4. **Cost Advantages**: Scale, process advantages
5. **Efficient Scale**: Natural monopoly/oligopoly?

**Overall Moat Rating**: None / Narrow / Wide
**Moat Trend**: Strengthening / Stable / Weakening
Keep under 200 words.`;

// ── INVEST: Call 2 — Technical + News + Bull/Bear ──────────
const INVEST_CONTEXT_SYSTEM = `You are a **Long-term Investment Context Team**. Provide FOUR sections:

## TECHNICAL ANALYSIS

${TECHNICAL_FRAMEWORK}

Long-term perspective using this framework:
- Weekly/monthly price action structure, major S/D zones
- Multi-year S/R levels, major breakout/breakdown levels
- EMA 50/200 weekly alignment
- Long-term volume trends
Keep under 200 words.

## NEWS

Long-term macro outlook, regulatory environment, sector tailwinds/headwinds, upcoming catalysts.
Keep under 150 words.

## BULL CASE

STRONGEST case for buying and HOLDING 3-10 years:
- Business quality, growth runway, sector tailwinds
- Cite specific numbers: revenue CAGR, margin expansion
Keep under 200 words.

## BEAR CASE

What could DESTROY this investment over 5-10 years?
- Disruption risk, governance, cyclicality, regulatory threats
Keep under 200 words.`;

// ── INVEST: Call 3 — Committee + Architect ──────────────────
const INVEST_DECISION_SYSTEM = `You are a **Long-term Investment Decision Board**. Provide TWO sections:

## INVESTMENT COMMITTEE

- **Investment Grade**: A+ / A / B / C / D
- **Moat Verdict**: Wide / Narrow / None
- **Quality Score**: 1-10
- **Fair Value Estimate**: ₹ per share
- **Margin of Safety**: current % discount/premium
- **Conviction**: High / Medium / Low
- **Recommended Action**: Buy / Accumulate on Dips / Hold / Avoid
- **Investment Horizon**: specify years
Keep under 200 words.

## PORTFOLIO ARCHITECT

- **Decision**: INVEST / WATCHLIST / PASS
- **Action**: Buy Now / Accumulate Below ₹X / Wait
- **Target Allocation**: % of portfolio
- **Investment Horizon**: X-Y years
- **Expected CAGR**: %
- **Risk Score**: 1-10
- **Confidence**: %
- **Buy Zone**: ₹X - ₹Y
- **Exit Criteria**: thesis breakers
- **Key Quote**: One Buffett principle

Keep under 250 words.`;

// ── OPTIONS: Call 1 — Analysis (with technical framework) ──
const OPTIONS_ANALYSIS_SYSTEM = `You are an **Elite Options Analyst** for Indian F&O markets.

${TECHNICAL_FRAMEWORK}

Cover ALL with clear section headers:

## OI Analysis
1. OI Build-up Classification: Long/Short Build-up, Unwinding, Covering
2. PCR Analysis & trend
3. Max Pain strike & implications
4. OI Concentration: highest Call OI (resistance) and Put OI (support)
5. OI Change: which strikes saw max addition/reduction
6. Writers vs Buyers dominance
7. Straddle premium & expected move range

## Greeks & IV
1. Current IV vs historical, IV Rank, IV Percentile
2. IV Skew (Call vs Put)
3. Greeks at key strikes
4. Volatility regime
5. Event risk assessment

## Technical Analysis
Apply the PA/SD/SR/EMA/Volume framework:
- S/D zones for strike selection with ₹ levels
- Key S/R for directional bias
- EMA alignment for trend
- VWAP position for intraday options
- Expected range based on ATR
- Volume confirmation

Keep total under 600 words.`;

const OPTIONS_DECISION_SYSTEM = `You are an **Elite Options Strategist & Trader** for Indian F&O markets. Based on the analysis:

## Recommended Strategies
2-3 strategies with different risk profiles:
- **Aggressive** (directional, high risk/reward)
- **Moderate** (spreads, balanced)
- **Conservative** (premium selling, income)

For EACH: Strategy name, exact legs (strikes, CE/PE, Buy/Sell, lots), net premium, max profit/loss, breakevens, R:R, probability of profit, holding duration, SL, target, adjustments.

## Risk Assessment
- Risk score 1-10 for each strategy
- Margin requirements, max drawdown
- Greeks risk, liquidity risk, event risk
- Position sizing, exit rules

## Final Trade Decision
**PRIMARY TRADE:**
- Strategy, direction, complete leg details
- Net cost/credit, R:R, max profit/loss, breakeven
- Entry, SL, Target 1 (book 50%), Target 2 (trail)
- Confidence %, Risk Score, Capital Required

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

  const base = `Price: ₹${fmt(price)}, Change: ${fmt(stockData.changePct)}%
EMA 9: ₹${fmt(stockData.ema9)}, EMA 20: ₹${fmt(stockData.ema20)}, EMA 50: ₹${fmt(stockData.ema50)}, EMA 200: ₹${fmt(stockData.ema200)}
SMA 20: ₹${fmt(stockData.sma20)}, SMA 50: ₹${fmt(stockData.sma50)}
Pivot: ₹${fmt(stockData.pivot)}, S1: ₹${fmt(stockData.s1)}, S2: ₹${fmt(stockData.s2)}, R1: ₹${fmt(stockData.r1)}, R2: ₹${fmt(stockData.r2)}
Bollinger: ₹${fmt(stockData.bollingerLower)} / ₹${fmt(stockData.bollingerMid)} / ₹${fmt(stockData.bollingerUpper)}
Volume: ${fmtInt(stockData.volume)}, Avg Vol: ${fmtInt(stockData.avgVolume)}, Vol Ratio: ${stockData.volRatio ?? 'N/A'}x
ATR(14): ₹${fmt(stockData.atr14)}, 52W: ₹${fmt(stockData.low52)} - ₹${fmt(stockData.high52)}
S/D Zones: ${stockData.supplyDemandZones?.join(", ") || "None detected"}
Swing S/R: ${stockData.swingPoints?.join(", ") || "None"}`;

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
    `Deep fundamental analysis of ${symbol} for long-term investment. ${dataCtx}`, M.fundamentals);

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
    `Final investment decision for ${symbol}.\nFUNDAMENTALS & MOAT:\n${fundResult}\nCONTEXT:\n${contextResult}`, M.decision);

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
    // Retry with 1y range if 3mo fails
    if (!stockData && dataRange === "3mo") {
      stockData = await fetchStockData(symbol, "1y");
    }
    if (stockData && (stockData.price == null || stockData.price <= 0)) {
      console.warn(`Invalid price for ${symbol}, stockData.price = ${stockData.price}`);
      stockData = null;
    }
    const dataCtx = stockData ? `Stock: ${symbol}\n${buildDataContext(stockData, mode)}` : `Stock: ${symbol} (limited data — use your knowledge of ${symbol} on NSE India)`;

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
