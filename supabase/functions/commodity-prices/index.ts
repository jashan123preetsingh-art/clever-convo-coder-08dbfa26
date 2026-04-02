const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

// Commodity configurations
const COMMODITIES: Record<string, {
  name: string; symbol: string; yahooSymbol: string | null; category: string;
  categoryLabel: string; intlUnit: string; indiaUnit: string;
  conversionDivisor: number; dutyRate: number; dutyLabel: string;
  showPurity: boolean; show10g: boolean; showKg?: boolean;
  conversionMode?: string; lmeOnly?: boolean;
  purityLabels?: { label: string; ratio: number }[];
  miniContracts?: { name: string; lot: string; multiplier: number }[];
}> = {
  gold: {
    name: "Gold", symbol: "XAU/USD", yahooSymbol: "GC=F",
    category: "precious", categoryLabel: "Precious Metal",
    intlUnit: "Troy Oz", indiaUnit: "g", conversionDivisor: 31.1035,
    dutyRate: 0.06, dutyLabel: "BCD 5% + AIDC 1% = 6%",
    showPurity: true, show10g: true, showKg: true,
    miniContracts: [
      { name: "10g · 24K", lot: "10g", multiplier: 10 },
      { name: "10g · 22K", lot: "10g", multiplier: 10 },
    ],
  },
  silver: {
    name: "Silver", symbol: "XAG/USD", yahooSymbol: "SI=F",
    category: "precious", categoryLabel: "Precious Metal",
    intlUnit: "Troy Oz", indiaUnit: "g", conversionDivisor: 31.1035,
    dutyRate: 0.06, dutyLabel: "BCD 5% + AIDC 1% = 6%",
    showPurity: true, show10g: true, showKg: true,
    purityLabels: [
      { label: "999 Fine", ratio: 1.0 },
      { label: "925 Sterling", ratio: 0.925 },
      { label: "900 Coin", ratio: 0.90 },
    ],
  },
  crudeoil: {
    name: "Crude Oil (WTI)", symbol: "WTI", yahooSymbol: "CL=F",
    category: "energy", categoryLabel: "Energy",
    intlUnit: "Barrel", indiaUnit: "barrel", conversionDivisor: 1,
    dutyRate: 0.05, dutyLabel: "Effective duty ~5%",
    showPurity: false, show10g: false,
  },
  brentcrude: {
    name: "Brent Crude", symbol: "BRENT", yahooSymbol: "BZ=F",
    category: "energy", categoryLabel: "Energy",
    intlUnit: "Barrel", indiaUnit: "barrel", conversionDivisor: 1,
    dutyRate: 0.05, dutyLabel: "Effective duty ~5%",
    showPurity: false, show10g: false,
  },
  naturalgas: {
    name: "Natural Gas", symbol: "NG", yahooSymbol: "NG=F",
    category: "energy", categoryLabel: "Energy",
    intlUnit: "MMBtu", indiaUnit: "MMBtu", conversionDivisor: 1,
    dutyRate: 0.025, dutyLabel: "BCD 2.5%",
    showPurity: false, show10g: false,
  },
  platinum: {
    name: "Platinum", symbol: "XPT/USD", yahooSymbol: "PL=F",
    category: "precious", categoryLabel: "Precious Metal",
    intlUnit: "Troy Oz", indiaUnit: "g", conversionDivisor: 31.1035,
    dutyRate: 0.1539, dutyLabel: "BCD 12.5% + SWS",
    showPurity: false, show10g: true,
  },
  copper: {
    name: "Copper", symbol: "HG", yahooSymbol: "HG=F",
    category: "industrial", categoryLabel: "Industrial Metal",
    intlUnit: "Pound", indiaUnit: "kg", conversionDivisor: 0.453592,
    conversionMode: "lbToKg", dutyRate: 0.025, dutyLabel: "BCD 2.5%",
    showPurity: false, show10g: false,
  },
  aluminium: {
    name: "Aluminium", symbol: "ALI", yahooSymbol: "ALI=F",
    category: "industrial", categoryLabel: "Industrial Metal",
    intlUnit: "Metric Ton", indiaUnit: "kg", conversionDivisor: 1000,
    dutyRate: 0.075, dutyLabel: "BCD 7.5%",
    showPurity: false, show10g: false,
  },
};

