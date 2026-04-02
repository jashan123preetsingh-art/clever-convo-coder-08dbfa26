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

    let totalInvested = 0;
    let totalCurrent = 0;
    const lines: string[] = [];
    const sectorExposure: Record<string, number> = {};

    for (const pos of positions) {
      const ltp = quotes?.[pos.symbol] ?? pos.entry_price;
      const invested = pos.entry_price * pos.quantity;
      const current = ltp * pos.quantity;
      const pnl = (ltp - pos.entry_price) * pos.quantity * (pos.trade_type === "sell" ? -1 : 1);
      const pnlPct = ((ltp - pos.entry_price) / pos.entry_price) * 100;
      totalInvested += invested;
      totalCurrent += current;
      lines.push(`• ${pos.symbol}: ${pos.quantity} shares @ ₹${pos.entry_price} → LTP ₹${ltp.toFixed(2)} | P&L: ₹${pnl.toFixed(0)} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%) | Weight: ${totalInvested > 0 ? ((invested / totalInvested) * 100).toFixed(1) : 0}%`);
    }

    const totalPnl = totalCurrent - totalInvested;
    const totalPnlPct = totalInvested > 0 ? ((totalPnl / totalInvested) * 100).toFixed(2) : "0";
    const posCount = positions.length;
    const winnersCount = positions.filter((p: any) => {
      const ltp = quotes?.[p.symbol] ?? p.entry_price;
      return ltp > p.entry_price;
    }).length;

    const portfolioContext = `Portfolio Summary (${posCount} positions, ${winnersCount} winners):
Total Invested: ₹${totalInvested.toFixed(0)}
Current Value: ₹${totalCurrent.toFixed(0)}
Unrealized P&L: ₹${totalPnl.toFixed(0)} (${totalPnl >= 0 ? "+" : ""}${totalPnlPct}%)
Win Rate: ${posCount > 0 ? ((winnersCount / posCount) * 100).toFixed(0) : 0}%

Positions:
${lines.join("\n")}`;

    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.15,
        messages: [
          {
            role: "system",
            content: `You are Trade Arsenal Portfolio AI — a SEBI-registered investment advisor analyzing an Indian stock portfolio.

ACCURACY RULES:
- Use ONLY the exact position data provided. Never fabricate prices or P&L numbers.
- All ₹ levels must come from the provided data.
- Be honest about risks — don't sugarcoat losses.
- If a position is significantly in loss (>15%), flag it clearly.
- If portfolio is concentrated (any single stock >25% weight), flag it.

Provide a BRIEF analysis in markdown (max 200 words):

1. **Portfolio Health** — Assessment with specific data (total P&L, win rate, concentration)
2. **Biggest Risks** — 2-3 specific risks citing actual positions and their performance
3. **Action Items** — 2-3 SPECIFIC, actionable suggestions with exact ₹ levels where possible:
   - For losers: suggest SL levels or exit criteria
   - For winners: suggest profit booking levels or trailing stops
   - For concentration: suggest rebalancing with specific %

Rules:
- Use ₹ for all prices
- Reference specific symbols from the portfolio
- If portfolio has <3 positions, suggest diversification
- Be direct and actionable, not generic`,
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
