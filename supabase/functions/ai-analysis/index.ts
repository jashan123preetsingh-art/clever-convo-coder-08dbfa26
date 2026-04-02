import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Post-processing: clamp key_levels to realistic ATR-based ranges
function clampKeyLevels(analysis: any, quote: any, technicals: any) {
  if (!analysis?.key_levels) return analysis;
  
  const cmp = quote?.ltp;
  const atr = technicals?.atr_14;
  if (!cmp || cmp <= 0) return analysis;

  // Use ATR or fallback to 3% of CMP
  const volatility = (atr && atr > 0) ? atr : cmp * 0.03;
  const maxTargetDist = volatility * 4; // max 4x ATR for targets
  const maxSLDist = volatility * 2.5; // max 2.5x ATR for SL

  const kl = analysis.key_levels;

  // Clamp targets within realistic range
  if (kl.target_1 != null) {
    const dist = Math.abs(kl.target_1 - cmp);
    if (dist > maxTargetDist) {
      kl.target_1 = kl.target_1 > cmp 
        ? Math.round(cmp + maxTargetDist) 
        : Math.round(cmp - maxTargetDist);
    }
  }
  if (kl.target_2 != null) {
    const dist = Math.abs(kl.target_2 - cmp);
    if (dist > maxTargetDist * 1.5) {
      kl.target_2 = kl.target_2 > cmp 
        ? Math.round(cmp + maxTargetDist * 1.5) 
        : Math.round(cmp - maxTargetDist * 1.5);
    }
  }

  // Clamp SL
  if (kl.stop_loss != null) {
    const dist = Math.abs(kl.stop_loss - cmp);
    if (dist > maxSLDist) {
      kl.stop_loss = kl.stop_loss < cmp 
        ? Math.round(cmp - maxSLDist) 
        : Math.round(cmp + maxSLDist);
    }
  }

  // Clamp support/resistance within 52W range if available
  const high52 = quote?.week_52_high;
  const low52 = quote?.week_52_low;
  if (high52 && kl.immediate_resistance > high52 * 1.05) {
    kl.immediate_resistance = Math.round(high52);
  }
  if (low52 && kl.immediate_support < low52 * 0.95) {
    kl.immediate_support = Math.round(low52);
  }

  // Clamp S/D zones
  if (kl.demand_zone_low != null && kl.demand_zone_low < cmp * 0.7) {
    kl.demand_zone_low = Math.round(cmp * 0.85);
  }
  if (kl.supply_zone_high != null && kl.supply_zone_high > cmp * 1.3) {
    kl.supply_zone_high = Math.round(cmp * 1.15);
  }

  // Validate score isn't inflated without evidence
  if (analysis.overall_score > 85) {
    // Check if multiple factors actually confirm
    const scores = analysis.scores;
    if (scores) {
      const highScores = Object.values(scores).filter((s: any) => s?.score >= 15).length;
      if (highScores < 3) {
        analysis.overall_score = Math.min(analysis.overall_score, 75);
      }
    }
  }

  analysis.key_levels = kl;
  return analysis;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stockData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { quote, fundamentals, technicals } = stockData;

    const cmp = quote?.ltp || 0;
    const atrVal = technicals?.atr_14;
    const atrPct = (cmp > 0 && atrVal) ? ((atrVal / cmp) * 100).toFixed(2) : 'N/A';

    const systemPrompt = `You are an expert Indian stock market analyst specializing in Price Action, Supply/Demand, and Institutional-grade technical analysis.

ACCURACY RULES (NEVER VIOLATE):
1. Use ONLY the exact data provided below. NEVER fabricate prices, levels, or indicators.
2. All support, resistance, target, and stop-loss levels MUST come from the provided data (EMAs, pivots, S/R levels, Bollinger bands).
3. If a data point shows "N/A", say "data unavailable" — don't make up values.
4. Targets must be within realistic ATR-based range of CMP (1-3x ATR for targets, 1-2x ATR for SL).
5. Express views as probability ("likely", "probable") — NEVER "will" or "guaranteed".
6. Score honestly: 70+ only with multi-factor confirmation across PA, S/R, EMA, and volume.
7. The CMP is ₹${cmp}. ATR(14) is ₹${atrVal || 'N/A'} (${atrPct}% of CMP). Targets CANNOT exceed ±4x ATR from CMP.
8. SPLIT AWARENESS: CMP is current split-adjusted. NEVER reference old pre-split prices.

Your framework (priority order):
1. **PRICE ACTION & SUPPLY/DEMAND** (40%) — trend structure, S/D zones, order blocks, FVGs
2. **MULTI-TIMEFRAME S/R** (25%) — pivots, swing highs/lows, round numbers, PDH/PDL/PDC
3. **EMA ALIGNMENT** (15%) — 9/20/50/200 stack, golden/death cross
4. **VOLUME & VWAP** (15%) — vol ratio, Bollinger position, squeeze/expansion
5. **CANDLE PATTERNS** (5%) — only at key S/R or S/D zones

Return ONLY valid JSON. Do NOT include fundamentals in the scoring.`;

    const safe = (v: any, d = 'N/A') => (v != null && v !== undefined && !isNaN(v)) ? v : d;
    const userPrompt = `Analyze this stock:

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
- ATR(14): ${safe(technicals?.atr_14)} (${atrPct}% of CMP — defines max target range)

IMPORTANT: target_1 should be within 2x ATR (₹${atrVal ? (cmp + atrVal * 2).toFixed(0) : 'N/A'} max upside). target_2 within 3x ATR (₹${atrVal ? (cmp + atrVal * 3).toFixed(0) : 'N/A'} max). stop_loss within 2x ATR below.

Return this exact JSON structure:
{
  "overall_score": <0-100, honest — 70+ needs 3+ confirming factors>,
  "grade": "<A+/A/B+/B/C+/C/D/F>",
  "verdict": "<Strong Buy/Buy/Hold/Sell/Strong Sell>",
  "summary": "<2-3 sentences with SPECIFIC ₹ levels from data, not generic>",
  "key_levels": {
    "immediate_support": <from S1/S2/EMA/swing>,
    "immediate_resistance": <from R1/R2/EMA/swing>,
    "stop_loss": <within 2x ATR below CMP>,
    "target_1": <within 2x ATR above CMP>,
    "target_2": <within 3x ATR above CMP>,
    "demand_zone_low": <number>,
    "demand_zone_high": <number>,
    "supply_zone_low": <number>,
    "supply_zone_high": <number>
  },
  "scores": {
    "price_action": { "score": <0-20>, "comment": "<specific observations>" },
    "support_resistance": { "score": <0-20>, "comment": "<cite exact levels>" },
    "ema_alignment": { "score": <0-20>, "comment": "<cite exact EMA values>" },
    "volume_vwap": { "score": <0-20>, "comment": "<cite exact vol ratio>" },
    "candle_pattern": { "score": <0-20>, "comment": "<only if at key S/R>" }
  },
  "risk_assessment": {
    "risk_level": "<Low/Medium/High/Very High>",
    "risk_factors": ["<specific factor>", "<specific factor>"],
    "invalidation": "<specific ₹ level from data>"
  },
  "supply_demand": {
    "nearest_demand": "<₹X - ₹Y from data>",
    "nearest_supply": "<₹X - ₹Y from data>",
    "bias": "<Bullish/Bearish/Neutral>"
  },
  "ema_analysis": {
    "alignment": "<Bullish Stack/Bearish Stack/Mixed>",
    "description": "<exact values: EMA9=₹X > EMA20=₹Y etc>"
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
        model: "google/gemini-2.5-flash",
        temperature: 0.12,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "stock_analysis",
            description: "Return structured stock analysis with ATR-clamped targets",
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
      let analysis = JSON.parse(toolCall.function.arguments);
      // Post-processing safety clamp
      analysis = clampKeyLevels(analysis, quote, technicals);
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
