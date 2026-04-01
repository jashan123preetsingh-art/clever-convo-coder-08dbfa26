import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stockData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { quote, fundamentals, technicals } = stockData;

    const systemPrompt = `You are an expert Indian stock market analyst specializing in Price Action, Supply/Demand, and Institutional-grade technical analysis. Your framework (in order of priority):

1. **PRICE ACTION & SUPPLY/DEMAND** (highest priority)
   - Trend structure: HH/HL or LH/LL, BOS (Break of Structure), CHoCH (Change of Character)
   - Supply zones (institutional selling) & Demand zones (institutional buying) with exact ₹ levels
   - Order blocks, breaker blocks, Fair Value Gaps (FVGs)
   - Liquidity sweeps, stop hunts, springs/upthrusts

2. **MULTI-TIMEFRAME SUPPORT & RESISTANCE**
   - Daily pivot levels (S1/S2/S3, R1/R2/R3)
   - Key horizontal S/R from price history
   - Round number psychology levels
   - Previous day high/low/close (PDH/PDL/PDC)

3. **MOVING AVERAGES (EMA)**
   - EMA 9/20/50/200 stack alignment
   - Price position relative to key EMAs
   - Golden/Death cross signals
   - Dynamic support/resistance from EMAs

4. **VOLUME & VWAP**
   - Volume-price relationship (confirmation/divergence)
   - VWAP position and deviation bands
   - Volume ratio vs 20-day average
   - Climactic volume, no-demand/no-supply bars
   - Bollinger Band position and squeeze

5. **CANDLE PATTERNS** (only at key S/R or S/D zones)

Return ONLY valid JSON. Do NOT include fundamentals in the scoring.`;

    const safe = (v: any, d = 'N/A') => (v != null && v !== undefined && !isNaN(v)) ? v : d;
    const userPrompt = `Analyze this stock using Price Action + S/D + S/R + EMA + Volume framework:

STOCK: ${quote?.symbol || 'Unknown'} (${quote?.name || 'Unknown'})
PRICE: ₹${safe(quote?.ltp)} | Change: ${safe(quote?.change_pct) !== 'N/A' ? Number(quote.change_pct).toFixed(2) + '%' : 'N/A'}
52W Range: ₹${safe(quote?.week_52_low)} - ₹${safe(quote?.week_52_high)}

TECHNICALS:
- RSI(14): ${safe(technicals?.rsi_14)}
- EMA 9: ${safe(technicals?.ema_9)} | EMA 20: ${safe(technicals?.ema_20)} | EMA 50: ${safe(technicals?.ema_50)} | EMA 200: ${safe(technicals?.ema_200)}
- SMA 20: ${safe(technicals?.sma_20)} | SMA 50: ${safe(technicals?.sma_50)} | SMA 200: ${safe(technicals?.sma_200)}
- Trend: ${safe(technicals?.trend)} | Strength: ${safe(technicals?.trend_strength)}
- Support: S1=${safe(technicals?.s1)} S2=${safe(technicals?.s2)} S3=${safe(technicals?.s3)}
- Resistance: R1=${safe(technicals?.r1)} R2=${safe(technicals?.r2)} R3=${safe(technicals?.r3)}
- Pivot: ${safe(technicals?.pivot)}
- Bollinger: ${safe(technicals?.bollinger_lower)} / ${safe(technicals?.bollinger_middle)} / ${safe(technicals?.bollinger_upper)}
- Volume Ratio: ${safe(technicals?.volume_ratio)}x avg | Avg Vol 20D: ${safe(technicals?.avg_volume_20)}
- Candle Patterns: ${technicals?.candle_patterns?.join(", ") || "None"}
- ATR(14): ${safe(technicals?.atr_14)}

Return this exact JSON structure:
{
  "overall_score": <number 0-100>,
  "grade": "<A+/A/B+/B/C+/C/D/F>",
  "verdict": "<Strong Buy/Buy/Hold/Sell/Strong Sell>",
  "summary": "<2-3 sentence analysis focusing on price action, S/D zones, and key levels>",
  "key_levels": {
    "immediate_support": <number>,
    "immediate_resistance": <number>,
    "stop_loss": <number>,
    "target_1": <number>,
    "target_2": <number>,
    "demand_zone_low": <number>,
    "demand_zone_high": <number>,
    "supply_zone_low": <number>,
    "supply_zone_high": <number>
  },
  "scores": {
    "price_action": { "score": <0-20>, "comment": "<trend structure, BOS/CHoCH, S/D zones>" },
    "support_resistance": { "score": <0-20>, "comment": "<multi-TF S/R, pivot levels, key horizontals>" },
    "ema_alignment": { "score": <0-20>, "comment": "<EMA stack, golden/death cross, dynamic S/R>" },
    "volume_vwap": { "score": <0-20>, "comment": "<volume confirmation, VWAP, Bollinger>" },
    "candle_pattern": { "score": <0-20>, "comment": "<patterns AT key levels only>" }
  },
  "risk_assessment": {
    "risk_level": "<Low/Medium/High/Very High>",
    "risk_factors": ["<factor1>", "<factor2>"],
    "invalidation": "<price level that kills setup>"
  },
  "supply_demand": {
    "nearest_demand": "<₹X - ₹Y zone description>",
    "nearest_supply": "<₹X - ₹Y zone description>",
    "bias": "<Bullish/Bearish/Neutral based on S/D>"
  },
  "ema_analysis": {
    "alignment": "<Bullish Stack/Bearish Stack/Mixed>",
    "description": "<EMA 9>20>50>200 etc>"
  },
  "sector_context": "<brief>",
  "freshness": "<Fresh/Aging/Stale>"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "stock_analysis",
            description: "Return structured stock analysis using PA/SD/SR/EMA/Volume framework",
            parameters: {
              type: "object",
              properties: {
                overall_score: { type: "number" },
                grade: { type: "string" },
                verdict: { type: "string" },
                summary: { type: "string" },
                key_levels: {
                  type: "object",
                  properties: {
                    immediate_support: { type: "number" },
                    immediate_resistance: { type: "number" },
                    stop_loss: { type: "number" },
                    target_1: { type: "number" },
                    target_2: { type: "number" },
                    demand_zone_low: { type: "number" },
                    demand_zone_high: { type: "number" },
                    supply_zone_low: { type: "number" },
                    supply_zone_high: { type: "number" },
                  },
                  required: ["immediate_support", "immediate_resistance", "stop_loss", "target_1", "target_2"],
                },
                scores: {
                  type: "object",
                  properties: {
                    price_action: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                    support_resistance: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                    ema_alignment: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                    volume_vwap: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                    candle_pattern: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                  },
                  required: ["price_action", "support_resistance", "ema_alignment", "volume_vwap", "candle_pattern"],
                },
                risk_assessment: {
                  type: "object",
                  properties: {
                    risk_level: { type: "string" },
                    risk_factors: { type: "array", items: { type: "string" } },
                    invalidation: { type: "string" },
                  },
                  required: ["risk_level", "risk_factors", "invalidation"],
                },
                supply_demand: {
                  type: "object",
                  properties: {
                    nearest_demand: { type: "string" },
                    nearest_supply: { type: "string" },
                    bias: { type: "string" },
                  },
                  required: ["nearest_demand", "nearest_supply", "bias"],
                },
                ema_analysis: {
                  type: "object",
                  properties: {
                    alignment: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["alignment", "description"],
                },
                sector_context: { type: "string" },
                freshness: { type: "string" },
              },
              required: ["overall_score", "grade", "verdict", "summary", "key_levels", "scores", "risk_assessment", "supply_demand", "ema_analysis", "sector_context", "freshness"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "stock_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      throw new Error(`AI gateway error: ${response.status} ${text}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const analysis = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No analysis generated");
  } catch (e) {
    console.error("ai-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
