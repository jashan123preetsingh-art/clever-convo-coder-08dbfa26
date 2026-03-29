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

    const systemPrompt = `You are an expert Indian stock market analyst. Analyze the given stock data and provide a comprehensive analysis. Return ONLY valid JSON matching the exact schema specified.`;

    const userPrompt = `Analyze this stock and return JSON:

STOCK: ${quote?.symbol} (${quote?.name})
PRICE: ₹${quote?.ltp} | Change: ${quote?.change_pct?.toFixed(2)}%
52W Range: ₹${quote?.week_52_low} - ₹${quote?.week_52_high}

TECHNICALS:
- RSI(14): ${technicals?.rsi_14}
- MACD: ${technicals?.macd}
- SMA20: ${technicals?.sma_20} | SMA50: ${technicals?.sma_50} | SMA200: ${technicals?.sma_200}
- EMA20: ${technicals?.ema_20} | EMA50: ${technicals?.ema_50}
- Trend: ${technicals?.trend} | Strength: ${technicals?.trend_strength}
- Support: S1=${technicals?.s1} S2=${technicals?.s2} S3=${technicals?.s3}
- Resistance: R1=${technicals?.r1} R2=${technicals?.r2} R3=${technicals?.r3}
- Bollinger: ${technicals?.bollinger_lower} / ${technicals?.bollinger_middle} / ${technicals?.bollinger_upper}
- Volume Ratio: ${technicals?.volume_ratio}x avg
- Candle Patterns: ${technicals?.candle_patterns?.join(", ") || "None"}
- ATR(14): ${technicals?.atr_14}

FUNDAMENTALS:
- P/E: ${fundamentals?.pe_ratio} | Forward PE: ${fundamentals?.forward_pe}
- P/B: ${fundamentals?.pb_ratio} | PEG: ${fundamentals?.peg_ratio}
- ROE: ${fundamentals?.roe}% | ROA: ${fundamentals?.roa}%
- Debt/Equity: ${fundamentals?.debt_to_equity}
- Profit Margin: ${fundamentals?.profit_margins}% | Operating Margin: ${fundamentals?.operating_margins}%
- Revenue Growth: ${fundamentals?.revenue_growth}% | Earnings Growth: ${fundamentals?.earnings_growth}%
- Dividend Yield: ${fundamentals?.dividend_yield}%
- Beta: ${fundamentals?.beta}
- Analyst Target: ₹${fundamentals?.target_mean_price} (${fundamentals?.recommendation})

Return this exact JSON structure:
{
  "overall_score": <number 0-100>,
  "grade": "<A+/A/B+/B/C+/C/D/F>",
  "verdict": "<Strong Buy/Buy/Hold/Sell/Strong Sell>",
  "summary": "<2-3 sentence analysis summary>",
  "key_levels": {
    "immediate_support": <number>,
    "immediate_resistance": <number>,
    "stop_loss": <number>,
    "target_1": <number>,
    "target_2": <number>
  },
  "scores": {
    "price_action": { "score": <0-20>, "comment": "<brief>" },
    "volume": { "score": <0-20>, "comment": "<brief>" },
    "candle": { "score": <0-20>, "comment": "<brief>" },
    "structure": { "score": <0-20>, "comment": "<brief>" },
    "momentum": { "score": <0-20>, "comment": "<brief>" },
    "fundamentals": { "score": <0-20>, "comment": "<brief>" },
    "relative_strength": { "score": <0-20>, "comment": "<brief>" }
  },
  "risk_assessment": {
    "risk_level": "<Low/Medium/High/Very High>",
    "risk_factors": ["<factor1>", "<factor2>"],
    "invalidation": "<price level and condition>"
  },
  "candle_analysis": {
    "pattern": "<detected pattern or None>",
    "bias": "<Bullish/Bearish/Neutral>",
    "description": "<brief description>"
  },
  "ma_analysis": {
    "alignment": "<Bullish/Bearish/Mixed>",
    "description": "<brief about MA stack>"
  },
  "sector_context": "<brief sector outlook>",
  "freshness": "<Fresh/Aging/Stale - based on pattern recency>"
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
            description: "Return structured stock analysis",
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
                  },
                  required: ["immediate_support", "immediate_resistance", "stop_loss", "target_1", "target_2"],
                },
                scores: {
                  type: "object",
                  properties: {
                    price_action: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                    volume: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                    candle: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                    structure: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                    momentum: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                    fundamentals: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                    relative_strength: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                  },
                  required: ["price_action", "volume", "candle", "structure", "momentum", "fundamentals", "relative_strength"],
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
                candle_analysis: {
                  type: "object",
                  properties: {
                    pattern: { type: "string" },
                    bias: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["pattern", "bias", "description"],
                },
                ma_analysis: {
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
              required: ["overall_score", "grade", "verdict", "summary", "key_levels", "scores", "risk_assessment", "candle_analysis", "ma_analysis", "sector_context", "freshness"],
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
