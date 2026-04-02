import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_KEY = "commodity-market-overview";
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { commodityData } = await req.json();

    // Check cache first
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: cached } = await sb
      .from("ai_analysis_cache")
      .select("result, created_at")
      .eq("cache_key", CACHE_KEY)
      .eq("mode", "commodity-overview")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ analysis: cached.result, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt from live data
    const summaryLines = Object.values(commodityData || {}).map((c: any) => {
      if (c.error) return `${c.name}: data unavailable`;
      return `${c.name}: $${c.price} (${c.change >= 0 ? "+" : ""}${c.changePct}%), India landed ₹${c.landedPerUnit}/${c.indiaUnit}`;
    });

    const prompt = `You are a commodities market analyst. Analyze the current commodity market based on this LIVE data:

${summaryLines.join("\n")}

Provide a concise overall market analysis in this JSON format:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "headline": "one-line market summary (max 15 words)",
  "summary": "2-3 sentence overall market overview",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "goldOutlook": "1 sentence on gold direction",
  "energyOutlook": "1 sentence on energy direction",
  "riskLevel": "low" | "moderate" | "high",
  "recommendation": "1 sentence actionable recommendation for Indian investors"
}

Keep it factual, data-driven. No disclaimers. Return ONLY valid JSON.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a concise commodities market analyst. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResp.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Clean markdown fences
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      analysis = {
        sentiment: "neutral",
        headline: "Market data analysis unavailable",
        summary: content.slice(0, 200),
        keyInsights: ["Analysis parsing failed"],
        goldOutlook: "Check live prices",
        energyOutlook: "Check live prices",
        riskLevel: "moderate",
        recommendation: "Monitor markets closely",
      };
    }

    // Cache for 30 min
    const expiresAt = new Date(Date.now() + CACHE_DURATION_MS).toISOString();
    await sb.from("ai_analysis_cache").insert({
      cache_key: CACHE_KEY,
      symbol: "COMMODITIES",
      mode: "commodity-overview",
      result: analysis,
      expires_at: expiresAt,
    });

    return new Response(JSON.stringify({ analysis, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("commodity-ai error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
