import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/*
 * TradingAgents-style Multi-Agent Framework — 3 Modes
 * 
 * Mode 1: SCALP (Intraday & Scalping) — Pure technical, fast, no fundamentals/portfolio
 * Mode 2: SWING (Swing & Position) — Full pipeline with holding duration
 * Mode 3: INVEST (Long-term 1-10yr) — Warren Buffett style, deep fundamentals
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── Mode-Optimized Model Selection ──────────────────────────
// SCALP: Speed + technical precision. Flash models for low latency, GPT-5.2 for price action.
// SWING: Balanced mix. Pro models for debate depth, GPT-5 for final decisions.
// INVEST: Deep research. GPT-5 with reasoning for DCF/moat, Pro for thorough debate.

const MODELS = {
  scalp: {
    technical:    "openai/gpt-5.2",          // Best at price action, SMC, order flow
    sentiment:    "google/gemini-2.5-flash-lite", // Fast sentiment scan
    trader:       "openai/gpt-5.2",          // Decisive quick calls
    risk:         "google/gemini-3-flash-preview", // Fast risk check
  },
  swing: {
    technical:    "openai/gpt-5.2",          // Strong technical analysis
    sentiment:    "google/gemini-2.5-flash",  // Balanced sentiment
    news:         "google/gemini-3-flash-preview", // Fast news digest
    fundamentals: "google/gemini-2.5-flash",  // Balanced fundamentals
    bull:         "google/gemini-2.5-pro",    // Deep bull arguments
    bear:         "google/gemini-2.5-pro",    // Deep bear arguments
    manager:      "openai/gpt-5",            // Strong judgment
    trader:       "openai/gpt-5.2",          // Decisive trader
    riskAggr:     "google/gemini-3-flash-preview",
    riskCons:     "google/gemini-3-flash-preview",
    riskNeut:     "google/gemini-2.5-flash",
    portfolio:    "openai/gpt-5",            // Final decision needs depth
  },
  invest: {
    fundamentals: "openai/gpt-5",            // Deep value analysis with reasoning
    moat:         "openai/gpt-5",            // Moat needs deep thinking
    technical:    "google/gemini-2.5-flash",  // Light technical for entry timing
    news:         "google/gemini-2.5-flash",  // Macro outlook
    bull:         "google/gemini-2.5-pro",    // Thorough bull case
    bear:         "google/gemini-2.5-pro",    // Thorough bear case
    committee:    "openai/gpt-5",            // Investment committee needs reasoning
    architect:    "openai/gpt-5",            // Final Buffett-style decision with reasoning
  },
};

const MAX_DEBATE_ROUNDS = 1;
const MAX_RISK_ROUNDS = 1;

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function callAIRaw(apiKey: string, system: string, user: string | Array<any>, model: string, reasoning?: { effort: string }): Promise<string> {
  const messages = [{ role: "system", content: system }, { role: "user", content: user }];
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const body: any = { model, messages, stream: false };
    if (reasoning) body.reasoning = reasoning;
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

async function callAI(apiKey: string, system: string, user: string, model: string, reasoning?: { effort: string }): Promise<string> {
  return callAIRaw(apiKey, system, user, model, reasoning);
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
    return {
      symbol, price: lastClose, change, changePct, prevClose,
      high: meta.regularMarketDayHigh, low: meta.regularMarketDayLow,
      volume: volumes[volumes.length - 1], avgVolume: avgVol,
      sma20, sma50, high52, low52,
      recentCloses: closes.slice(-20), recentVolumes: volumes.slice(-10),
    };
  } catch { return null; }
}

// ── Mode-specific prompts ──────────────────────────────────

// === SCALP MODE prompts (Intraday/Scalping) ===
const SCALP_MARKET_SYSTEM = `You are an **Elite Intraday/Scalping Technical Analyst**. You read NAKED CHARTS for quick entries/exits.

Focus ONLY on:
- **Price Action**: BOS, CHoCH, HH/HL, LH/LL, liquidity grabs, fakeouts, spring/upthrust
- **Order Flow**: Supply/demand zones, order blocks, fair value gaps (FVG), imbalance zones
- **Volume**: Volume spikes, climactic volume, no-demand/no-supply bars, VWAP positioning
- **Key Levels**: Exact ₹ support/resistance, pivot points, round numbers, PDH/PDL (previous day high/low)
- **Candle Patterns**: Pin bars, engulfing, inside bars at key levels
- **Momentum**: RSI divergences only on 5min-15min for scalp confirmation

DO NOT discuss fundamentals, long-term outlook, or PE ratios. This is PURE TECHNICAL for quick trades (minutes to hours).
Provide: Entry ₹, Target ₹, Stop-loss ₹, Risk:Reward ratio. Keep under 250 words.`;

const SCALP_MARKET_CHART_SYSTEM = `You are an **Elite Intraday/Scalping Chart Reader**. Analyze the uploaded chart for QUICK TRADE setups.

Focus on:
- Market structure on the visible timeframe (BOS, CHoCH, trend)
- Key supply/demand zones with exact ₹ levels
- Candlestick patterns at critical levels
- Volume profile: POC, Value Area, volume spikes
- Immediate support/resistance for scalp entries
- Fair value gaps, order blocks, liquidity pools

Provide specific ₹ Entry, Target, Stop-loss for an intraday/scalp trade. Keep under 300 words.`;

const SCALP_TRADER_SYSTEM = `You are the **Intraday/Scalp Trader**. Make a FAST, DECISIVE trading call.

Based on the technical analysis, provide:
- **Action**: Buy / Sell / No Trade
- **Entry**: Exact ₹ price
- **Target 1**: Quick ₹ target (scalp)
- **Target 2**: Extended ₹ target (if momentum continues)
- **Stop Loss**: Tight ₹ level
- **Risk:Reward**: ratio
- **Trade Duration**: Expected hold time (e.g., "15-30 min", "1-2 hours")
- **Position Size**: % of capital (keep small for scalp: 2-5%)

NO fundamentals needed. Pure price action decision. Be decisive. Keep under 150 words.`;

const SCALP_RISK_SYSTEM = `You are the **Intraday Risk Manager**. Evaluate this scalp/intraday trade:
- Is the R:R ratio acceptable (min 1:1.5 for scalp, 1:2 for intraday)?
- Is the stop-loss too wide for the timeframe?
- Volatility risk: is the stock too choppy?
- Liquidity: enough volume for clean entries/exits?
- Spread and slippage concerns?
Approve or adjust the trade. Keep under 150 words.`;

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
  const REASONING_HIGH = { effort: "high" };
  const REASONING_MEDIUM = { effort: "medium" };

  // Step 1: Deep fundamentals WITH REASONING (Buffett style) + Moat analysis WITH REASONING
  const [fundamentalsReport, moatReport] = await Promise.all([
    callAI(apiKey, INVEST_FUNDAMENTALS_SYSTEM, `Deep fundamental analysis of ${symbol} for long-term investment (1-10 years). ${dataCtx}`, M.fundamentals, REASONING_HIGH),
    callAI(apiKey, INVEST_MOAT_SYSTEM, `Analyze competitive moat of ${symbol}. ${dataCtx}`, M.moat, REASONING_MEDIUM),
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

  // Step 4: Investment Committee WITH REASONING
  const investmentManager = await callAI(apiKey, INVEST_MANAGER_SYSTEM,
    `Investment committee review for ${symbol} (1-10yr horizon).\nFUNDAMENTALS:\n${fundamentalsReport}\nMOAT:\n${moatReport}\nBULL:\n${bullCase}\nBEAR:\n${bearCase}\nTECHNICAL:\n${marketReport}\nNEWS:\n${newsReport}`,
    M.committee, REASONING_MEDIUM);

  await sleep(800);

  // Step 5: Portfolio Architect WITH REASONING (final Buffett decision)
  const portfolioArchitect = await callAI(apiKey, INVEST_PORTFOLIO_SYSTEM,
    `Final long-term investment decision for ${symbol}.\n${analystContext}\nBULL:\n${bullCase}\nBEAR:\n${bearCase}\nINVESTMENT COMMITTEE:\n${investmentManager}`,
    M.architect, REASONING_HIGH);

  return {
    agents: {
      fundamentals: fundamentalsReport, moat: moatReport,
      market: marketReport, news: newsReport,
      bullCase, bearCase, investmentManager, portfolioArchitect,
    },
  };
}

// ── Main Handler ─────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, chartImage, mode = "swing" } = await req.json();
    if (!symbol) {
      return new Response(JSON.stringify({ error: "Symbol required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasChart = !!chartImage;
    console.log(`TradingAgents [${mode}] pipeline started for ${symbol}${hasChart ? ' (with chart)' : ''}`);

    const dataRange = mode === "invest" ? "1y" : "3mo";
    const stockData = await fetchStockData(symbol, dataRange);
    const dataCtx = stockData
      ? `Stock: ${symbol}, Price: ₹${stockData.price?.toFixed(2)}, Change: ${stockData.changePct?.toFixed(2)}%, SMA20: ₹${stockData.sma20?.toFixed(2)}, SMA50: ₹${stockData.sma50?.toFixed(2)}, Volume: ${stockData.volume?.toLocaleString()}, Avg Vol: ${stockData.avgVolume?.toLocaleString()}, 52W High: ₹${stockData.high52?.toFixed(2)}, 52W Low: ₹${stockData.low52?.toFixed(2)}, Recent closes: ${stockData.recentCloses?.slice(-10)?.map((c: number) => c?.toFixed(2))?.join(", ")}`
      : `Stock: ${symbol} (limited data)`;

    let result;
    if (mode === "scalp") {
      result = await runScalpPipeline(LOVABLE_API_KEY, symbol, dataCtx, stockData, chartImage);
    } else if (mode === "invest") {
      result = await runInvestPipeline(LOVABLE_API_KEY, symbol, dataCtx, stockData);
    } else {
      result = await runSwingPipeline(LOVABLE_API_KEY, symbol, dataCtx, stockData, chartImage);
    }

    console.log(`TradingAgents [${mode}] pipeline complete for ${symbol}`);

    return new Response(
      JSON.stringify({
        symbol, mode, hasChartAnalysis: hasChart,
        stockData: stockData ? {
          price: stockData.price, change: stockData.change, changePct: stockData.changePct,
          volume: stockData.volume, sma20: stockData.sma20, sma50: stockData.sma50,
          high52: stockData.high52, low52: stockData.low52,
        } : null,
        agents: result.agents,
      }),
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
