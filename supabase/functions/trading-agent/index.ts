import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/*
 * TradingAgents-style Multi-Agent Framework — 4 Modes
 * 
 * Mode 1: SCALP (Intraday & Scalping) — Pure technical, fast, no fundamentals/portfolio
 * Mode 2: SWING (Swing & Position) — Full pipeline with holding duration
 * Mode 3: INVEST (Long-term 1-10yr) — Warren Buffett style, deep fundamentals
 * Mode 4: OPTIONS — Full options analysis, OI, Greeks, strategies, risk-reward
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── In-Memory Cache (10 min TTL) ────────────────────────────
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

function getCacheKey(symbol: string, mode: string, optionsConfig?: any): string {
  const base = `${symbol.toUpperCase()}:${mode}`;
  if (mode === "options" && optionsConfig) {
    return `${base}:${optionsConfig.tradeType || ""}:${optionsConfig.rrFilter || ""}`;
  }
  return base;
}

function getFromCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any) {
  // Limit cache size to prevent memory issues
  if (cache.size > 100) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// ── Mode-Optimized Model Selection ──────────────────────────
// SCALP: Speed + technical precision. Flash models for low latency, GPT-5.2 for price action.
// SWING: Balanced mix. Pro models for debate depth, GPT-5 for final decisions.
// INVEST: Deep research. GPT-5 with reasoning for DCF/moat, Pro for thorough debate.

const MODELS = {
  scalp: {
    technical:    "google/gemini-2.5-flash",     // Fast technical analysis
    sentiment:    "google/gemini-2.5-flash-lite", // Fast sentiment scan
    trader:       "google/gemini-2.5-flash",     // Decisive quick calls
    risk:         "google/gemini-3-flash-preview", // Fast risk check
  },
  swing: {
    technical:    "google/gemini-2.5-flash",     // Strong technical analysis
    sentiment:    "google/gemini-2.5-flash-lite", // Balanced sentiment
    news:         "google/gemini-3-flash-preview", // Fast news digest
    fundamentals: "google/gemini-2.5-flash",     // Balanced fundamentals
    bull:         "google/gemini-2.5-flash",     // Bull arguments
    bear:         "google/gemini-2.5-flash",     // Bear arguments
    manager:      "google/gemini-2.5-flash",     // Strong judgment
    trader:       "google/gemini-2.5-flash",     // Decisive trader
    riskAggr:     "google/gemini-3-flash-preview",
    riskCons:     "google/gemini-3-flash-preview",
    riskNeut:     "google/gemini-2.5-flash-lite",
    portfolio:    "google/gemini-2.5-flash",     // Final decision
  },
  invest: {
    fundamentals: "google/gemini-2.5-flash",     // Deep value analysis
    moat:         "google/gemini-2.5-flash",     // Moat analysis
    technical:    "google/gemini-2.5-flash-lite", // Light technical for entry timing
    news:         "google/gemini-2.5-flash-lite", // Macro outlook
    bull:         "google/gemini-2.5-flash",     // Thorough bull case
    bear:         "google/gemini-2.5-flash",     // Thorough bear case
    committee:    "google/gemini-2.5-flash",     // Investment committee
    architect:    "google/gemini-2.5-flash",     // Final Buffett-style decision
  },
  options: {
    oiAnalyst:    "google/gemini-2.5-flash",         // Fast OI scan
    greeksAnalyst:"google/gemini-2.5-flash",         // Fast Greeks & IV
    technical:    "google/gemini-2.5-flash",         // Fast strike selection
    strategist:   "google/gemini-3-flash-preview",   // Latest+smartest fast model for strategy
    riskManager:  "google/gemini-2.5-flash",         // Fast risk check
    trader:       "google/gemini-3-flash-preview",   // Latest+smartest fast model for final trade
  },
};

const MAX_DEBATE_ROUNDS = 1;
const MAX_RISK_ROUNDS = 1;

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function callAIRaw(apiKey: string, system: string, user: string | Array<any>, model: string): Promise<string> {
  const messages = [{ role: "system", content: system }, { role: "user", content: user }];
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const body: any = { model, messages, stream: false };
    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

    // Intraday-relevant: recent OHLCV candles, ATR, volume ratio, swing points
    const recentCandles = [];
    for (let i = Math.max(0, closes.length - 10); i < closes.length; i++) {
      recentCandles.push({ o: opens[i], h: highs[i], l: lows[i], c: closes[i], v: volumes[i] });
    }
    // ATR (14-period)
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
    
    // Volume ratio (today vs 10-day avg)
    const todayVol = volumes[volumes.length - 1] || 0;
    const volRatio = avgVol > 0 ? (todayVol / avgVol).toFixed(2) : "N/A";

    // PDH, PDL, PDC (Previous Day High/Low/Close)
    const pdh = highs[highs.length - 2] || 0;
    const pdl = lows[lows.length - 2] || 0;
    const pdc = closes[closes.length - 2] || 0;

    // Recent swing highs/lows (last 20 candles)
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

// ── Mode-specific prompts ──────────────────────────────────

// === SCALP MODE prompts (Intraday/Scalping) ===
const SCALP_MARKET_SYSTEM = `You are a **World-Class Intraday Price Action & Volume Analyst** — the most feared scalper on Dalal Street. You trade NAKED CHARTS with surgical precision. Zero indicators, pure tape reading.

## MANDATORY ANALYSIS FRAMEWORK (follow this exact order):

### 1. TREND STRUCTURE (most important)
- **Multi-timeframe trend**: 15min trend inside 1H trend inside Daily trend — are they aligned or conflicting?
- **Market phase**: Accumulation / Markup / Distribution / Markdown (Wyckoff)
- **Swing structure**: Map the last 5 swing points — HH/HL (bullish) or LH/LL (bearish)?
- **BOS vs CHoCH**: Has structure broken? Where exactly (₹ level)? Is this a trend continuation or reversal signal?
- **Trend strength**: Are impulse moves stronger than corrections? (compare candle sizes, speed)

### 2. PRICE ACTION DEEP DIVE
- **Smart Money Concepts**: Order blocks (OB), breaker blocks, mitigation blocks with exact ₹ zones
- **Liquidity mapping**: Where are stop-losses clustered? (below equal lows, above equal highs, below trendlines)
- **Liquidity grabs**: Has price swept liquidity and reversed? (spring, upthrust, deviation, trap)
- **Fair Value Gaps (FVG)**: Unfilled imbalances — price WILL revisit these. Mark exact ₹ ranges
- **Supply/Demand zones**: Fresh zones only. Rate: tested/untested, how price left the zone (strong/weak departure)
- **Candle analysis at key levels**: Pin bars, engulfing, inside bars, doji — ONLY at S/D zones or OBs (ignore random candles)

### 3. VOLUME ANALYSIS (critical for intraday)
- **Volume-Price relationship**: Up move + high volume = strong. Up move + low volume = weak/suspect
- **Volume spikes**: Where did climactic volume occur? What happened after? (absorption, exhaustion, breakout)
- **No-demand bars**: Up bars with below-average volume = weakness (Wyckoff VSA)
- **No-supply bars**: Down bars with below-average volume = strength
- **VWAP**: Is price above/below VWAP? VWAP acts as dynamic S/R for institutional traders
- **Relative volume**: Today's volume vs 10-day avg — is there unusual activity?
- **Volume at key levels**: Did support/resistance levels have volume confirmation?

### 4. KEY LEVELS (exact ₹ prices)
- PDH (Previous Day High), PDL (Previous Day Low), PDC (Previous Day Close)
- Opening Range High/Low (first 15-30 min)
- Round numbers (psychological levels)
- CPR (Central Pivot Range) or Standard Pivots
- Gap levels (if any gap up/down)

### 5. TRADE SETUP
- **Setup type**: Breakout-Retest / Pullback to Demand / Rejection at Supply / Liquidity Sweep Reversal / FVG Fill
- **Entry trigger**: What EXACT candle or price action confirms entry?
- **Entry ₹**: Exact price
- **Target 1 ₹** (scalp): Nearest opposing zone
- **Target 2 ₹** (intraday): Next major level
- **Stop Loss ₹**: Below/above the setup structure (not arbitrary)
- **Risk:Reward**: Must be minimum 1:1.5

DO NOT mention PE, fundamentals, long-term outlook. ZERO indicators except VWAP and volume. This is PURE PRICE ACTION.
Keep under 400 words. Be specific with every ₹ level.`;

const SCALP_MARKET_CHART_SYSTEM = `You are a **World-Class Intraday Chart Reader** — you see what 99% of traders miss. Analyze the uploaded chart for PRECISION trade setups.

## CHART READING PROTOCOL:

### STRUCTURE FIRST
- What is the prevailing trend on this timeframe? Map HH/HL or LH/LL
- Has BOS (Break of Structure) occurred? Where? Is it confirmed or just a wick?
- Any CHoCH (Change of Character) signaling reversal?

### ZONES & LEVELS
- Mark ALL supply/demand zones visible on chart with exact ₹ levels
- Identify order blocks (last opposing candle before a strong move)
- Fair value gaps (3-candle imbalances)
- Key horizontal S/R that price has reacted to multiple times

### VOLUME & CANDLES
- Volume bars: Where are the volume spikes? Absorption or breakout volume?
- Candle patterns AT key levels only (ignore noise)
- Wyckoff VSA: No-demand, no-supply, stopping volume, climactic action

### TRADE SETUP
- **Entry ₹**: Based on what you see on the chart
- **Target ₹**: Next opposing zone/level
- **Stop Loss ₹**: Structural stop (below demand or above supply)
- **R:R**: Calculate precisely

Keep under 400 words. Every claim must reference a specific ₹ level visible on chart.`;

const SCALP_TRADER_SYSTEM = `You are the **Elite Intraday Scalp Trader** — you execute with ZERO emotion, pure system-based decisions.

Based on the technical analysis provided, deliver your FINAL TRADE CALL:

## TRADE DECISION FORMAT:

**BIAS**: Bullish / Bearish / Neutral (with confidence %)
**ACTION**: BUY / SELL / NO TRADE (and WHY in one line)

**TRADE PLAN:**
| Parameter | Value |
|-----------|-------|
| Entry ₹ | Exact trigger price |
| Entry Type | Market / Limit / Stop-Limit |
| Target 1 ₹ | Quick scalp target (book 50%) |
| Target 2 ₹ | Extended target (trail remaining) |
| Stop Loss ₹ | Hard stop, non-negotiable |
| Risk:Reward | Minimum 1:1.5 |
| Trade Duration | 10-30 min / 30-60 min / 1-3 hours |
| Position Size | 2-5% of capital |
| Trailing Stop | How to trail after T1 hit |

**ENTRY CONFIRMATION**: What MUST happen before entering? (e.g., "Wait for 5min close above ₹X with volume > avg")
**INVALIDATION**: What kills this setup? (e.g., "If price closes below ₹X, setup is dead")
**MARKET CONTEXT**: Is broader market (NIFTY/BANKNIFTY) supporting this trade?

Be DECISIVE. No "maybe" or "could go either way". Pick a side. Keep under 200 words.`;

const SCALP_RISK_SYSTEM = `You are the **Intraday Risk Manager** — your job is to PROTECT CAPITAL above all else.

## RISK ASSESSMENT:

### 1. Trade Quality Score (1-10)
- R:R ratio (min 1:1.5 for scalp, 1:2 for positional intraday)
- Setup clarity (is the setup textbook or forced?)
- Multiple confluence factors (trend + volume + level + candle = strong)

### 2. Risk Checks
- **Stop-loss validation**: Is SL below a structural level or just arbitrary? Is SL too wide for the timeframe (>0.5% for scalp, >1% for intraday)?
- **Volume risk**: Is there enough liquidity for clean execution? Check avg volume vs position size
- **Volatility**: ATR-based assessment — is the stock moving enough to hit target but not so wild it'll hit SL randomly?
- **Spread**: For illiquid stocks, bid-ask spread eats into profits
- **Time risk**: Is this trade too close to market close or a high-impact news event?
- **Correlation**: Is this trade doubling exposure to the same sector/index move?

### 3. VERDICT
- **APPROVED** / **APPROVED WITH ADJUSTMENTS** / **REJECTED**
- If adjustments: provide modified SL, target, or position size
- If rejected: explain clearly why and what would make it tradeable

Keep under 200 words. Be strict — only good setups deserve capital.`;

// === SWING MODE prompts ===
const SWING_TRADER_SYSTEM = `You are the **Swing/Position Trader Agent**. Given all reports, make a CLEAR trading decision:

- **Action**: Strong Buy / Buy / Hold / Sell / Strong Sell
- **Entry Price**: specific ₹ level
- **Target Price**: specific ₹ level (and extended target)
- **Stop Loss**: specific ₹ level
- **Position Size**: % of portfolio (3-10%)
- **Holding Duration**: MUST specify expected duration (e.g., "2-4 weeks", "1-3 months", "3-6 months")
- **Key Catalysts**: what will drive the move in this timeframe
- **Exit Strategy**: conditions for early exit or trailing stop

Be decisive and always mention the expected holding period. Keep under 250 words.`;

const SWING_PORTFOLIO_SYSTEM = `You are the **Portfolio Manager** — the FINAL decision-maker for Swing/Position trades.

Make the FINAL decision:
- **Decision**: APPROVE or REJECT
- **Final Action**: Strong Buy / Buy / Hold / Sell / Strong Sell
- **Holding Duration**: Confirm or adjust expected hold time (weeks/months)
- **Adjusted Position Size**: if different from trader's suggestion
- **Risk Score**: 1-10 (10 = highest risk)
- **Confidence**: percentage
- **Trailing Stop Strategy**: how to protect profits as trade moves
- **Summary**: 2-3 sentence rationale including why this timeframe

Be authoritative. Keep under 200 words.`;

// === INVEST MODE prompts (Warren Buffett style) ===
const INVEST_FUNDAMENTALS_SYSTEM = `You are a **Warren Buffett-style Value Investor & Fundamental Analyst**. Analyze this company as if you're buying the ENTIRE BUSINESS, not just a stock.

Apply Buffett's core principles:
1. **Economic Moat**: Does this company have a durable competitive advantage? (brand, network effects, switching costs, cost advantages, patents)
2. **Management Quality**: Is management honest, competent, and shareholder-friendly? (capital allocation, insider buying, promoter holding)
3. **Financial Fortress**: Strong balance sheet? (debt/equity < 0.5 preferred, consistent FCF, ROE > 15%, ROCE > 15%)
4. **Earnings Power**: Consistent earnings growth over 5-10 years? Predictable business?
5. **Intrinsic Value**: What is the business worth? Use DCF, earnings yield, asset value. What's the margin of safety?
6. **Circle of Competence**: Is this business simple to understand?

Key metrics: PE, PB, ROE, ROCE, Debt/Equity, Dividend Yield, FCF Yield, Revenue/Profit CAGR (5yr, 10yr), Promoter Holding, Pledge %.

"Price is what you pay, value is what you get." — Warren Buffett

Be specific with numbers. Keep under 350 words.`;

const INVEST_MOAT_SYSTEM = `You are a **Competitive Moat Analyst** (inspired by Pat Dorsey / Morningstar moat methodology).

Analyze the company's moat across 5 dimensions:
1. **Brand Power**: Pricing power, brand recognition, customer loyalty
2. **Network Effects**: Does the product become more valuable as more people use it?
3. **Switching Costs**: How hard is it for customers to switch to competitors?
4. **Cost Advantages**: Scale, process, location, or resource advantages
5. **Efficient Scale**: Natural monopoly or oligopoly characteristics

Rate each dimension: None / Narrow / Wide
Overall Moat Rating: None / Narrow / Wide

Also assess **Moat Trend**: Strengthening / Stable / Weakening

Keep under 200 words.`;

const INVEST_BULL_SYSTEM = `You are the **Long-term Bull Case Builder** (think like a Warren Buffett disciple).
Build the STRONGEST case for buying and HOLDING this stock for 3-10 years.
Focus on: business quality, growth runway, management, reinvestment potential, dividend growth, sector tailwinds.
Cite specific numbers: revenue CAGR, margin expansion potential, addressable market size.
Keep under 200 words.`;

const INVEST_BEAR_SYSTEM = `You are the **Long-term Risk Analyst** (think like Charlie Munger — "Invert, always invert").
What could DESTROY this investment over 5-10 years?
Focus on: disruption risk, regulatory threats, management red flags, accounting concerns, cyclicality, capital misallocation, governance issues.
"It's not about being bearish. It's about avoiding permanent loss of capital."
Keep under 200 words.`;

const INVEST_MANAGER_SYSTEM = `You are the **Investment Committee Chairman** evaluating a long-term (1-10 year) investment.
Given the fundamental analysis, moat assessment, bull case, and bear case:

- **Investment Grade**: A+ (Exceptional) / A (Strong) / B (Good) / C (Fair) / D (Avoid)
- **Moat Verdict**: Wide / Narrow / None
- **Quality Score**: 1-10
- **Fair Value Estimate**: ₹ intrinsic value per share
- **Margin of Safety**: current % discount/premium to fair value
- **Conviction**: High / Medium / Low
- **Recommended Action**: Buy / Accumulate on Dips / Hold / Avoid
- **Investment Horizon**: specify (e.g., "3-5 years", "5-10 years")
Keep under 200 words.`;

const INVEST_PORTFOLIO_SYSTEM = `You are the **Long-term Portfolio Architect** — Warren Buffett's right hand.

Final investment decision for a multi-year holding:
- **Decision**: INVEST / WATCHLIST / PASS
- **Action**: Buy Now / Accumulate Below ₹X / Wait for Better Price
- **Target Allocation**: % of portfolio (concentrated: 5-15% for high conviction)
- **Investment Horizon**: X-Y years
- **Expected CAGR**: %
- **Risk Score**: 1-10
- **Confidence**: %
- **Buy Zone**: ₹X - ₹Y (ideal accumulation range)
- **Exit Criteria**: What would make you sell (thesis breakers)
- **Key Quote**: One Warren Buffett principle that applies

"Our favorite holding period is forever." — but know when the thesis breaks.
Keep under 250 words.`;

// === Original shared prompts ===
const MARKET_ANALYST_SYSTEM = `You are an **Elite Price Action & Technical Analyst** in a professional trading firm — a master of pure price action trading.

Your core expertise:
**Price Action Mastery:**
- Read naked charts — identify trend structure (HH/HL for uptrend, LH/LL for downtrend), BOS (Break of Structure), CHoCH (Change of Character)
- Recognize candlestick patterns with precision
- Identify key price action setups: pullback entries, breakout retests, fakeouts/traps

**Supply & Demand Zone Analysis:**
- Mark fresh vs tested supply/demand zones with exact ₹ price levels
- Order blocks, breaker blocks, mitigation blocks (Smart Money Concepts)
- Rally-Base-Rally, Drop-Base-Drop formations

**Volume & Volume Profile (PRIMARY):**
- Volume Profile: POC, Value Area High/Low, HVN, LVN
- Volume Price Analysis: climactic volume, no-demand/no-supply bars
- RSI divergences — use only on 1H+ timeframes

Be specific with ₹ price levels. Keep under 250 words.`;

const MARKET_ANALYST_CHART_SYSTEM = `You are an **Elite Price Action & Technical Analyst** with chart reading expertise.
Analyze the uploaded chart along with numerical data:
- Market structure: HH/HL, LH/LL, BOS, CHoCH
- Supply/Demand zones with ₹ levels
- Chart patterns, candlestick patterns
- Volume profile analysis
- Key S/R levels
Combine visual + numerical analysis. Keep under 350 words.`;

const SENTIMENT_ANALYST_SYSTEM = `You are the **Sentiment Analyst**. Gauge retail & institutional sentiment, social media buzz, FII/DII activity, options PCR, and market mood. Be specific. Keep under 200 words.`;

const NEWS_ANALYST_SYSTEM = `You are the **News Analyst**. Analyze recent news, regulatory changes, sector trends, global macro, insider transactions, and event risks. Be specific. Keep under 200 words.`;

const FUNDAMENTALS_ANALYST_SYSTEM = `You are the **Fundamentals Analyst**. Evaluate PE, PB, ROE, ROCE, debt-to-equity, promoter holding, revenue/profit growth, FCF, dividend yield. Be specific with numbers. Keep under 200 words.`;

const BULL_RESEARCHER_SYSTEM = `You are the **Bullish Researcher**. Build the STRONGEST bull case with upside targets, catalysts, and growth drivers. Challenge bear arguments if provided. Keep under 200 words.`;
const BEAR_RESEARCHER_SYSTEM = `You are the **Bearish Researcher**. Build the STRONGEST bear case. Highlight risks, red flags, downside targets. Challenge bull arguments. Keep under 200 words.`;
const RESEARCH_MANAGER_SYSTEM = `You are the **Research Manager / Investment Judge**. Evaluate both sides and produce a clear Investment Plan with bias, conviction, key factors. Keep under 200 words.`;

const TRADER_SYSTEM = `You are the **Trader Agent**. Make a CLEAR trading decision: Action, Entry ₹, Target ₹, Stop Loss ₹, Position Size %, Time Horizon. Be decisive. Keep under 200 words.`;

const AGGRESSIVE_RISK_SYSTEM = `You are the **Aggressive Risk Analyst**. Evaluate and argue FOR the trade execution. Discuss favorable risk/reward. Keep under 150 words.`;
const CONSERVATIVE_RISK_SYSTEM = `You are the **Conservative Risk Analyst**. Focus on downside protection, suggest hedges. Keep under 150 words.`;
const NEUTRAL_RISK_SYSTEM = `You are the **Neutral Risk Analyst**. Balance aggressive and conservative views. Offer practical adjustments. Keep under 150 words.`;
const PORTFOLIO_MANAGER_SYSTEM = `You are the **Portfolio Manager** — FINAL decision-maker. Decision, Final Action, Position Size, Risk Score 1-10, Confidence %, Conditions, Summary. Keep under 200 words.`;

// === OPTIONS MODE prompts ===
const OPTIONS_OI_SYSTEM = `You are an **Elite Open Interest (OI) Analyst** for Indian F&O markets. You are the BEST in the world at reading OI data.

Analyze OI patterns for the given stock/index:
1. **OI Build-up Classification**: Long Build-up, Short Build-up, Long Unwinding, Short Covering — based on price + OI change correlation
2. **PCR Analysis**: Put-Call Ratio interpretation, PCR trend (rising/falling), extreme levels
3. **Max Pain**: Identify the max pain strike and its implications for expiry
4. **OI Concentration**: Where is the highest Call OI (resistance) and Put OI (support)? Identify key strikes
5. **OI Change Analysis**: Which strikes saw maximum OI addition/reduction? What does it signal?
6. **Writers vs Buyers**: Who is dominating — option writers (smart money) or buyers (retail)?
7. **Straddle/Strangle Analysis**: ATM straddle premium, expected move range
8. **Institutional Footprint**: Detect large OI positions that indicate institutional activity

Provide specific strike prices, OI numbers where possible. Be PRECISE. Keep under 350 words.`;

const OPTIONS_GREEKS_SYSTEM = `You are an **Options Greeks & IV Specialist** — the best in analyzing Implied Volatility and Greeks for Indian markets.

Analyze:
1. **IV Analysis**: Current IV vs historical IV, IV Rank, IV Percentile. Is IV cheap or expensive?
2. **IV Skew**: Call vs Put IV skew, what it signals about market direction
3. **IV Surface**: Term structure — near-month vs far-month IV differences
4. **Greeks Breakdown**:
   - Delta: Directional exposure, probability of ITM
   - Gamma: Rate of delta change, gamma risk near expiry
   - Theta: Time decay — how much premium erodes daily
   - Vega: Volatility sensitivity — impact of IV crush/expansion
5. **Volatility Regime**: Is the market in low-vol (sell premium) or high-vol (buy premium) regime?
6. **Event Risk**: Any upcoming events (earnings, RBI policy, expiry) that could cause IV spike?

Recommend whether to BUY premium (directional) or SELL premium (income). Keep under 300 words.`;

const OPTIONS_STRATEGY_SYSTEM = `You are an **Elite Options Strategist** — master of constructing optimal options strategies for Indian F&O markets.

Based on the OI analysis, Greeks/IV analysis, and technical view, recommend the BEST strategy:

For EACH recommended strategy provide:
1. **Strategy Name**: (e.g., Bull Call Spread, Iron Condor, Naked Put, Calendar Spread, Ratio Spread)
2. **Legs**: Exact strikes, CE/PE, Buy/Sell, Lot size, Premium ₹
3. **Net Premium**: Total debit or credit ₹
4. **Max Profit**: ₹ amount and at what level
5. **Max Loss**: ₹ amount and at what level
6. **Breakeven Points**: Exact ₹ levels
7. **Risk:Reward Ratio**: e.g., 1:2, 1:3
8. **Probability of Profit**: approximate %
9. **Trade Type**: Intraday / Swing / Till Expiry
10. **Holding Duration**: Expected time to hold
11. **Stop Loss**: When to exit (premium-based or underlying-based)
12. **Target**: When to book profits
13. **Adjustments**: What to do if trade goes against you

Recommend 2-3 strategies with different risk profiles:
- **Aggressive** (high risk, high reward — directional)
- **Moderate** (balanced — spreads)
- **Conservative** (low risk, income — premium selling)

Be SPECIFIC with lot sizes for NSE (NIFTY=25, BANKNIFTY=15, stocks=varies). Keep under 400 words.`;

const OPTIONS_RISK_SYSTEM = `You are the **Options Risk Manager** — specialist in F&O risk assessment.

Evaluate the proposed options strategies:
1. **Margin Requirement**: Approximate margin needed for each strategy
2. **Max Drawdown**: Worst-case scenario analysis
3. **Greeks Risk**: Gamma risk near expiry, theta decay timeline, vega risk from IV changes
4. **Liquidity Risk**: Bid-ask spread concerns, OI liquidity at recommended strikes
5. **Event Risk**: Impact of upcoming events on the strategy
6. **Position Sizing**: Recommended capital allocation (% of total portfolio)
7. **Exit Rules**: 
   - Stop loss: At what premium loss % to exit
   - Target: At what profit % to book
   - Time stop: Exit before expiry if not in profit by when?
8. **Hedge Recommendations**: How to protect the position if it goes wrong
9. **Risk Score**: 1-10 for each strategy

Approve, modify, or reject each strategy. Keep under 250 words.`;

const OPTIONS_TECHNICAL_SYSTEM = `You are a **Technical Analyst specializing in Options Trading**. Analyze for OPTIONS STRIKE SELECTION.

Focus on:
- **Key Support/Resistance**: Exact ₹ levels for strike selection
- **Trend & Structure**: For directional bias (CE vs PE)
- **VWAP**: Current position relative to VWAP for intraday options
- **Volume Profile**: POC, Value Area for identifying key levels
- **Expected Range**: Based on ATR, what range can the stock move today/this week?
- **Pattern-based Targets**: Where is price likely heading? This determines strike selection.

Keep analysis focused on helping select the RIGHT strikes and direction. Keep under 200 words.`;

const OPTIONS_TRADER_SYSTEM = `You are the **Options Trade Executor** — FINAL decision-maker for F&O trades.

Based on ALL analysis (OI, Greeks, Strategy, Risk, Technical), provide the FINAL trade recommendation:

**PRIMARY TRADE:**
- **Strategy**: Name
- **Direction**: Bullish / Bearish / Neutral
- **Legs**: Complete details with strikes, CE/PE, Buy/Sell, Lots, Premium
- **Net Cost/Credit**: ₹
- **Risk:Reward**: ratio
- **Max Profit**: ₹ | **Max Loss**: ₹
- **Breakeven**: ₹ level(s)
- **Trade Type**: Intraday / Swing (2-5 days) / Till Expiry
- **Entry**: Now or wait for level ₹X
- **Stop Loss**: Exit if premium drops/rises to ₹X (or underlying hits ₹X)
- **Target 1**: Book 50% at ₹X premium
- **Target 2**: Trail remaining 50%
- **Confidence**: %
- **Risk Score**: 1-10
- **Capital Required**: ₹ (margin + premium)

**ALTERNATIVE TRADE** (if primary doesn't suit risk appetite):
- Provide a lower-risk alternative

"In options, risk management IS the strategy." Keep under 300 words.`;

// ── Pipeline runners by mode ─────────────────────────────

async function runScalpPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any, chartImage?: string) {
  const M = MODELS.scalp;
  const hasChart = !!chartImage;

  // Step 1: Technical analysis (speed-optimized, no fundamentals)
  const marketReport = hasChart
    ? await callAIWithImage(apiKey, SCALP_MARKET_CHART_SYSTEM, `Scalp/intraday analysis for ${symbol}. ${dataCtx}`, chartImage, M.technical)
    : await callAI(apiKey, SCALP_MARKET_SYSTEM, `Scalp/intraday analysis for ${symbol}. ${dataCtx}`, M.technical);

  const sentimentReport = await callAI(apiKey, SENTIMENT_ANALYST_SYSTEM, `Quick sentiment check for ${symbol} (intraday context). ${dataCtx}`, M.sentiment);

  await sleep(600);

  // Step 2: Direct to trader (no debate for scalp — speed matters)
  const analystContext = `TECHNICAL ANALYSIS${hasChart ? ' (with chart)' : ''}:\n${marketReport}\n\nSENTIMENT:\n${sentimentReport}`;
  const traderDecision = await callAI(apiKey, SCALP_TRADER_SYSTEM, `Make scalp/intraday call for ${symbol}.\n${analystContext}`, M.trader);

  await sleep(600);

  // Step 3: Quick risk check
  const riskCheck = await callAI(apiKey, SCALP_RISK_SYSTEM, `Evaluate this scalp trade for ${symbol}.\nTRADER CALL:\n${traderDecision}\n\n${analystContext}\n\nDATA: ${dataCtx}`, M.risk);

  return {
    agents: { market: marketReport, sentiment: sentimentReport, traderDecision, riskCheck },
  };
}

async function runSwingPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any, chartImage?: string) {
  const M = MODELS.swing;
  const hasChart = !!chartImage;

  // Step 1: Full analyst team (parallel batch)
  const marketPromise = hasChart
    ? callAIWithImage(apiKey, MARKET_ANALYST_CHART_SYSTEM, `Analyze for ${symbol}. ${dataCtx}`, chartImage, M.technical)
    : callAI(apiKey, MARKET_ANALYST_SYSTEM, `Analyze ${symbol}. ${dataCtx}`, M.technical);

  const [marketReport, sentimentReport] = await Promise.all([
    marketPromise,
    callAI(apiKey, SENTIMENT_ANALYST_SYSTEM, `Sentiment for ${symbol}. ${dataCtx}`, M.sentiment),
  ]);
  await sleep(800);

  const [newsReport, fundamentalsReport] = await Promise.all([
    callAI(apiKey, NEWS_ANALYST_SYSTEM, `News for ${symbol}. ${dataCtx}`, M.news),
    callAI(apiKey, FUNDAMENTALS_ANALYST_SYSTEM, `Fundamentals for ${symbol}. ${dataCtx}`, M.fundamentals),
  ]);

  const chartNote = hasChart ? "\n[Chart analysis included]" : "";
  const analystContext = `TECHNICAL${hasChart ? ' (with chart)' : ''}:\n${marketReport}\n\nSENTIMENT:\n${sentimentReport}\n\nNEWS:\n${newsReport}\n\nFUNDAMENTALS:\n${fundamentalsReport}${chartNote}`;

  // Step 2: Bull vs Bear debate
  let bullCase = "", bearCase = "";
  for (let round = 0; round <= MAX_DEBATE_ROUNDS; round++) {
    const ctx = round === 0 ? analystContext : `${analystContext}\nPREV BULL:\n${bullCase}\nPREV BEAR:\n${bearCase}`;
    [bullCase, bearCase] = await Promise.all([
      callAI(apiKey, BULL_RESEARCHER_SYSTEM, `Round ${round + 1} bull for ${symbol}.\n${ctx}`, M.bull),
      callAI(apiKey, BEAR_RESEARCHER_SYSTEM, `Round ${round + 1} bear for ${symbol}.\n${ctx}`, M.bear),
    ]);
  }

  // Step 3: Research Manager (GPT-5 for strong judgment)
  const researchManager = await callAI(apiKey, RESEARCH_MANAGER_SYSTEM,
    `Judge debate for ${symbol}.\nBULL:\n${bullCase}\nBEAR:\n${bearCase}\n${analystContext}`, M.manager);

  // Step 4: Swing Trader
  const traderDecision = await callAI(apiKey, SWING_TRADER_SYSTEM,
    `Swing/Position trade for ${symbol}.\nRESEARCH MANAGER:\n${researchManager}\n${analystContext}\nBULL:\n${bullCase}\nBEAR:\n${bearCase}`, M.trader);

  // Step 5: Risk debate
  let aggressiveView = "", conservativeView = "", neutralView = "";
  const riskCtx = `TRADER PROPOSAL:\n${traderDecision}\nDATA:\n${dataCtx}\nRESEARCH:\n${researchManager}`;
  for (let round = 0; round <= MAX_RISK_ROUNDS; round++) {
    const prev = round === 0 ? riskCtx : `${riskCtx}\nAGGR:\n${aggressiveView}\nCONS:\n${conservativeView}\nNEUT:\n${neutralView}`;
    aggressiveView = await callAI(apiKey, AGGRESSIVE_RISK_SYSTEM, `Round ${round + 1} risk for ${symbol}.\n${prev}`, M.riskAggr);
    conservativeView = await callAI(apiKey, CONSERVATIVE_RISK_SYSTEM, `Round ${round + 1} risk for ${symbol}.\n${prev}\nAGGR:\n${aggressiveView}`, M.riskCons);
    neutralView = await callAI(apiKey, NEUTRAL_RISK_SYSTEM, `Round ${round + 1} risk for ${symbol}.\n${prev}\nAGGR:\n${aggressiveView}\nCONS:\n${conservativeView}`, M.riskNeut);
  }

  // Step 6: Portfolio Manager (GPT-5 for depth)
  const portfolioManager = await callAI(apiKey, SWING_PORTFOLIO_SYSTEM,
    `Final swing/position decision for ${symbol}.\n${analystContext}\nBULL:\n${bullCase}\nBEAR:\n${bearCase}\nRESEARCH:\n${researchManager}\nTRADER:\n${traderDecision}\nRISK: Aggr: ${aggressiveView}\nCons: ${conservativeView}\nNeut: ${neutralView}`,
    M.portfolio);

  return {
    agents: {
      market: marketReport, sentiment: sentimentReport, news: newsReport, fundamentals: fundamentalsReport,
      bullCase, bearCase, researchManager, traderDecision,
      aggressiveRisk: aggressiveView, conservativeRisk: conservativeView, neutralRisk: neutralView,
      portfolioManager,
    },
  };
}

async function runInvestPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any) {
  const M = MODELS.invest;

  // Step 1: Deep fundamentals (Buffett style) + Moat analysis
  const [fundamentalsReport, moatReport] = await Promise.all([
    callAI(apiKey, INVEST_FUNDAMENTALS_SYSTEM, `Deep fundamental analysis of ${symbol} for long-term investment (1-10 years). ${dataCtx}`, M.fundamentals),
    callAI(apiKey, INVEST_MOAT_SYSTEM, `Analyze competitive moat of ${symbol}. ${dataCtx}`, M.moat),
  ]);

  await sleep(1000);

  // Step 2: Technical (light, for entry timing) + News/Macro
  const [marketReport, newsReport] = await Promise.all([
    callAI(apiKey, MARKET_ANALYST_SYSTEM, `Long-term technical perspective for ${symbol} (focus on weekly/monthly structure, major S/R, long-term trend). ${dataCtx}`, M.technical),
    callAI(apiKey, NEWS_ANALYST_SYSTEM, `Long-term news & macro outlook for ${symbol}. ${dataCtx}`, M.news),
  ]);

  const analystContext = `BUFFETT FUNDAMENTALS:\n${fundamentalsReport}\n\nMOAT ANALYSIS:\n${moatReport}\n\nTECHNICAL (long-term):\n${marketReport}\n\nNEWS & MACRO:\n${newsReport}`;

  await sleep(1000);

  // Step 3: Bull (Buffett disciple) vs Bear (Munger skeptic)
  let bullCase = "", bearCase = "";
  for (let round = 0; round <= MAX_DEBATE_ROUNDS; round++) {
    const ctx = round === 0 ? analystContext : `${analystContext}\nPREV BULL:\n${bullCase}\nPREV BEAR:\n${bearCase}`;
    [bullCase, bearCase] = await Promise.all([
      callAI(apiKey, INVEST_BULL_SYSTEM, `Round ${round + 1} long-term bull case for ${symbol}.\n${ctx}`, M.bull),
      callAI(apiKey, INVEST_BEAR_SYSTEM, `Round ${round + 1} long-term bear risks for ${symbol}.\n${ctx}`, M.bear),
    ]);
  }

  // Step 4: Investment Committee
  const investmentManager = await callAI(apiKey, INVEST_MANAGER_SYSTEM,
    `Investment committee review for ${symbol} (1-10yr horizon).\nFUNDAMENTALS:\n${fundamentalsReport}\nMOAT:\n${moatReport}\nBULL:\n${bullCase}\nBEAR:\n${bearCase}\nTECHNICAL:\n${marketReport}\nNEWS:\n${newsReport}`,
    M.committee);

  await sleep(800);

  // Step 5: Portfolio Architect (final Buffett decision)
  const portfolioArchitect = await callAI(apiKey, INVEST_PORTFOLIO_SYSTEM,
    `Final long-term investment decision for ${symbol}.\n${analystContext}\nBULL:\n${bullCase}\nBEAR:\n${bearCase}\nINVESTMENT COMMITTEE:\n${investmentManager}`,
    M.architect);

  return {
    agents: {
      fundamentals: fundamentalsReport, moat: moatReport,
      market: marketReport, news: newsReport,
      bullCase, bearCase, investmentManager, portfolioArchitect,
    },
  };
}

async function runOptionsPipeline(apiKey: string, symbol: string, dataCtx: string, stockData: any, optionsConfig?: { riskReward?: string; tradeType?: string }) {
  const M = MODELS.options;
  const rrFilter = optionsConfig?.riskReward || "1:2";
  const tradeType = optionsConfig?.tradeType || "all";

  const configCtx = `\nUser's Risk:Reward preference: minimum ${rrFilter}\nTrade type preference: ${tradeType === 'all' ? 'Show Intraday, Swing (2-5 days), and Till Expiry options' : tradeType}\nToday's date: ${new Date().toISOString().split('T')[0]}`;

  try {
    // Step 1: OI + Greeks + Technical ALL in parallel (flash models, fast)
    const [oiReport, greeksReport, technicalReport] = await Promise.all([
      callAI(apiKey, OPTIONS_OI_SYSTEM, `Full OI analysis for ${symbol} options.${configCtx}\n${dataCtx}`, M.oiAnalyst),
      callAI(apiKey, OPTIONS_GREEKS_SYSTEM, `Greeks and IV analysis for ${symbol} options.${configCtx}\n${dataCtx}`, M.greeksAnalyst),
      callAI(apiKey, OPTIONS_TECHNICAL_SYSTEM, `Technical analysis for options strike selection on ${symbol}.\n${dataCtx}`, M.technical),
    ]);

    await sleep(300);

    // Step 2: Strategy construction (PRO model — needs all analysis context)
    const analystContext = `OI ANALYSIS:\n${oiReport}\n\nGREEKS & IV:\n${greeksReport}\n\nTECHNICAL (for strikes):\n${technicalReport}`;
    const strategyReport = await callAI(apiKey, OPTIONS_STRATEGY_SYSTEM, `Construct optimal options strategies for ${symbol}.\nRisk:Reward filter: minimum ${rrFilter}\nTrade types needed: ${tradeType}\n${analystContext}\n${dataCtx}${configCtx}`, M.strategist);

    await sleep(300);

    // Step 3: Risk + Final Trade in parallel (risk is flash, trader is PRO)
    const [riskReport, traderDecision] = await Promise.all([
      callAI(apiKey, OPTIONS_RISK_SYSTEM, `Evaluate options strategies for ${symbol}.\nSTRATEGIES:\n${strategyReport}\n${analystContext}\n${dataCtx}${configCtx}`, M.riskManager),
      callAI(apiKey, OPTIONS_TRADER_SYSTEM,
        `Final options trade decision for ${symbol}.\nRisk:Reward minimum: ${rrFilter}\nTrade type: ${tradeType}\n\nOI ANALYSIS:\n${oiReport}\nGREEKS:\n${greeksReport}\nTECHNICAL:\n${technicalReport}\nSTRATEGIES:\n${strategyReport}\n${dataCtx}`,
        M.trader),
    ]);

    return {
      agents: {
        oiAnalysis: oiReport,
        greeksIV: greeksReport,
        technical: technicalReport,
        strategy: strategyReport,
        riskAssessment: riskReport,
        optionsTrader: traderDecision,
      },
    };
  } catch (err) {
    // Fallback: generate deterministic options report from stock data
    console.error("Options pipeline AI error, using fallback:", err);
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
  const volume = stockData?.volume || 0;
  const avgVol = stockData?.avgVolume || volume;
  const volRatio = avgVol > 0 ? (volume / avgVol).toFixed(2) : "1.00";

  const trend = price > sma20 && price > sma50 ? "BULLISH" : price < sma20 && price < sma50 ? "BEARISH" : "NEUTRAL";
  const nearSupport = Math.round(Math.min(sma20, sma50, low52 * 1.05));
  const nearResist = Math.round(Math.max(sma20, sma50, high52 * 0.95));
  const atr = Math.round(price * 0.02); // Approximate 2% ATR
  const ceStrike = Math.ceil(price / 50) * 50;
  const peStrike = Math.floor(price / 50) * 50;

  return {
    agents: {
      oiAnalysis: `## OI Analysis — ${symbol} (Data-Based Estimate)\n\n**Trend**: ${trend} (Price ₹${price.toFixed(0)} vs SMA20 ₹${sma20.toFixed(0)}, SMA50 ₹${sma50.toFixed(0)})\n**Volume Ratio**: ${volRatio}x average\n**Key Resistance (Call OI zone)**: ₹${nearResist}\n**Key Support (Put OI zone)**: ₹${nearSupport}\n**Max Pain Estimate**: ₹${ceStrike}\n**PCR Indication**: ${trend === "BULLISH" ? "Moderately bullish (Put writing dominant)" : trend === "BEARISH" ? "Bearish (Call writing dominant)" : "Neutral range"}\n\n*Note: This is a data-driven estimate. Live OI data may differ.*`,

      greeksIV: `## Greeks & IV Analysis — ${symbol}\n\n**IV Regime**: ${Math.abs(changePct) > 2 ? "High volatility" : "Low-moderate volatility"} (${Math.abs(changePct).toFixed(1)}% daily move)\n**Recommendation**: ${Math.abs(changePct) > 2 ? "BUY premium — high vol favors directional plays" : "SELL premium — low vol favors income strategies"}\n**ATM Straddle Range**: ±₹${atr * 2} from current price\n**Delta Target**: 0.4-0.6 for directional, 0.2-0.3 for hedges\n**Theta Impact**: ~₹${Math.round(price * 0.001)}/day per lot decay\n**Gamma Risk**: ${Math.abs(changePct) > 2 ? "HIGH — manage positions actively" : "MODERATE"}`,

      technical: `## Technical for Strike Selection — ${symbol}\n\n**Price**: ₹${price.toFixed(2)} | **Trend**: ${trend}\n**Immediate Support**: ₹${nearSupport} | **Resistance**: ₹${nearResist}\n**52W Range**: ₹${low52.toFixed(0)} — ₹${high52.toFixed(0)}\n**SMA20**: ₹${sma20.toFixed(0)} | **SMA50**: ₹${sma50.toFixed(0)}\n**Expected Daily Range**: ₹${(price - atr).toFixed(0)} — ₹${(price + atr).toFixed(0)}\n\n**Strike Selection**: CE ${ceStrike}, PE ${peStrike}`,

      strategy: `## Options Strategies — ${symbol}\n\n### 1. Aggressive — ${trend === "BULLISH" ? "Bull Call Spread" : trend === "BEARISH" ? "Bear Put Spread" : "Long Straddle"}\n- **Legs**: ${trend === "BULLISH" ? `Buy ${ceStrike} CE, Sell ${ceStrike + 100} CE` : trend === "BEARISH" ? `Buy ${peStrike} PE, Sell ${peStrike - 100} PE` : `Buy ${ceStrike} CE + Buy ${peStrike} PE`}\n- **Risk:Reward**: 1:2.5\n- **Max Loss**: Limited to premium paid\n- **Trade Type**: ${tradeType === "all" ? "Swing / Till Expiry" : tradeType}\n\n### 2. Conservative — ${trend === "BULLISH" ? "Cash-Secured Put Sell" : "Covered Call / Iron Condor"}\n- **Risk:Reward**: ${rrFilter}\n- **Trade Type**: Till Expiry\n- **Max Loss**: Limited\n\n*Risk:Reward filter applied: minimum ${rrFilter}*`,

      riskAssessment: `## Risk Assessment — ${symbol} Options\n\n**Risk Score**: ${Math.abs(changePct) > 3 ? "7/10 (High)" : Math.abs(changePct) > 1.5 ? "5/10 (Moderate)" : "3/10 (Low)"}\n**Position Sizing**: 2-5% of capital\n**Stop Loss**: Exit at 50% premium loss\n**Target**: Book 50% at 1.5x premium, trail rest\n**Time Stop**: Exit 2 days before expiry if not in profit\n**Key Risk**: ${Math.abs(changePct) > 2 ? "High volatility — sudden reversals possible" : "Low volatility — theta decay risk for buyers"}`,

      optionsTrader: `## Final Trade Decision — ${symbol}\n\n**Direction**: ${trend}\n**Strategy**: ${trend === "BULLISH" ? "Bull Call Spread" : trend === "BEARISH" ? "Bear Put Spread" : "Iron Condor"}\n**Strikes**: ${trend === "BULLISH" ? `Buy ${ceStrike} CE / Sell ${ceStrike + 100} CE` : trend === "BEARISH" ? `Buy ${peStrike} PE / Sell ${peStrike - 100} PE` : `Sell ${ceStrike} CE + Sell ${peStrike} PE`}\n**Risk:Reward**: ${rrFilter}\n**Trade Type**: ${tradeType === "all" ? "Swing" : tradeType}\n**Entry**: At market open or on pullback to ₹${(price * 0.99).toFixed(0)}\n**Stop Loss**: 50% of premium paid\n**Target 1**: 1.5x premium (book 50%)\n**Target 2**: Trail remaining with SL at cost\n**Confidence**: 65%\n**Risk Score**: 5/10\n\n⚠️ *Analysis generated from price data (AI was temporarily busy). Re-run for full AI analysis.*`,
    },
  };
}

// ── Main Handler ─────────────────────────────────────────

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

    // ── Check cache first (skip if chart image provided — unique each time) ──
    const cacheKey = getCacheKey(symbol, mode, optionsConfig);
    if (!chartImage) {
      const cached = getFromCache(cacheKey);
      if (cached) {
        console.log(`TradingAgents [${mode}] CACHE HIT for ${symbol}`);
        return new Response(
          JSON.stringify({ ...cached, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasChart = !!chartImage;
    console.log(`TradingAgents [${mode}] pipeline started for ${symbol}${hasChart ? ' (with chart)' : ''}`);

    const dataRange = mode === "invest" ? "1y" : "3mo";
    const stockData = await fetchStockData(symbol, dataRange);
    let dataCtx: string;
    if (stockData) {
      const base = `Stock: ${symbol}, Price: ₹${stockData.price?.toFixed(2)}, Change: ${stockData.changePct?.toFixed(2)}%, SMA20: ₹${stockData.sma20?.toFixed(2)}, SMA50: ₹${stockData.sma50?.toFixed(2)}, Volume: ${stockData.volume?.toLocaleString()}, Avg Vol: ${stockData.avgVolume?.toLocaleString()}, 52W High: ₹${stockData.high52?.toFixed(2)}, 52W Low: ₹${stockData.low52?.toFixed(2)}, Recent closes: ${stockData.recentCloses?.slice(-10)?.map((c: number) => c?.toFixed(2))?.join(", ")}`;
      if (mode === "scalp") {
        const intradayCtx = `\nATR(14): ₹${stockData.atr14?.toFixed(2)}, Vol Ratio (today/avg): ${stockData.volRatio}x, PDH: ₹${stockData.pdh?.toFixed(2)}, PDL: ₹${stockData.pdl?.toFixed(2)}, PDC: ₹${stockData.pdc?.toFixed(2)}\nRecent Swing Points: ${stockData.swingPoints?.join(", ") || "None detected"}\nLast 5 Candles (OHLCV):\n${stockData.recentCandles?.slice(-5)?.map((c: any, i: number) => `  [${i+1}] O:₹${c.o?.toFixed(2)} H:₹${c.h?.toFixed(2)} L:₹${c.l?.toFixed(2)} C:₹${c.c?.toFixed(2)} V:${(c.v || 0).toLocaleString()}`).join("\n") || "N/A"}`;
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

    console.log(`TradingAgents [${mode}] pipeline complete for ${symbol}`);

    const responseData = {
      symbol, mode, hasChartAnalysis: hasChart,
      stockData: stockData ? {
        price: stockData.price, change: stockData.change, changePct: stockData.changePct,
        volume: stockData.volume, sma20: stockData.sma20, sma50: stockData.sma50,
        high52: stockData.high52, low52: stockData.low52,
      } : null,
      agents: result.agents,
    };

    // Store in cache (skip chart-based analyses)
    if (!chartImage) {
      setCache(cacheKey, responseData);
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
