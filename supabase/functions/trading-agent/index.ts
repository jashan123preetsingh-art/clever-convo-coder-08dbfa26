import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * TradingAgents — Consolidated Multi-Agent Framework
 * 
 * OPTIMIZED: Consolidated AI calls to reduce credit usage while maintaining quality.
 * - Scalp: 2 calls (was 4)
 * - Swing: 3 calls (was 12)
 * - Invest: 3 calls (was 8)
 * - Options: 2 calls (unchanged)
 * 
 * DB caching: Results cached for 30 min in ai_analysis_cache table.
 * UI still shows full pipeline stages — each consolidated response is split into sections.
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
  scalp:   { analysis: "google/gemini-2.5-flash", decision: "google/gemini-2.5-flash" },
  swing:   { research: "google/gemini-2.5-flash", debate: "google/gemini-2.5-flash", decision: "google/gemini-2.5-flash" },
  invest:  { fundamentals: "google/gemini-2.5-flash", context: "google/gemini-2.5-flash", decision: "google/gemini-2.5-flash" },
  options: { analysis: "google/gemini-2.5-flash", decision: "google/gemini-2.5-flash" },
};

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
// Splits a multi-section AI response by ## headers into named agent outputs
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

// Ensures all expected keys exist (fallback to full text if parsing fails)
function ensureKeys(parsed: Record<string, string>, keys: string[], fullText: string): Record<string, string> {
  const result = { ...parsed };
  const missingKeys = keys.filter(k => !result[k] || result[k].length < 20);
  if (missingKeys.length > 0 && Object.keys(parsed).length === 0) {
    // Parsing completely failed — put full text in first key
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
    const lastClose = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const change = lastClose - prevClose;
    const changePct = (change / prevClose) * 100;
    const sma20 = closes.slice(-20).reduce((a: number, b: number) => a + (b || 0), 0) / 20;
    const sma50 = closes.slice(-50).reduce((a: number, b: number) => a + (b || 0), 0) / Math.min(50, closes.length);
    const avgVol = volumes.slice(-10).reduce((a: number, b: number) => a + (b || 0), 0) / 10;
    const high52 = Math.max(...closes.filter((c: any) => c));
    const low52 = Math.min(...closes.filter((c: any) => c && c > 0));

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

    const swingPoints: string[] = [];
    for (let i = Math.max(2, closes.length - 18); i < closes.length - 2; i++) {
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        swingPoints.push(`SwingHigh: ₹${highs[i]?.toFixed(2)}`);
      }
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        swingPoints.push(`SwingLow: ₹${lows[i]?.toFixed(2)}`);
      }
    }

    return {
      symbol, price: lastClose, change, changePct, prevClose,
      high: meta.regularMarketDayHigh, low: meta.regularMarketDayLow,
      volume: todayVol, avgVolume: avgVol,
      sma20, sma50, high52, low52,
      atr14, volRatio, pdh, pdl, pdc,
      swingPoints: swingPoints.slice(-6),
      recentCandles,
      recentCloses: closes.slice(-20), recentVolumes: volumes.slice(-10),
    };
  } catch { return null; }
}

// ════════════════════════════════════════════════════════════
// CONSOLIDATED PIPELINE PROMPTS
// Each call combines multiple agent roles into a single comprehensive prompt
// The model outputs multiple ## sections that get parsed back into individual agents
// ════════════════════════════════════════════════════════════

// ── SCALP: Call 1 — Technical + Sentiment ──────────────────
const SCALP_ANALYSIS_SYSTEM = `You are a **World-Class Intraday Multi-Specialist Team**. Provide your analysis in TWO clearly separated sections using EXACTLY these headers:

## TECHNICAL ANALYSIS

As a Price Action & Volume Analyst, analyze:
- **Trend Structure**: Multi-timeframe (15min/1H/Daily alignment), HH/HL or LH/LL, BOS/CHoCH
- **Smart Money Concepts**: Order blocks, breaker blocks, FVGs with exact ₹ zones
- **Liquidity**: Stop-loss clusters, liquidity grabs, springs/upthrusts
- **Supply/Demand**: Fresh zones only, rate tested/untested
- **Volume Analysis**: Volume-price relationship, VWAP position, relative volume, climactic vs no-demand bars
- **Key Levels**: PDH/PDL/PDC, round numbers, gap levels
- **Trade Setup**: Setup type, entry trigger, entry/target/SL ₹ levels

## SENTIMENT

As a Sentiment Analyst, gauge:
- Retail & institutional sentiment, FII/DII activity hints
- Social media buzz, market mood
- Options PCR indication, fear/greed positioning

Keep each section focused and specific with ₹ levels. Total under 500 words.`;

