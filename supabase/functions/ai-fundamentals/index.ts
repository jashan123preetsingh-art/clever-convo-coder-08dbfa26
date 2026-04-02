import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, quote, technicals, partialFundamentals } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build context from available data
    const context: string[] = [`Stock: ${symbol}`];
    if (quote) {
      context.push(`LTP: ₹${quote.ltp}, Change: ${quote.change_pct}%`);
      if (quote.market_cap) context.push(`Market Cap: ₹${(quote.market_cap / 1e7).toFixed(0)} Cr`);
      if (quote.volume) context.push(`Volume: ${quote.volume}`);
      if (quote.week_52_high) context.push(`52W High: ₹${quote.week_52_high}, 52W Low: ₹${quote.week_52_low}`);
    }
    if (technicals) {
      context.push(`RSI: ${technicals.rsi_14}, MACD: ${technicals.macd}, Trend: ${technicals.trend}`);
      if (technicals.sma_50) context.push(`SMA50: ${technicals.sma_50}, SMA200: ${technicals.sma_200}`);
    }
    if (partialFundamentals) {
      const pf = partialFundamentals;
      if (pf.pe_ratio) context.push(`P/E: ${pf.pe_ratio}`);
      if (pf.roe) context.push(`ROE: ${pf.roe}%`);
      if (pf.debt_to_equity != null) context.push(`D/E: ${pf.debt_to_equity}`);
      if (pf.dividend_yield) context.push(`Div Yield: ${pf.dividend_yield}%`);
      if (pf.profit_margins) context.push(`Profit Margin: ${pf.profit_margins}%`);
    }

    const cmp = quote?.ltp || 0;
    const systemPrompt = `You are an expert Indian stock market fundamental analyst. Given the available data for a stock, provide a comprehensive fundamental analysis report. You MUST respond with valid JSON only, no markdown.

CRITICAL RULES FOR TARGET PRICES:
- The current market price (CMP) is ₹${cmp}. 
- Your target_range MUST be realistic and anchored to CMP.
- For HOLD/SELL verdicts: targets should be within -10% to +15% of CMP.
- For BUY verdicts: targets can be +5% to +25% of CMP maximum.
- For STRONG BUY: targets can be +10% to +35% of CMP maximum.
- NEVER give targets that are 2x or 3x the CMP — that is unrealistic for a 12-month horizon.
- "low" target should be near or slightly below CMP (downside risk).
- "mid" target is the most likely fair value in 6-12 months.
- "high" target is the optimistic scenario (bull case).
- All targets must be reasonable round numbers close to CMP.

Respond with this exact JSON structure:
{
  "verdict": "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL",
  "confidence": 1-100,
  "summary": "2-3 sentence overview",
  "valuation": {
    "assessment": "Undervalued" | "Fairly Valued" | "Overvalued",
    "reasoning": "1-2 sentences",
    "score": 1-10
  },
  "profitability": {
    "assessment": "Strong" | "Moderate" | "Weak",
    "reasoning": "1-2 sentences",
    "score": 1-10
  },
  "growth": {
    "assessment": "High Growth" | "Moderate Growth" | "Low Growth" | "Declining",
    "reasoning": "1-2 sentences",
    "score": 1-10
  },
  "financial_health": {
    "assessment": "Excellent" | "Good" | "Moderate" | "Concerning",
    "reasoning": "1-2 sentences",
    "score": 1-10
  },
  "dividend": {
    "assessment": "Strong" | "Moderate" | "Low" | "None",
    "reasoning": "1 sentence",
    "score": 1-10
  },
  "risks": ["risk1", "risk2", "risk3"],
  "catalysts": ["catalyst1", "catalyst2", "catalyst3"],
  "target_range": { "low": number, "mid": number, "high": number },
  "sector_outlook": "1 sentence about sector"
}

Remember: CMP is ₹${cmp}. Targets MUST be realistic (within 10-30% of CMP). Use the available data to make informed assessments. If data is limited, use your knowledge of the company (${symbol} on NSE India). Be specific and actionable.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze fundamentals for ${symbol}:\n${context.join('\n')}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { error: "Failed to parse AI response", raw: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-fundamentals error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
