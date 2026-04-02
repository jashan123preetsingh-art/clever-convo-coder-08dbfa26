import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YF_BASE = "https://query1.finance.yahoo.com";

interface MarketEvent {
  time: string;
  title: string;
  type: "circuit" | "block_deal" | "insider" | "sebi" | "alert";
  impact: "high" | "medium" | "low";
}

// Top NSE stocks to scan for events
const SCAN_SYMBOLS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR", "ITC", "SBIN",
  "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK", "WIPRO", "TATAMOTORS", "SUNPHARMA",
  "BAJFINANCE", "MARUTI", "TITAN", "HCLTECH", "ULTRACEMCO", "ONGC", "NTPC", "POWERGRID",
  "ADANIENT", "ADANIPORTS", "COALINDIA", "TATASTEEL", "JSWSTEEL", "HINDALCO",
  "DRREDDY", "CIPLA", "DIVISLAB", "APOLLOHOSP", "TECHM", "NESTLEIND",
  "BAJAJ-AUTO", "HEROMOTOCO", "EICHERMOT", "M&M", "TATAPOWER", "IRFC",
  "IDEA", "SUZLON", "YESBANK", "PNB", "BANKBARODA", "ZOMATO", "PAYTM",
  "ADANIPOWER", "NHPC", "IRCTC", "HAL", "BEL", "TRENT", "VEDL",
  "JINDALSTEL", "GAIL", "BPCL", "IOC", "SAIL", "NMDC", "RECLTD",
  "PFC", "BHEL", "NAUKRI", "DMART"
];

async function fetchStockQuotes(): Promise<any[]> {
  // Batch fetch using Yahoo v6 quote API
  const batchSize = 30;
  const allQuotes: any[] = [];

  for (let i = 0; i < SCAN_SYMBOLS.length; i += batchSize) {
    const batch = SCAN_SYMBOLS.slice(i, i + batchSize);
    const symbols = batch.map(s => `${s}.NS`).join(",");
    try {
      const resp = await fetch(
        `${YF_BASE}/v6/finance/quote?symbols=${encodeURIComponent(symbols)}`,
        { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
      );
      if (resp.ok) {
        const data = await resp.json();
        const quotes = data?.quoteResponse?.result || [];
        allQuotes.push(...quotes);
      }
    } catch (e) {
      console.error("Batch fetch error:", e);
    }
  }
  return allQuotes;
}

function generateEvents(quotes: any[]): MarketEvent[] {
  const events: MarketEvent[] = [];
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const timeStr = istNow.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

  for (const q of quotes) {
    if (!q || !q.regularMarketPrice) continue;

    const symbol = (q.symbol || "").replace(".NS", "").replace(".BO", "");
    const name = q.shortName || q.longName || symbol;
    const price = q.regularMarketPrice;
    const changePct = q.regularMarketChangePercent || 0;
    const volume = q.regularMarketVolume || 0;
    const avgVol = q.averageDailyVolume3Month || 1;
    const high52 = q.fiftyTwoWeekHigh || 0;
    const low52 = q.fiftyTwoWeekLow || 0;
    const dayHigh = q.regularMarketDayHigh || 0;
    const dayLow = q.regularMarketDayLow || 0;

    // Circuit breaker detection (5%, 10%, 20% limits in Indian markets)
    if (changePct >= 4.8) {
      events.push({
        time: timeStr,
        title: `${symbol} hit upper circuit at ₹${price.toFixed(2)} (+${changePct.toFixed(1)}%)`,
        type: "circuit",
        impact: changePct >= 10 ? "high" : "medium",
      });
    } else if (changePct <= -4.8) {
      events.push({
        time: timeStr,
        title: `${symbol} hit lower circuit at ₹${price.toFixed(2)} (${changePct.toFixed(1)}%)`,
        type: "circuit",
        impact: changePct <= -10 ? "high" : "medium",
      });
    }

    // 52-week high/low
    if (high52 > 0 && price >= high52 * 0.995) {
      events.push({
        time: timeStr,
        title: `${symbol} at 52-week high — ₹${price.toFixed(2)}`,
        type: "alert",
        impact: "high",
      });
    } else if (low52 > 0 && price <= low52 * 1.005) {
      events.push({
        time: timeStr,
        title: `${symbol} at 52-week low — ₹${price.toFixed(2)}`,
        type: "alert",
        impact: "high",
      });
    }

    // Volume spike (3x average)
    if (avgVol > 0 && volume > avgVol * 3) {
      const volMultiple = (volume / avgVol).toFixed(1);
      events.push({
        time: timeStr,
        title: `${symbol} volume spike — ${volMultiple}x avg at ₹${price.toFixed(2)}`,
        type: "alert",
        impact: "medium",
      });
    }

    // Big move (>3% change for large caps)
    if (Math.abs(changePct) >= 3 && Math.abs(changePct) < 4.8) {
      const direction = changePct > 0 ? "surges" : "drops";
      events.push({
        time: timeStr,
        title: `${name} ${direction} ${Math.abs(changePct).toFixed(1)}% to ₹${price.toFixed(2)}`,
        type: "alert",
        impact: "medium",
      });
    }
  }

  // Sort by impact (high first), then deduplicate per symbol (max 1 event per stock)
  events.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });

  // Deduplicate: keep highest-impact event per symbol
  const seen = new Set<string>();
  const deduped: MarketEvent[] = [];
  for (const ev of events) {
    const sym = ev.title.split(" ")[0];
    if (!seen.has(sym)) {
      seen.add(sym);
      deduped.push(ev);
    }
  }

  return deduped.slice(0, 15);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const quotes = await fetchStockQuotes();
    const events = generateEvents(quotes);

    return new Response(JSON.stringify({ events, count: events.length, source: "live" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("market-events error:", err);
    return new Response(JSON.stringify({ events: [], count: 0, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
