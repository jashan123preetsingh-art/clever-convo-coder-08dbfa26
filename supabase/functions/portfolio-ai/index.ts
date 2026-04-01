import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { positions, quotes } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      return new Response(JSON.stringify({ error: "No positions to analyze" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build portfolio context
    let totalInvested = 0;
    let totalCurrent = 0;
    const lines: string[] = [];

    for (const pos of positions) {
      const ltp = quotes?.[pos.symbol] ?? pos.entry_price;
      const invested = pos.entry_price * pos.quantity;
      const current = ltp * pos.quantity;
      const pnl = (ltp - pos.entry_price) * pos.quantity * (pos.trade_type === "sell" ? -1 : 1);
      const pnlPct = ((ltp - pos.entry_price) / pos.entry_price) * 100;
      totalInvested += invested;
      totalCurrent += current;
      lines.push(`• ${pos.symbol}: ${pos.quantity} shares @ ₹${pos.entry_price} → LTP ₹${ltp.toFixed(2)} | P&L: ₹${pnl.toFixed(0)} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%)`);
    }

    const totalPnl = totalCurrent - totalInvested;
    const totalPnlPct = totalInvested > 0 ? ((totalPnl / totalInvested) * 100).toFixed(2) : "0";

    const portfolioContext = `Portfolio Summary:
Total Invested: ₹${totalInvested.toFixed(0)}
Current Value: ₹${totalCurrent.toFixed(0)}
Unrealized P&L: ₹${totalPnl.toFixed(0)} (${totalPnl >= 0 ? "+" : ""}${totalPnlPct}%)

Positions:
${lines.join("\n")}`;

    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are Trade Arsenal Portfolio AI — a concise Indian stock market portfolio analyst.
Given a user's portfolio positions with live prices, provide a BRIEF analysis in markdown (max 150 words).

Include:
1. **Portfolio Health** — one line assessment (concentrated/diversified, risk level)
2. **Key Risks** — 1-2 biggest risks (sector concentration, single stock exposure, stocks near 52W high/low)
3. **Action Items** — 1-2 specific actionable suggestions (book profit, add SL, rebalance)

Rules:
- Be extremely concise — bullet points only
- Use ₹ for prices
- No disclaimers needed, keep it actionable
- If portfolio is in loss, focus on risk management
- If in profit, suggest profit booking levels`,
          },
          { role: "user", content: portfolioContext },
        ],
        stream: false,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const analysis = data.choices?.[0]?.message?.content || "Analysis unavailable.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("portfolio-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
