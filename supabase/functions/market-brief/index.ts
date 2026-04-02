import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { marketData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a senior Indian stock market strategist writing the daily morning brief for institutional traders.

ACCURACY RULES:
- Use ONLY the exact index levels, breadth, and sector data provided below. NEVER fabricate numbers.
- Support/resistance levels must be derived from the actual index prices (round numbers near ±1-2% of CMP).
- Mood score must honestly reflect the breadth data (advances vs declines ratio).
- Trading idea must reference a stock from the gainers/losers data provided.
- Sector analysis must use the exact performance numbers provided.
- Be specific and actionable, not generic. Write like a Bloomberg terminal brief.`;

    const userPrompt = `Generate a daily market brief from this LIVE data. Use ONLY these exact numbers:

INDICES:
${JSON.stringify(marketData.indices, null, 1)}

MARKET BREADTH:
- Advances: ${marketData.advances}, Declines: ${marketData.declines}, Unchanged: ${marketData.unchanged}
- A/D Ratio: ${marketData.advances && marketData.declines ? (marketData.advances / marketData.declines).toFixed(2) : 'N/A'}

TOP GAINERS: ${marketData.gainers?.map((g: any) => `${g.symbol} (+${(g.change_pct ?? 0).toFixed(1)}%)`).join(', ') || 'N/A'}
TOP LOSERS: ${marketData.losers?.map((l: any) => `${l.symbol} (${(l.change_pct ?? 0).toFixed(1)}%)`).join(', ') || 'N/A'}

SECTOR PERFORMANCE:
${marketData.sectors?.map((s: any) => `${s.sector}: ${(s.avg_change ?? 0) >= 0 ? '+' : ''}${(s.avg_change ?? 0).toFixed(2)}%`).join('\n') || 'N/A'}

RULES FOR OUTPUT:
- nifty_support = nearest round number 1-2% below current Nifty level
- nifty_resistance = nearest round number 1-2% above current Nifty level
- Same logic for banknifty_support/resistance
- trading_idea.stock MUST be from the gainers or losers list above
- mood_score: calculate from A/D ratio (>1.5 = 7+, <0.7 = 3-, balanced = 5)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.15,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "market_brief",
            description: "Return structured daily market brief grounded in provided data",
            parameters: {
              type: "object",
              properties: {
                headline: { type: "string", description: "Catchy 8-12 word headline using actual index levels" },
                market_mood: { type: "string", enum: ["Bullish", "Bearish", "Cautious", "Euphoric", "Fearful", "Neutral"] },
                mood_score: { type: "number", description: "1-10 based on A/D ratio" },
                summary: { type: "string", description: "3-4 sentences using exact numbers from data" },
                key_observations: { type: "array", items: { type: "string" }, description: "4 observations citing exact data points" },
                sector_spotlight: {
                  type: "object",
                  properties: {
                    winner: { type: "string" },
                    winner_reason: { type: "string" },
                    laggard: { type: "string" },
                    laggard_reason: { type: "string" },
                  },
                  required: ["winner", "winner_reason", "laggard", "laggard_reason"],
                },
                levels_to_watch: {
                  type: "object",
                  properties: {
                    nifty_support: { type: "number" },
                    nifty_resistance: { type: "number" },
                    banknifty_support: { type: "number" },
                    banknifty_resistance: { type: "number" },
                  },
                  required: ["nifty_support", "nifty_resistance", "banknifty_support", "banknifty_resistance"],
                },
                trading_idea: {
                  type: "object",
                  properties: {
                    stock: { type: "string", description: "MUST be from gainers or losers list" },
                    direction: { type: "string", enum: ["Long", "Short"] },
                    rationale: { type: "string", description: "1 sentence with specific data" },
                  },
                  required: ["stock", "direction", "rationale"],
                },
                outlook: { type: "string", description: "1-2 sentence forward view based on breadth and sector data" },
              },
              required: ["headline", "market_mood", "mood_score", "summary", "key_observations", "sector_spotlight", "levels_to_watch", "trading_idea", "outlook"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "market_brief" } },
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
      const brief = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(brief), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No brief generated");
  } catch (e) {
    console.error("market-brief error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
