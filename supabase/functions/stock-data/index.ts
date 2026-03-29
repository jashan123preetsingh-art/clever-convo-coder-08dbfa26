import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YF_BASE = "https://query1.finance.yahoo.com";
const YF_BASE2 = "https://query2.finance.yahoo.com";

const INDEX_MAP: Record<string, string> = {
  "NIFTY": "^NSEI", "NIFTY 50": "^NSEI", "NIFTY50": "^NSEI",
  "BANKNIFTY": "^NSEBANK", "BANK NIFTY": "^NSEBANK",
  "SENSEX": "^BSESN",
  "NIFTYIT": "^CNXIT", "NIFTY IT": "^CNXIT",
  "NIFTYNEXT50": "^NSMIDCP",
};

function toYahooSymbol(symbol: string): string {
  const upper = symbol.toUpperCase().trim();
  if (INDEX_MAP[upper]) return INDEX_MAP[upper];
  if (symbol.startsWith("^") || symbol.includes(".")) return symbol;
  if (/^[0-9A-Z]{10,}$/.test(upper) && !upper.match(/[A-Z]{3,}/)) return "";
  return `${upper}.NS`;
}

async function fetchSafe(url: string, retries = 1): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (resp.ok) return resp;
      if (i === 0 && (resp.status === 403 || resp.status === 429)) {
        const altUrl = url.replace(YF_BASE, YF_BASE2);
        if (altUrl !== url) {
          const altResp = await fetch(altUrl, {
            headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
          });
          if (altResp.ok) return altResp;
        }
      }
    } catch {
      if (i === retries) return null;
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

async function getQuote(symbol: string) {
  const yfSymbol = toYahooSymbol(symbol);
  if (!yfSymbol) return null;

  const resp = await fetchSafe(`${YF_BASE}/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1d&range=5d&includePrePost=false`);
  if (!resp) return null;

  const data = await resp.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];
  const ts = result.timestamp || [];
  const last = ts.length - 1;
  const prev = meta.chartPreviousClose || meta.previousClose || 0;

  return {
    symbol, name: meta.longName || meta.shortName || symbol,
    ltp: meta.regularMarketPrice,
    prev_close: prev,
    open: quote?.open?.[last], high: quote?.high?.[last],
    low: quote?.low?.[last], close: quote?.close?.[last],
    volume: quote?.volume?.[last],
    change: round(meta.regularMarketPrice - prev),
    change_pct: round(prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0),
    week_52_high: meta.fiftyTwoWeekHigh, week_52_low: meta.fiftyTwoWeekLow,
    exchange: meta.exchangeName || "NSE", currency: meta.currency,
    market_cap: meta.marketCap, timezone: meta.exchangeTimezoneName,
  };
}

async function getChart(symbol: string, interval = "1d", range = "1y") {
  const yfSymbol = toYahooSymbol(symbol);
  if (!yfSymbol) return [];

  const resp = await fetchSafe(`${YF_BASE}/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=${interval}&range=${range}&includePrePost=false`);
  if (!resp) return [];

  const data = await resp.json();
  const result = data?.chart?.result?.[0];
  if (!result) return [];

  const timestamps = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const candles = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (q.open?.[i] == null) continue;
    candles.push({
      time: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
      open: round(q.open[i]), high: round(q.high[i]),
      low: round(q.low[i]), close: round(q.close[i]),
      volume: q.volume?.[i] || 0,
    });
  }
  return candles;
}

