import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YF_BASE = "https://query1.finance.yahoo.com";
const YF_BASE2 = "https://query2.finance.yahoo.com";

async function fetchSafe(url: string): Promise<Response | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "application/json" },
    });
    if (resp.ok) return resp;
    // Try alternate endpoint
    if (resp.status === 403 || resp.status === 429) {
      const alt = url.replace(YF_BASE, YF_BASE2);
      if (alt !== url) {
        const r2 = await fetch(alt, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
        if (r2.ok) return r2;
      }
    }
  } catch {}
  return null;
}

function round(v: number | null | undefined) { return v != null ? Math.round(v * 100) / 100 : null; }

// Recently listed IPOs on NSE (2024-2025) - comprehensive list
const RECENT_IPO_SYMBOLS = [
  // 2025 listings
  { yahoo: "HEXAWARE.NS", name: "Hexaware Technologies", sector: "IT Services", issueSize: 8750, priceBand: "₹674-₹708", lotSize: 21 },
  { yahoo: "DFRSHFOODS.NS", name: "Dr. Agarwal's Health Care", sector: "Healthcare", issueSize: 3027, priceBand: "₹382-₹402", lotSize: 37 },
  { yahoo: "STALLIONFLR.NS", name: "Stallion India Fluorochemicals", sector: "Chemicals", issueSize: 160, priceBand: "₹85-₹90", lotSize: 165 },
  { yahoo: "CAPITALINFT.NS", name: "Capital Infra Trust InvIT", sector: "Infrastructure", issueSize: 2800, priceBand: "₹99-₹100", lotSize: 150 },
  { yahoo: "NTPCGREEN.NS", name: "NTPC Green Energy", sector: "Renewable Energy", issueSize: 10000, priceBand: "₹102-₹108", lotSize: 138 },
  { yahoo: "BAJAJHFL.NS", name: "Bajaj Housing Finance", sector: "Financial Services", issueSize: 6560, priceBand: "₹66-₹70", lotSize: 214 },
  // 2024 major listings
  { yahoo: "AFCONS.NS", name: "Afcons Infrastructure", sector: "Infrastructure", issueSize: 5430, priceBand: "₹440-₹463", lotSize: 32 },
  { yahoo: "SWIGGY.NS", name: "Swiggy", sector: "Consumer Services", issueSize: 11327, priceBand: "₹371-₹390", lotSize: 38 },
  { yahoo: "ACME.NS", name: "Acme Solar Holdings", sector: "Renewable Energy", issueSize: 2900, priceBand: "₹275-₹289", lotSize: 51 },
  { yahoo: "SAGILITY.NS", name: "Sagility India", sector: "Healthcare IT", issueSize: 2106, priceBand: "₹28-₹30", lotSize: 500 },
  { yahoo: "HYUNDAI.NS", name: "Hyundai Motor India", sector: "Automobile", issueSize: 27870, priceBand: "₹1865-₹1960", lotSize: 7 },
  { yahoo: "OLAELEC.NS", name: "Ola Electric Mobility", sector: "EV / Automobile", issueSize: 6145, priceBand: "₹72-₹76", lotSize: 195 },
  { yahoo: "FIRSTCRY.NS", name: "FirstCry (Brainbees)", sector: "E-Commerce", issueSize: 4193, priceBand: "₹440-₹465", lotSize: 32 },
  { yahoo: "UNICOMMERCE.NS", name: "Unicommerce eSolutions", sector: "IT Services", issueSize: 276, priceBand: "₹102-₹108", lotSize: 138 },
  { yahoo: "IKIOFED.NS", name: "Ikio Lighting", sector: "Electronics", issueSize: 607, priceBand: "₹548-₹572", lotSize: 26 },
  // More 2024
  { yahoo: "TBOTEK.NS", name: "TBO Tek", sector: "IT Services", issueSize: 1550, priceBand: "₹875-₹920", lotSize: 16 },
  { yahoo: "AADHARHOU.NS", name: "Aadhar Housing Finance", sector: "Financial Services", issueSize: 3000, priceBand: "₹300-₹315", lotSize: 47 },
  { yahoo: "GODIGIT.NS", name: "Go Digit General Insurance", sector: "Insurance", issueSize: 2614, priceBand: "₹258-₹272", lotSize: 55 },
  { yahoo: "INDGN.NS", name: "Indegene", sector: "Healthcare IT", issueSize: 1842, priceBand: "₹430-₹452", lotSize: 33 },
  { yahoo: "AWFIS.NS", name: "Awfis Space Solutions", sector: "Real Estate", issueSize: 599, priceBand: "₹364-₹383", lotSize: 39 },
];

async function fetchLiveListedIPOs() {
  const listed: any[] = [];

  // Fetch via v8 chart API (more reliable than v6)
  const results = await Promise.allSettled(
    RECENT_IPO_SYMBOLS.map(async (ipo) => {
      const resp = await fetchSafe(`${YF_BASE}/v8/finance/chart/${encodeURIComponent(ipo.yahoo)}?interval=1d&range=5d&includePrePost=false`);
      if (!resp) return null;
      const data = await resp.json();
      const result = data?.chart?.result?.[0];
      if (!result?.meta?.regularMarketPrice) return null;

      const meta = result.meta;
      const prev = meta.chartPreviousClose || meta.previousClose || 0;
      const ltp = meta.regularMarketPrice;
      const changePct = prev > 0 ? ((ltp - prev) / prev) * 100 : 0;

      return {
        company: ipo.name,
        symbol: ipo.yahoo.replace(".NS", "").replace(".BO", ""),
        cmp: round(ltp),
        change_pct: round(changePct),
        market_cap: meta.marketCap || 0,
        status: "listed",
        sector: ipo.sector,
        exchange: meta.exchangeName || "NSE",
        volume: meta.regularMarketVolume || 0,
        week_52_high: meta.fiftyTwoWeekHigh || null,
        week_52_low: meta.fiftyTwoWeekLow || null,
        price_band: ipo.priceBand,
        lot_size: ipo.lotSize,
        issue_size_cr: ipo.issueSize,
      };
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      listed.push(r.value);
    }
  }

  // Sort by market cap descending
  listed.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
  return listed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const listed = await fetchLiveListedIPOs();

    const result = {
      ongoing: [],
      upcoming: [],
      listed,
      source: listed.length > 0 ? "live" : "unavailable",
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
