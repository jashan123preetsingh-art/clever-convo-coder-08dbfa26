import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Yahoo Finance base
const YF_BASE = "https://query1.finance.yahoo.com";

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      });
      if (resp.ok) return resp;
    } catch (e) {
      if (i === retries) throw e;
    }
  }
  throw new Error("All retries failed");
}

// Get quote data from Yahoo Finance
async function getQuote(symbol: string) {
  const yfSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;
  const url = `${YF_BASE}/v8/finance/chart/${yfSymbol}?interval=1d&range=5d&includePrePost=false`;
  const resp = await fetchWithRetry(url);
  const data = await resp.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];
  const timestamps = result.timestamp || [];
  const lastIdx = timestamps.length - 1;

  return {
    symbol: symbol,
    name: meta.longName || meta.shortName || symbol,
    ltp: meta.regularMarketPrice,
    prev_close: meta.chartPreviousClose || meta.previousClose,
    open: quote?.open?.[lastIdx],
    high: quote?.high?.[lastIdx],
    low: quote?.low?.[lastIdx],
    close: quote?.close?.[lastIdx],
    volume: quote?.volume?.[lastIdx],
    change: meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose || 0),
    change_pct: ((meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose || 1)) / (meta.chartPreviousClose || meta.previousClose || 1)) * 100,
    week_52_high: meta.fiftyTwoWeekHigh,
    week_52_low: meta.fiftyTwoWeekLow,
    exchange: meta.exchangeName || "NSE",
    currency: meta.currency,
    market_cap: meta.marketCap,
    timezone: meta.exchangeTimezoneName,
  };
}

// Get historical chart data
async function getChart(symbol: string, interval = "1d", range = "1y") {
  const yfSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;
  const url = `${YF_BASE}/v8/finance/chart/${yfSymbol}?interval=${interval}&range=${range}&includePrePost=false`;
  const resp = await fetchWithRetry(url);
  const data = await resp.json();
  const result = data?.chart?.result?.[0];
  if (!result) return [];

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const candles = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (quote.open?.[i] == null) continue;
    candles.push({
      time: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
      open: Math.round((quote.open[i] || 0) * 100) / 100,
      high: Math.round((quote.high[i] || 0) * 100) / 100,
      low: Math.round((quote.low[i] || 0) * 100) / 100,
      close: Math.round((quote.close[i] || 0) * 100) / 100,
      volume: quote.volume?.[i] || 0,
    });
  }
  return candles;
}

// Get fundamental data from Yahoo Finance
async function getFundamentals(symbol: string) {
  const yfSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;
  const modules = "summaryDetail,defaultKeyStatistics,financialData,earningsHistory,earningsTrend,industryTrend,indexTrend,sectorTrend";
  const url = `${YF_BASE}/v10/finance/quoteSummary/${yfSymbol}?modules=${modules}`;

  try {
    const resp = await fetchWithRetry(url);
    const data = await resp.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const summary = result.summaryDetail || {};
    const keyStats = result.defaultKeyStatistics || {};
    const financial = result.financialData || {};

    return {
      pe_ratio: summary.trailingPE?.raw || null,
      forward_pe: summary.forwardPE?.raw || null,
      pb_ratio: summary.priceToBook?.raw || null,
      dividend_yield: summary.dividendYield?.raw ? summary.dividendYield.raw * 100 : null,
      dividend_rate: summary.dividendRate?.raw || null,
      market_cap: summary.marketCap?.raw || null,
      enterprise_value: keyStats.enterpriseValue?.raw || null,
      profit_margins: financial.profitMargins?.raw ? financial.profitMargins.raw * 100 : null,
      roe: financial.returnOnEquity?.raw ? financial.returnOnEquity.raw * 100 : null,
      roa: financial.returnOnAssets?.raw ? financial.returnOnAssets.raw * 100 : null,
      revenue_growth: financial.revenueGrowth?.raw ? financial.revenueGrowth.raw * 100 : null,
      earnings_growth: financial.earningsGrowth?.raw ? financial.earningsGrowth.raw * 100 : null,
      debt_to_equity: financial.debtToEquity?.raw ? financial.debtToEquity.raw / 100 : null,
      current_ratio: financial.currentRatio?.raw || null,
      quick_ratio: financial.quickRatio?.raw || null,
      operating_margins: financial.operatingMargins?.raw ? financial.operatingMargins.raw * 100 : null,
      gross_margins: financial.grossMargins?.raw ? financial.grossMargins.raw * 100 : null,
      ebitda: financial.ebitda?.raw || null,
      total_revenue: financial.totalRevenue?.raw || null,
      free_cashflow: financial.freeCashflow?.raw || null,
      operating_cashflow: financial.operatingCashflow?.raw || null,
      eps_trailing: keyStats.trailingEps?.raw || null,
      eps_forward: keyStats.forwardEps?.raw || null,
      beta: keyStats.beta?.raw || null,
      book_value: keyStats.bookValue?.raw || null,
      shares_outstanding: keyStats.sharesOutstanding?.raw || null,
      float_shares: keyStats.floatShares?.raw || null,
      peg_ratio: keyStats.pegRatio?.raw || null,
      short_ratio: keyStats.shortRatio?.raw || null,
      target_mean_price: financial.targetMeanPrice?.raw || null,
      target_high_price: financial.targetHighPrice?.raw || null,
      target_low_price: financial.targetLowPrice?.raw || null,
      recommendation: financial.recommendationKey || null,
      num_analysts: financial.numberOfAnalystOpinions?.raw || null,
      week_52_high: summary.fiftyTwoWeekHigh?.raw || null,
      week_52_low: summary.fiftyTwoWeekLow?.raw || null,
      fifty_day_avg: summary.fiftyDayAverage?.raw || null,
      two_hundred_day_avg: summary.twoHundredDayAverage?.raw || null,
      avg_volume: summary.averageVolume?.raw || null,
      avg_volume_10d: summary.averageDailyVolume10Day?.raw || null,
    };
  } catch (e) {
    console.error("Fundamentals error:", e);
    return null;
  }
}