const SCALP_ANALYSIS_CHART_SYSTEM = `You are a **World-Class Intraday Chart Reading Team**. Analyze the uploaded chart AND numerical data. Provide TWO clearly separated sections:

## TECHNICAL ANALYSIS

Read the chart for:
- Trend structure: HH/HL or LH/LL, BOS, CHoCH
- Supply/demand zones, order blocks, FVGs with ₹ levels
- Volume analysis: spikes, absorption, climactic action
- Candlestick patterns AT key levels only
- Trade setup with exact entry/target/SL ₹ levels

## SENTIMENT

Quick sentiment assessment:
- Market mood from price action and volume behavior
- Institutional vs retail positioning hints
- Overall bias with confidence level

Total under 500 words. Every claim must reference specific ₹ levels.`;

// ── SCALP: Call 2 — Trade Decision + Risk ──────────────────
const SCALP_DECISION_SYSTEM = `You are a combined **Elite Scalp Trader + Risk Manager**. Based on the analysis, provide TWO sections:

## TRADE DECISION

**BIAS**: Bullish / Bearish / Neutral (with confidence %)
**ACTION**: BUY / SELL / NO TRADE

**TRADE PLAN:**
| Parameter | Value |
|-----------|-------|
| Entry ₹ | Exact trigger price |
| Entry Type | Market / Limit / Stop-Limit |
| Target 1 ₹ | Quick scalp (book 50%) |
| Target 2 ₹ | Extended (trail remaining) |
| Stop Loss ₹ | Hard stop, non-negotiable |
| Risk:Reward | Minimum 1:1.5 |
| Trade Duration | 10-30 min / 30-60 min / 1-3 hours |
| Position Size | 2-5% of capital |
| Trailing Stop | How to trail after T1 |

**ENTRY CONFIRMATION**: What MUST happen before entering?
**INVALIDATION**: What kills this setup?

## RISK CHECK

**Trade Quality Score**: 1-10
- R:R ratio assessment, setup clarity, confluence factors
- Stop-loss validation (structural or arbitrary?)
- Volume/liquidity risk, volatility (ATR-based), spread concerns
- Time risk (market close, news events)
**VERDICT**: APPROVED / APPROVED WITH ADJUSTMENTS / REJECTED
If adjustments needed, provide modified parameters.

Be DECISIVE. Total under 400 words.`;

// ── SWING: Call 1 — Full Research Team ──────────────────────
const SWING_RESEARCH_SYSTEM = `You are a **Professional Trading Firm Research Team** with 4 specialists. Provide FOUR clearly separated sections:

## TECHNICAL ANALYSIS

As an Elite Price Action Analyst:
- Trend structure: HH/HL or LH/LL, BOS, CHoCH
- Supply/Demand zones with exact ₹ levels, order blocks
- Volume Profile: POC, Value Area High/Low
- Key S/R levels, candlestick patterns at key levels
- RSI divergences (1H+ timeframes only)
Keep under 250 words.

## SENTIMENT

As a Sentiment Analyst:
- Retail & institutional sentiment, social media buzz
- FII/DII activity, options PCR, market mood
Keep under 150 words.

## NEWS

As a News & Macro Analyst:
- Recent news, regulatory changes, sector trends
- Global macro factors, insider transactions, event risks
Keep under 150 words.

## FUNDAMENTALS

As a Fundamentals Analyst:
- PE, PB, ROE, ROCE, debt-to-equity
- Promoter holding, revenue/profit growth, FCF, dividend yield
Keep under 200 words.

Be specific with numbers and ₹ levels throughout.`;

