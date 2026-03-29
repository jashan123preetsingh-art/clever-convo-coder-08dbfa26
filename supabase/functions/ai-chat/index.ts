import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const CHAT_BUSY_MESSAGE = "⚠️ StockPulse AI is busy right now. Please retry in a moment. For full stock reports, you can also use the Trading Agent page.";

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("rate_limited") || message.includes("rate limit") || message.includes("429");
}

function isCreditsError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("credits_exhausted") || message.includes("credits exhausted") || message.includes("402");
}

function createSseResponse(content: string) {
  const encoder = new TextEncoder();
  const chunks = content.match(/.{1,120}/gs) || [content];

  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        const sseData = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
        controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

function formatCurrency(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? `₹${value.toFixed(2)}` : "N/A";
}

function buildFallbackReport(symbol: string, stockData: Awaited<ReturnType<typeof fetchStockData>>) {
  if (!stockData) {
    return `# 🤖 Multi-Agent Analysis: ${symbol}

⚠️ StockPulse AI is busy right now, so this fallback report uses limited live market data only.

## 📊 Analyst Reports

### 📈 Fundamental Analysis
Detailed financial ratios are unavailable in fallback mode. Re-run shortly for the full AI analyst breakdown.

### 📉 Technical Analysis
Live chart-derived data is temporarily limited, so specific support and resistance levels are not available in this fallback.

### 💬 Sentiment Analysis
Current market sentiment cannot be scored reliably without the full AI workflow.

### 📰 News & Macro
News synthesis is unavailable in fallback mode.

## ⚔️ Bull vs Bear Debate

### 🟢 Bull Case
Wait for the full AI workflow to evaluate upside catalysts.

### 🔴 Bear Case
Wait for the full AI workflow to evaluate downside risks.

## 🎯 Trading Decision
**Action:** Hold off for now.

## ⚠️ Risk Assessment
**Risk Score:** 7/10 — incomplete context while the AI service is busy.

*Fallback report generated from limited live data. Not financial advice.*`;
  }

  const distanceFromHigh = stockData.high52 ? (((stockData.high52 - stockData.price) / stockData.high52) * 100) : null;
  const distanceFromLow = stockData.low52 ? (((stockData.price - stockData.low52) / stockData.low52) * 100) : null;
  const volumeRatio = stockData.avgVolume ? stockData.volume / stockData.avgVolume : null;
  const aboveSma20 = stockData.price >= stockData.sma20;
  const aboveSma50 = stockData.price >= stockData.sma50;
  const dailyBias = stockData.changePct > 1 ? "bullish" : stockData.changePct < -1 ? "bearish" : "neutral";
  const support = Math.min(stockData.sma20 || stockData.price, stockData.sma50 || stockData.price);
  const resistance = Math.max(stockData.sma20 || stockData.price, stockData.sma50 || stockData.price);
  const tradeAction = aboveSma20 && aboveSma50 && stockData.changePct >= 0 ? "Buy on dips" : stockData.changePct <= -1.5 ? "Hold / avoid fresh longs" : "Wait for confirmation";
  const target = aboveSma20 ? stockData.high52 : stockData.sma20;
  const stopLoss = aboveSma50 ? stockData.sma50 : stockData.low52;
  const riskScore = Math.min(9, Math.max(4, Math.round(Math.abs(stockData.changePct) / 1.5 + (volumeRatio && volumeRatio > 1.2 ? 2 : 1) + (!aboveSma50 ? 2 : 0))));

  return `# 🤖 Multi-Agent Analysis: ${symbol}
**Current Price:** ${formatCurrency(stockData.price)} (${stockData.changePct >= 0 ? "+" : ""}${stockData.changePct?.toFixed(2)}%)

⚠️ StockPulse AI is busy right now, so this fallback report is generated from live market data instead of the full AI workflow.

---

## 📊 Analyst Reports

### 📈 Fundamental Analysis
This fallback mode does not have full valuation ratios, but market structure shows the stock trading ${distanceFromHigh !== null ? `**${distanceFromHigh.toFixed(1)}% below**` : "below"} its 52-week high and ${distanceFromLow !== null ? `**${distanceFromLow.toFixed(1)}% above**` : "above"} its 52-week low. That places it in a ${dailyBias} positioning zone rather than a clean long-term breakout.

### 📉 Technical Analysis
Price is at **${formatCurrency(stockData.price)}**, with SMA20 at **${formatCurrency(stockData.sma20)}** and SMA50 at **${formatCurrency(stockData.sma50)}**. Bias is **${aboveSma20 && aboveSma50 ? "trend-supportive" : "weak-to-neutral"}**. Immediate support sits near **${formatCurrency(support)}**, while resistance is near **${formatCurrency(resistance)}**.

### 💬 Sentiment Analysis
Intraday sentiment looks **${dailyBias}**, with the stock moving **${stockData.changePct >= 0 ? "+" : ""}${stockData.changePct.toFixed(2)}%**. ${volumeRatio ? `Volume is running at **${volumeRatio.toFixed(2)}x** the recent average, suggesting ${volumeRatio > 1 ? "active participation" : "muted conviction"}.` : "Volume context is limited right now."}

### 📰 News & Macro
Specific news synthesis is unavailable in fallback mode. Use this report as a live-structure view only, not a full catalyst map.

---

## ⚔️ Bull vs Bear Debate

### 🟢 Bull Case
If price reclaims and holds above both short-term averages, the setup can stabilize quickly and attempt a move back toward **${formatCurrency(target)}**.

### 🔴 Bear Case
Failure to hold **${formatCurrency(support)}** keeps downside pressure alive, especially if the stock remains below the 20/50-day trend zone.

---

## 🎯 Trading Decision
**Action:** ${tradeAction}

**Entry Zone:** ${formatCurrency(stockData.price)} to ${formatCurrency(support)}  
**Target Zone:** ${formatCurrency(target)}  
**Stop Loss:** ${formatCurrency(stopLoss)}

---

## ⚠️ Risk Assessment
**Risk Score:** ${riskScore}/10 — this is a live-data fallback with limited fundamental and news context, so execution risk is higher than the full multi-agent report.

---
*Fallback report generated from live data. Not financial advice.*`;
}

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string, model = "google/gemini-3-flash-preview"): Promise<string> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
    }),
  });
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("RATE_LIMITED");
    if (resp.status === 402) throw new Error("CREDITS_EXHAUSTED");
    const t = await resp.text();
    throw new Error(`AI error ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "No response";
}

async function fetchStockData(symbol: string) {
  const ySymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;
  try {
    const resp = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ySymbol}?interval=1d&range=3mo`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
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
      volume: volumes[volumes.length - 1], avgVolume: avgVol,
      sma20, sma50, high52, low52,
      recentCloses: closes.slice(-10),
    };
  } catch { return null; }
}