// Calculate technical indicators from chart data
function calculateTechnicals(candles: any[]) {
  if (candles.length < 20) return null;

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const last = closes[closes.length - 1];

  // Simple Moving Averages
  const sma = (arr: number[], period: number) => {
    if (arr.length < period) return null;
    const slice = arr.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  };

  // EMA
  const ema = (arr: number[], period: number) => {
    if (arr.length < period) return null;
    const k = 2 / (period + 1);
    let e = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < arr.length; i++) {
      e = arr[i] * k + e * (1 - k);
    }
    return e;
  };

  // RSI
  const calcRSI = (arr: number[], period = 14) => {
    if (arr.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = arr.length - period; i < arr.length; i++) {
      const diff = arr[i] - arr[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    if (losses === 0) return 100;
    const rs = (gains / period) / (losses / period);
    return 100 - (100 / (1 + rs));
  };

  // MACD
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = ema12 && ema26 ? ema12 - ema26 : null;

  // ATR
  const calcATR = (period = 14) => {
    if (candles.length < period + 1) return null;
    let atr = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      atr += tr;
    }
    return atr / period;
  };

  // Pivot Points (Standard)
  const lastCandle = candles[candles.length - 1];
  const pivot = (lastCandle.high + lastCandle.low + lastCandle.close) / 3;
  const s1 = 2 * pivot - lastCandle.high;
  const r1 = 2 * pivot - lastCandle.low;
  const s2 = pivot - (lastCandle.high - lastCandle.low);
  const r2 = pivot + (lastCandle.high - lastCandle.low);
  const s3 = lastCandle.low - 2 * (lastCandle.high - pivot);
  const r3 = lastCandle.high + 2 * (pivot - lastCandle.low);

  // Bollinger Bands
  const sma20Val = sma(closes, 20);
  let bbStdDev = 0;
  if (sma20Val) {
    const slice = closes.slice(-20);
    bbStdDev = Math.sqrt(slice.reduce((sum, v) => sum + (v - sma20Val) ** 2, 0) / 20);
  }

  // ADX approximation
  const atr14 = calcATR(14);

  // Volume analysis
  const avgVol20 = sma(candles.map(c => c.volume), 20);
  const currentVol = candles[candles.length - 1].volume;
  const volumeRatio = avgVol20 ? currentVol / avgVol20 : 1;

  // Candlestick pattern detection
  const detectPattern = () => {
    const c = candles[candles.length - 1];
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const bullish = c.close > c.open;

    const patterns: string[] = [];

    // Doji
    if (body < range * 0.1) patterns.push("Doji");
    // Hammer
    if (lowerWick > body * 2 && upperWick < body * 0.5 && body > 0) patterns.push(bullish ? "Hammer" : "Hanging Man");
    // Shooting Star
    if (upperWick > body * 2 && lowerWick < body * 0.5 && body > 0) patterns.push(bullish ? "Inverted Hammer" : "Shooting Star");
    // Marubozu
    if (body > range * 0.8) patterns.push(bullish ? "Bullish Marubozu" : "Bearish Marubozu");
    // Spinning Top
    if (body < range * 0.3 && body > range * 0.1) patterns.push("Spinning Top");

    // Two-candle patterns
    if (candles.length >= 2) {
      const prev = candles[candles.length - 2];
      const prevBullish = prev.close > prev.open;
      // Engulfing
      if (bullish && !prevBullish && c.open < prev.close && c.close > prev.open) patterns.push("Bullish Engulfing");
      if (!bullish && prevBullish && c.open > prev.close && c.close < prev.open) patterns.push("Bearish Engulfing");
    }

    return patterns;
  };

  const rsi = calcRSI(closes);

  return {
    sma_5: round(sma(closes, 5)),
    sma_10: round(sma(closes, 10)),
    sma_20: round(sma20Val),
    sma_50: round(sma(closes, 50)),
    sma_100: round(sma(closes, 100)),
    sma_200: round(sma(closes, 200)),
    ema_9: round(ema(closes, 9)),
    ema_12: round(ema12),
    ema_20: round(ema(closes, 20)),
    ema_26: round(ema26),
    ema_50: round(ema(closes, 50)),
    ema_200: round(ema(closes, 200)),
    rsi_14: round(rsi),
    macd: round(macd),
    macd_signal: null, // simplified
    atr_14: round(atr14),
    pivot,
    s1: round(s1), s2: round(s2), s3: round(s3),
    r1: round(r1), r2: round(r2), r3: round(r3),
    bollinger_upper: round(sma20Val ? sma20Val + 2 * bbStdDev : null),
    bollinger_middle: round(sma20Val),
    bollinger_lower: round(sma20Val ? sma20Val - 2 * bbStdDev : null),
    volume_ratio: round(volumeRatio),
    avg_volume_20: Math.round(avgVol20 || 0),
    candle_patterns: detectPattern(),
    trend: determineTrend(closes, sma(closes, 20), sma(closes, 50), sma(closes, 200)),
    trend_strength: rsi ? (rsi > 70 ? "Strong" : rsi > 50 ? "Moderate" : rsi > 30 ? "Weak" : "Oversold") : "N/A",
  };
}