const SWING_RESEARCH_CHART_SYSTEM = `You are a **Professional Trading Firm Research Team** with 4 specialists. Analyze the uploaded chart AND numerical data. Provide FOUR sections:

## TECHNICAL ANALYSIS
Chart reading + price action: trend structure, S/D zones, volume analysis, patterns. Use ₹ levels from chart.

## SENTIMENT
Market mood, retail vs institutional positioning, PCR indication.

## NEWS
Recent catalysts, sector trends, macro factors.

## FUNDAMENTALS
Key ratios: PE, PB, ROE, ROCE, debt, promoter holding, growth.

Total under 700 words.`;

// ── SWING: Call 2 — Bull vs Bear Debate + Manager ──────────
const SWING_DEBATE_SYSTEM = `You are a **Research Debate Panel** — a Bull Researcher, Bear Researcher, and Research Manager. Based on the analysis provided, produce THREE sections:

## BULL CASE

As the Bullish Researcher, build the STRONGEST bull case:
- Upside targets with specific ₹ levels
- Key catalysts and growth drivers
- Challenge bear arguments
Keep under 200 words.

## BEAR CASE

As the Bearish Researcher, build the STRONGEST bear case:
- Downside risks and red flags
- Specific downside targets
- Challenge bull arguments
Keep under 200 words.

## RESEARCH VERDICT

As the Research Manager / Investment Judge:
- Evaluate both sides objectively
- Clear Investment Plan with bias, conviction level, key factors
- State which side has stronger arguments and why
Keep under 200 words.`;

// ── SWING: Call 3 — Trader + Risk Panel + Portfolio Manager ─
const SWING_DECISION_SYSTEM = `You are a **Trading Decision Committee** combining 5 roles. Based on all analysis, debate, and research, provide FIVE sections:

## TRADER DECISION

As the Swing/Position Trader:
- **Action**: Strong Buy / Buy / Hold / Sell / Strong Sell
- **Entry Price**: specific ₹ level
- **Target Price**: specific ₹ (and extended target)
- **Stop Loss**: specific ₹
- **Position Size**: 3-10% of portfolio
- **Holding Duration**: MUST specify (e.g., "2-4 weeks", "1-3 months")
- **Key Catalysts**: what drives the move
- **Exit Strategy**: trailing stop or conditions

## AGGRESSIVE RISK

As the Aggressive Risk Analyst, argue FOR trade execution. Favorable R:R, momentum support. Under 120 words.

## CONSERVATIVE RISK

As the Conservative Risk Analyst, focus on downside protection, suggest hedges. Under 120 words.

## NEUTRAL RISK

As the Neutral Risk Analyst, balance both views, practical adjustments. Under 120 words.

## PORTFOLIO MANAGER

As the FINAL decision-maker:
- **Decision**: APPROVE or REJECT
- **Final Action**: Strong Buy / Buy / Hold / Sell / Strong Sell
- **Holding Duration**: Confirm or adjust
- **Position Size**: Final recommendation
- **Risk Score**: 1-10 (10 = highest risk)
- **Confidence**: percentage
- **Trailing Stop Strategy**: how to protect profits
- **Summary**: 2-3 sentence rationale

Be authoritative and decisive. Total under 700 words.`;

// ── INVEST: Call 1 — Deep Fundamentals + Moat ──────────────
const INVEST_FUNDAMENTALS_SYSTEM = `You are a **Warren Buffett-style Investment Research Team**. Provide TWO in-depth sections:

## FUNDAMENTAL ANALYSIS

As a Buffett-style Value Investor, analyze this company as if buying the ENTIRE BUSINESS:
1. **Economic Moat**: Durable competitive advantage? (brand, network effects, switching costs, cost advantages)
2. **Management Quality**: Honest, competent, shareholder-friendly? Capital allocation, insider buying, promoter holding
3. **Financial Fortress**: Debt/equity < 0.5, consistent FCF, ROE > 15%, ROCE > 15%
4. **Earnings Power**: Consistent growth over 5-10 years? Predictable business?
5. **Intrinsic Value**: DCF, earnings yield, asset value. Margin of safety?
6. **Circle of Competence**: Simple to understand?

Key metrics: PE, PB, ROE, ROCE, D/E, Dividend Yield, FCF Yield, Revenue/Profit CAGR (5yr, 10yr), Promoter Holding, Pledge %.
Keep under 350 words.

## MOAT ANALYSIS

As a Competitive Moat Analyst (Pat Dorsey / Morningstar methodology):
Rate each dimension: None / Narrow / Wide
1. **Brand Power**: Pricing power, recognition, loyalty
2. **Network Effects**: Value increases with users?
3. **Switching Costs**: How hard to switch?
4. **Cost Advantages**: Scale, process, location advantages
5. **Efficient Scale**: Natural monopoly/oligopoly?

**Overall Moat Rating**: None / Narrow / Wide
**Moat Trend**: Strengthening / Stable / Weakening
Keep under 200 words.`;

