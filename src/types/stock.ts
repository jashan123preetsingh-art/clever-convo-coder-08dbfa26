// Canonical stock/market types used across the app
// Re-exports from mockData for backward compat + adds new ones

export interface Stock {
  symbol: string;
  name: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  prev_close: number;
  change: number;
  change_pct: number;
  volume: number;
  market_cap: number;
  sector: string;
  exchange: string;
  week_52_high: number;
  week_52_low: number;
  pe_ratio?: number;
  roe?: number;
  roce?: number;
  debt_to_equity?: number;
  dividend_yield?: number;
  promoter_holding?: number;
  avg_volume_10d?: number;
}

export interface IndexData {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  change_pct: number;
  error?: string;
}

export interface NewsArticle {
  title: string;
  source: string;
  category: string;
  published_at: string;
  url: string;
  summary?: string;
}

export interface FiiDiiEntry {
  category: string;
  netValue: string;
  date: string;
}

export interface MarketBreadthData {
  advances: number;
  declines: number;
  unchanged: number;
  stocks?: Stock[];
}

export interface MarketMetrics {
  vix?: { value: number; change_pct: number };
  nifty?: MetricData;
  banknifty?: MetricData;
  daysToExpiry?: number;
  dataSource?: string;
  timestamp?: string;
}

export interface MetricData {
  pcr?: number;
  expectedMove?: number;
  atmStraddle?: number;
  atmIV?: number;
  maxPain?: number;
  source?: string;
}

export interface SectorPerformance {
  sector: string;
  count: number;
  avg_change: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange?: string;
}

export type DataStatus = 'live' | 'delayed' | 'estimated' | 'loading' | 'unavailable' | 'market-closed';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  plan: string | null;
  created_at: string | null;
  updated_at: string | null;
}
