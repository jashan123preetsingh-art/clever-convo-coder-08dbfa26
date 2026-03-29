import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are StockPulse AI — an expert Indian stock market analyst and options strategist. You help traders with:

1. **Chart Analysis**: Reading price action, support/resistance, trend analysis, candlestick patterns, moving averages, RSI, MACD, Bollinger Bands, volume analysis
2. **Options Strategy**: Option chain analysis, Greeks interpretation, IV analysis, straddle/strangle setups, iron condors, bull/bear spreads, covered calls, protective puts
3. **Trade Setups**: Entry/exit points, stop-loss placement, position sizing, risk-reward ratios
4. **Market Context**: Nifty/BankNifty levels, FII/DII flows, sector rotation, market breadth

Guidelines:
- Always mention specific price levels when discussing support/resistance
- For options, discuss strike selection, expiry choice, and premium decay
- Use ₹ for Indian rupee prices
- Be concise but thorough. Use bullet points and clear formatting.
- When uncertain, say so and suggest what data would help
- Never give guaranteed returns or absolute predictions
- Always include risk warnings for trade setups
- Format responses with markdown for readability`;

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

    // Build context-aware system message
    let systemContent = SYSTEM_PROMPT;
    if (context) {
      systemContent += `\n\nCurrent Context:\n`;
      if (context.currentPage) systemContent += `- User is on: ${context.currentPage}\n`;
      if (context.currentStock) systemContent += `- Viewing stock: ${context.currentStock}\n`;
      if (context.stockData) {
        const sd = context.stockData;
        systemContent += `- Stock: ${sd.symbol} @ ₹${sd.ltp} (${sd.change_pct >= 0 ? '+' : ''}${sd.change_pct?.toFixed(2)}%)\n`;
        if (sd.high) systemContent += `- Day Range: ₹${sd.low} - ₹${sd.high}\n`;
        if (sd.week_52_high) systemContent += `- 52W Range: ₹${sd.week_52_low} - ₹${sd.week_52_high}\n`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages.slice(-20), // Keep last 20 messages for context
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
