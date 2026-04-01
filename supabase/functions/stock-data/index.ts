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

  const resp = await fetchSafe(`${YF_BASE}/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1d&range=2d&includePrePost=false`);
  if (!resp) return null;

  const data = await resp.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];
  const closes = quote?.close || [];
  const ts = result.timestamp || [];
  const last = ts.length - 1;
  const prev = meta.chartPreviousClose || meta.previousClose || (closes.length >= 2 ? closes[closes.length - 2] : 0) || 0;
  const ltp = meta.regularMarketPrice || closes[last] || 0;

  if (!ltp || ltp <= 0) return null;

  return {
    symbol, name: meta.longName || meta.shortName || symbol,
    ltp: ltp,
    prev_close: round(prev),
    open: quote?.open?.[last] ?? ltp, high: quote?.high?.[last] ?? ltp,
    low: quote?.low?.[last] ?? ltp, close: quote?.close?.[last] ?? ltp,
    volume: quote?.volume?.[last] ?? 0,
    change: round(ltp - prev),
    change_pct: round(prev > 0 ? ((ltp - prev) / prev) * 100 : 0),
    week_52_high: meta.fiftyTwoWeekHigh ?? null, week_52_low: meta.fiftyTwoWeekLow ?? null,
    exchange: meta.exchangeName || "NSE", currency: meta.currency,
    market_cap: meta.marketCap ?? null, timezone: meta.exchangeTimezoneName,
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

// Fundamentals
async function getFundamentals(symbol: string) {
  const yfSymbol = toYahooSymbol(symbol);
  if (!yfSymbol) return null;

  let quoteFundamentals: Record<string, any> = {};

  const resp = await fetchSafe(
    `${YF_BASE}/v6/finance/quote?symbols=${encodeURIComponent(yfSymbol)}`, 1
  );

  if (resp) {
    try {
      const data = await resp.json();
      const q = data?.quoteResponse?.result?.[0];
      if (q) {
        quoteFundamentals = {
          pe_ratio: q.trailingPE || null, forward_pe: q.forwardPE || null,
          pb_ratio: q.priceToBook || null,
          dividend_yield: q.trailingAnnualDividendYield ? q.trailingAnnualDividendYield * 100 : null,
          dividend_rate: q.trailingAnnualDividendRate || null,
          market_cap: q.marketCap || null, enterprise_value: q.enterpriseValue || null,
          profit_margins: q.profitMargins ? q.profitMargins * 100 : null,
          roe: q.returnOnEquity ? q.returnOnEquity * 100 : null,
          roa: q.returnOnAssets ? q.returnOnAssets * 100 : null,
          revenue_growth: q.revenueGrowth ? q.revenueGrowth * 100 : null,
          earnings_growth: q.earningsQuarterlyGrowth ? q.earningsQuarterlyGrowth * 100 : null,
          debt_to_equity: q.debtToEquity ? q.debtToEquity / 100 : null,
          current_ratio: q.currentRatio || null, quick_ratio: q.quickRatio || null,
          operating_margins: q.operatingMargins ? q.operatingMargins * 100 : null,
          gross_margins: q.grossMargins ? q.grossMargins * 100 : null,
          ebitda: q.ebitda || null, total_revenue: q.totalRevenue || null,
          free_cashflow: q.freeCashflow || null, operating_cashflow: q.operatingCashflow || null,
          eps_trailing: q.trailingEps || null, eps_forward: q.epsForward || null,
          beta: q.beta || null, book_value: q.bookValue || null,
          shares_outstanding: q.sharesOutstanding || null, peg_ratio: q.pegRatio || null,
          target_mean_price: q.targetMeanPrice || null, target_high_price: q.targetHighPrice || null,
          target_low_price: q.targetLowPrice || null, recommendation: q.recommendationKey || null,
          num_analysts: q.numberOfAnalystOpinions || null,
          week_52_high: q.fiftyTwoWeekHigh || null, week_52_low: q.fiftyTwoWeekLow || null,
          fifty_day_avg: q.fiftyDayAverage || null, two_hundred_day_avg: q.twoHundredDayAverage || null,
          avg_volume: q.averageDailyVolume3Month || null, avg_volume_10d: q.averageDailyVolume10Day || null,
        };
      }
    } catch {}
  }

  const resp2 = await fetchSafe(
    `${YF_BASE}/v10/finance/quoteSummary/${encodeURIComponent(yfSymbol)}?modules=summaryDetail,defaultKeyStatistics,financialData`, 0
  );

  if (resp2) {
    try {
      const data = await resp2.json();
      const r = data?.quoteSummary?.result?.[0];
      if (r) {
        const summaryFundamentals = extractFundamentals(r.summaryDetail, r.defaultKeyStatistics, r.financialData);
        const merged = { ...summaryFundamentals, ...quoteFundamentals };
        for (const [key, value] of Object.entries(summaryFundamentals)) {
          if (merged[key] == null && value != null) merged[key] = value;
        }
        if (Object.values(merged).some(v => v != null)) return merged;
      }
    } catch {}
  }

  if (Object.values(quoteFundamentals).every(v => v == null) || Object.keys(quoteFundamentals).length === 0) {
    const chartResp = await fetchSafe(
      `${YF_BASE}/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1d&range=5d&includePrePost=false`, 1
    );
    if (chartResp) {
      try {
        const data = await chartResp.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta) {
          return {
            pe_ratio: null, forward_pe: null, pb_ratio: null,
            market_cap: meta.marketCap || null,
            week_52_high: meta.fiftyTwoWeekHigh || null, week_52_low: meta.fiftyTwoWeekLow || null,
            fifty_day_avg: meta.fiftyDayAverage || null, two_hundred_day_avg: meta.twoHundredDayAverage || null,
            dividend_yield: null, dividend_rate: null, roe: null, roa: null, debt_to_equity: null,
            revenue_growth: null, earnings_growth: null, profit_margins: null,
            operating_margins: null, gross_margins: null, current_ratio: null, quick_ratio: null,
            beta: null, book_value: null, shares_outstanding: null,
            ebitda: null, total_revenue: null, free_cashflow: null, operating_cashflow: null,
            eps_trailing: null, eps_forward: null, peg_ratio: null, enterprise_value: null,
            target_mean_price: null, target_high_price: null, target_low_price: null,
            recommendation: null, num_analysts: null, avg_volume: null, avg_volume_10d: null,
          };
        }
      } catch {}
    }
  }

  return Object.keys(quoteFundamentals).length ? quoteFundamentals : null;
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

  // MACD Signal Line (9-period EMA of MACD line)
  let macdSignal: number | null = null;
  let macdHistogram: number | null = null;
  if (closes.length >= 35) {
    const macdLine: number[] = [];
    for (let i = 26; i <= closes.length; i++) {
      const slice = closes.slice(0, i);
      const e12 = ema(slice, 12);
      const e26 = ema(slice, 26);
      if (e12 != null && e26 != null) macdLine.push(e12 - e26);
    }
    if (macdLine.length >= 9) {
      const k = 2 / 10;
      let sig = macdLine.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
      for (let i = 9; i < macdLine.length; i++) sig = macdLine[i] * k + sig * (1 - k);
      macdSignal = sig;
      macdHistogram = macd != null ? macd - sig : null;
    }
  }

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
    rsi_14: round(rsi), macd: round(macd),
    macd_signal: round(macdSignal), macd_histogram: round(macdHistogram),
    atr_14: round(calcATR()),
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

// Popular NSE stocks for local fallback search
const NSE_STOCKS: Array<{ symbol: string; name: string }> = [
  { symbol: "RELIANCE", name: "Reliance Industries Limited" },
  { symbol: "TCS", name: "Tata Consultancy Services Limited" },
  { symbol: "HDFCBANK", name: "HDFC Bank Limited" },
  { symbol: "INFY", name: "Infosys Limited" },
  { symbol: "ICICIBANK", name: "ICICI Bank Limited" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever Limited" },
  { symbol: "ITC", name: "ITC Limited" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Limited" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Limited" },
  { symbol: "LT", name: "Larsen & Toubro Limited" },
  { symbol: "AXISBANK", name: "Axis Bank Limited" },
  { symbol: "WIPRO", name: "Wipro Limited" },
  { symbol: "HCLTECH", name: "HCL Technologies Limited" },
  { symbol: "ASIANPAINT", name: "Asian Paints Limited" },
  { symbol: "MARUTI", name: "Maruti Suzuki India Limited" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries Limited" },
  { symbol: "TATAMOTORS", name: "Tata Motors Limited" },
  { symbol: "TATASTEEL", name: "Tata Steel Limited" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Limited" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv Limited" },
  { symbol: "TITAN", name: "Titan Company Limited" },
  { symbol: "NESTLEIND", name: "Nestle India Limited" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement Limited" },
  { symbol: "ADANIENT", name: "Adani Enterprises Limited" },
  { symbol: "ADANIPORTS", name: "Adani Ports and Special Economic Zone Limited" },
  { symbol: "POWERGRID", name: "Power Grid Corporation of India Limited" },
  { symbol: "NTPC", name: "NTPC Limited" },
  { symbol: "ONGC", name: "Oil and Natural Gas Corporation Limited" },
  { symbol: "JSWSTEEL", name: "JSW Steel Limited" },
  { symbol: "M&M", name: "Mahindra & Mahindra Limited" },
  { symbol: "TECHM", name: "Tech Mahindra Limited" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories Limited" },
  { symbol: "DIVISLAB", name: "Divi's Laboratories Limited" },
  { symbol: "CIPLA", name: "Cipla Limited" },
  { symbol: "COALINDIA", name: "Coal India Limited" },
  { symbol: "BPCL", name: "Bharat Petroleum Corporation Limited" },
  { symbol: "GRASIM", name: "Grasim Industries Limited" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank Limited" },
  { symbol: "EICHERMOT", name: "Eicher Motors Limited" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp Limited" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals Enterprise Limited" },
  { symbol: "TATACONSUM", name: "Tata Consumer Products Limited" },
  { symbol: "BRITANNIA", name: "Britannia Industries Limited" },
  { symbol: "PIDILITIND", name: "Pidilite Industries Limited" },
  { symbol: "DABUR", name: "Dabur India Limited" },
  { symbol: "GODREJCP", name: "Godrej Consumer Products Limited" },
  { symbol: "HAVELLS", name: "Havells India Limited" },
  { symbol: "BIOCON", name: "Biocon Limited" },
  { symbol: "SBILIFE", name: "SBI Life Insurance Company Limited" },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance Company Limited" },
  { symbol: "ICICIPRULI", name: "ICICI Prudential Life Insurance Company Limited" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto Limited" },
  { symbol: "SHREECEM", name: "Shree Cement Limited" },
  { symbol: "HINDALCO", name: "Hindalco Industries Limited" },
  { symbol: "TRENT", name: "Trent Limited" },
  { symbol: "ZOMATO", name: "Zomato Limited" },
  { symbol: "PAYTM", name: "One97 Communications Limited (Paytm)" },
  { symbol: "NYKAA", name: "FSN E-Commerce Ventures Limited (Nykaa)" },
  { symbol: "DELHIVERY", name: "Delhivery Limited" },
  { symbol: "HAL", name: "Hindustan Aeronautics Limited" },
  { symbol: "BEL", name: "Bharat Electronics Limited" },
  { symbol: "IRCTC", name: "Indian Railway Catering and Tourism Corporation Limited" },
  { symbol: "IRFC", name: "Indian Railway Finance Corporation Limited" },
  { symbol: "PNB", name: "Punjab National Bank" },
  { symbol: "BANKBARODA", name: "Bank of Baroda" },
  { symbol: "CANBK", name: "Canara Bank" },
  { symbol: "VEDL", name: "Vedanta Limited" },
  { symbol: "JINDALSTEL", name: "Jindal Steel & Power Limited" },
  { symbol: "SAIL", name: "Steel Authority of India Limited" },
  { symbol: "TATAPOWER", name: "Tata Power Company Limited" },
  { symbol: "ADANIGREEN", name: "Adani Green Energy Limited" },
  { symbol: "ADANIPOWER", name: "Adani Power Limited" },
  { symbol: "RPOWER", name: "Reliance Power Limited" },
  { symbol: "DLF", name: "DLF Limited" },
  { symbol: "GODREJPROP", name: "Godrej Properties Limited" },
  { symbol: "OBEROIRLTY", name: "Oberoi Realty Limited" },
  { symbol: "PRESTIGE", name: "Prestige Estates Projects Limited" },
  { symbol: "IDEA", name: "Vodafone Idea Limited" },
  { symbol: "YESBANK", name: "Yes Bank Limited" },
  { symbol: "IDFCFIRSTB", name: "IDFC First Bank Limited" },
  { symbol: "FEDERALBNK", name: "Federal Bank Limited" },
  { symbol: "BANDHANBNK", name: "Bandhan Bank Limited" },
  { symbol: "ASHOKLEY", name: "Ashok Leyland Limited" },
  { symbol: "BHEL", name: "Bharat Heavy Electricals Limited" },
  { symbol: "GAIL", name: "GAIL (India) Limited" },
  { symbol: "IOC", name: "Indian Oil Corporation Limited" },
  { symbol: "HINDPETRO", name: "Hindustan Petroleum Corporation Limited" },
  { symbol: "RECLTD", name: "REC Limited" },
  { symbol: "PFC", name: "Power Finance Corporation Limited" },
  { symbol: "NHPC", name: "NHPC Limited" },
  { symbol: "SJVN", name: "SJVN Limited" },
  { symbol: "HYUNDAI", name: "Hyundai Motor India Limited" },
  { symbol: "OLAELEC", name: "Ola Electric Mobility Limited" },
  { symbol: "MAZDOCK", name: "Mazagon Dock Shipbuilders Limited" },
  { symbol: "COCHINSHIP", name: "Cochin Shipyard Limited" },
  { symbol: "GRSE", name: "Garden Reach Shipbuilders & Engineers Limited" },
  { symbol: "BDL", name: "Bharat Dynamics Limited" },
];

function localSearch(query: string): Array<{ symbol: string; name: string; exchange: string; type: string }> {
  const q = query.toUpperCase().trim();
  if (!q) return [];
  return NSE_STOCKS
    .filter(s => s.symbol.includes(q) || s.name.toUpperCase().includes(q))
    .slice(0, 15)
    .map(s => ({ symbol: s.symbol, name: s.name, exchange: "NSE", type: "EQUITY" }));
}

async function searchStocks(query: string) {
  if (!query || query.length < 1) return [];

  // Try Yahoo Finance search first
  try {
    const resp = await fetchSafe(`${YF_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=25&newsCount=0&listsCount=0`);
    if (resp) {
      const data = await resp.json();
      const results = (data.quotes || [])
        .filter((q: any) => {
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
      if (results.length > 0) return results;
    }
  } catch (e) {
    console.warn("Yahoo search failed, using local fallback:", e);
  }

  // Fallback to local search
  return localSearch(query);
}

// ── Yahoo Finance Options Chain (replaces failing NSE scraping) ──
async function fetchYahooOptionsChain(symbol: string) {
  const upper = symbol.toUpperCase().trim();
  
  // Map to Yahoo options symbols
  const optionsSymbolMap: Record<string, string> = {
    "NIFTY": "^NSEI",
    "NIFTY 50": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "BANK NIFTY": "^NSEBANK",
    "FINNIFTY": "NIFTY_FIN_SERVICE.NS",
    "MIDCPNIFTY": "^NSMIDCP",
  };
  
  const yfSymbol = optionsSymbolMap[upper] || toYahooSymbol(symbol);
  if (!yfSymbol) return null;

  try {
    // Fetch options data from Yahoo Finance
    const resp = await fetchSafe(
      `${YF_BASE}/v7/finance/options/${encodeURIComponent(yfSymbol)}`, 1
    );
    if (!resp) {
      console.warn(`Yahoo options fetch failed for ${yfSymbol}, using VIX-based estimation`);
      return await estimateOptionsFromVIX(upper, yfSymbol);
    }

    const data = await resp.json();
    const optionChain = data?.optionChain?.result?.[0];
    if (!optionChain) {
      console.warn(`No Yahoo options data for ${yfSymbol}, using VIX-based estimation`);
      return await estimateOptionsFromVIX(upper, yfSymbol);
    }

    const quote = optionChain.quote;
    const spot = quote?.regularMarketPrice || 0;
    const expiryDates = (optionChain.expirationDates || []).map((ts: number) =>
      new Date(ts * 1000).toISOString().split("T")[0]
    );

    const options = optionChain.options?.[0];
    if (!options) {
      return await estimateOptionsFromVIX(upper, yfSymbol);
    }

    const calls = options.calls || [];
    const puts = options.puts || [];

    // Build unified chain
    const strikeMap: Record<number, any> = {};
    
    for (const c of calls) {
      const strike = c.strike;
      if (!strikeMap[strike]) strikeMap[strike] = { strike, ce: null, pe: null };
      strikeMap[strike].ce = {
        oi: c.openInterest || 0,
        chg_oi: c.openInterest || 0,
        volume: c.volume || 0,
        iv: c.impliedVolatility ? round(c.impliedVolatility * 100) : 0,
        ltp: c.lastPrice || 0,
        change: c.change || 0,
        bid: c.bid || 0,
        ask: c.ask || 0,
      };
    }
    
    for (const p of puts) {
      const strike = p.strike;
      if (!strikeMap[strike]) strikeMap[strike] = { strike, ce: null, pe: null };
      strikeMap[strike].pe = {
        oi: p.openInterest || 0,
        chg_oi: p.openInterest || 0,
        volume: p.volume || 0,
        iv: p.impliedVolatility ? round(p.impliedVolatility * 100) : 0,
        ltp: p.lastPrice || 0,
        change: p.change || 0,
        bid: p.bid || 0,
        ask: p.ask || 0,
      };
    }

    const emptyOpt = { oi: 0, chg_oi: 0, volume: 0, iv: 0, ltp: 0, change: 0, bid: 0, ask: 0 };
    const chain = Object.values(strikeMap)
      .map((row: any) => ({
        strike: row.strike,
        ce: row.ce || emptyOpt,
        pe: row.pe || emptyOpt,
      }))
      .sort((a: any, b: any) => a.strike - b.strike);

    // Analytics
    const totalCallOI = chain.reduce((s: number, r: any) => s + r.ce.oi, 0);
    const totalPutOI = chain.reduce((s: number, r: any) => s + r.pe.oi, 0);
    const totalCallVol = chain.reduce((s: number, r: any) => s + r.ce.volume, 0);
    const totalPutVol = chain.reduce((s: number, r: any) => s + r.pe.volume, 0);
    const pcr = totalCallOI > 0 ? round(totalPutOI / totalCallOI) : 0;

    // Max Pain calculation
    let minPain = Infinity, maxPainStrike = spot;
    for (const row of chain) {
      let pain = 0;
      for (const r of chain) {
        if (r.strike < row.strike) pain += r.ce.oi * (row.strike - r.strike);
        if (r.strike > row.strike) pain += r.pe.oi * (r.strike - row.strike);
      }
      if (pain < minPain) { minPain = pain; maxPainStrike = row.strike; }
    }

    return {
      chain, underlyingValue: spot, expiryDates, timestamp: new Date().toISOString(),
      analytics: { totalCallOI, totalPutOI, totalCallVol, totalPutVol, pcr, maxPain: maxPainStrike },
      live: true, source: "yahoo",
    };
  } catch (e) {
    console.error(`Yahoo options chain error: ${e}`);
    return await estimateOptionsFromVIX(upper, yfSymbol);
  }
}

// ── VIX-Based Options Estimation (fallback when Yahoo options unavailable) ──
async function estimateOptionsFromVIX(indexName: string, yfSymbol: string) {
  // Get spot price and VIX
  const [spotResp, vixResp] = await Promise.all([
    fetchSafe(`${YF_BASE}/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1d&range=2d`),
    fetchSafe(`${YF_BASE}/v8/finance/chart/%5EINDIAVIX?interval=1d&range=2d`),
  ]);

  let spot = 0;
  if (spotResp) {
    const d = await spotResp.json();
    spot = d?.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
  }
  if (!spot) return null;

  let vixValue = 13; // Default VIX assumption
  if (vixResp) {
    const d = await vixResp.json();
    vixValue = d?.chart?.result?.[0]?.meta?.regularMarketPrice || 13;
  }

  // Calculate days to next Thursday expiry
  const now = new Date();
  let dte = (4 - now.getDay() + 7) % 7;
  if (dte === 0 && now.getHours() >= 15) dte = 7;
  if (dte === 0) dte = 0.5; // Same-day expiry

  const iv = vixValue / 100;
  const sqrtT = Math.sqrt(Math.max(dte, 1) / 365);
  
  // ATM straddle estimate using Black-Scholes approximation
  // ATM Call ≈ ATM Put ≈ S * N(d1) - S * N(-d1) ≈ S * σ * √T * 0.7979 (for ATM)
  const atmCallPrice = round(spot * iv * sqrtT * 0.3989);
  const atmPutPrice = round(spot * iv * sqrtT * 0.3989);
  const atmStraddle = round((atmCallPrice || 0) + (atmPutPrice || 0));
  const expectedMove = round(atmStraddle ? atmStraddle * 0.85 : 0);

  // Generate synthetic chain around spot
  const stepSize = indexName.includes("BANK") ? 100 : 50;
  const atmStrike = Math.round(spot / stepSize) * stepSize;
  const chain = [];

  for (let offset = -10; offset <= 10; offset++) {
    const strike = atmStrike + offset * stepSize;
    const moneyness = (strike - spot) / spot;
    
    // Simplified OI distribution (bell curve around ATM)
    const oiFactor = Math.exp(-moneyness * moneyness * 50);
    const callOI = Math.round(50000 * oiFactor * (1 + moneyness * 2));
    const putOI = Math.round(50000 * oiFactor * (1 - moneyness * 2));
    
    // Simple Black-Scholes-like premium
    const intrinsicCall = Math.max(spot - strike, 0);
    const intrinsicPut = Math.max(strike - spot, 0);
    const timeValue = spot * iv * sqrtT * Math.exp(-moneyness * moneyness * 2) * 0.3989;
    
    chain.push({
      strike,
      ce: {
        oi: Math.max(callOI, 100), chg_oi: 0,
        volume: Math.round(callOI * 0.3),
        iv: round(vixValue * (1 + Math.abs(moneyness) * 0.5)),
        ltp: round(intrinsicCall + timeValue),
        change: 0, bid: 0, ask: 0,
      },
      pe: {
        oi: Math.max(putOI, 100), chg_oi: 0,
        volume: Math.round(putOI * 0.3),
        iv: round(vixValue * (1 + Math.abs(moneyness) * 0.5)),
        ltp: round(intrinsicPut + timeValue),
        change: 0, bid: 0, ask: 0,
      },
    });
  }

  const totalCallOI = chain.reduce((s, r) => s + r.ce.oi, 0);
  const totalPutOI = chain.reduce((s, r) => s + r.pe.oi, 0);
  const pcr = totalCallOI > 0 ? round(totalPutOI / totalCallOI) : 1;

  // Max pain from synthetic chain
  let minPain = Infinity, maxPainStrike = atmStrike;
  for (const row of chain) {
    let pain = 0;
    for (const r of chain) {
      if (r.strike < row.strike) pain += r.ce.oi * (row.strike - r.strike);
      if (r.strike > row.strike) pain += r.pe.oi * (r.strike - row.strike);
    }
    if (pain < minPain) { minPain = pain; maxPainStrike = row.strike; }
  }

  return {
    chain, underlyingValue: spot,
    expiryDates: [],
    timestamp: new Date().toISOString(),
    analytics: {
      totalCallOI, totalPutOI,
      totalCallVol: Math.round(totalCallOI * 0.3),
      totalPutVol: Math.round(totalPutOI * 0.3),
      pcr, maxPain: maxPainStrike,
    },
    live: false, source: "vix-estimate",
    estimate: { vix: vixValue, dte, atmStraddle, expectedMove, atmIV: vixValue },
  };
}

// ── Market Metrics (VIX + Yahoo/VIX-based PCR, Expected Move, F&O) ──
async function getMarketMetrics() {
  // 1. Fetch India VIX
  const vixPromise = fetchSafe(`${YF_BASE}/v8/finance/chart/%5EINDIAVIX?interval=1d&range=5d`).then(async (r) => {
    if (!r) return null;
    const data = await r.json();
    const res = data?.chart?.result?.[0];
    if (!res?.meta) return null;
    const closes = res.indicators?.quote?.[0]?.close || [];
    const current = res.meta.regularMarketPrice;
    const prev = closes.length >= 2 ? closes[closes.length - 2] : current;
    return {
      value: round(current),
      change: round(current - prev),
      change_pct: round(prev ? ((current - prev) / prev) * 100 : 0),
    };
  }).catch(() => null);

  // 2. Yahoo Finance options for NIFTY & BANKNIFTY (replaces NSE scraping)
  const niftyOCPromise = fetchYahooOptionsChain("NIFTY").catch(() => null);
  const bnfOCPromise = fetchYahooOptionsChain("BANKNIFTY").catch(() => null);

  const [vix, niftyOC, bnfOC] = await Promise.all([vixPromise, niftyOCPromise, bnfOCPromise]);

  // Days to next Thursday (weekly expiry)
  const now = new Date();
  let daysToExpiry = (4 - now.getDay() + 7) % 7;
  if (daysToExpiry === 0) {
    daysToExpiry = now.getHours() >= 15 ? 7 : 0;
  }

  function calcMetrics(oc: any) {
    if (!oc) return null;
    
    // If we have VIX-based estimates directly
    if (oc.estimate) {
      return {
        spot: oc.underlyingValue,
        pcr: oc.analytics?.pcr || 1,
        totalCallOI: oc.analytics?.totalCallOI || 0,
        totalPutOI: oc.analytics?.totalPutOI || 0,
        totalCallVol: oc.analytics?.totalCallVol || 0,
        totalPutVol: oc.analytics?.totalPutVol || 0,
        maxPain: oc.analytics?.maxPain || 0,
        atmStrike: Math.round(oc.underlyingValue / 50) * 50,
        atmStraddle: oc.estimate.atmStraddle,
        expectedMove: oc.estimate.expectedMove,
        atmIV: oc.estimate.atmIV,
        premiumTurnover: 0,
        source: oc.source,
      };
    }
    
    // Real options data
    if (!oc.chain || oc.chain.length === 0) return null;
    const spot = oc.underlyingValue || 0;
    const pcr = oc.analytics?.pcr || 0;
    const totalCallOI = oc.analytics?.totalCallOI || 0;
    const totalPutOI = oc.analytics?.totalPutOI || 0;
    const totalCallVol = oc.analytics?.totalCallVol || 0;
    const totalPutVol = oc.analytics?.totalPutVol || 0;
    const maxPain = oc.analytics?.maxPain || 0;

    // Find ATM strike
    let atmRow = oc.chain[0];
    let minDist = Infinity;
    for (const row of oc.chain) {
      const dist = Math.abs(row.strike - spot);
      if (dist < minDist) { minDist = dist; atmRow = row; }
    }

    const atmStraddle = round((atmRow?.ce?.ltp || 0) + (atmRow?.pe?.ltp || 0));
    const expectedMove = round(atmStraddle ? atmStraddle * 0.85 : 0);
    const atmIV = round(((atmRow?.ce?.iv || 0) + (atmRow?.pe?.iv || 0)) / 2);

    let premiumTurnover = 0;
    for (const row of oc.chain) {
      premiumTurnover += (row.ce?.volume || 0) * (row.ce?.ltp || 0);
      premiumTurnover += (row.pe?.volume || 0) * (row.pe?.ltp || 0);
    }

    return {
      spot, pcr, totalCallOI, totalPutOI, totalCallVol, totalPutVol, maxPain,
      atmStrike: atmRow?.strike, atmStraddle, expectedMove, atmIV,
      premiumTurnover: round(premiumTurnover / 10000000),
      source: oc.source,
    };
  }

  const niftyMetrics = calcMetrics(niftyOC);
  const bnfMetrics = calcMetrics(bnfOC);

  const totalFnOTurnover = round((niftyMetrics?.premiumTurnover || 0) + (bnfMetrics?.premiumTurnover || 0));

  // Determine market status
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay();
  const isWeekday = day >= 1 && day <= 5;
  const marketOpen = isWeekday && ((hour === 9 && minute >= 15) || (hour > 9 && hour < 15) || (hour === 15 && minute <= 30));

  return {
    vix,
    nifty: niftyMetrics,
    banknifty: bnfMetrics,
    daysToExpiry,
    fnoTurnover: totalFnOTurnover,
    timestamp: new Date().toISOString(),
    live: !!(vix || niftyMetrics || bnfMetrics),
    marketOpen,
    dataSource: niftyMetrics?.source || "unavailable",
  };
}

// ── Batch EMA Calculator ──
async function getBatchEMA(symbols: string[]) {
  const results = await Promise.allSettled(
    symbols.slice(0, 30).map(async (sym) => {
      const candles = await getChart(sym, "1d", "1y");
      if (!Array.isArray(candles) || candles.length < 20) return { symbol: sym, emas: null };

      const closes = candles.map((c: any) => c.close);

      const calcEMA = (arr: number[], period: number): number | null => {
        if (arr.length < period) return null;
        const k = 2 / (period + 1);
        let e = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
        for (let i = period; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
        return round(e);
      };

      const calcSMA = (arr: number[], period: number): number | null => {
        if (arr.length < period) return null;
        return round(arr.slice(-period).reduce((a, b) => a + b, 0) / period);
      };

      const price = closes[closes.length - 1];
      const ema9 = calcEMA(closes, 9);
      const ema20 = calcEMA(closes, 20);
      const ema50 = calcEMA(closes, 50);
      const ema100 = calcEMA(closes, 100);
      const ema200 = calcEMA(closes, 200);
      const sma20 = calcSMA(closes, 20);
      const sma50 = calcSMA(closes, 50);
      const sma200 = calcSMA(closes, 200);

      return {
        symbol: sym, price,
        emas: { ema9, ema20, ema50, ema100, ema200, sma20, sma50, sma200 },
      };
    })
  );

  return results.map((r, i) => ({
    symbol: symbols[i],
    ...(r.status === "fulfilled" ? r.value : { emas: null }),
  }));
}

async function getIndices() {
  const indices = ["^NSEI", "^BSESN", "^NSEBANK"];
  const names = ["NIFTY 50", "SENSEX", "BANKNIFTY"];
  const results = await Promise.allSettled(
    indices.map(idx => fetchSafe(`${YF_BASE}/v8/finance/chart/${idx}?interval=1d&range=2d`).then(r => r?.json()))
  );
  return results.map((r, i) => {
    if (r.status !== "fulfilled" || !r.value) return { symbol: names[i], error: true };
    const res = r.value?.chart?.result?.[0];
    if (!res?.meta) return { symbol: names[i], error: true };
    const meta = res.meta;
    const closes = res.indicators?.quote?.[0]?.close || [];
    const prev = meta.chartPreviousClose || meta.previousClose || (closes.length >= 2 ? closes[closes.length - 2] : 0) || 0;
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
      case "batch-ema": result = await getBatchEMA(symbols); break;
      case "search": result = await searchStocks(query); break;
      case "indices": result = await getIndices(); break;
      case "market-metrics": result = await getMarketMetrics(); break;
      case "options-chain": result = await fetchYahooOptionsChain(symbol || "NIFTY"); break;
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