// ── INVEST: Call 2 — Technical + News + Bull/Bear ──────────
const INVEST_CONTEXT_SYSTEM = `You are a **Long-term Investment Context Team**. Provide FOUR sections:

## TECHNICAL ANALYSIS

Long-term technical perspective:
- Weekly/monthly structure, major S/R levels, long-term trend
- Multi-year chart patterns, major breakout/breakdown levels
- Entry timing based on long-term technicals
Keep under 200 words.

## NEWS

Long-term macro outlook:
- Regulatory environment, sector tailwinds/headwinds
- Global macro factors, industry disruption risks
- Upcoming catalysts (earnings, policy changes)
Keep under 150 words.

## BULL CASE

As a Warren Buffett disciple, build the STRONGEST case for buying and HOLDING 3-10 years:
- Business quality, growth runway, management
- Reinvestment potential, dividend growth, sector tailwinds
- Cite specific numbers: revenue CAGR, margin expansion, addressable market
Keep under 200 words.

## BEAR CASE

As Charlie Munger ("Invert, always invert"), what could DESTROY this investment over 5-10 years?
- Disruption risk, regulatory threats, management red flags
- Accounting concerns, cyclicality, capital misallocation, governance
Keep under 200 words.`;

// ── INVEST: Call 3 — Committee + Architect ──────────────────
const INVEST_DECISION_SYSTEM = `You are a **Long-term Investment Decision Board**. Provide TWO sections:

## INVESTMENT COMMITTEE

As the Investment Committee Chairman evaluating a 1-10 year investment:
- **Investment Grade**: A+ (Exceptional) / A (Strong) / B (Good) / C (Fair) / D (Avoid)
- **Moat Verdict**: Wide / Narrow / None
- **Quality Score**: 1-10
- **Fair Value Estimate**: ₹ intrinsic value per share
- **Margin of Safety**: current % discount/premium to fair value
- **Conviction**: High / Medium / Low
- **Recommended Action**: Buy / Accumulate on Dips / Hold / Avoid
- **Investment Horizon**: specify years
Keep under 200 words.

## PORTFOLIO ARCHITECT

As Warren Buffett's right hand, final investment decision:
- **Decision**: INVEST / WATCHLIST / PASS
- **Action**: Buy Now / Accumulate Below ₹X / Wait for Better Price
- **Target Allocation**: % of portfolio (5-15% for high conviction)
- **Investment Horizon**: X-Y years
- **Expected CAGR**: %
- **Risk Score**: 1-10
- **Confidence**: %
- **Buy Zone**: ₹X - ₹Y (ideal accumulation range)
- **Exit Criteria**: What would make you sell (thesis breakers)
- **Key Quote**: One Buffett principle that applies

"Our favorite holding period is forever." Keep under 250 words.`;

// ── OPTIONS prompts (already consolidated — 2 calls) ────────
const OPTIONS_ANALYSIS_SYSTEM = `You are an **Elite Options Analyst** combining expertise in OI patterns, Greeks/IV analysis, and technical analysis for Indian F&O markets. Provide comprehensive, actionable analysis with specific numbers.

Cover ALL of the following with clear section headers:

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
3. Greeks breakdown: Delta, Gamma, Theta, Vega at key strikes
4. Volatility regime (low-vol sell premium vs high-vol buy premium)
5. Event risk assessment

## Technical Analysis
- Key S/R for strike selection with exact ₹ levels
- Trend & structure for directional bias
- VWAP position for intraday options
- Expected range based on ATR
- Pattern-based targets for strike selection

Keep total under 600 words.`;