async function fetchYahoo(symbol: string) {
  try {
    const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const change = prevClose ? price - prevClose : 0;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;
    return { price, change, changePct };
  } catch {
    return null;
  }
}

async function fetchUsdInr() {
  // Try exchange rate API
  try {
    const resp = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(6000),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data?.rates?.INR) return { rate: data.rates.INR, source: "ExchangeRate API" };
    }
  } catch {}
  // Fallback: Yahoo
  const yahoo = await fetchYahoo("USDINR=X");
  if (yahoo) return { rate: yahoo.price, source: "Yahoo Finance" };
  return { rate: 85.5, source: "fallback" }; // safe fallback
}

function calcLanded(price: number, usdInr: number, config: typeof COMMODITIES[string]) {
  let perUnit: number;
  if (config.conversionMode === "lbToKg") {
    perUnit = (price / config.conversionDivisor) * usdInr * (1 + config.dutyRate);
  } else {
    perUnit = (price / config.conversionDivisor) * usdInr * (1 + config.dutyRate);
  }
  return perUnit;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Fetch USD/INR + all Yahoo quotes concurrently
    const keys = Object.keys(COMMODITIES);
    const [usdInrResult, ...quoteResults] = await Promise.allSettled([
      fetchUsdInr(),
      ...keys.map((k) => {
        const c = COMMODITIES[k];
        return c.yahooSymbol ? fetchYahoo(c.yahooSymbol) : Promise.resolve(null);
      }),
    ]);

    const usdInr = usdInrResult.status === "fulfilled" && usdInrResult.value
      ? usdInrResult.value
      : { rate: 85.5, source: "fallback" };

    const commodities: Record<string, any> = {};
    keys.forEach((key, i) => {
      const config = COMMODITIES[key];
      const quoteResult = quoteResults[i];
      const quote = quoteResult.status === "fulfilled" ? quoteResult.value : null;

      if (!quote) {
        commodities[key] = { ...config, error: "Price unavailable" };
        return;
      }

      const landedPerUnit = calcLanded(quote.price, usdInr.rate, config);

      const result: any = {
        key,
        name: config.name,
        symbol: config.symbol,
        category: config.category,
        categoryLabel: config.categoryLabel,
        intlUnit: config.intlUnit,
        indiaUnit: config.indiaUnit,
        dutyLabel: config.dutyLabel,
        dutyRate: config.dutyRate,
        price: quote.price,
        change: +quote.change.toFixed(2),
        changePct: +quote.changePct.toFixed(2),
        landedPerUnit: +landedPerUnit.toFixed(2),
      };

      // Gold purity variants
      if (key === "gold" && config.showPurity) {
        result.purity = {
          "24K": +landedPerUnit.toFixed(2),
          "22K": +(landedPerUnit * 22 / 24).toFixed(2),
          "18K": +(landedPerUnit * 18 / 24).toFixed(2),
        };
        result.tenGram = {
          "24K": +(landedPerUnit * 10).toFixed(0),
          "22K": +(landedPerUnit * 22 / 24 * 10).toFixed(0),
        };
        result.perKg = {
          "24K": +(landedPerUnit * 1000).toFixed(0),
          "22K": +(landedPerUnit * 22 / 24 * 1000).toFixed(0),
        };
      }

      // Silver purity
      if (key === "silver" && config.showPurity) {
        const purities = config.purityLabels || [];
        result.purity = {};
        purities.forEach((p) => {
          result.purity[p.label] = +(landedPerUnit * p.ratio).toFixed(2);
        });
        result.perKg = {};
        purities.forEach((p) => {
          result.perKg[`Per kg · ${p.label}`] = +(landedPerUnit * p.ratio * 1000).toFixed(0);
        });
      }

      // 10g for platinum
      if (key === "platinum" && config.show10g) {
        result.tenGram = { perGram: +landedPerUnit.toFixed(2), per10g: +(landedPerUnit * 10).toFixed(0) };
      }

      commodities[key] = result;
    });

    const response = {
      usdInr: { rate: +usdInr.rate.toFixed(2), source: usdInr.source },
      commodities,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
