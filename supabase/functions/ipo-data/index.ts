import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YF_BASE = "https://query1.finance.yahoo.com";

async function fetchSafe(url: string): Promise<Response | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "application/json" },
    });
    if (resp.ok) return resp;
  } catch {}
  return null;
}

// Real recently-listed IPO symbols to fetch live prices
const RECENT_IPO_SYMBOLS = [
  "HEXAWARE.NS", "DFRSHFOODS.NS", "STALLIONFLR.NS",
  "CAPITALINFT.NS", "NTPCGREEN.NS", "BAJAJHFL.NS",
  "AFCONS.NS", "SWIGGY.NS", "ACME.NS", "SAGILITY.NS",
];

// Current/upcoming IPO data - curated from public SEBI filings & news
function getCuratedIPOs() {
  return {
    ongoing: [] as any[],
    upcoming: [] as any[],
  };
}

async function fetchLiveListedIPOs() {
  const listed: any[] = [];
  const symStr = RECENT_IPO_SYMBOLS.join(",");

  try {
    const resp = await fetchSafe(`${YF_BASE}/v6/finance/quote?symbols=${encodeURIComponent(symStr)}`);
    if (resp) {
      const data = await resp.json();
      const quotes = data?.quoteResponse?.result || [];
      for (const q of quotes) {
        if (q?.regularMarketPrice) {
          listed.push({
            company: q.longName || q.shortName || q.symbol,
            symbol: (q.symbol || "").replace(".NS", "").replace(".BO", ""),
            cmp: q.regularMarketPrice,
            change_pct: q.regularMarketChangePercent || 0,
            market_cap: q.marketCap || 0,
            status: "listed",
            sector: q.industry || "General",
            exchange: q.exchange || "NSE",
            volume: q.regularMarketVolume || 0,
            week_52_high: q.fiftyTwoWeekHigh || null,
            week_52_low: q.fiftyTwoWeekLow || null,
          });
        }
      }
    }
  } catch (e) {
    console.warn("Yahoo IPO fetch failed:", e);
  }

  return listed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const curated = getCuratedIPOs();
    const listed = await fetchLiveListedIPOs();

    const result = {
      ongoing: curated.ongoing,
      upcoming: curated.upcoming,
      listed,
      source: listed.length > 0 ? "live" : "curated",
      updated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ipo-data error:", err);
    return new Response(JSON.stringify({ ongoing: [], upcoming: [], listed: [], error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