// Fundamentals - use v6 quote endpoint (most reliable for Indian stocks)
async function getFundamentals(symbol: string) {
  const yfSymbol = toYahooSymbol(symbol);
  if (!yfSymbol) return null;

  // Try v6 quote endpoint first - most reliable
  const resp = await fetchSafe(
    `${YF_BASE}/v6/finance/quote?symbols=${encodeURIComponent(yfSymbol)}`,
    1
  );

  if (resp) {
    try {
      const data = await resp.json();
      const q = data?.quoteResponse?.result?.[0];
      if (q) {
        return {
          pe_ratio: q.trailingPE || null,
          forward_pe: q.forwardPE || null,
          pb_ratio: q.priceToBook || null,
          dividend_yield: q.trailingAnnualDividendYield ? q.trailingAnnualDividendYield * 100 : null,
          dividend_rate: q.trailingAnnualDividendRate || null,
          market_cap: q.marketCap || null,
          enterprise_value: q.enterpriseValue || null,
          profit_margins: q.profitMargins ? q.profitMargins * 100 : null,
          roe: q.returnOnEquity ? q.returnOnEquity * 100 : null,
          roa: null,
          revenue_growth: q.revenueGrowth ? q.revenueGrowth * 100 : null,
          earnings_growth: q.earningsQuarterlyGrowth ? q.earningsQuarterlyGrowth * 100 : null,
          debt_to_equity: null,
          current_ratio: null,
          quick_ratio: null,
          operating_margins: null,
          gross_margins: null,
          ebitda: q.ebitda || null,
          total_revenue: q.totalRevenue || null,
          free_cashflow: null,
          operating_cashflow: null,
          eps_trailing: q.trailingEps || null,
          eps_forward: q.epsForward || null,
          beta: q.beta || null,
          book_value: q.bookValue || null,
          shares_outstanding: q.sharesOutstanding || null,
          peg_ratio: q.pegRatio || null,
          target_mean_price: q.targetMeanPrice || null,
          target_high_price: q.targetHighPrice || null,
          target_low_price: q.targetLowPrice || null,
          recommendation: q.recommendationKey || null,
          num_analysts: q.numberOfAnalystOpinions || null,
          week_52_high: q.fiftyTwoWeekHigh || null,
          week_52_low: q.fiftyTwoWeekLow || null,
          fifty_day_avg: q.fiftyDayAverage || null,
          two_hundred_day_avg: q.twoHundredDayAverage || null,
          avg_volume: q.averageDailyVolume3Month || null,
          avg_volume_10d: q.averageDailyVolume10Day || null,
        };
      }
    } catch {}
  }

  // Fallback: v10 quoteSummary
  const resp2 = await fetchSafe(
    `${YF_BASE}/v10/finance/quoteSummary/${encodeURIComponent(yfSymbol)}?modules=summaryDetail,defaultKeyStatistics,financialData`,
    0
  );
  if (!resp2) return null;
  try {
    const data = await resp2.json();
    const r = data?.quoteSummary?.result?.[0];
    if (!r) return null;
    return extractFundamentals(r.summaryDetail, r.defaultKeyStatistics, r.financialData);
  } catch { return null; }
}

function getRaw(obj: any): number | null {
  if (obj == null) return null;
  if (typeof obj === "number") return obj;
  return obj?.raw ?? obj?.fmt ? parseFloat(obj.fmt.replace(/,/g, "")) : null;
}

function extractFundamentals(summary: any = {}, keyStats: any = {}, financial: any = {}) {
  return {
    pe_ratio: getRaw(summary.trailingPE), forward_pe: getRaw(summary.forwardPE),
    pb_ratio: getRaw(summary.priceToBook),
    dividend_yield: getRaw(summary.dividendYield) ? getRaw(summary.dividendYield)! * 100 : null,
    dividend_rate: getRaw(summary.dividendRate),
    market_cap: getRaw(summary.marketCap), enterprise_value: getRaw(keyStats.enterpriseValue),
    profit_margins: getRaw(financial.profitMargins) ? getRaw(financial.profitMargins)! * 100 : null,
    roe: getRaw(financial.returnOnEquity) ? getRaw(financial.returnOnEquity)! * 100 : null,
    roa: getRaw(financial.returnOnAssets) ? getRaw(financial.returnOnAssets)! * 100 : null,
    revenue_growth: getRaw(financial.revenueGrowth) ? getRaw(financial.revenueGrowth)! * 100 : null,
    earnings_growth: getRaw(financial.earningsGrowth) ? getRaw(financial.earningsGrowth)! * 100 : null,
    debt_to_equity: getRaw(financial.debtToEquity) ? getRaw(financial.debtToEquity)! / 100 : null,
    current_ratio: getRaw(financial.currentRatio), quick_ratio: getRaw(financial.quickRatio),
    operating_margins: getRaw(financial.operatingMargins) ? getRaw(financial.operatingMargins)! * 100 : null,
    gross_margins: getRaw(financial.grossMargins) ? getRaw(financial.grossMargins)! * 100 : null,
    ebitda: getRaw(financial.ebitda), total_revenue: getRaw(financial.totalRevenue),
    free_cashflow: getRaw(financial.freeCashflow), operating_cashflow: getRaw(financial.operatingCashflow),
    eps_trailing: getRaw(keyStats.trailingEps), eps_forward: getRaw(keyStats.forwardEps),
    beta: getRaw(keyStats.beta), book_value: getRaw(keyStats.bookValue),
    shares_outstanding: getRaw(keyStats.sharesOutstanding), peg_ratio: getRaw(keyStats.pegRatio),
    target_mean_price: getRaw(financial.targetMeanPrice),
    target_high_price: getRaw(financial.targetHighPrice),
    target_low_price: getRaw(financial.targetLowPrice),
    recommendation: financial.recommendationKey || null,
    num_analysts: getRaw(financial.numberOfAnalystOpinions),
    week_52_high: getRaw(summary.fiftyTwoWeekHigh), week_52_low: getRaw(summary.fiftyTwoWeekLow),
    fifty_day_avg: getRaw(summary.fiftyDayAverage),
    two_hundred_day_avg: getRaw(summary.twoHundredDayAverage),
    avg_volume: getRaw(summary.averageVolume), avg_volume_10d: getRaw(summary.averageDailyVolume10Day),
  };
}

