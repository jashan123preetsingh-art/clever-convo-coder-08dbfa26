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

    const systemPrompt = `You are a seasoned Indian stock market analyst writing a daily market brief. Write in a professional yet engaging tone. Be specific with numbers and levels. Keep it concise but insightful. Return ONLY valid JSON.`;

    const userPrompt = `Generate a daily market brief based on this data:

INDICES:
${JSON.stringify(marketData.indices, null, 1)}

MARKET BREADTH:
- Advances: ${marketData.advances}, Declines: ${marketData.declines}, Unchanged: ${marketData.unchanged}

TOP GAINERS: ${marketData.gainers?.map((g: any) => `${g.symbol} (+${g.change_pct?.toFixed(1)}%)`).join(', ')}
TOP LOSERS: ${marketData.losers?.map((l: any) => `${l.symbol} (${l.change_pct?.toFixed(1)}%)`).join(', ')}

SECTOR PERFORMANCE:
${marketData.sectors?.map((s: any) => `${s.sector}: ${s.avg_change >= 0 ? '+' : ''}${s.avg_change?.toFixed(2)}%`).join('\n')}

Return this JSON structure:
{
  "headline": "<catchy 8-12 word headline>",
  "market_mood": "<Bullish/Bearish/Cautious/Euphoric/Fearful/Neutral>",
  "mood_score": <1-10, 1=extreme fear, 10=extreme greed>,
  "summary": "<3-4 sentence market overview paragraph>",
  "key_observations": ["<observation 1>", "<observation 2>", "<observation 3>", "<observation 4>"],
  "sector_spotlight": {
    "winner": "<sector name>",
    "winner_reason": "<brief why>",
    "laggard": "<sector name>",
    "laggard_reason": "<brief why>"
  },
  "levels_to_watch": {
    "nifty_support": <number>,
    "nifty_resistance": <number>,
    "banknifty_support": <number>,
    "banknifty_resistance": <number>
  },
  "trading_idea": {
    "stock": "<symbol>",
    "direction": "<Long/Short>",
    "rationale": "<1 sentence>"
  },
  "outlook": "<1-2 sentence forward-looking view>"
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
            name: "market_brief",
            description: "Return structured daily market brief",
            parameters: {
              type: "object",
              properties: {
                headline: { type: "string" },
                market_mood: { type: "string" },
                mood_score: { type: "number" },
                summary: { type: "string" },
                key_observations: { type: "array", items: { type: "string" } },
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
                    stock: { type: "string" },
                    direction: { type: "string" },
                    rationale: { type: "string" },
                  },
                  required: ["stock", "direction", "rationale"],
                },
                outlook: { type: "string" },
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
