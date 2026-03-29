import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fetch FII/DII data from NSE
async function fetchNSEData(endpoint: string) {
  // NSE requires cookies, so we first hit the homepage
  const session = await fetch("https://www.nseindia.com", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const cookies = session.headers.get("set-cookie") || "";

  const resp = await fetch(`https://www.nseindia.com/api/${endpoint}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Referer": "https://www.nseindia.com/",
      "Cookie": cookies,
    },
  });

  if (!resp.ok) throw new Error(`NSE API error: ${resp.status}`);
  return resp.json();
}

// Get FII/DII activity data
async function getFiiDiiData() {
  try {
    const data = await fetchNSEData("fiidiiTradeReact");
    return data;
  } catch (e) {
    console.error("NSE FII/DII fetch failed, using alternative:", e);
    // Fallback: try to get from moneycontrol or generate from recent patterns
    try {
      // Try NSDL data as alternative
      const resp = await fetch(
        "https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx",
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (resp.ok) {
        const text = await resp.text();
        // Parse basic data from response
        return { source: "NSDL", raw: text.substring(0, 500) };
      }
    } catch {}
    return null;
  }
}

// Get market breadth
async function getMarketBreadth() {
  try {
    const data = await fetchNSEData("equity-stockIndices?index=NIFTY%20500");
    if (!data?.data) return null;

    let advances = 0, declines = 0, unchanged = 0;
    const stocks = data.data.map((s: any) => {
      if (s.pChange > 0) advances++;
      else if (s.pChange < 0) declines++;
      else unchanged++;
      return {
        symbol: s.symbol,
        name: s.meta?.companyName || s.symbol,
        ltp: s.lastPrice,
        change_pct: s.pChange,
        volume: s.totalTradedVolume,
        open: s.open,
        high: s.dayHigh,
        low: s.dayLow,
        prev_close: s.previousClose,
        sector: s.meta?.industry || "",
      };
    });

    return { advances, declines, unchanged, total: stocks.length, stocks };
  } catch (e) {
    console.error("Market breadth error:", e);
    return null;
  }
}

// Get NSE stock list (for getting 2000+ stocks)
async function getNSEStockList(index = "NIFTY%20500") {
  try {
    const data = await fetchNSEData(`equity-stockIndices?index=${index}`);
    if (!data?.data) return [];
    return data.data.map((s: any) => ({
      symbol: s.symbol,
      name: s.meta?.companyName || s.symbol,
      ltp: s.lastPrice,
      change: s.change,
      change_pct: s.pChange,
      open: s.open,
      high: s.dayHigh,
      low: s.dayLow,
      prev_close: s.previousClose,
      volume: s.totalTradedVolume,
      year_high: s.yearHigh,
      year_low: s.yearLow,
      sector: s.meta?.industry || "",
      exchange: "NSE",
    }));
  } catch (e) {
    console.error("NSE stock list error:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "fii-dii";
    const index = url.searchParams.get("index") || "NIFTY%20500";

    let result: any;

    switch (action) {
      case "fii-dii":
        result = await getFiiDiiData();
        break;
      case "breadth":
        result = await getMarketBreadth();
        break;
      case "stock-list":
        result = await getNSEStockList(index);
        break;
      default:
        result = { error: "Unknown action" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fii-dii error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