// Detect if user wants a deep stock analysis (multi-agent)
function detectAgentRequest(lastMessage: string): string | null {
  const msg = lastMessage.toLowerCase();
  // Patterns: "analyze RELIANCE", "deep analysis TCS", "agent analysis INFY", "full report on HDFC"
  const patterns = [
    /(?:analyze|analysis|agent|report|evaluate|assess|review)\s+(?:on\s+)?(?:for\s+)?([A-Z]{2,20})/i,
    /([A-Z]{2,20})\s+(?:analysis|report|deep|full|agent)/i,
    /(?:run|do|give|show)\s+(?:a\s+)?(?:deep|full|agent|multi[- ]?agent|trading)?\s*(?:analysis|report)\s+(?:on|for|of)?\s*([A-Z]{2,20})/i,
  ];
  for (const p of patterns) {
    const match = msg.match(p);
    if (match) {
      const sym = (match[1] || match[2]).toUpperCase();
      if (sym.length >= 2 && sym.length <= 15 && !["THE", "FOR", "AND", "NOT", "BUT", "HOW", "WHAT", "THIS", "THAT", "WITH"].includes(sym)) {
        return sym;
      }
    }
  }
  return null;
}

async function runMultiAgent(apiKey: string, symbol: string): Promise<string> {
  const stockData = await fetchStockData(symbol);
  const dataContext = stockData
    ? `Stock: ${symbol}, Price: ₹${stockData.price?.toFixed(2)}, Change: ${stockData.changePct?.toFixed(2)}%, SMA20: ₹${stockData.sma20?.toFixed(2)}, SMA50: ₹${stockData.sma50?.toFixed(2)}, Volume: ${stockData.volume?.toLocaleString()}, 52W High: ₹${stockData.high52?.toFixed(2)}, 52W Low: ₹${stockData.low52?.toFixed(2)}`
    : `Stock: ${symbol} (limited data)`;

  try {
    return await callAI(
      apiKey,
      `You are StockPulse AI running an internal multi-agent workflow for Indian stocks.
Return ONE markdown report with these exact sections and headings:
# 🤖 Multi-Agent Analysis: {SYMBOL}
## 📊 Analyst Reports
### 📈 Fundamental Analysis
### 📉 Technical Analysis
### 💬 Sentiment Analysis
### 📰 News & Macro
## ⚔️ Bull vs Bear Debate
### 🟢 Bull Case
### 🔴 Bear Case
## 🎯 Trading Decision
## ⚠️ Risk Assessment

Requirements:
- Use only the supplied market data and clearly say when data is limited
- Be specific with ₹ price levels
- Keep each section concise
- Include action, entry zone, target zone, and stop loss in Trading Decision
- Include a 1-10 risk score in Risk Assessment
- Output markdown only`,
      `Generate the full multi-agent report for ${symbol}.\n\n${dataContext}\nRecent closes: ${stockData?.recentCloses?.map((c: number) => c?.toFixed(2)).join(", ") || "N/A"}`,
      "google/gemini-2.5-flash-lite"
    );
  } catch (error) {
    if (isRateLimitError(error) || isCreditsError(error)) {
      return buildFallbackReport(symbol, stockData);
    }

    throw error;
  }
}

