import { useQuery } from "@tanstack/react-query";
import { stockApi, fiiDiiApi, aiApi } from "@/lib/api";

export function useStockQuote(symbol: string) {
  return useQuery({
    queryKey: ["stock-quote", symbol],
    queryFn: () => stockApi.getQuote(symbol),
    enabled: !!symbol,
    staleTime: 30_000, // 30s
    retry: 2,
  });
}

export function useStockChart(symbol: string, interval = "1d", range = "1y") {
  return useQuery({
    queryKey: ["stock-chart", symbol, interval, range],
    queryFn: () => stockApi.getChart(symbol, interval, range),
    enabled: !!symbol,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useStockFundamentals(symbol: string) {
  return useQuery({
    queryKey: ["stock-fundamentals", symbol],
    queryFn: () => stockApi.getFundamentals(symbol),
    enabled: !!symbol,
    staleTime: 300_000, // 5min
    retry: 2,
  });
}

export function useStockTechnicals(symbol: string) {
  return useQuery({
    queryKey: ["stock-technicals", symbol],
    queryFn: () => stockApi.getTechnicals(symbol),
    enabled: !!symbol,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useFullStockData(symbol: string) {
  return useQuery({
    queryKey: ["stock-full", symbol],
    queryFn: () => stockApi.getFullData(symbol),
    enabled: !!symbol,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useBatchQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ["batch-quotes", symbols.join(",")],
    queryFn: () => stockApi.getBatchQuotes(symbols),
    enabled: symbols.length > 0,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useStockSearch(query: string) {
  return useQuery({
    queryKey: ["stock-search", query],
    queryFn: () => stockApi.search(query),
    enabled: query.length >= 2,
    staleTime: 120_000,
  });
}

export function useIndices() {
  return useQuery({
    queryKey: ["indices"],
    queryFn: () => stockApi.getIndices(),
    staleTime: 30_000,
    refetchInterval: 30_000, // Auto-refresh every 30s
    retry: 2,
  });
}

export function useFiiDiiData() {
  return useQuery({
    queryKey: ["fii-dii"],
    queryFn: () => fiiDiiApi.getData(),
    staleTime: 300_000,
    retry: 2,
  });
}

export function useMarketBreadth() {
  return useQuery({
    queryKey: ["market-breadth"],
    queryFn: () => fiiDiiApi.getBreadth(),
    staleTime: 60_000,
    retry: 2,
  });
}

export function useNSEStockList(index = "NIFTY%20500") {
  return useQuery({
    queryKey: ["nse-stock-list", index],
    queryFn: () => fiiDiiApi.getStockList(index),
    staleTime: 60_000,
    retry: 2,
  });
}

export function useAIAnalysis(stockData: any, enabled = false) {
  return useQuery({
    queryKey: ["ai-analysis", stockData?.quote?.symbol],
    queryFn: () => aiApi.analyzeStock(stockData),
    enabled: enabled && !!stockData?.quote?.symbol,
    staleTime: 600_000, // 10 min
    retry: 1,
  });
}