const OPTIONS_DECISION_SYSTEM = `You are an **Elite Options Strategist & Trader** for Indian F&O markets. Based on the analysis, provide your COMPLETE recommendation with these sections:

## Recommended Strategies
Construct 2-3 optimal strategies with different risk profiles:
- **Aggressive** (directional, high risk/reward)
- **Moderate** (spreads, balanced)
- **Conservative** (premium selling, income)

For EACH: Strategy name, exact legs (strikes, CE/PE, Buy/Sell, lots), net premium, max profit/loss, breakevens, R:R ratio, probability of profit, trade type, holding duration, SL, target, adjustments.

## Risk Assessment
- Risk score 1-10 for each strategy
- Margin requirements, max drawdown
- Greeks risk (gamma near expiry, theta timeline, vega)
- Liquidity risk, event risk
- Position sizing (% of portfolio)
- Exit rules (SL, target, time stop)

## Final Trade Decision
**PRIMARY TRADE:**
- Strategy, direction, complete leg details
- Net cost/credit, R:R, max profit/loss, breakeven
- Entry, SL, Target 1 (book 50%), Target 2 (trail)
- Confidence %, Risk Score, Capital Required

**ALTERNATIVE** (lower-risk option)

Use NSE lot sizes (NIFTY=25, BANKNIFTY=15). Keep under 800 words.`;

// ════════════════════════════════════════════════════════════
// PIPELINE RUNNERS — Consolidated
// ════════════════════════════════════════════════════════════

async function runScalpPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any, chartImage?: string) {
  const M = MODELS.scalp;
  const hasChart = !!chartImage;

  // Call 1: Technical + Sentiment (combined)
  const analysisResult = hasChart
    ? await callAIWithImage(apiKey, SCALP_ANALYSIS_CHART_SYSTEM, `Scalp/intraday analysis for ${symbol}. ${dataCtx}`, chartImage!, M.analysis)
    : await callAI(apiKey, SCALP_ANALYSIS_SYSTEM, `Scalp/intraday analysis for ${symbol}. ${dataCtx}`, M.analysis);

  const analysisParts = parseSections(analysisResult, {
    "TECHNICAL": "market",
    "SENTIMENT": "sentiment",
  });
  const agents1 = ensureKeys(analysisParts, ["market", "sentiment"], analysisResult);

  await sleep(400);

  // Call 2: Trade Decision + Risk Check (combined)
  const decisionResult = await callAI(apiKey, SCALP_DECISION_SYSTEM,
    `Make scalp/intraday call for ${symbol}.\nANALYSIS:\n${analysisResult}\nDATA: ${dataCtx}`, M.decision);

  const decisionParts = parseSections(decisionResult, {
    "TRADE": "traderDecision",
    "RISK": "riskCheck",
  });
  const agents2 = ensureKeys(decisionParts, ["traderDecision", "riskCheck"], decisionResult);

  return { agents: { ...agents1, ...agents2 } };
}

