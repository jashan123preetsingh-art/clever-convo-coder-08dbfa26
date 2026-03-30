import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/*
 * TradingAgents-style Multi-Agent Framework
 * Mirrors: https://github.com/TauricResearch/TradingAgents
 *
 * Graph flow (LangGraph-inspired):
 *   1. Analyst Team (parallel): Market · Sentiment · News · Fundamentals
 *   2. Researcher Debate: Bull Researcher ↔ Bear Researcher (N rounds)
 *   3. Research Manager: judges debate, produces investment plan
 *   4. Trader Agent: produces trading decision
 *   5. Risk Debate: Aggressive ↔ Conservative ↔ Neutral (N rounds)
 *   6. Portfolio Manager: final approve / reject
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
// ── Model assignments per agent ──
// Using lighter models to avoid rate limits while keeping quality
const MODEL_MARKET_ANALYST = "openai/gpt-5.2";                // Top-tier for TA
const MODEL_SENTIMENT      = "google/gemini-2.5-flash";       // Fast multimodal
const MODEL_NEWS            = "google/gemini-3-flash-preview"; // Latest gen balance
const MODEL_FUNDAMENTALS    = "google/gemini-3-flash-preview"; // Latest gen balance
const MODEL_BULL            = "google/gemini-2.5-pro";         // Strong reasoning
const MODEL_BEAR            = "google/gemini-2.5-pro";         // Strong reasoning
const MODEL_RESEARCH_MGR    = "openai/gpt-5-mini";            // Good reasoning, faster
const MODEL_TRADER          = "openai/gpt-5.2";               // Top-tier for decisions
const MODEL_RISK_AGGRESSIVE = "google/gemini-3-flash-preview"; // Fast balanced
const MODEL_RISK_CONSERVATIVE = "google/gemini-3-flash-preview"; // Fast balanced
const MODEL_RISK_NEUTRAL    = "google/gemini-2.5-flash";       // Fast balanced
const MODEL_PORTFOLIO_MGR   = "openai/gpt-5-mini";            // Good reasoning, final call

const MAX_DEBATE_ROUNDS = 1;
const MAX_RISK_ROUNDS = 1;

// ── Helpers ──────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callAIRaw(
  apiKey: string,
  system: string,
  user: string | Array<any>,
  model: string
): Promise<string> {
  const userContent = typeof user === "string" ? user : user;
  const messages = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: false }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "No response";
    }

    if (resp.status === 429 && attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
      console.log(`Rate limited (${model}), retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      continue;
    }

    if (resp.status === 429) throw new Error("RATE_LIMITED");
    if (resp.status === 402) throw new Error("CREDITS_EXHAUSTED");
    const t = await resp.text();
    throw new Error(`AI error ${resp.status}: ${t}`);
  }
  throw new Error("Max retries exceeded");
}

async function callAI(
  apiKey: string,
  system: string,
  user: string,
  model: string
): Promise<string> {
  return callAIRaw(apiKey, system, user, model);
}

// Call AI with image (multimodal)
async function callAIWithImage(
  apiKey: string,
  system: string,
  userText: string,
  imageUrl: string,
  model: string
): Promise<string> {
  return callAIRaw(apiKey, system, [
    { type: "text", text: userText },
    { type: "image_url", image_url: { url: imageUrl } },
  ], model);
}

async function fetchStockData(symbol: string) {
  const ySymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;
  try {
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ySymbol}?interval=1d&range=3mo`,
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
    const sma20 =
      closes.slice(-20).reduce((a: number, b: number) => a + (b || 0), 0) / 20;
    const sma50 =
      closes.slice(-50).reduce((a: number, b: number) => a + (b || 0), 0) /
      Math.min(50, closes.length);
    const avgVol =
      volumes.slice(-10).reduce((a: number, b: number) => a + (b || 0), 0) / 10;
    const high52 = Math.max(...closes.filter((c: any) => c));
    const low52 = Math.min(...closes.filter((c: any) => c && c > 0));
    return {
      symbol,
      price: lastClose,
      change,
      changePct,
      prevClose,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      volume: volumes[volumes.length - 1],
      avgVolume: avgVol,
      sma20,
      sma50,
      high52,
      low52,
      recentCloses: closes.slice(-20),
      recentVolumes: volumes.slice(-10),
    };
  } catch {
    return null;
  }
}

// ── Agent Prompts (TradingAgents-style) ──────────────────

const MARKET_ANALYST_SYSTEM = `You are an **Elite Price Action & Technical Analyst** in a professional trading firm — a master of pure price action trading.

Your core expertise:
**Price Action Mastery:**
- Read naked charts — identify trend structure (HH/HL for uptrend, LH/LL for downtrend), BOS (Break of Structure), CHoCH (Change of Character)
- Recognize candlestick patterns with precision: pin bars, engulfing candles, inside bars, outside bars, doji, morning/evening stars, tweezer tops/bottoms, three white soldiers/black crows
- Identify key price action setups: pullback entries, breakout retests, fakeouts/traps, spring/upthrust (Wyckoff), liquidity grabs

**Supply & Demand Zone Analysis:**
- Mark fresh vs tested supply/demand zones with exact ₹ price levels
- Identify order blocks (OB), breaker blocks, mitigation blocks (Smart Money Concepts)
- Spot liquidity pools above swing highs / below swing lows — where stop hunts occur
- Rally-Base-Rally (RBR), Drop-Base-Drop (DBD), Rally-Base-Drop (RBD), Drop-Base-Rally (DBR) formations

**Support & Resistance:**
- Key horizontal S/R levels with ₹ prices, pivot points, psychological round numbers
- Dynamic S/R: SMA20, SMA50, SMA200, VWAP
- Trendlines, channels, and wedge boundaries

**Volume & Volume Profile (PRIMARY — do NOT depend on MACD):**
- Volume Profile: POC (Point of Control), Value Area High/Low, High Volume Nodes (HVN), Low Volume Nodes (LVN)
- Volume Price Analysis (VPA): climactic volume, no-demand/no-supply bars, effort vs result
- Volume spikes at key levels = confirmation; dry volume = weakness
- Accumulation/Distribution via volume clusters
- Multi-timeframe confluence (if chart TF is provided)
- RSI divergences (regular + hidden) — use only on 1H+ timeframes
- Fibonacci retracements (0.382, 0.5, 0.618, 0.786) and extensions

**IMPORTANT:** Do NOT rely on MACD. Focus on price action + volume + S/D zones as primary tools. RSI is secondary and only useful on bigger timeframes (1H, 4H, Daily, Weekly).

Be extremely specific with ₹ price levels. Use the supplied data. Keep under 250 words.`;

const MARKET_ANALYST_CHART_SYSTEM = `You are an **Elite Price Action & Technical Analyst** with expertise in visual chart reading — a master of reading the story candles tell.

Analyze the uploaded chart image along with the numerical data. Apply these techniques:

**Price Action Reading:**
- Identify market structure: HH/HL (bullish), LH/LL (bearish), BOS, CHoCH
- Read individual candle stories: wicks (rejection), body size (momentum), close position (strength)
- Spot patterns: pin bars at key levels, engulfing at S/D zones, inside bar breakouts, fakeout/trap candles
- Wyckoff phases: accumulation, markup, distribution, markdown

**Supply & Demand Zones (mark exact ₹ levels):**
- Fresh order blocks, breaker blocks, mitigation blocks
- RBR, DBD, RBD, DBR formations visible on chart
- Liquidity pools above swing highs / below swing lows
- Fair Value Gaps (FVG) / imbalances

**Chart Patterns & Structure:**
- Classical: head & shoulders, double top/bottom, cup & handle, triangles, flags, wedges, channels
- Harmonic patterns if visible (Gartley, butterfly, bat, crab)
- Trendlines, channels, and their breaks/retests

**Volume & Volume Profile (PRIMARY — never depend on MACD):**
- Volume Profile: POC, Value Area High/Low, HVN, LVN zones
- Climactic volume spikes, dry-up zones, volume-price divergence
- Effort vs result analysis on volume bars
- RSI: only on 1H+ TF — overbought/oversold, divergences (regular + hidden)
- Bollinger Bands: squeezes, walks, mean reversion (if visible)

**Key Levels:** Mark specific ₹ support, resistance, entry, stop-loss, and target levels.

Combine visual analysis with numerical data for a complete picture. Keep under 350 words.`;

const SENTIMENT_ANALYST_SYSTEM = `You are the **Social Media / Sentiment Analyst** in a professional trading firm.
Your job: gauge retail & institutional sentiment, social media buzz, FII/DII activity trends, options positioning (PCR), and short-term market mood.
Be specific. Keep under 200 words.`;

const NEWS_ANALYST_SYSTEM = `You are the **News Analyst** in a professional trading firm.
Your job: analyze recent news, regulatory changes, sector trends, global macro factors, insider transactions, and event risks affecting this stock.
Be specific. Keep under 200 words.`;

const FUNDAMENTALS_ANALYST_SYSTEM = `You are the **Fundamentals Analyst** in a professional trading firm.
Your job: evaluate company financials — PE ratio, PB, ROE, ROCE, debt-to-equity, promoter holding, revenue/profit growth, free cash flow, dividend yield, and intrinsic valuation.
Be specific with numbers. Keep under 200 words.`;

const BULL_RESEARCHER_SYSTEM = `You are the **Bullish Researcher** in an investment debate.
Given the 4 analyst reports (including any chart analysis), build the STRONGEST possible bull case. Be specific with upside price targets, catalysts, and growth drivers.
Challenge bear arguments if provided. Keep under 200 words.`;

const BEAR_RESEARCHER_SYSTEM = `You are the **Bearish Researcher** in an investment debate.
Given the 4 analyst reports (including any chart analysis), build the STRONGEST possible bear case. Highlight risks, red flags, downside targets, and what could go wrong.
Challenge bull arguments if provided. Keep under 200 words.`;

const RESEARCH_MANAGER_SYSTEM = `You are the **Research Manager / Investment Judge** at a trading firm.
You have seen the bull and bear debate. Evaluate BOTH sides objectively and produce a clear **Investment Plan**:
- Overall Bias: Bullish / Bearish / Neutral
- Conviction Level: Strong / Moderate / Weak
- Key Factors: list the 3 most important factors
- Recommendation summary
Keep under 200 words.`;

const TRADER_SYSTEM = `You are the **Trader Agent** at a professional trading firm.
Given all analyst reports and the research manager's investment plan, make a CLEAR trading decision:
- **Action**: Strong Buy / Buy / Hold / Sell / Strong Sell (use TradingAgents 5-tier scale)
- **Entry Price**: specific ₹ level
- **Target Price**: specific ₹ level
- **Stop Loss**: specific ₹ level
- **Position Size**: % of portfolio (1-10%)
- **Time Horizon**: Intraday / Swing / Positional / Long-term
Be decisive. Keep under 200 words.`;

const AGGRESSIVE_RISK_SYSTEM = `You are the **Aggressive Risk Analyst** in a risk management debate.
You tend to APPROVE trades with higher risk tolerance. Evaluate the trader's proposal and argue for its execution. Discuss why the risk/reward is favorable.
If others raised concerns, counter them. Keep under 150 words.`;

const CONSERVATIVE_RISK_SYSTEM = `You are the **Conservative Risk Analyst** in a risk management debate.
You are CAUTIOUS and focus on downside protection. Evaluate the trader's proposal and highlight potential risks: volatility, liquidity, concentration, event risk, max drawdown.
Suggest position size reductions or hedges. Keep under 150 words.`;

const NEUTRAL_RISK_SYSTEM = `You are the **Neutral Risk Analyst** in a risk management debate.
You balance the aggressive and conservative views. Provide a measured assessment of the risk/reward, considering both upside potential and downside protection.
Offer practical adjustments if needed. Keep under 150 words.`;

const PORTFOLIO_MANAGER_SYSTEM = `You are the **Portfolio Manager** — the FINAL decision-maker.
You have seen: analyst reports, bull/bear debate, research manager's plan, trader's proposal, and the risk team's debate.

Make the FINAL decision:
- **Decision**: APPROVE or REJECT the trade
- **Final Action**: Strong Buy / Buy / Hold / Sell / Strong Sell
- **Adjusted Position Size**: if different from trader's suggestion
- **Risk Score**: 1-10 (10 = highest risk)
- **Confidence**: percentage
- **Key Conditions**: any conditions for execution
- **Summary**: 2-3 sentence rationale

Be authoritative and decisive. Keep under 200 words.`;

// ── Main Handler ─────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, chartImage } = await req.json();
    if (!symbol) {
      return new Response(JSON.stringify({ error: "Symbol required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasChart = !!chartImage;
    console.log(`TradingAgents pipeline started for ${symbol}${hasChart ? ' (with chart image)' : ''}`);

    // ── Step 1: Fetch market data ──
    const stockData = await fetchStockData(symbol);
    const dataCtx = stockData
      ? `Stock: ${symbol}, Price: ₹${stockData.price?.toFixed(2)}, Change: ${stockData.changePct?.toFixed(2)}%, SMA20: ₹${stockData.sma20?.toFixed(2)}, SMA50: ₹${stockData.sma50?.toFixed(2)}, Volume: ${stockData.volume?.toLocaleString()}, Avg Vol: ${stockData.avgVolume?.toLocaleString()}, 52W High: ₹${stockData.high52?.toFixed(2)}, 52W Low: ₹${stockData.low52?.toFixed(2)}, Recent closes: ${stockData.recentCloses?.slice(-10)?.map((c: number) => c?.toFixed(2))?.join(", ")}`
      : `Stock: ${symbol} (limited data)`;

    // ── Step 2: Analyst Team (parallel) ──
    // Run analysts in 2 batches of 2 to reduce rate limit pressure
    const marketReportPromise = hasChart
      ? callAIWithImage(
          LOVABLE_API_KEY,
          MARKET_ANALYST_CHART_SYSTEM,
          `Analyze this chart for ${symbol} along with the data. ${dataCtx}`,
          chartImage,
          MODEL_MARKET_ANALYST
        )
      : callAI(LOVABLE_API_KEY, MARKET_ANALYST_SYSTEM, `Analyze ${symbol}. ${dataCtx}`, MODEL_MARKET_ANALYST);

    const [marketReport, sentimentReport] = await Promise.all([
      marketReportPromise,
      callAI(LOVABLE_API_KEY, SENTIMENT_ANALYST_SYSTEM, `Sentiment for ${symbol}. ${dataCtx}`, MODEL_SENTIMENT),
    ]);

    await sleep(1000); // Brief pause between batches

    const [newsReport, fundamentalsReport] = await Promise.all([
      callAI(LOVABLE_API_KEY, NEWS_ANALYST_SYSTEM, `News analysis for ${symbol}. ${dataCtx}`, MODEL_NEWS),
      callAI(LOVABLE_API_KEY, FUNDAMENTALS_ANALYST_SYSTEM, `Fundamentals for ${symbol}. ${dataCtx}`, MODEL_FUNDAMENTALS),
    ]);

    const chartNote = hasChart ? "\n\n[NOTE: The Market/Technical Analyst had access to a user-uploaded chart image and performed visual chart pattern analysis in addition to numerical data analysis.]" : "";
    const analystContext = `MARKET/TECHNICAL REPORT${hasChart ? ' (includes visual chart analysis)' : ''}:\n${marketReport}\n\nSENTIMENT REPORT:\n${sentimentReport}\n\nNEWS REPORT:\n${newsReport}\n\nFUNDAMENTALS REPORT:\n${fundamentalsReport}${chartNote}`;

    // ── Step 3: Bull vs Bear Researcher Debate ──
    let bullHistory = "";
    let bearHistory = "";
    let bullCase = "";
    let bearCase = "";

    for (let round = 0; round <= MAX_DEBATE_ROUNDS; round++) {
      const debateCtx =
        round === 0
          ? analystContext
          : `${analystContext}\n\nPREVIOUS BULL ARGUMENT:\n${bullCase}\n\nPREVIOUS BEAR ARGUMENT:\n${bearCase}`;

      [bullCase, bearCase] = await Promise.all([
        callAI(LOVABLE_API_KEY, BULL_RESEARCHER_SYSTEM, `Round ${round + 1} bull case for ${symbol}.\n${debateCtx}`, MODEL_BULL),
        callAI(LOVABLE_API_KEY, BEAR_RESEARCHER_SYSTEM, `Round ${round + 1} bear case for ${symbol}.\n${debateCtx}`, MODEL_BEAR),
      ]);
      bullHistory += `\n[Round ${round + 1}] ${bullCase}`;
      bearHistory += `\n[Round ${round + 1}] ${bearCase}`;
    }

    // ── Step 4: Research Manager (judge) ──
    const researchManagerDecision = await callAI(
      LOVABLE_API_KEY,
      RESEARCH_MANAGER_SYSTEM,
      `Judge the investment debate for ${symbol}.\n\nBULL ARGUMENTS:\n${bullHistory}\n\nBEAR ARGUMENTS:\n${bearHistory}\n\nANALYST REPORTS:\n${analystContext}`,
      MODEL_RESEARCH_MGR
    );

    // ── Step 5: Trader Agent ──
    const traderDecision = await callAI(
      LOVABLE_API_KEY,
      TRADER_SYSTEM,
      `Make trading decision for ${symbol}.\n\nRESEARCH MANAGER PLAN:\n${researchManagerDecision}\n\n${analystContext}\n\nBULL CASE:\n${bullCase}\n\nBEAR CASE:\n${bearCase}`,
      MODEL_TRADER
    );

    // ── Step 6: Risk Management Debate ──
    let aggressiveView = "";
    let conservativeView = "";
    let neutralView = "";

    const riskCtx = `TRADER PROPOSAL:\n${traderDecision}\n\nMARKET DATA:\n${dataCtx}\n\nRESEARCH MANAGER:\n${researchManagerDecision}`;

    for (let round = 0; round <= MAX_RISK_ROUNDS; round++) {
      const prevRiskCtx =
        round === 0
          ? riskCtx
          : `${riskCtx}\n\nPREVIOUS AGGRESSIVE:\n${aggressiveView}\nPREVIOUS CONSERVATIVE:\n${conservativeView}\nPREVIOUS NEUTRAL:\n${neutralView}`;

      aggressiveView = await callAI(LOVABLE_API_KEY, AGGRESSIVE_RISK_SYSTEM, `Round ${round + 1} risk assessment for ${symbol}.\n${prevRiskCtx}`, MODEL_RISK_AGGRESSIVE);
      conservativeView = await callAI(LOVABLE_API_KEY, CONSERVATIVE_RISK_SYSTEM, `Round ${round + 1} risk assessment for ${symbol}.\n${prevRiskCtx}\n\nAGGRESSIVE VIEW:\n${aggressiveView}`, MODEL_RISK_CONSERVATIVE);
      neutralView = await callAI(LOVABLE_API_KEY, NEUTRAL_RISK_SYSTEM, `Round ${round + 1} risk assessment for ${symbol}.\n${prevRiskCtx}\n\nAGGRESSIVE:\n${aggressiveView}\nCONSERVATIVE:\n${conservativeView}`, MODEL_RISK_NEUTRAL);
    }

    // ── Step 7: Portfolio Manager (final decision) ──
    const portfolioManagerDecision = await callAI(
      LOVABLE_API_KEY,
      PORTFOLIO_MANAGER_SYSTEM,
      `Final decision for ${symbol}.\n\n${analystContext}\n\nBULL CASE:\n${bullCase}\n\nBEAR CASE:\n${bearCase}\n\nRESEARCH MANAGER:\n${researchManagerDecision}\n\nTRADER PROPOSAL:\n${traderDecision}\n\nRISK DEBATE:\nAggressive: ${aggressiveView}\nConservative: ${conservativeView}\nNeutral: ${neutralView}`,
      MODEL_PORTFOLIO_MGR
    );

    console.log(`TradingAgents pipeline complete for ${symbol}`);

    return new Response(
      JSON.stringify({
        symbol,
        hasChartAnalysis: hasChart,
        stockData: stockData
          ? {
              price: stockData.price,
              change: stockData.change,
              changePct: stockData.changePct,
              volume: stockData.volume,
              sma20: stockData.sma20,
              sma50: stockData.sma50,
              high52: stockData.high52,
              low52: stockData.low52,
            }
          : null,
        agents: {
          market: marketReport,
          sentiment: sentimentReport,
          news: newsReport,
          fundamentals: fundamentalsReport,
          bullCase,
          bearCase,
          researchManager: researchManagerDecision,
          traderDecision,
          aggressiveRisk: aggressiveView,
          conservativeRisk: conservativeView,
          neutralRisk: neutralView,
          portfolioManager: portfolioManagerDecision,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Trading agent error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("429") || msg.includes("RATE_LIMITED")
      ? 429
      : msg.includes("402") || msg.includes("CREDITS")
        ? 402
        : 500;
    const userMsg =
      status === 429
        ? "AI is busy right now. Please wait a moment and retry."
        : status === 402
          ? "AI credits temporarily unavailable."
          : msg;
    return new Response(JSON.stringify({ error: userMsg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