function determineTrend(closes: number[], sma20: number | null, sma50: number | null, sma200: number | null) {
  const last = closes[closes.length - 1];
  let bullish = 0, bearish = 0;
  if (sma20 && last > sma20) bullish++; else bearish++;
  if (sma50 && last > sma50) bullish++; else bearish++;
  if (sma200 && last > sma200) bullish++; else bearish++;
  if (sma20 && sma50 && sma20 > sma50) bullish++; else bearish++;
  if (bullish >= 3) return "Bullish";
  if (bearish >= 3) return "Bearish";
  return "Sideways";
}

function round(v: number | null | undefined) {
  return v != null ? Math.round(v * 100) / 100 : null;
}

// Batch quotes for multiple symbols
async function getBatchQuotes(symbols: string[]) {
  const results = await Promise.allSettled(
    symbols.map((s) => getQuote(s))
  );
  return results.map((r, i) => ({
    symbol: symbols[i],
    data: r.status === "fulfilled" ? r.value : null,
    error: r.status === "rejected" ? r.reason?.message : null,
  }));
}

// Search stocks
async function searchStocks(query: string) {
  const url = `${YF_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&listsCount=0&quotesQueryId=tss_match_phrase_query`;
  const resp = await fetchWithRetry(url);
  const data = await resp.json();
  return (data.quotes || [])
    .filter((q: any) => q.exchange === "NSI" || q.exchange === "BSE" || q.exchange === "NSE")
    .map((q: any) => ({
      symbol: q.symbol?.replace(".NS", "").replace(".BO", ""),
      name: q.longname || q.shortname || q.symbol,
      exchange: q.exchange === "BSE" ? "BSE" : "NSE",
      type: q.quoteType,
    }));
}

// Market indices
async function getIndices() {
  const indices = ["^NSEI", "^BSESN", "^NSEBANK"];
  const names = ["NIFTY 50", "SENSEX", "BANKNIFTY"];
  const results = await Promise.allSettled(
    indices.map((idx) =>
      fetchWithRetry(`${YF_BASE}/v8/finance/chart/${idx}?interval=1d&range=5d`)
        .then((r) => r.json())
    )
  );

  return results.map((r, i) => {
    if (r.status !== "fulfilled") return { symbol: names[i], error: true };
    const meta = r.value?.chart?.result?.[0]?.meta;
    if (!meta) return { symbol: names[i], error: true };
    const prev = meta.chartPreviousClose || meta.previousClose || 0;
    return {
      symbol: names[i],
      ltp: round(meta.regularMarketPrice),
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      case "quote":
        result = await getQuote(symbol);
        break;
      case "chart":
        result = await getChart(symbol, interval, range);
        break;
      case "fundamentals":
        result = await getFundamentals(symbol);
        break;
      case "technicals": {
        const chartData = await getChart(symbol, "1d", "1y");
        result = calculateTechnicals(chartData);
        break;
      }
      case "full": {
        const [quoteData, chartData, fundData] = await Promise.all([
          getQuote(symbol),
          getChart(symbol, "1d", "1y"),
          getFundamentals(symbol),
        ]);
        const technicals = calculateTechnicals(chartData);
        result = { quote: quoteData, fundamentals: fundData, technicals, chart_summary: { total_candles: chartData.length } };
        break;
      }
      case "batch":
        result = await getBatchQuotes(symbols);
        break;
      case "search":
        result = await searchStocks(query);
        break;
      case "indices":
        result = await getIndices();
        break;
      default:
        result = { error: "Unknown action" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stock-data error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