async function runSwingPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any, chartImage?: string) {
  const M = MODELS.swing;
  const hasChart = !!chartImage;

  // Call 1: Full Research Team (Technical + Sentiment + News + Fundamentals)
  const researchResult = hasChart
    ? await callAIWithImage(apiKey, SWING_RESEARCH_CHART_SYSTEM, `Full analysis for ${symbol}. ${dataCtx}`, chartImage!, M.research)
    : await callAI(apiKey, SWING_RESEARCH_SYSTEM, `Full analysis for ${symbol}. ${dataCtx}`, M.research);

  const researchParts = parseSections(researchResult, {
    "TECHNICAL": "market",
    "SENTIMENT": "sentiment",
    "NEWS": "news",
    "FUNDAMENTAL": "fundamentals",
  });
  const agents1 = ensureKeys(researchParts, ["market", "sentiment", "news", "fundamentals"], researchResult);

  await sleep(400);

  // Call 2: Bull vs Bear Debate + Research Manager
  const debateResult = await callAI(apiKey, SWING_DEBATE_SYSTEM,
    `Research debate for ${symbol}.\nFULL ANALYSIS:\n${researchResult}`, M.debate);

  const debateParts = parseSections(debateResult, {
    "BULL": "bullCase",
    "BEAR": "bearCase",
    "RESEARCH": "researchManager",
  });
  const agents2 = ensureKeys(debateParts, ["bullCase", "bearCase", "researchManager"], debateResult);

  await sleep(400);

  // Call 3: Trader + Risk Panel + Portfolio Manager
  const decisionResult = await callAI(apiKey, SWING_DECISION_SYSTEM,
    `Final trading decision for ${symbol}.\nRESEARCH:\n${researchResult}\nDEBATE:\n${debateResult}`, M.decision);

  const decisionParts = parseSections(decisionResult, {
    "TRADER": "traderDecision",
    "AGGRESSIVE": "aggressiveRisk",
    "CONSERVATIVE": "conservativeRisk",
    "NEUTRAL": "neutralRisk",
    "PORTFOLIO": "portfolioManager",
  });
  const agents3 = ensureKeys(decisionParts, ["traderDecision", "aggressiveRisk", "conservativeRisk", "neutralRisk", "portfolioManager"], decisionResult);

  return { agents: { ...agents1, ...agents2, ...agents3 } };
}

async function runInvestPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any) {
  const M = MODELS.invest;

  // Call 1: Deep Fundamentals + Moat
  const fundResult = await callAI(apiKey, INVEST_FUNDAMENTALS_SYSTEM,
    `Deep fundamental analysis of ${symbol} for long-term investment (1-10 years). ${dataCtx}`, M.fundamentals);

  const fundParts = parseSections(fundResult, {
    "FUNDAMENTAL": "fundamentals",
    "MOAT": "moat",
  });
  const agents1 = ensureKeys(fundParts, ["fundamentals", "moat"], fundResult);

  await sleep(400);

  // Call 2: Technical + News + Bull/Bear
  const contextResult = await callAI(apiKey, INVEST_CONTEXT_SYSTEM,
    `Long-term context for ${symbol}.\nFUNDAMENTALS:\n${fundResult}\n${dataCtx}`, M.context);

  const contextParts = parseSections(contextResult, {
    "TECHNICAL": "market",
    "NEWS": "news",
    "BULL": "bullCase",
    "BEAR": "bearCase",
  });
  const agents2 = ensureKeys(contextParts, ["market", "news", "bullCase", "bearCase"], contextResult);

  await sleep(400);

  // Call 3: Investment Committee + Portfolio Architect
  const decisionResult = await callAI(apiKey, INVEST_DECISION_SYSTEM,
    `Final investment decision for ${symbol} (1-10yr horizon).\nFUNDAMENTALS & MOAT:\n${fundResult}\nCONTEXT:\n${contextResult}`, M.decision);

  const decisionParts = parseSections(decisionResult, {
    "INVESTMENT COMMITTEE": "investmentManager",
    "PORTFOLIO ARCHITECT": "portfolioArchitect",
  });
  const agents3 = ensureKeys(decisionParts, ["investmentManager", "portfolioArchitect"], decisionResult);

  return { agents: { ...agents1, ...agents2, ...agents3 } };
}

async function runOptionsPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any, optionsConfig?: { riskReward?: string; tradeType?: string }) {
  const M = MODELS.options;
  const rrFilter = optionsConfig?.riskReward || "1:2";
  const tradeType = optionsConfig?.tradeType || "all";
  const configCtx = `\nRisk:Reward preference: minimum ${rrFilter}\nTrade type: ${tradeType === 'all' ? 'Intraday, Swing, Till Expiry' : tradeType}\nDate: ${new Date().toISOString().split('T')[0]}`;

  try {
    // Call 1: Combined OI + Greeks + Technical
    const analysisResult = await callAI(apiKey, OPTIONS_ANALYSIS_SYSTEM,
      `Complete options analysis for ${symbol}.\n${configCtx}\n${dataCtx}`, M.analysis);

    await sleep(200);

    // Call 2: Strategy + Risk + Final Trade
    const decisionResult = await callAI(apiKey, OPTIONS_DECISION_SYSTEM,
      `Options strategy for ${symbol}.\nANALYSIS:\n${analysisResult}\nR:R filter: ${rrFilter}\nTrade types: ${tradeType}\n${dataCtx}${configCtx}`, M.decision);

    return {
      agents: {
        oiAnalysis: analysisResult,
        optionsTrader: decisionResult,
      },
    };
  } catch (err) {
    console.error("Options pipeline error, using fallback:", err);
    return generateOptionsFallback(symbol, stockData, rrFilter, tradeType);
  }
}