const SYSTEM_PROMPT = `You are StockPulse AI — an expert Indian stock market analyst and options strategist with access to REAL-TIME market data.

You help traders with:
1. **Chart Analysis**: Price action, support/resistance, trend analysis, candlestick patterns, MAs, RSI, MACD, Bollinger Bands, volume
2. **Options Strategy**: Option chain analysis, Greeks, IV analysis, straddle/strangle, iron condors, spreads, covered calls, protective puts
3. **Trade Setups**: Entry/exit points, stop-loss, position sizing, risk-reward
4. **Market Context**: Nifty/BankNifty levels, FII/DII flows, sector rotation, market breadth

IMPORTANT: When the user asks to "analyze" a specific stock (e.g. "analyze RELIANCE", "give me a report on TCS"), inform them that you are running a full multi-agent analysis with Fundamental, Technical, Sentiment, News analysts + Bull/Bear debate + Trading Decision + Risk Assessment.

CRITICAL RULES:
- You have LIVE market data injected below. ALWAYS use these EXACT numbers — never make up or estimate prices.
- When discussing Nifty/BankNifty, use the exact levels from the live data provided.
- For FII/DII analysis, use the exact figures provided.
- Always mention specific price levels with ₹ symbol
- For options, discuss strike selection, expiry choice, premium decay
- Be concise but thorough. Use bullet points and markdown.
- Never give guaranteed returns. Always include risk warnings.
- If you don't have data for something specific, say so clearly.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if last message triggers multi-agent analysis
    const lastMsg = messages[messages.length - 1]?.content || "";
    const agentSymbol = detectAgentRequest(lastMsg);

    if (agentSymbol) {
      // Run multi-agent pipeline and return as SSE
      console.log(`Multi-agent triggered for: ${agentSymbol}`);
      const report = await runMultiAgent(LOVABLE_API_KEY, agentSymbol);
      return createSseResponse(report);
    }

    // Normal chat — build context with live data
    let liveDataBlock = "";

    if (context?.liveIndices && Array.isArray(context.liveIndices)) {
      liveDataBlock += "\n\n📊 LIVE MARKET DATA (Real-time):\n";
      for (const idx of context.liveIndices) {
        liveDataBlock += `• ${idx.symbol}: ₹${idx.ltp?.toLocaleString()} | Change: ${idx.change >= 0 ? '+' : ''}${idx.change} (${idx.change_pct >= 0 ? '+' : ''}${idx.change_pct}%) | Day: ₹${idx.low} – ₹${idx.high}\n`;
      }
    }

    if (context?.fiiDii && Array.isArray(context.fiiDii)) {
      liveDataBlock += "\n💰 FII/DII DATA (Latest):\n";
      for (const fd of context.fiiDii) {
        const net = parseFloat(fd.netValue);
        liveDataBlock += `• ${fd.category} (${fd.date}): Buy ₹${fd.buyValue}Cr | Sell ₹${fd.sellValue}Cr | Net: ${net >= 0 ? '+' : ''}₹${fd.netValue}Cr\n`;
      }
    }

    if (context?.currentPage) liveDataBlock += `\n📍 User is on: ${context.currentPage}`;
    if (context?.currentStock) liveDataBlock += `\n🔍 Viewing stock: ${context.currentStock}`;

    if (context?.stockData) {
      const sd = context.stockData;
      liveDataBlock += `\n\n📈 STOCK IN FOCUS:\n`;
      liveDataBlock += `• ${sd.symbol} (${sd.name}): ₹${sd.ltp} | Change: ${sd.change_pct >= 0 ? '+' : ''}${sd.change_pct?.toFixed(2)}%\n`;
      if (sd.high) liveDataBlock += `• Day Range: ₹${sd.low} – ₹${sd.high}\n`;
      if (sd.week_52_high) liveDataBlock += `• 52W Range: ₹${sd.week_52_low} – ₹${sd.week_52_high}\n`;
      if (sd.volume) liveDataBlock += `• Volume: ${Number(sd.volume).toLocaleString()}\n`;

      if (sd.fundamentals) {
        const f = sd.fundamentals;
        liveDataBlock += `\n📚 FUNDAMENTALS:\n`;
        liveDataBlock += `• P/E: ${f.pe_ratio ?? 'N/A'} | Forward P/E: ${f.forward_pe ?? 'N/A'} | P/B: ${f.pb_ratio ?? 'N/A'}\n`;
        liveDataBlock += `• ROE: ${f.roe ?? 'N/A'}% | ROA: ${f.roa ?? 'N/A'}% | Debt/Equity: ${f.debt_to_equity ?? 'N/A'}\n`;
        liveDataBlock += `• Profit Margin: ${f.profit_margins ?? 'N/A'}% | Operating Margin: ${f.operating_margins ?? 'N/A'}%\n`;
        liveDataBlock += `• Revenue Growth: ${f.revenue_growth ?? 'N/A'}% | Earnings Growth: ${f.earnings_growth ?? 'N/A'}%\n`;
        liveDataBlock += `• Dividend Yield: ${f.dividend_yield ?? 'N/A'}% | Beta: ${f.beta ?? 'N/A'}\n`;
        if (f.target_mean_price || f.recommendation) {
          liveDataBlock += `• Analyst View: ${f.recommendation ?? 'N/A'} | Target Mean: ₹${f.target_mean_price ?? 'N/A'}\n`;
        }
      }

      if (sd.technicals) {
        const t = sd.technicals;
        liveDataBlock += `\n📊 TECHNICALS:\n`;
        liveDataBlock += `• RSI(14): ${t.rsi_14 ?? 'N/A'} | MACD: ${t.macd ?? 'N/A'} | ATR: ${t.atr_14 ?? 'N/A'}\n`;
        liveDataBlock += `• SMA20: ${t.sma_20 ?? 'N/A'} | SMA50: ${t.sma_50 ?? 'N/A'} | SMA200: ${t.sma_200 ?? 'N/A'}\n`;
        liveDataBlock += `• EMA20: ${t.ema_20 ?? 'N/A'} | EMA50: ${t.ema_50 ?? 'N/A'}\n`;
        liveDataBlock += `• Trend: ${t.trend ?? 'N/A'} | Strength: ${t.trend_strength ?? 'N/A'} | Volume Ratio: ${t.volume_ratio ?? 'N/A'}x\n`;
        liveDataBlock += `• Support: ${t.s1 ?? 'N/A'} / ${t.s2 ?? 'N/A'} / ${t.s3 ?? 'N/A'}\n`;
        liveDataBlock += `• Resistance: ${t.r1 ?? 'N/A'} / ${t.r2 ?? 'N/A'} / ${t.r3 ?? 'N/A'}\n`;
        if (t.candle_patterns?.length) liveDataBlock += `• Candle Patterns: ${t.candle_patterns.join(', ')}\n`;
      }
    }

    const fullSystem = SYSTEM_PROMPT + liveDataBlock;

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: fullSystem },
          ...messages.slice(-20),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return createSseResponse(CHAT_BUSY_MESSAGE);
      }
      if (response.status === 402) {
        return createSseResponse("⚠️ AI is temporarily unavailable right now. Please try again later.");
      }
      const text = await response.text();
      throw new Error(`AI gateway error: ${response.status} ${text}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
