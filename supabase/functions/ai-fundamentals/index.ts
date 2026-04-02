import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FUNDAMENTALS_MODEL = "google/gemini-3-flash-preview";

type Verdict = "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL";
type RangeTuple = [number, number];
type TargetBand = {
  low: RangeTuple;
  mid: RangeTuple;
  high: RangeTuple;
};

const TARGET_BANDS: Record<Verdict, TargetBand> = {
  "STRONG BUY": { low: [0.95, 1.02], mid: [1.08, 1.18], high: [1.15, 1.3] },
  BUY: { low: [0.92, 1.0], mid: [1.04, 1.12], high: [1.1, 1.22] },
  HOLD: { low: [0.88, 0.98], mid: [0.98, 1.05], high: [1.03, 1.12] },
  SELL: { low: [0.72, 0.88], mid: [0.8, 0.92], high: [0.88, 0.98] },
  "STRONG SELL": { low: [0.6, 0.82], mid: [0.7, 0.86], high: [0.8, 0.94] },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toNumber(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function roundTarget(value: number, cmp: number) {
  const step = cmp >= 5000 ? 50 : cmp >= 1000 ? 10 : cmp >= 200 ? 5 : 1;
  return Math.round(value / step) * step;
}

function midpoint([min, max]: RangeTuple) {
  return (min + max) / 2;
}

function normalizeTargetRange(targetRange: any, cmp: number, verdictRaw: string, week52High?: number | null, week52Low?: number | null) {
  const verdict = (String(verdictRaw || "HOLD").toUpperCase() as Verdict);
  const band = TARGET_BANDS[verdict] ?? TARGET_BANDS.HOLD;

  const lowMin = Math.max(cmp * band.low[0], week52Low && week52Low > 0 ? week52Low * 0.95 : 0);
  const lowMax = cmp * band.low[1];
  const lowBase = toNumber(targetRange?.low) ?? cmp * midpoint(band.low);
  const low = roundTarget(clamp(lowBase, lowMin, Math.max(lowMin, lowMax)), cmp);

  const midMin = Math.max(cmp * band.mid[0], low);
  const midMax = Math.max(midMin, cmp * band.mid[1]);
  const midBase = toNumber(targetRange?.mid) ?? cmp * midpoint(band.mid);
  const mid = roundTarget(clamp(midBase, midMin, midMax), cmp);

  let highMax = cmp * band.high[1];
  if (week52High && week52High > 0) {
    highMax = Math.min(highMax, week52High * 1.08);
  }
  const highMin = Math.max(cmp * band.high[0], mid);
  const highBase = toNumber(targetRange?.high) ?? cmp * midpoint(band.high);
  const high = roundTarget(clamp(highBase, highMin, Math.max(highMin, highMax)), cmp);

  return { low, mid, high };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, quote, technicals, partialFundamentals } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const context: string[] = [`Stock: ${symbol}`];
    if (quote) {
      context.push(`LTP: ₹${quote.ltp}, Change: ${quote.change_pct}%`);
      if (quote.market_cap) context.push(`Market Cap: ₹${(quote.market_cap / 1e7).toFixed(0)} Cr`);
      if (quote.volume) context.push(`Volume: ${quote.volume}`);
      if (quote.week_52_high) context.push(`52W High: ₹${quote.week_52_high}, 52W Low: ₹${quote.week_52_low}`);
    }
    if (technicals) {
      context.push(`RSI: ${technicals.rsi_14}, Trend: ${technicals.trend}`);
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
    const week52High = quote?.week_52_high ?? null;
    const week52Low = quote?.week_52_low ?? null;

    const systemPrompt = `You are an expert Indian stock market fundamental analyst. Use ONLY the live input data as the source of truth and respond with a structured report.

CRITICAL GROUNDING RULES:
- The stock may have undergone splits, bonuses, or face-value changes.
- NEVER anchor to stale pre-split prices, legacy historic prices, or memorized older price ranges.
- The current split-adjusted CMP is ₹${cmp}.
- The live 52-week range is ₹${week52Low ?? "N/A"} to ₹${week52High ?? "N/A"}.
- target_range is a realistic 6-12 month fair-value band, NOT a 2x/3x projection.
- Keep targets close to CMP and consistent with the verdict.
- If data is limited, stay conservative instead of making aggressive claims.
- Base your reasoning on valuation, profitability, growth, balance sheet strength, and sector context.
- Be specific, practical, and avoid hype.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: FUNDAMENTALS_MODEL,
        temperature: 0.15,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze fundamentals for ${symbol}:\n${context.join("\n")}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "fundamental_report",
            description: "Return a structured Indian stock fundamental analysis report with a realistic target range anchored to current price.",
            parameters: {
              type: "object",
              properties: {
                verdict: { type: "string", enum: ["STRONG BUY", "BUY", "HOLD", "SELL", "STRONG SELL"] },
                confidence: { type: "number" },
                summary: { type: "string" },
                valuation: {
                  type: "object",
                  properties: {
                    assessment: { type: "string", enum: ["Undervalued", "Fairly Valued", "Overvalued"] },
                    reasoning: { type: "string" },
                    score: { type: "number" },
                  },
                  required: ["assessment", "reasoning", "score"],
                },
                profitability: {
                  type: "object",
                  properties: {
                    assessment: { type: "string", enum: ["Strong", "Moderate", "Weak"] },
                    reasoning: { type: "string" },
                    score: { type: "number" },
                  },
                  required: ["assessment", "reasoning", "score"],
                },
                growth: {
                  type: "object",
                  properties: {
                    assessment: { type: "string", enum: ["High Growth", "Moderate Growth", "Low Growth", "Declining"] },
                    reasoning: { type: "string" },
                    score: { type: "number" },
                  },
                  required: ["assessment", "reasoning", "score"],
                },
                financial_health: {
                  type: "object",
                  properties: {
                    assessment: { type: "string", enum: ["Excellent", "Good", "Moderate", "Concerning"] },
                    reasoning: { type: "string" },
                    score: { type: "number" },
                  },
                  required: ["assessment", "reasoning", "score"],
                },
                dividend: {
                  type: "object",
                  properties: {
                    assessment: { type: "string", enum: ["Strong", "Moderate", "Low", "None"] },
                    reasoning: { type: "string" },
                    score: { type: "number" },
                  },
                  required: ["assessment", "reasoning", "score"],
                },
                risks: { type: "array", items: { type: "string" } },
                catalysts: { type: "array", items: { type: "string" } },
                target_range: {
                  type: "object",
                  properties: {
                    low: { type: "number" },
                    mid: { type: "number" },
                    high: { type: "number" },
                  },
                  required: ["low", "mid", "high"],
                },
                sector_outlook: { type: "string" },
              },
              required: [
                "verdict",
                "confidence",
                "summary",
                "valuation",
                "profitability",
                "growth",
                "financial_health",
                "dividend",
                "risks",
                "catalysts",
                "target_range",
                "sector_outlook"
              ],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "fundamental_report" } },
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
      const text = await response.text();
      throw new Error(`AI gateway error: ${response.status} ${text}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const content = data.choices?.[0]?.message?.content || "";

    let parsed: any;
    if (toolCall?.function?.arguments) {
      parsed = JSON.parse(toolCall.function.arguments);
    } else {
      try {
        const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(jsonStr);
      } catch {
        parsed = { error: "Failed to parse AI response", raw: content };
      }
    }

    if (!parsed?.error && cmp > 0) {
      parsed.target_range = normalizeTargetRange(parsed.target_range, cmp, parsed.verdict, week52High, week52Low);
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
