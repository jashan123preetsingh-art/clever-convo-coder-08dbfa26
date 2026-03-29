import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function callFunction(fnName: string, params: Record<string, string> = {}, body?: any) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${FUNCTIONS_URL}/${fnName}${queryString ? `?${queryString}` : ""}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  };

  const resp = await fetch(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API Error ${resp.status}: ${text}`);
  }

  return resp.json();
}

// Stock Data API
export const stockApi = {
  getQuote: (symbol: string) =>
    callFunction("stock-data", { action: "quote", symbol }),

  getChart: (symbol: string, interval = "1d", range = "1y") =>
    callFunction("stock-data", { action: "chart", symbol, interval, range }),

  getFundamentals: (symbol: string) =>
    callFunction("stock-data", { action: "fundamentals", symbol }),

  getTechnicals: (symbol: string) =>
    callFunction("stock-data", { action: "technicals", symbol }),

  getFullData: (symbol: string) =>
    callFunction("stock-data", { action: "full", symbol }),

  getBatchQuotes: (symbols: string[]) =>
    callFunction("stock-data", { action: "batch", symbols: symbols.join(",") }),

  search: (query: string) =>
    callFunction("stock-data", { action: "search", q: query }),

  getIndices: () =>
    callFunction("stock-data", { action: "indices" }),
};

// FII/DII API
export const fiiDiiApi = {
  getData: () =>
    callFunction("fii-dii", { action: "fii-dii" }),

  getBreadth: () =>
    callFunction("fii-dii", { action: "breadth" }),

  getStockList: (index = "NIFTY%20500") =>
    callFunction("fii-dii", { action: "stock-list", index }),
};

// AI Analysis API
export const aiApi = {
  analyzeStock: (stockData: any) =>
    callFunction("ai-analysis", {}, { stockData }),
};
