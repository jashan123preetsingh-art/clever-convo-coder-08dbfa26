import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are StockPulse AI — an expert Indian stock market analyst and options strategist with access to REAL-TIME market data.

You help traders with:
1. **Chart Analysis**: Price action, support/resistance, trend analysis, candlestick patterns, MAs, RSI, MACD, Bollinger Bands, volume
2. **Options Strategy**: Option chain analysis, Greeks, IV analysis, straddle/strangle, iron condors, spreads, covered calls, protective puts
3. **Trade Setups**: Entry/exit points, stop-loss, position sizing, risk-reward
4. **Market Context**: Nifty/BankNifty levels, FII/DII flows, sector rotation, market breadth

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

    // Build context with live data
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
    }

    const fullSystem = SYSTEM_PROMPT + liveDataBlock;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