function calculateTechnicals(candles: any[]) {
  if (!candles || candles.length < 20) return null;

  const closes = candles.map(c => c.close);
  const last = closes[closes.length - 1];

  const sma = (arr: number[], p: number) => {
    if (arr.length < p) return null;
    return arr.slice(-p).reduce((a, b) => a + b, 0) / p;
  };

  const ema = (arr: number[], p: number) => {
    if (arr.length < p) return null;
    const k = 2 / (p + 1);
    let e = arr.slice(0, p).reduce((a, b) => a + b, 0) / p;
    for (let i = p; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
    return e;
  };

  const calcRSI = (arr: number[], p = 14) => {
    if (arr.length < p + 1) return null;
    let gains = 0, losses = 0;
    for (let i = arr.length - p; i < arr.length; i++) {
      const d = arr[i] - arr[i - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    if (losses === 0) return 100;
    return 100 - (100 / (1 + (gains / p) / (losses / p)));
  };

  const ema12 = ema(closes, 12), ema26 = ema(closes, 26);
  const macd = ema12 && ema26 ? ema12 - ema26 : null;

  const lastC = candles[candles.length - 1];
  const pivot = (lastC.high + lastC.low + lastC.close) / 3;
  const s1 = 2 * pivot - lastC.high, r1 = 2 * pivot - lastC.low;
  const s2 = pivot - (lastC.high - lastC.low), r2 = pivot + (lastC.high - lastC.low);
  const s3 = lastC.low - 2 * (lastC.high - pivot), r3 = lastC.high + 2 * (pivot - lastC.low);

  const sma20 = sma(closes, 20);
  let bbStd = 0;
  if (sma20) { const s = closes.slice(-20); bbStd = Math.sqrt(s.reduce((sum, v) => sum + (v - sma20) ** 2, 0) / 20); }

  const calcATR = (p = 14) => {
    if (candles.length < p + 1) return null;
    let atr = 0;
    for (let i = candles.length - p; i < candles.length; i++) {
      atr += Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - closes[i - 1]), Math.abs(candles[i].low - closes[i - 1]));
    }
    return atr / p;
  };

  const avgVol20 = sma(candles.map(c => c.volume), 20);
  const volRatio = avgVol20 ? candles[candles.length - 1].volume / avgVol20 : 1;

  const detectPattern = () => {
    const c = candles[candles.length - 1];
    const body = Math.abs(c.close - c.open), range = c.high - c.low;
    const upperW = c.high - Math.max(c.open, c.close), lowerW = Math.min(c.open, c.close) - c.low;
    const bull = c.close > c.open;
    const patterns: string[] = [];
    if (body < range * 0.1) patterns.push("Doji");
    if (lowerW > body * 2 && upperW < body * 0.5 && body > 0) patterns.push(bull ? "Hammer" : "Hanging Man");
    if (upperW > body * 2 && lowerW < body * 0.5 && body > 0) patterns.push(bull ? "Inverted Hammer" : "Shooting Star");
    if (body > range * 0.8) patterns.push(bull ? "Bullish Marubozu" : "Bearish Marubozu");
    if (candles.length >= 2) {
      const prev = candles[candles.length - 2];
      if (bull && prev.close < prev.open && c.open < prev.close && c.close > prev.open) patterns.push("Bullish Engulfing");
      if (!bull && prev.close > prev.open && c.open > prev.close && c.close < prev.open) patterns.push("Bearish Engulfing");
    }
    return patterns;
  };

  const rsi = calcRSI(closes);
  const sma50 = sma(closes, 50), sma200 = sma(closes, 200);

  let bullish = 0, bearish = 0;
  if (sma20 && last > sma20) bullish++; else bearish++;
  if (sma50 && last > sma50) bullish++; else bearish++;
  if (sma200 && last > sma200) bullish++; else bearish++;
  if (sma20 && sma50 && sma20 > sma50) bullish++; else bearish++;
  const trend = bullish >= 3 ? "Bullish" : bearish >= 3 ? "Bearish" : "Sideways";

  return {
    sma_20: round(sma20), sma_50: round(sma50), sma_200: round(sma200),
    ema_9: round(ema(closes, 9)), ema_20: round(ema(closes, 20)),
    ema_50: round(ema(closes, 50)), ema_200: round(ema(closes, 200)),
    rsi_14: round(rsi), macd: round(macd), atr_14: round(calcATR()),
    pivot: round(pivot), s1: round(s1), s2: round(s2), s3: round(s3),
    r1: round(r1), r2: round(r2), r3: round(r3),
    bollinger_upper: round(sma20 ? sma20 + 2 * bbStd : null),
    bollinger_middle: round(sma20),
    bollinger_lower: round(sma20 ? sma20 - 2 * bbStd : null),
    volume_ratio: round(volRatio), avg_volume_20: Math.round(avgVol20 || 0),
    candle_patterns: detectPattern(), trend,
    trend_strength: rsi ? (rsi > 70 ? "Strong" : rsi > 50 ? "Moderate" : rsi > 30 ? "Weak" : "Oversold") : "N/A",
  };
}

function round(v: number | null | undefined) { return v != null ? Math.round(v * 100) / 100 : null; }

async function getBatchQuotes(symbols: string[]) {
  const results = await Promise.allSettled(symbols.slice(0, 20).map(s => getQuote(s)));
  return results.map((r, i) => ({
    symbol: symbols[i],
    data: r.status === "fulfilled" ? r.value : null,
    error: r.status === "rejected" ? r.reason?.message : null,
  }));
}

async function searchStocks(query: string) {
  // Try Yahoo Finance search with broader filtering
  const resp = await fetchSafe(`${YF_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=25&newsCount=0&listsCount=0`);
  if (!resp) return [];
  const data = await resp.json();
  const results = (data.quotes || [])
    .filter((q: any) => {
      // Accept Indian exchanges + any .NS or .BO symbols
      const isIndian = ["NSI", "BSE", "NSE", "BOM"].includes(q.exchange) ||
        q.symbol?.endsWith(".NS") || q.symbol?.endsWith(".BO");
      return isIndian;
    })
    .map((q: any) => ({
      symbol: q.symbol?.replace(".NS", "").replace(".BO", ""),
      name: q.longname || q.shortname || q.symbol,
      exchange: q.exchange === "BSE" || q.exchange === "BOM" ? "BSE" : "NSE",
      type: q.quoteType,
    }));
  
  return results;
}

async function getIndices() {
  const indices = ["^NSEI", "^BSESN", "^NSEBANK"];
  const names = ["NIFTY 50", "SENSEX", "BANKNIFTY"];
  const results = await Promise.allSettled(
    indices.map(idx => fetchSafe(`${YF_BASE}/v8/finance/chart/${idx}?interval=1d&range=5d`).then(r => r?.json()))
  );
  return results.map((r, i) => {
    if (r.status !== "fulfilled" || !r.value) return { symbol: names[i], error: true };
    const meta = r.value?.chart?.result?.[0]?.meta;
    if (!meta) return { symbol: names[i], error: true };
    const prev = meta.chartPreviousClose || meta.previousClose || 0;
    return {
      symbol: names[i], ltp: round(meta.regularMarketPrice),
      open: round(meta.regularMarketOpen || meta.regularMarketPrice),
      high: round(meta.regularMarketDayHigh || meta.regularMarketPrice),
      low: round(meta.regularMarketDayLow || meta.regularMarketPrice),
      prev_close: round(prev),
      change: round(meta.regularMarketPrice - prev),
      change_pct: round(prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0),
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "quote";
    const symbol = url.searchParams.get("symbol") || "";
    const symbols = url.searchParams.get("symbols")?.split(",") || [];
    const interval = url.searchParams.get("interval") || "1d";
    const range = url.searchParams.get("range") || "1y";
    const query = url.searchParams.get("q") || "";

    let result: any;

    switch (action) {
      case "quote": result = await getQuote(symbol); break;
      case "chart": result = await getChart(symbol, interval, range); break;
      case "fundamentals": result = await getFundamentals(symbol); break;
      case "technicals": {
        const cd = await getChart(symbol, "1d", "1y");
        result = calculateTechnicals(cd);
        break;
      }
      case "full": {
        const [quoteData, chartData, fundData] = await Promise.all([
          getQuote(symbol).catch(() => null),
          getChart(symbol, "1d", "1y").catch(() => []),
          getFundamentals(symbol).catch(() => null),
        ]);
        const technicals = Array.isArray(chartData) && chartData.length > 0 ? calculateTechnicals(chartData) : null;
        result = {
          quote: quoteData, fundamentals: fundData, technicals,
          chart_summary: { total_candles: Array.isArray(chartData) ? chartData.length : 0 },
        };
        break;
      }
      case "batch": result = await getBatchQuotes(symbols); break;
      case "search": result = await searchStocks(query); break;
      case "indices": result = await getIndices(); break;
      default: result = { error: "Unknown action" };
    }

    return new Response(JSON.stringify(result || {}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stock-data error:", e);
    return new Response(
      JSON.stringify({ error: "Service temporarily unavailable", details: e instanceof Error ? e.message : "Unknown" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