// ── Deterministic Fallback for Options ─────────────────────
function generateOptionsFallback(symbol: string, stockData: any, rrFilter: string, tradeType: string) {
  const price = stockData?.price || 0;
  const sma20 = stockData?.sma20 || price;
  const sma50 = stockData?.sma50 || price;
  const high52 = stockData?.high52 || price * 1.2;
  const low52 = stockData?.low52 || price * 0.8;
  const changePct = stockData?.changePct || 0;
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

    // ── Check DB cache (skip if chart image — unique each time) ──
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

    const hasChart = !!chartImage;
    console.log(`TradingAgents [${mode}] started for ${symbol}${hasChart ? ' (chart)' : ''}`);

    const dataRange = mode === "invest" ? "1y" : "3mo";
    const stockData = await fetchStockData(symbol, dataRange);
    let dataCtx: string;
    if (stockData) {
      const base = `Stock: ${symbol}, Price: ₹${stockData.price?.toFixed(2)}, Change: ${stockData.changePct?.toFixed(2)}%, SMA20: ₹${stockData.sma20?.toFixed(2)}, SMA50: ₹${stockData.sma50?.toFixed(2)}, Volume: ${stockData.volume?.toLocaleString()}, Avg Vol: ${stockData.avgVolume?.toLocaleString()}, 52W High: ₹${stockData.high52?.toFixed(2)}, 52W Low: ₹${stockData.low52?.toFixed(2)}, Recent closes: ${stockData.recentCloses?.slice(-10)?.map((c: number) => c?.toFixed(2))?.join(", ")}`;
      if (mode === "scalp") {
        const intradayCtx = `\nATR(14): ₹${stockData.atr14?.toFixed(2)}, Vol Ratio: ${stockData.volRatio}x, PDH: ₹${stockData.pdh?.toFixed(2)}, PDL: ₹${stockData.pdl?.toFixed(2)}, PDC: ₹${stockData.pdc?.toFixed(2)}\nSwing Points: ${stockData.swingPoints?.join(", ") || "None"}\nLast 5 Candles:\n${stockData.recentCandles?.slice(-5)?.map((c: any, i: number) => `  [${i+1}] O:₹${c.o?.toFixed(2)} H:₹${c.h?.toFixed(2)} L:₹${c.l?.toFixed(2)} C:₹${c.c?.toFixed(2)} V:${(c.v || 0).toLocaleString()}`).join("\n") || "N/A"}`;
        dataCtx = base + intradayCtx;
      } else {
        dataCtx = base;
      }
    } else {
      dataCtx = `Stock: ${symbol} (limited data)`;
    }

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

    const responseData = {
      symbol, mode, hasChartAnalysis: hasChart,
      stockData: stockData ? {
        price: stockData.price, change: stockData.change, changePct: stockData.changePct,
        volume: stockData.volume, sma20: stockData.sma20, sma50: stockData.sma50,
        high52: stockData.high52, low52: stockData.low52,
      } : null,
      agents: result.agents,
    };

    // Store in DB cache (skip chart-based)
    if (!chartImage) {
      setDBCache(cacheKey, symbol.toUpperCase(), mode, responseData).catch(() => {});
    }

    return new Response(
      JSON.stringify({ ...responseData, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Trading agent error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("RATE_LIMITED") ? 429 : msg.includes("CREDITS") ? 402 : 500;
    const userMsg = status === 429 ? "AI is busy. Please wait and retry." : status === 402 ? "AI credits temporarily unavailable." : msg;
    return new Response(JSON.stringify({ error: userMsg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
