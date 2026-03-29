// Comprehensive mock data for Indian Stock Market

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
}

export interface NewsArticle {
  title: string;
  source: string;
  category: string;
  published_at: string;
  url: string;
  summary?: string;
}

export interface FiiDiiData {
  date: string;
  fii_buy: number;
  fii_sell: number;
  fii_net: number;
  dii_buy: number;
  dii_sell: number;
  dii_net: number;
}

export interface ScannerDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface OptionRow {
  strike: number;
  ce: { oi: number; chg_oi: number; volume: number; iv: number; ltp: number };
  pe: { oi: number; chg_oi: number; volume: number; iv: number; ltp: number };
}

const STOCKS: Stock[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', ltp: 1414.40, open: 1398, high: 1425, low: 1392, prev_close: 1384.5, change: 29.9, change_pct: 2.16, volume: 18500000, market_cap: 1900000, sector: 'Oil & Gas', exchange: 'NSE', week_52_high: 1608, week_52_low: 1200, pe_ratio: 25.8, roe: 9.5, roce: 12.3, debt_to_equity: 0.38, dividend_yield: 0.4, promoter_holding: 50.3, avg_volume_10d: 15000000 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', ltp: 3890.50, open: 3845, high: 3910, low: 3830, prev_close: 3820, change: 70.5, change_pct: 1.85, volume: 4200000, market_cap: 1500000, sector: 'Information Technology', exchange: 'NSE', week_52_high: 4250, week_52_low: 3300, pe_ratio: 32.4, roe: 45.2, roce: 56.8, debt_to_equity: 0.04, dividend_yield: 1.5, promoter_holding: 72.3, avg_volume_10d: 3800000 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', ltp: 1680.90, open: 1690, high: 1695, low: 1672, prev_close: 1685.1, change: -4.2, change_pct: -0.25, volume: 12000000, market_cap: 1200000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1880, week_52_low: 1450, pe_ratio: 21.3, roe: 16.8, roce: 18.2, debt_to_equity: 6.2, dividend_yield: 1.1, promoter_holding: 25.5, avg_volume_10d: 11000000 },
  { symbol: 'INFY', name: 'Infosys Ltd', ltp: 1520.40, open: 1505, high: 1535, low: 1498, prev_close: 1503.6, change: 16.8, change_pct: 1.12, volume: 8500000, market_cap: 750000, sector: 'Information Technology', exchange: 'NSE', week_52_high: 1720, week_52_low: 1250, pe_ratio: 28.5, roe: 32.1, roce: 40.5, debt_to_equity: 0.08, dividend_yield: 2.3, promoter_holding: 14.8, avg_volume_10d: 7500000 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', ltp: 1125.60, open: 1118, high: 1138, low: 1112, prev_close: 1110, change: 15.6, change_pct: 1.41, volume: 15000000, market_cap: 800000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1340, week_52_low: 950, pe_ratio: 19.5, roe: 17.2, roce: 19.1, debt_to_equity: 5.8, dividend_yield: 0.9, promoter_holding: 0, avg_volume_10d: 13000000 },
  { symbol: 'SBIN', name: 'State Bank of India', ltp: 812.30, open: 805, high: 820, low: 798, prev_close: 795, change: 17.3, change_pct: 2.18, volume: 22000000, market_cap: 720000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 912, week_52_low: 600, pe_ratio: 10.2, roe: 18.5, roce: 16.8, debt_to_equity: 12.5, dividend_yield: 1.8, promoter_holding: 57.5, avg_volume_10d: 19000000 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', ltp: 7250.30, open: 7340, high: 7380, low: 7200, prev_close: 7338, change: -87.7, change_pct: -1.20, volume: 3200000, market_cap: 420000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 8200, week_52_low: 6100, pe_ratio: 35.6, roe: 22.4, roce: 14.8, debt_to_equity: 3.5, dividend_yield: 0.5, promoter_holding: 54.7, avg_volume_10d: 2800000 },
  { symbol: 'ITC', name: 'ITC Ltd', ltp: 456.20, open: 452, high: 460, low: 450, prev_close: 454.2, change: 2.0, change_pct: 0.45, volume: 16000000, market_cap: 480000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 530, week_52_low: 390, pe_ratio: 28.2, roe: 28.5, roce: 35.2, debt_to_equity: 0.01, dividend_yield: 3.2, promoter_holding: 0, avg_volume_10d: 14000000 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', ltp: 685.40, open: 672, high: 695, low: 668, prev_close: 665, change: 20.4, change_pct: 3.07, volume: 25000000, market_cap: 350000, sector: 'Automobile', exchange: 'NSE', week_52_high: 810, week_52_low: 520, pe_ratio: 8.5, roe: 35.2, roce: 18.5, debt_to_equity: 1.2, dividend_yield: 0.5, promoter_holding: 46.4, avg_volume_10d: 21000000 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma', ltp: 1245.60, open: 1200, high: 1255, low: 1195, prev_close: 1204, change: 41.6, change_pct: 3.45, volume: 5800000, market_cap: 300000, sector: 'Pharma', exchange: 'NSE', week_52_high: 1380, week_52_low: 980, pe_ratio: 38.2, roe: 14.2, roce: 17.5, debt_to_equity: 0.15, dividend_yield: 0.8, promoter_holding: 54.5, avg_volume_10d: 5000000 },
  { symbol: 'LT', name: 'Larsen & Toubro', ltp: 3456.80, open: 3420, high: 3480, low: 3400, prev_close: 3410, change: 46.8, change_pct: 1.37, volume: 3100000, market_cap: 480000, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 3900, week_52_low: 2800, pe_ratio: 35.1, roe: 15.2, roce: 18.3, debt_to_equity: 1.5, dividend_yield: 0.9, promoter_holding: 0, avg_volume_10d: 2800000 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', ltp: 12450.00, open: 12300, high: 12520, low: 12250, prev_close: 12280, change: 170.0, change_pct: 1.38, volume: 1200000, market_cap: 380000, sector: 'Automobile', exchange: 'NSE', week_52_high: 13200, week_52_low: 9800, pe_ratio: 30.5, roe: 14.8, roce: 18.2, debt_to_equity: 0.02, dividend_yield: 0.8, promoter_holding: 56.4, avg_volume_10d: 1000000 },
  { symbol: 'TITAN', name: 'Titan Company', ltp: 3580.50, open: 3560, high: 3600, low: 3540, prev_close: 3545, change: 35.5, change_pct: 1.00, volume: 2400000, market_cap: 320000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 3950, week_52_low: 2900, pe_ratio: 82.5, roe: 25.3, roce: 30.2, debt_to_equity: 0.5, dividend_yield: 0.3, promoter_holding: 52.9, avg_volume_10d: 2100000 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', ltp: 2890.00, open: 2850, high: 2920, low: 2830, prev_close: 2835, change: 55.0, change_pct: 1.94, volume: 6800000, market_cap: 340000, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 3500, week_52_low: 2200, pe_ratio: 72.5, roe: 8.5, roce: 10.2, debt_to_equity: 1.8, dividend_yield: 0.1, promoter_holding: 72.6, avg_volume_10d: 5500000 },
  { symbol: 'WIPRO', name: 'Wipro Ltd', ltp: 452.80, open: 448, high: 458, low: 445, prev_close: 450, change: 2.8, change_pct: 0.62, volume: 7500000, market_cap: 280000, sector: 'Information Technology', exchange: 'NSE', week_52_high: 540, week_52_low: 380, pe_ratio: 22.5, roe: 16.8, roce: 20.5, debt_to_equity: 0.2, dividend_yield: 1.2, promoter_holding: 72.9, avg_volume_10d: 6500000 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', ltp: 1580.00, open: 1565, high: 1595, low: 1558, prev_close: 1562, change: 18.0, change_pct: 1.15, volume: 5200000, market_cap: 920000, sector: 'Telecom', exchange: 'NSE', week_52_high: 1780, week_52_low: 1200, pe_ratio: 75.2, roe: 12.5, roce: 14.8, debt_to_equity: 2.8, dividend_yield: 0.5, promoter_holding: 55.1, avg_volume_10d: 4800000 },
  { symbol: 'AXISBANK', name: 'Axis Bank', ltp: 1145.60, open: 1138, high: 1158, low: 1130, prev_close: 1135, change: 10.6, change_pct: 0.93, volume: 9800000, market_cap: 350000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1340, week_52_low: 950, pe_ratio: 14.8, roe: 17.5, roce: 15.2, debt_to_equity: 8.5, dividend_yield: 0.1, promoter_holding: 8.2, avg_volume_10d: 8500000 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', ltp: 1780.00, open: 1770, high: 1795, low: 1760, prev_close: 1768, change: 12.0, change_pct: 0.68, volume: 4500000, market_cap: 350000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 2010, week_52_low: 1550, pe_ratio: 22.1, roe: 14.2, roce: 15.8, debt_to_equity: 7.2, dividend_yield: 0.1, promoter_holding: 25.8, avg_volume_10d: 4000000 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', ltp: 2450.00, open: 2440, high: 2465, low: 2430, prev_close: 2455, change: -5.0, change_pct: -0.20, volume: 2800000, market_cap: 580000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 2850, week_52_low: 2200, pe_ratio: 58.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.01, dividend_yield: 1.8, promoter_holding: 61.9, avg_volume_10d: 2500000 },
  { symbol: 'NTPC', name: 'NTPC Ltd', ltp: 345.80, open: 340, high: 350, low: 338, prev_close: 338, change: 7.8, change_pct: 2.31, volume: 18000000, market_cap: 340000, sector: 'Power', exchange: 'NSE', week_52_high: 420, week_52_low: 280, pe_ratio: 18.2, roe: 12.5, roce: 10.8, debt_to_equity: 1.5, dividend_yield: 2.5, promoter_holding: 51.1, avg_volume_10d: 16000000 },
  { symbol: 'POWERGRID', name: 'Power Grid Corp', ltp: 298.50, open: 294, high: 302, low: 292, prev_close: 292, change: 6.5, change_pct: 2.23, volume: 12000000, market_cap: 280000, sector: 'Power', exchange: 'NSE', week_52_high: 360, week_52_low: 240, pe_ratio: 15.2, roe: 18.5, roce: 14.2, debt_to_equity: 2.8, dividend_yield: 3.5, promoter_holding: 51.3, avg_volume_10d: 10000000 },
  { symbol: 'TATASTEEL', name: 'Tata Steel', ltp: 142.50, open: 140, high: 145, low: 138, prev_close: 138, change: 4.5, change_pct: 3.26, volume: 35000000, market_cap: 180000, sector: 'Metals', exchange: 'NSE', week_52_high: 185, week_52_low: 118, pe_ratio: 52.5, roe: 5.8, roce: 8.2, debt_to_equity: 0.8, dividend_yield: 2.5, promoter_holding: 33.2, avg_volume_10d: 30000000 },
  { symbol: 'JSWSTEEL', name: 'JSW Steel', ltp: 892.40, open: 880, high: 900, low: 875, prev_close: 872, change: 20.4, change_pct: 2.34, volume: 8500000, market_cap: 220000, sector: 'Metals', exchange: 'NSE', week_52_high: 1050, week_52_low: 720, pe_ratio: 28.5, roe: 12.5, roce: 15.8, debt_to_equity: 1.2, dividend_yield: 0.8, promoter_holding: 44.8, avg_volume_10d: 7500000 },
  { symbol: 'HCLTECH', name: 'HCL Technologies', ltp: 1380.20, open: 1365, high: 1395, low: 1358, prev_close: 1370, change: 10.2, change_pct: 0.74, volume: 3800000, market_cap: 380000, sector: 'Information Technology', exchange: 'NSE', week_52_high: 1580, week_52_low: 1150, pe_ratio: 24.5, roe: 22.8, roce: 28.5, debt_to_equity: 0.1, dividend_yield: 3.5, promoter_holding: 60.8, avg_volume_10d: 3200000 },
  { symbol: 'TECHM', name: 'Tech Mahindra', ltp: 1285.60, open: 1270, high: 1298, low: 1262, prev_close: 1265, change: 20.6, change_pct: 1.63, volume: 4200000, market_cap: 125000, sector: 'Information Technology', exchange: 'NSE', week_52_high: 1560, week_52_low: 1050, pe_ratio: 42.5, roe: 12.2, roce: 15.8, debt_to_equity: 0.1, dividend_yield: 2.5, promoter_holding: 35.2, avg_volume_10d: 3800000 },
  { symbol: 'ONGC', name: 'Oil & Natural Gas', ltp: 248.50, open: 245, high: 252, low: 243, prev_close: 242, change: 6.5, change_pct: 2.69, volume: 14000000, market_cap: 310000, sector: 'Oil & Gas', exchange: 'NSE', week_52_high: 320, week_52_low: 200, pe_ratio: 7.5, roe: 14.5, roce: 18.2, debt_to_equity: 0.4, dividend_yield: 4.2, promoter_holding: 58.9, avg_volume_10d: 12000000 },
  { symbol: 'COALINDIA', name: 'Coal India', ltp: 438.20, open: 432, high: 442, low: 428, prev_close: 430, change: 8.2, change_pct: 1.91, volume: 8500000, market_cap: 270000, sector: 'Mining', exchange: 'NSE', week_52_high: 530, week_52_low: 360, pe_ratio: 8.2, roe: 52.5, roce: 60.2, debt_to_equity: 0.08, dividend_yield: 5.5, promoter_holding: 63.1, avg_volume_10d: 7500000 },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Labs", ltp: 5820.00, open: 5780, high: 5860, low: 5750, prev_close: 5795, change: 25.0, change_pct: 0.43, volume: 1200000, market_cap: 98000, sector: 'Pharma', exchange: 'NSE', week_52_high: 6500, week_52_low: 4800, pe_ratio: 22.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.1, dividend_yield: 0.7, promoter_holding: 26.7, avg_volume_10d: 1000000 },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', ltp: 10250.00, open: 10180, high: 10320, low: 10150, prev_close: 10200, change: 50.0, change_pct: 0.49, volume: 800000, market_cap: 300000, sector: 'Cement', exchange: 'NSE', week_52_high: 11800, week_52_low: 8500, pe_ratio: 38.5, roe: 12.5, roce: 15.8, debt_to_equity: 0.4, dividend_yield: 0.4, promoter_holding: 60.4, avg_volume_10d: 700000 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', ltp: 2780.00, open: 2790, high: 2810, low: 2760, prev_close: 2800, change: -20.0, change_pct: -0.71, volume: 2200000, market_cap: 270000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 3400, week_52_low: 2500, pe_ratio: 55.2, roe: 28.5, roce: 35.2, debt_to_equity: 0.3, dividend_yield: 0.8, promoter_holding: 52.6, avg_volume_10d: 2000000 },
  { symbol: 'NESTLEIND', name: 'Nestle India', ltp: 2320.00, open: 2340, high: 2350, low: 2310, prev_close: 2345, change: -25.0, change_pct: -1.07, volume: 800000, market_cap: 224000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 2780, week_52_low: 2100, pe_ratio: 72.5, roe: 108.5, roce: 140.2, debt_to_equity: 0.5, dividend_yield: 1.5, promoter_holding: 62.8, avg_volume_10d: 700000 },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', ltp: 2680.00, open: 2650, high: 2710, low: 2640, prev_close: 2645, change: 35.0, change_pct: 1.32, volume: 5500000, market_cap: 330000, sector: 'Automobile', exchange: 'NSE', week_52_high: 3100, week_52_low: 2100, pe_ratio: 28.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.3, dividend_yield: 0.7, promoter_holding: 18.5, avg_volume_10d: 4800000 },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', ltp: 1620.00, open: 1635, high: 1640, low: 1608, prev_close: 1638, change: -18.0, change_pct: -1.10, volume: 2500000, market_cap: 260000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1900, week_52_low: 1380, pe_ratio: 32.5, roe: 12.5, roce: 14.8, debt_to_equity: 2.5, dividend_yield: 0.1, promoter_holding: 60.5, avg_volume_10d: 2200000 },
  { symbol: 'CIPLA', name: 'Cipla Ltd', ltp: 1450.00, open: 1435, high: 1465, low: 1428, prev_close: 1430, change: 20.0, change_pct: 1.40, volume: 3200000, market_cap: 118000, sector: 'Pharma', exchange: 'NSE', week_52_high: 1680, week_52_low: 1150, pe_ratio: 28.5, roe: 15.2, roce: 19.8, debt_to_equity: 0.08, dividend_yield: 0.7, promoter_holding: 33.5, avg_volume_10d: 2800000 },
  { symbol: 'DIVISLAB', name: "Divi's Laboratories", ltp: 4520.00, open: 4480, high: 4560, low: 4460, prev_close: 4490, change: 30.0, change_pct: 0.67, volume: 900000, market_cap: 120000, sector: 'Pharma', exchange: 'NSE', week_52_high: 5200, week_52_low: 3500, pe_ratio: 62.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.02, dividend_yield: 0.8, promoter_holding: 51.9, avg_volume_10d: 800000 },
  { symbol: 'EICHERMOT', name: 'Eicher Motors', ltp: 4680.00, open: 4650, high: 4720, low: 4630, prev_close: 4640, change: 40.0, change_pct: 0.86, volume: 1500000, market_cap: 128000, sector: 'Automobile', exchange: 'NSE', week_52_high: 5200, week_52_low: 3800, pe_ratio: 35.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.01, dividend_yield: 0.6, promoter_holding: 49.2, avg_volume_10d: 1300000 },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp', ltp: 4850.00, open: 4820, high: 4880, low: 4800, prev_close: 4810, change: 40.0, change_pct: 0.83, volume: 1800000, market_cap: 97000, sector: 'Automobile', exchange: 'NSE', week_52_high: 5500, week_52_low: 3800, pe_ratio: 22.5, roe: 22.8, roce: 28.5, debt_to_equity: 0.01, dividend_yield: 3.2, promoter_holding: 34.8, avg_volume_10d: 1500000 },
  { symbol: 'GRASIM', name: 'Grasim Industries', ltp: 2580.00, open: 2560, high: 2610, low: 2540, prev_close: 2545, change: 35.0, change_pct: 1.37, volume: 2200000, market_cap: 170000, sector: 'Cement', exchange: 'NSE', week_52_high: 2950, week_52_low: 2100, pe_ratio: 18.5, roe: 8.5, roce: 10.2, debt_to_equity: 0.5, dividend_yield: 0.5, promoter_holding: 42.6, avg_volume_10d: 1900000 },
  { symbol: 'TATAPOWER', name: 'Tata Power', ltp: 418.50, open: 412, high: 425, low: 408, prev_close: 408, change: 10.5, change_pct: 2.57, volume: 28000000, market_cap: 134000, sector: 'Power', exchange: 'NSE', week_52_high: 480, week_52_low: 320, pe_ratio: 38.5, roe: 10.2, roce: 12.5, debt_to_equity: 1.8, dividend_yield: 0.5, promoter_holding: 46.9, avg_volume_10d: 24000000 },
  { symbol: 'HINDALCO', name: 'Hindalco Industries', ltp: 568.20, open: 558, high: 575, low: 555, prev_close: 555, change: 13.2, change_pct: 2.38, volume: 9500000, market_cap: 128000, sector: 'Metals', exchange: 'NSE', week_52_high: 680, week_52_low: 450, pe_ratio: 12.5, roe: 12.8, roce: 14.5, debt_to_equity: 0.8, dividend_yield: 0.6, promoter_holding: 34.6, avg_volume_10d: 8500000 },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank', ltp: 1380.00, open: 1395, high: 1405, low: 1368, prev_close: 1402, change: -22.0, change_pct: -1.57, volume: 6500000, market_cap: 107000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1700, week_52_low: 1100, pe_ratio: 12.5, roe: 14.5, roce: 12.8, debt_to_equity: 9.5, dividend_yield: 1.2, promoter_holding: 16.5, avg_volume_10d: 5800000 },
  { symbol: 'VEDL', name: 'Vedanta Ltd', ltp: 438.60, open: 430, high: 445, low: 425, prev_close: 425, change: 13.6, change_pct: 3.20, volume: 18000000, market_cap: 163000, sector: 'Metals', exchange: 'NSE', week_52_high: 520, week_52_low: 280, pe_ratio: 15.5, roe: 28.5, roce: 22.8, debt_to_equity: 1.5, dividend_yield: 8.5, promoter_holding: 68.1, avg_volume_10d: 15000000 },
  { symbol: 'ZOMATO', name: 'Zomato Ltd', ltp: 245.80, open: 242, high: 250, low: 238, prev_close: 240, change: 5.8, change_pct: 2.42, volume: 32000000, market_cap: 215000, sector: 'Consumer Services', exchange: 'NSE', week_52_high: 310, week_52_low: 150, pe_ratio: 250, roe: 2.5, roce: 3.2, debt_to_equity: 0.01, dividend_yield: 0, promoter_holding: 0, avg_volume_10d: 28000000 },
  { symbol: 'PAYTM', name: 'One 97 Communications', ltp: 685.00, open: 678, high: 695, low: 670, prev_close: 672, change: 13.0, change_pct: 1.93, volume: 12000000, market_cap: 44000, sector: 'Consumer Services', exchange: 'NSE', week_52_high: 850, week_52_low: 400, pe_ratio: -1, roe: -12.5, roce: -10.2, debt_to_equity: 0.01, dividend_yield: 0, promoter_holding: 0, avg_volume_10d: 10000000 },
  { symbol: 'IRCTC', name: 'IRCTC', ltp: 895.00, open: 885, high: 905, low: 878, prev_close: 880, change: 15.0, change_pct: 1.70, volume: 5200000, market_cap: 72000, sector: 'Consumer Services', exchange: 'NSE', week_52_high: 1050, week_52_low: 650, pe_ratio: 58.5, roe: 35.2, roce: 45.8, debt_to_equity: 0.01, dividend_yield: 0.8, promoter_holding: 62.4, avg_volume_10d: 4500000 },
  { symbol: 'HAL', name: 'Hindustan Aeronautics', ltp: 4120.00, open: 4080, high: 4160, low: 4050, prev_close: 4060, change: 60.0, change_pct: 1.48, volume: 3800000, market_cap: 275000, sector: 'Defence', exchange: 'NSE', week_52_high: 5100, week_52_low: 3200, pe_ratio: 32.5, roe: 25.8, roce: 32.5, debt_to_equity: 0.01, dividend_yield: 1.2, promoter_holding: 71.6, avg_volume_10d: 3200000 },
  { symbol: 'BEL', name: 'Bharat Electronics', ltp: 285.40, open: 280, high: 290, low: 278, prev_close: 278, change: 7.4, change_pct: 2.66, volume: 25000000, market_cap: 208000, sector: 'Defence', exchange: 'NSE', week_52_high: 340, week_52_low: 210, pe_ratio: 42.5, roe: 22.5, roce: 28.8, debt_to_equity: 0.01, dividend_yield: 0.8, promoter_holding: 51.1, avg_volume_10d: 22000000 },
  { symbol: 'TRENT', name: 'Trent Ltd', ltp: 5850.00, open: 5800, high: 5920, low: 5780, prev_close: 5790, change: 60.0, change_pct: 1.04, volume: 1800000, market_cap: 210000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 7200, week_52_low: 4200, pe_ratio: 180, roe: 18.5, roce: 22.8, debt_to_equity: 0.5, dividend_yield: 0.1, promoter_holding: 36.3, avg_volume_10d: 1500000 },
  { symbol: 'ADANIPORTS', name: 'Adani Ports', ltp: 1285, open: 1252.5, high: 1292.16, low: 1246.36, prev_close: 1264.51, change: 20.49, change_pct: 1.62, volume: 18543544, market_cap: 310000, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 1630.89, week_52_low: 1057.61, pe_ratio: 28.5, roe: 18.2, roce: 22.5, debt_to_equity: 0.8, dividend_yield: 0.4, promoter_holding: 65.1, avg_volume_10d: 13625342 },
  { symbol: 'ADANIGREEN', name: 'Adani Green Energy', ltp: 1820, open: 1805.05, high: 1828.81, low: 1789.58, prev_close: 1822.19, change: -2.19, change_pct: -0.12, volume: 1150131, market_cap: 290000, sector: 'Power', exchange: 'NSE', week_52_high: 2092.47, week_52_low: 1387.7, pe_ratio: 180, roe: 8.5, roce: 6.2, debt_to_equity: 5.8, dividend_yield: 0, promoter_holding: 56.4, avg_volume_10d: 1055793 },
  { symbol: 'ADANIPOWER', name: 'Adani Power', ltp: 548, open: 558.7, high: 565.7, low: 546.86, prev_close: 557.7, change: -9.7, change_pct: -1.74, volume: 20242571, market_cap: 210000, sector: 'Power', exchange: 'NSE', week_52_high: 698.45, week_52_low: 375.41, pe_ratio: 12.5, roe: 42.5, roce: 35.2, debt_to_equity: 2.2, dividend_yield: 0, promoter_holding: 75.0, avg_volume_10d: 15428721 },
  { symbol: 'AMBUJACEM', name: 'Ambuja Cements', ltp: 625, open: 598.08, high: 627.0, low: 596.13, prev_close: 600.04, change: 24.96, change_pct: 4.16, volume: 21263611, market_cap: 125000, sector: 'Cement', exchange: 'NSE', week_52_high: 781.83, week_52_low: 501.11, pe_ratio: 32.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.3, dividend_yield: 0.8, promoter_holding: 63.2, avg_volume_10d: 21091220 },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals', ltp: 6450, open: 6459.99, high: 6504.7, low: 6390.81, prev_close: 6399.44, change: 50.56, change_pct: 0.79, volume: 20820414, market_cap: 93000, sector: 'Healthcare', exchange: 'NSE', week_52_high: 8092.36, week_52_low: 5259.5, pe_ratio: 85.2, roe: 15.2, roce: 18.5, debt_to_equity: 0.5, dividend_yield: 0.3, promoter_holding: 29.3, avg_volume_10d: 19382574 },
  { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma', ltp: 1180, open: 1144.79, high: 1185.86, low: 1138.19, prev_close: 1155.28, change: 24.72, change_pct: 2.14, volume: 2454903, market_cap: 69000, sector: 'Pharma', exchange: 'NSE', week_52_high: 1366.67, week_52_low: 737.8, pe_ratio: 18.5, roe: 16.8, roce: 20.2, debt_to_equity: 0.3, dividend_yield: 0.8, promoter_holding: 51.8, avg_volume_10d: 1991391 },
  { symbol: 'BAJAJ_AUTO', name: 'Bajaj Auto', ltp: 9250, open: 9080.62, high: 9313.01, low: 9037.73, prev_close: 9105.23, change: 144.77, change_pct: 1.59, volume: 7040956, market_cap: 260000, sector: 'Automobile', exchange: 'NSE', week_52_high: 12341.01, week_52_low: 7048.58, pe_ratio: 32.5, roe: 25.8, roce: 32.5, debt_to_equity: 0.01, dividend_yield: 1.5, promoter_holding: 54.6, avg_volume_10d: 6644215 },
  { symbol: 'BANKBARODA', name: 'Bank of Baroda', ltp: 258, open: 264.82, high: 265.91, low: 256.21, prev_close: 263.61, change: -5.61, change_pct: -2.13, volume: 24743322, market_cap: 133000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 325.08, week_52_low: 190.72, pe_ratio: 6.8, roe: 15.2, roce: 12.5, debt_to_equity: 14.5, dividend_yield: 2.8, promoter_holding: 63.9, avg_volume_10d: 24096177 },
  { symbol: 'BERGEPAINT', name: 'Berger Paints', ltp: 548, open: 533.73, high: 550.73, low: 532.44, prev_close: 530.8, change: 17.2, change_pct: 3.24, volume: 8228599, market_cap: 53000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 639.48, week_52_low: 357.7, pe_ratio: 62.5, roe: 22.5, roce: 28.8, debt_to_equity: 0.2, dividend_yield: 0.5, promoter_holding: 75.1, avg_volume_10d: 8863549 },
  { symbol: 'BIOCON', name: 'Biocon Ltd', ltp: 345, open: 332.06, high: 348.63, low: 329.69, prev_close: 333.3, change: 11.7, change_pct: 3.51, volume: 22906415, market_cap: 41000, sector: 'Pharma', exchange: 'NSE', week_52_high: 419.08, week_52_low: 229.85, pe_ratio: 45.2, roe: 8.5, roce: 10.2, debt_to_equity: 0.5, dividend_yield: 0.3, promoter_holding: 60.7, avg_volume_10d: 18294231 },
  { symbol: 'BPCL', name: 'Bharat Petroleum', ltp: 315, open: 310.43, high: 318.02, low: 306.19, prev_close: 311.91, change: 3.09, change_pct: 0.99, volume: 10285312, market_cap: 136000, sector: 'Oil & Gas', exchange: 'NSE', week_52_high: 363.77, week_52_low: 267.56, pe_ratio: 5.8, roe: 28.5, roce: 32.2, debt_to_equity: 0.8, dividend_yield: 4.5, promoter_holding: 52.9, avg_volume_10d: 9295973 },
  { symbol: 'BRITANNIA', name: 'Britannia Industries', ltp: 5420, open: 5523.92, high: 5542.84, low: 5364.95, prev_close: 5574.41, change: -154.41, change_pct: -2.77, volume: 19905944, market_cap: 130000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 6534.03, week_52_low: 3338.08, pe_ratio: 55.2, roe: 42.5, roce: 52.8, debt_to_equity: 0.5, dividend_yield: 1.5, promoter_holding: 50.6, avg_volume_10d: 16972757 },
  { symbol: 'CANBK', name: 'Canara Bank', ltp: 112, open: 107.27, high: 113.64, low: 105.86, prev_close: 107.21, change: 4.79, change_pct: 4.47, volume: 781285, market_cap: 102000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 143.38, week_52_low: 86.29, pe_ratio: 5.2, roe: 16.8, roce: 14.2, debt_to_equity: 12.8, dividend_yield: 3.2, promoter_holding: 62.9, avg_volume_10d: 714710 },
  { symbol: 'CHOLAFIN', name: 'Cholamandalam Inv', ltp: 1345, open: 1367.52, high: 1372.24, low: 1334.71, prev_close: 1363.68, change: -18.68, change_pct: -1.37, volume: 11616230, market_cap: 113000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1800.22, week_52_low: 1101.51, pe_ratio: 28.5, roe: 20.2, roce: 14.5, debt_to_equity: 5.2, dividend_yield: 0.2, promoter_holding: 51.3, avg_volume_10d: 9355196 },
  { symbol: 'COLPAL', name: 'Colgate-Palmolive', ltp: 2780, open: 2748.39, high: 2818.54, low: 2711.79, prev_close: 2766.17, change: 13.83, change_pct: 0.5, volume: 7811897, market_cap: 75500, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 3502.07, week_52_low: 2091.23, pe_ratio: 48.5, roe: 62.5, roce: 72.8, debt_to_equity: 0.3, dividend_yield: 2.2, promoter_holding: 51.0, avg_volume_10d: 5945913 },
  { symbol: 'CONCOR', name: 'Container Corp', ltp: 845, open: 824.24, high: 855.24, low: 816.91, prev_close: 823.59, change: 21.41, change_pct: 2.6, volume: 514011, market_cap: 51500, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 997.98, week_52_low: 511.11, pe_ratio: 32.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.1, dividend_yield: 1.8, promoter_holding: 54.8, avg_volume_10d: 550834 },
  { symbol: 'COFORGE', name: 'Coforge Ltd', ltp: 5680, open: 5522.72, high: 5714.07, low: 5507.52, prev_close: 5486.33, change: 193.67, change_pct: 3.53, volume: 22011235, market_cap: 35000, sector: 'Information Technology', exchange: 'NSE', week_52_high: 7592.67, week_52_low: 3529.63, pe_ratio: 38.5, roe: 25.8, roce: 32.5, debt_to_equity: 0.2, dividend_yield: 1.2, promoter_holding: 0, avg_volume_10d: 19686764 },
  { symbol: 'CROMPTON', name: 'Crompton Greaves CE', ltp: 385, open: 398.77, high: 403.54, low: 383.59, prev_close: 396.7, change: -11.7, change_pct: -2.95, volume: 12144418, market_cap: 24500, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 476.42, week_52_low: 256.51, pe_ratio: 42.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.1, dividend_yield: 0.8, promoter_holding: 0, avg_volume_10d: 12739169 },
  { symbol: 'CUB', name: 'City Union Bank', ltp: 158, open: 157.26, high: 159.42, low: 155.45, prev_close: 158.17, change: -0.17, change_pct: -0.11, volume: 5428201, market_cap: 11700, sector: 'Financial Services', exchange: 'NSE', week_52_high: 186.11, week_52_low: 134.11, pe_ratio: 10.5, roe: 14.2, roce: 12.5, debt_to_equity: 8.5, dividend_yield: 1.5, promoter_holding: 0.3, avg_volume_10d: 5210808 },
  { symbol: 'DABUR', name: 'Dabur India', ltp: 548, open: 548.19, high: 550.15, low: 545.3, prev_close: 548.0, change: 0.0, change_pct: 0.0, volume: 8783096, market_cap: 97000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 683.4, week_52_low: 360.33, pe_ratio: 52.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.1, dividend_yield: 1.2, promoter_holding: 67.2, avg_volume_10d: 6921843 },
  { symbol: 'DALBHARAT', name: 'Dalmia Bharat', ltp: 1920, open: 1983.14, high: 1993.01, low: 1893.56, prev_close: 1977.95, change: -57.95, change_pct: -2.93, volume: 21561067, market_cap: 36000, sector: 'Cement', exchange: 'NSE', week_52_high: 2146.01, week_52_low: 1266.24, pe_ratio: 42.5, roe: 5.8, roce: 8.2, debt_to_equity: 0.3, dividend_yield: 0.2, promoter_holding: 56.4, avg_volume_10d: 20862296 },
  { symbol: 'DEEPAKNTR', name: 'Deepak Nitrite', ltp: 2340, open: 2365.13, high: 2398.62, low: 2317.95, prev_close: 2382.65, change: -42.65, change_pct: -1.79, volume: 12080440, market_cap: 32000, sector: 'Chemicals', exchange: 'NSE', week_52_high: 3033.0, week_52_low: 1876.39, pe_ratio: 35.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.1, dividend_yield: 0.3, promoter_holding: 49.2, avg_volume_10d: 9376402 },
  { symbol: 'DELTACORP', name: 'Delta Corp', ltp: 142, open: 145.77, high: 146.86, low: 140.85, prev_close: 145.97, change: -3.97, change_pct: -2.72, volume: 18362358, market_cap: 3800, sector: 'Consumer Services', exchange: 'NSE', week_52_high: 180.1, week_52_low: 120.14, pe_ratio: 28.5, roe: 8.5, roce: 10.2, debt_to_equity: 0.1, dividend_yield: 0.5, promoter_holding: 34.7, avg_volume_10d: 13576524 },
  { symbol: 'DLF', name: 'DLF Ltd', ltp: 865, open: 864.64, high: 876.42, low: 860.12, prev_close: 867.43, change: -2.43, change_pct: -0.28, volume: 5160118, market_cap: 214000, sector: 'Real Estate', exchange: 'NSE', week_52_high: 1048.51, week_52_low: 610.23, pe_ratio: 52.5, roe: 8.5, roce: 10.2, debt_to_equity: 0.1, dividend_yield: 0.8, promoter_holding: 74.9, avg_volume_10d: 4187012 },
  { symbol: 'ESCORTS', name: 'Escorts Kubota', ltp: 3680, open: 3767.67, high: 3796.91, low: 3631.43, prev_close: 3736.04, change: -56.04, change_pct: -1.5, volume: 13982970, market_cap: 40000, sector: 'Automobile', exchange: 'NSE', week_52_high: 4094.54, week_52_low: 3127.34, pe_ratio: 28.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.1, dividend_yield: 0.5, promoter_holding: 48.5, avg_volume_10d: 14464138 },
  { symbol: 'EXIDEIND', name: 'Exide Industries', ltp: 478, open: 462.42, high: 484.23, low: 460.5, prev_close: 458.51, change: 19.49, change_pct: 4.25, volume: 12398207, market_cap: 40700, sector: 'Automobile', exchange: 'NSE', week_52_high: 551.34, week_52_low: 334.72, pe_ratio: 22.5, roe: 12.5, roce: 15.8, debt_to_equity: 0.2, dividend_yield: 1.5, promoter_holding: 46.0, avg_volume_10d: 8969534 },
  { symbol: 'FEDERALBNK', name: 'Federal Bank', ltp: 185, open: 187.67, high: 188.69, low: 182.74, prev_close: 185.87, change: -0.87, change_pct: -0.47, volume: 11647704, market_cap: 43800, sector: 'Financial Services', exchange: 'NSE', week_52_high: 223.06, week_52_low: 155.28, pe_ratio: 8.5, roe: 14.2, roce: 12.8, debt_to_equity: 10.2, dividend_yield: 1.5, promoter_holding: 0, avg_volume_10d: 12791148 },
  { symbol: 'GAIL', name: 'GAIL India', ltp: 198, open: 197.0, high: 198.79, low: 195.85, prev_close: 196.14, change: 1.86, change_pct: 0.95, volume: 24233379, market_cap: 130000, sector: 'Oil & Gas', exchange: 'NSE', week_52_high: 246.47, week_52_low: 145.64, pe_ratio: 12.5, roe: 15.2, roce: 18.5, debt_to_equity: 0.2, dividend_yield: 3.2, promoter_holding: 51.9, avg_volume_10d: 24213755 },
  { symbol: 'GODREJCP', name: 'Godrej Consumer', ltp: 1245, open: 1286.19, high: 1297.17, low: 1228.71, prev_close: 1284.03, change: -39.03, change_pct: -3.04, volume: 4357101, market_cap: 127000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 1668.54, week_52_low: 771.93, pe_ratio: 52.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.3, dividend_yield: 1.2, promoter_holding: 63.2, avg_volume_10d: 3373833 },
  { symbol: 'GODREJPROP', name: 'Godrej Properties', ltp: 2680, open: 2655.92, high: 2693.55, low: 2646.47, prev_close: 2646.65, change: 33.35, change_pct: 1.26, volume: 22312039, market_cap: 74500, sector: 'Real Estate', exchange: 'NSE', week_52_high: 3112.96, week_52_low: 2006.33, pe_ratio: 85.2, roe: 5.8, roce: 8.2, debt_to_equity: 0.5, dividend_yield: 0, promoter_holding: 58.5, avg_volume_10d: 21146293 },
  { symbol: 'HAVELLS', name: 'Havells India', ltp: 1520, open: 1524.83, high: 1538.24, low: 1498.49, prev_close: 1522.28, change: -2.28, change_pct: -0.15, volume: 5504350, market_cap: 95200, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 1944.15, week_52_low: 1002.7, pe_ratio: 62.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.01, dividend_yield: 0.8, promoter_holding: 59.4, avg_volume_10d: 4724462 },
  { symbol: 'HDFCAMC', name: 'HDFC AMC', ltp: 4250, open: 4155.29, high: 4275.97, low: 4106.36, prev_close: 4171.98, change: 78.02, change_pct: 1.87, volume: 2277306, market_cap: 90500, sector: 'Financial Services', exchange: 'NSE', week_52_high: 5161.93, week_52_low: 3610.86, pe_ratio: 42.5, roe: 32.5, roce: 38.2, debt_to_equity: 0.01, dividend_yield: 1.5, promoter_holding: 52.6, avg_volume_10d: 2501480 },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance', ltp: 648, open: 663.59, high: 667.2, low: 638.84, prev_close: 667.42, change: -19.42, change_pct: -2.91, volume: 22081172, market_cap: 139000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 855.24, week_52_low: 448.66, pe_ratio: 82.5, roe: 10.2, roce: 12.5, debt_to_equity: 0, dividend_yield: 0.3, promoter_holding: 50.4, avg_volume_10d: 16850114 },
  { symbol: 'HINDPETRO', name: 'Hindustan Petroleum', ltp: 385, open: 374.69, high: 388.83, low: 369.13, prev_close: 373.17, change: 11.83, change_pct: 3.17, volume: 16522419, market_cap: 82000, sector: 'Oil & Gas', exchange: 'NSE', week_52_high: 424.25, week_52_low: 309.65, pe_ratio: 5.2, roe: 22.5, roce: 28.2, debt_to_equity: 1.2, dividend_yield: 5.2, promoter_holding: 51.3, avg_volume_10d: 13544277 },
  { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank', ltp: 78, open: 77.28, high: 78.29, low: 77.01, prev_close: 76.61, change: 1.39, change_pct: 1.81, volume: 3122381, market_cap: 54500, sector: 'Financial Services', exchange: 'NSE', week_52_high: 96.59, week_52_low: 52.11, pe_ratio: 18.5, roe: 10.2, roce: 8.5, debt_to_equity: 6.8, dividend_yield: 0, promoter_holding: 36.5, avg_volume_10d: 2941070 },
  { symbol: 'IEX', name: 'Indian Energy Exch', ltp: 165, open: 160.42, high: 166.69, low: 159.55, prev_close: 161.38, change: 3.62, change_pct: 2.24, volume: 12469030, market_cap: 14800, sector: 'Financial Services', exchange: 'NSE', week_52_high: 218.85, week_52_low: 133.9, pe_ratio: 38.5, roe: 35.2, roce: 42.5, debt_to_equity: 0.01, dividend_yield: 1.5, promoter_holding: 0, avg_volume_10d: 9188669 },
  { symbol: 'INDHOTEL', name: 'Indian Hotels', ltp: 685, open: 682.69, high: 686.4, low: 674.48, prev_close: 685.75, change: -0.75, change_pct: -0.11, volume: 16109277, market_cap: 97000, sector: 'Consumer Services', exchange: 'NSE', week_52_high: 798.36, week_52_low: 537.94, pe_ratio: 72.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.3, dividend_yield: 0.3, promoter_holding: 38.2, avg_volume_10d: 14831362 },
  { symbol: 'INDIGO', name: 'InterGlobe Aviation', ltp: 4580, open: 4538.72, high: 4593.64, low: 4477.54, prev_close: 4583.67, change: -3.67, change_pct: -0.08, volume: 22646250, market_cap: 177000, sector: 'Consumer Services', exchange: 'NSE', week_52_high: 5662.7, week_52_low: 3703.61, pe_ratio: 22.5, roe: 45.2, roce: 52.8, debt_to_equity: 2.5, dividend_yield: 0, promoter_holding: 75.0, avg_volume_10d: 21129037 },
  { symbol: 'IOC', name: 'Indian Oil Corp', ltp: 142, open: 144.29, high: 145.16, low: 140.06, prev_close: 145.37, change: -3.37, change_pct: -2.32, volume: 20004996, market_cap: 200000, sector: 'Oil & Gas', exchange: 'NSE', week_52_high: 186.75, week_52_low: 117.11, pe_ratio: 5.8, roe: 18.5, roce: 22.8, debt_to_equity: 0.8, dividend_yield: 8.5, promoter_holding: 51.5, avg_volume_10d: 15684529 },
  { symbol: 'IRFC', name: 'IRFC Ltd', ltp: 158, open: 159.14, high: 161.07, low: 155.87, prev_close: 160.41, change: -2.41, change_pct: -1.5, volume: 10456246, market_cap: 206000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 198.32, week_52_low: 100.9, pe_ratio: 28.5, roe: 14.2, roce: 12.8, debt_to_equity: 8.5, dividend_yield: 1.2, promoter_holding: 86.4, avg_volume_10d: 11208598 },
  { symbol: 'JINDALSTEL', name: 'Jindal Steel & Power', ltp: 892, open: 870.71, high: 903.19, low: 858.99, prev_close: 862.5, change: 29.5, change_pct: 3.42, volume: 1107265, market_cap: 91000, sector: 'Metals', exchange: 'NSE', week_52_high: 1145.45, week_52_low: 609.28, pe_ratio: 15.5, roe: 15.2, roce: 18.5, debt_to_equity: 0.5, dividend_yield: 0.5, promoter_holding: 61.2, avg_volume_10d: 1187349 },
  { symbol: 'JSWENERGY', name: 'JSW Energy', ltp: 545, open: 533.4, high: 551.83, low: 530.48, prev_close: 529.54, change: 15.46, change_pct: 2.92, volume: 19790675, market_cap: 95000, sector: 'Power', exchange: 'NSE', week_52_high: 614.23, week_52_low: 445.83, pe_ratio: 62.5, roe: 8.5, roce: 6.2, debt_to_equity: 1.2, dividend_yield: 0.3, promoter_holding: 69.9, avg_volume_10d: 20650328 },
  { symbol: 'JUBLFOOD', name: 'Jubilant FoodWorks', ltp: 548, open: 561.12, high: 565.6, low: 544.73, prev_close: 557.59, change: -9.59, change_pct: -1.72, volume: 19985964, market_cap: 36200, sector: 'Consumer Services', exchange: 'NSE', week_52_high: 633.98, week_52_low: 332.04, pe_ratio: 125, roe: 12.8, roce: 15.2, debt_to_equity: 0.5, dividend_yield: 0, promoter_holding: 41.9, avg_volume_10d: 15534128 },
  { symbol: 'LICI', name: 'LIC of India', ltp: 945, open: 960.24, high: 974.23, low: 939.68, prev_close: 953.29, change: -8.29, change_pct: -0.87, volume: 16216302, market_cap: 597000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1133.92, week_52_low: 798.8, pe_ratio: 12.5, roe: 78.5, roce: 12.8, debt_to_equity: 0, dividend_yield: 1.2, promoter_holding: 96.5, avg_volume_10d: 14829585 },
  { symbol: 'LTIM', name: 'LTIMindtree', ltp: 5280, open: 5037.38, high: 5357.17, low: 5015.61, prev_close: 5076.43, change: 203.57, change_pct: 4.01, volume: 24082090, market_cap: 156000, sector: 'Information Technology', exchange: 'NSE', week_52_high: 6158.42, week_52_low: 3311.09, pe_ratio: 32.5, roe: 25.8, roce: 32.5, debt_to_equity: 0.1, dividend_yield: 1.2, promoter_holding: 68.6, avg_volume_10d: 21043544 },
  { symbol: 'LUPIN', name: 'Lupin Ltd', ltp: 2080, open: 2025.07, high: 2100.55, low: 2007.56, prev_close: 2032.64, change: 47.36, change_pct: 2.33, volume: 9937288, market_cap: 95000, sector: 'Pharma', exchange: 'NSE', week_52_high: 2587.83, week_52_low: 1380.46, pe_ratio: 32.5, roe: 15.2, roce: 18.5, debt_to_equity: 0.3, dividend_yield: 0.5, promoter_holding: 47.0, avg_volume_10d: 9773462 },
  { symbol: 'MAXHEALTH', name: 'Max Healthcare', ltp: 885, open: 924.81, high: 933.13, low: 874.95, prev_close: 917.0, change: -32.0, change_pct: -3.49, volume: 18677776, market_cap: 86000, sector: 'Healthcare', exchange: 'NSE', week_52_high: 1121.88, week_52_low: 611.58, pe_ratio: 72.5, roe: 15.2, roce: 18.5, debt_to_equity: 0.2, dividend_yield: 0, promoter_holding: 24.3, avg_volume_10d: 13597225 },
  { symbol: 'MCDOWELL_N', name: 'United Spirits', ltp: 1285, open: 1257.86, high: 1292.81, low: 1241.48, prev_close: 1262.15, change: 22.85, change_pct: 1.81, volume: 18133979, market_cap: 93500, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 1509.98, week_52_low: 870.36, pe_ratio: 82.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.5, dividend_yield: 0, promoter_holding: 55.9, avg_volume_10d: 15656100 },
  { symbol: 'MCX', name: 'Multi Commodity Exch', ltp: 5420, open: 5413.01, high: 5439.81, low: 5372.6, prev_close: 5435.22, change: -15.22, change_pct: -0.28, volume: 23538909, market_cap: 27600, sector: 'Financial Services', exchange: 'NSE', week_52_high: 6879.77, week_52_low: 4475.3, pe_ratio: 35.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.01, dividend_yield: 0.8, promoter_holding: 0, avg_volume_10d: 22272656 },
  { symbol: 'METROPOLIS', name: 'Metropolis Health', ltp: 1845, open: 1867.12, high: 1870.86, low: 1834.43, prev_close: 1865.33, change: -20.33, change_pct: -1.09, volume: 11032259, market_cap: 9500, sector: 'Healthcare', exchange: 'NSE', week_52_high: 2297.02, week_52_low: 1408.98, pe_ratio: 42.5, roe: 15.2, roce: 18.5, debt_to_equity: 0.1, dividend_yield: 0.5, promoter_holding: 49.8, avg_volume_10d: 9774529 },
  { symbol: 'MFSL', name: 'Max Financial Serv', ltp: 1045, open: 1038.6, high: 1053.52, low: 1024.36, prev_close: 1044.58, change: 0.42, change_pct: 0.04, volume: 20002606, market_cap: 36000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1193.83, week_52_low: 649.15, pe_ratio: 125, roe: 8.5, roce: 6.2, debt_to_equity: 0.3, dividend_yield: 0, promoter_holding: 12.3, avg_volume_10d: 18125977 },
  { symbol: 'MOTHERSON', name: 'Samvardhana Motherson', ltp: 148, open: 145.25, high: 149.87, low: 143.54, prev_close: 145.73, change: 2.27, change_pct: 1.56, volume: 16983493, market_cap: 100000, sector: 'Automobile', exchange: 'NSE', week_52_high: 171.11, week_52_low: 96.17, pe_ratio: 42.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.5, dividend_yield: 0.5, promoter_holding: 22.6, avg_volume_10d: 12054376 },
  { symbol: 'MPHASIS', name: 'MphasiS Ltd', ltp: 2680, open: 2720.57, high: 2756.06, low: 2672.1, prev_close: 2721.92, change: -41.92, change_pct: -1.54, volume: 10653804, market_cap: 50500, sector: 'Information Technology', exchange: 'NSE', week_52_high: 3369.94, week_52_low: 1738.27, pe_ratio: 28.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.1, dividend_yield: 2.2, promoter_holding: 55.5, avg_volume_10d: 10425191 },
  { symbol: 'MRF', name: 'MRF Ltd', ltp: 125000, open: 123790.52, high: 126316.09, low: 123534.02, prev_close: 124427.63, change: 572.37, change_pct: 0.46, volume: 18898629, market_cap: 53000, sector: 'Automobile', exchange: 'NSE', week_52_high: 161563.94, week_52_low: 78330.85, pe_ratio: 28.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.1, dividend_yield: 0.1, promoter_holding: 27.6, avg_volume_10d: 16442912 },
  { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance', ltp: 1850, open: 1906.8, high: 1923.45, low: 1845.09, prev_close: 1889.49, change: -39.49, change_pct: -2.09, volume: 6605357, market_cap: 74200, sector: 'Financial Services', exchange: 'NSE', week_52_high: 2427.36, week_52_low: 1321.11, pe_ratio: 15.5, roe: 18.5, roce: 14.2, debt_to_equity: 3.5, dividend_yield: 1.5, promoter_holding: 73.4, avg_volume_10d: 6741207 },
  { symbol: 'NAM_INDIA', name: 'Nippon Life India AMC', ltp: 625, open: 619.7, high: 631.09, low: 610.81, prev_close: 613.71, change: 11.29, change_pct: 1.84, volume: 22339935, market_cap: 38500, sector: 'Financial Services', exchange: 'NSE', week_52_high: 783.23, week_52_low: 487.39, pe_ratio: 32.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.01, dividend_yield: 2.5, promoter_holding: 73.6, avg_volume_10d: 20148639 },
  { symbol: 'NATIONALUM', name: 'National Aluminium', ltp: 158, open: 153.34, high: 160.16, low: 151.55, prev_close: 153.19, change: 4.81, change_pct: 3.14, volume: 12129523, market_cap: 29000, sector: 'Metals', exchange: 'NSE', week_52_high: 184.04, week_52_low: 104.57, pe_ratio: 10.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.1, dividend_yield: 2.8, promoter_holding: 51.3, avg_volume_10d: 11584477 },
  { symbol: 'NAUKRI', name: 'Info Edge India', ltp: 6850, open: 6677.3, high: 6919.51, low: 6640.11, prev_close: 6674.46, change: 175.54, change_pct: 2.63, volume: 2398342, market_cap: 88500, sector: 'Information Technology', exchange: 'NSE', week_52_high: 8024.31, week_52_low: 4575.31, pe_ratio: 82.5, roe: 8.5, roce: 10.2, debt_to_equity: 0.01, dividend_yield: 0.3, promoter_holding: 39.1, avg_volume_10d: 1985548 },
  { symbol: 'NAVINFLUOR', name: 'Navin Fluorine', ltp: 3420, open: 3367.65, high: 3437.12, low: 3330.53, prev_close: 3392.18, change: 27.82, change_pct: 0.82, volume: 17807268, market_cap: 17000, sector: 'Chemicals', exchange: 'NSE', week_52_high: 3816.92, week_52_low: 2400.5, pe_ratio: 42.5, roe: 15.2, roce: 18.5, debt_to_equity: 0.1, dividend_yield: 0.3, promoter_holding: 28.8, avg_volume_10d: 16330056 },
  { symbol: 'NBCC', name: 'NBCC India', ltp: 108, open: 107.55, high: 108.81, low: 106.07, prev_close: 108.18, change: -0.18, change_pct: -0.17, volume: 14809945, market_cap: 19500, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 137.58, week_52_low: 87.93, pe_ratio: 52.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.1, dividend_yield: 0.8, promoter_holding: 61.8, avg_volume_10d: 14902326 },
  { symbol: 'NCC', name: 'NCC Ltd', ltp: 285, open: 283.49, high: 286.87, low: 280.15, prev_close: 286.32, change: -1.32, change_pct: -0.46, volume: 21409474, market_cap: 18000, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 381.43, week_52_low: 200.86, pe_ratio: 15.5, roe: 15.2, roce: 12.8, debt_to_equity: 0.8, dividend_yield: 0.8, promoter_holding: 22.2, avg_volume_10d: 21388198 },
  { symbol: 'NMDC', name: 'NMDC Ltd', ltp: 238, open: 236.44, high: 239.16, low: 235.29, prev_close: 235.95, change: 2.05, change_pct: 0.87, volume: 11177981, market_cap: 70000, sector: 'Mining', exchange: 'NSE', week_52_high: 263.53, week_52_low: 162.8, pe_ratio: 8.5, roe: 22.5, roce: 28.8, debt_to_equity: 0.1, dividend_yield: 4.5, promoter_holding: 60.8, avg_volume_10d: 10861160 },
  { symbol: 'OBEROIRLTY', name: 'Oberoi Realty', ltp: 1680, open: 1673.27, high: 1693.57, low: 1667.15, prev_close: 1684.55, change: -4.55, change_pct: -0.27, volume: 15745295, market_cap: 61000, sector: 'Real Estate', exchange: 'NSE', week_52_high: 1859.33, week_52_low: 1173.49, pe_ratio: 28.5, roe: 15.2, roce: 18.5, debt_to_equity: 0.2, dividend_yield: 0.3, promoter_holding: 67.7, avg_volume_10d: 14576313 },
  { symbol: 'OFSS', name: 'Oracle Fin Services', ltp: 11250, open: 11664.72, high: 11708.63, low: 11159.98, prev_close: 11631.51, change: -381.51, change_pct: -3.28, volume: 1731973, market_cap: 97000, sector: 'Information Technology', exchange: 'NSE', week_52_high: 13441.23, week_52_low: 7345.29, pe_ratio: 35.5, roe: 28.5, roce: 35.2, debt_to_equity: 0.01, dividend_yield: 2.8, promoter_holding: 73.0, avg_volume_10d: 1438816 },
  { symbol: 'PAGEIND', name: 'Page Industries', ltp: 42500, open: 41326.89, high: 43000.49, low: 40797.29, prev_close: 41427.04, change: 1072.96, change_pct: 2.59, volume: 6680652, market_cap: 47400, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 47620.25, week_52_low: 25705.95, pe_ratio: 82.5, roe: 35.2, roce: 42.5, debt_to_equity: 0.3, dividend_yield: 0.8, promoter_holding: 47.5, avg_volume_10d: 6117924 },
  { symbol: 'PEL', name: 'Piramal Enterprises', ltp: 1085, open: 1035.16, high: 1096.34, low: 1022.58, prev_close: 1038.28, change: 46.72, change_pct: 4.5, volume: 16467989, market_cap: 25800, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1398.09, week_52_low: 908.58, pe_ratio: 18.5, roe: 5.8, roce: 8.2, debt_to_equity: 1.5, dividend_yield: 0.5, promoter_holding: 46.1, avg_volume_10d: 12840820 },
  { symbol: 'PERSISTENT', name: 'Persistent Systems', ltp: 5120, open: 5260.09, high: 5279.24, low: 5065.2, prev_close: 5296.92, change: -176.92, change_pct: -3.34, volume: 14317254, market_cap: 39500, sector: 'Information Technology', exchange: 'NSE', week_52_high: 5910.99, week_52_low: 3967.32, pe_ratio: 52.5, roe: 25.8, roce: 32.5, debt_to_equity: 0.1, dividend_yield: 0.8, promoter_holding: 30.9, avg_volume_10d: 14414027 },
  { symbol: 'PETRONET', name: 'Petronet LNG', ltp: 342, open: 350.3, high: 354.41, low: 340.81, prev_close: 349.55, change: -7.55, change_pct: -2.16, volume: 20572878, market_cap: 51200, sector: 'Oil & Gas', exchange: 'NSE', week_52_high: 458.68, week_52_low: 214.44, pe_ratio: 15.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.3, dividend_yield: 3.5, promoter_holding: 50.0, avg_volume_10d: 14612326 },
  { symbol: 'PFC', name: 'Power Finance Corp', ltp: 445, open: 451.08, high: 457.6, low: 441.82, prev_close: 449.49, change: -4.49, change_pct: -1.0, volume: 18017860, market_cap: 147000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 497.95, week_52_low: 343.83, pe_ratio: 5.2, roe: 18.5, roce: 14.2, debt_to_equity: 8.5, dividend_yield: 3.2, promoter_holding: 55.9, avg_volume_10d: 17133128 },
  { symbol: 'PIDILITIND', name: 'Pidilite Industries', ltp: 2880, open: 2975.44, high: 3014.28, low: 2851.76, prev_close: 2959.31, change: -79.31, change_pct: -2.68, volume: 3465849, market_cap: 146000, sector: 'Chemicals', exchange: 'NSE', week_52_high: 3876.37, week_52_low: 2291.5, pe_ratio: 72.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.1, dividend_yield: 0.5, promoter_holding: 69.2, avg_volume_10d: 2907436 },
  { symbol: 'PIIND', name: 'PI Industries', ltp: 3850, open: 3842.73, high: 3883.02, low: 3818.0, prev_close: 3852.7, change: -2.7, change_pct: -0.07, volume: 21314602, market_cap: 58500, sector: 'Chemicals', exchange: 'NSE', week_52_high: 5026.49, week_52_low: 2411.58, pe_ratio: 38.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.1, dividend_yield: 0.3, promoter_holding: 46.1, avg_volume_10d: 23111743 },
  { symbol: 'PNB', name: 'Punjab National Bank', ltp: 108, open: 107.02, high: 109.21, low: 106.2, prev_close: 106.32, change: 1.68, change_pct: 1.58, volume: 18477984, market_cap: 119000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 144.87, week_52_low: 72.09, pe_ratio: 8.5, roe: 8.2, roce: 6.5, debt_to_equity: 15.2, dividend_yield: 2.5, promoter_holding: 73.2, avg_volume_10d: 18908145 },
  { symbol: 'POLYCAB', name: 'Polycab India', ltp: 6250, open: 6197.73, high: 6297.89, low: 6126.44, prev_close: 6199.78, change: 50.22, change_pct: 0.81, volume: 7075690, market_cap: 93800, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 8205.8, week_52_low: 5048.02, pe_ratio: 48.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.1, dividend_yield: 0.5, promoter_holding: 67.4, avg_volume_10d: 5198262 },
  { symbol: 'PVRINOX', name: 'PVR INOX', ltp: 1485, open: 1426.74, high: 1496.94, low: 1412.57, prev_close: 1434.09, change: 50.91, change_pct: 3.55, volume: 9785237, market_cap: 14600, sector: 'Consumer Services', exchange: 'NSE', week_52_high: 1644.15, week_52_low: 1206.92, pe_ratio: 125, roe: 2.5, roce: 5.8, debt_to_equity: 1.5, dividend_yield: 0, promoter_holding: 10.8, avg_volume_10d: 7561404 },
  { symbol: 'RAMCOCEM', name: 'Ramco Cements', ltp: 945, open: 968.05, high: 974.27, low: 932.3, prev_close: 962.32, change: -17.32, change_pct: -1.8, volume: 17679001, market_cap: 22400, sector: 'Cement', exchange: 'NSE', week_52_high: 1104.77, week_52_low: 569.4, pe_ratio: 32.5, roe: 8.5, roce: 10.2, debt_to_equity: 0.5, dividend_yield: 0.5, promoter_holding: 42.5, avg_volume_10d: 19079620 },
  { symbol: 'RBLBANK', name: 'RBL Bank', ltp: 248, open: 256.32, high: 258.46, low: 245.06, prev_close: 255.2, change: -7.2, change_pct: -2.82, volume: 17419928, market_cap: 14900, sector: 'Financial Services', exchange: 'NSE', week_52_high: 312.85, week_52_low: 179.23, pe_ratio: 12.5, roe: 8.5, roce: 6.2, debt_to_equity: 8.2, dividend_yield: 0, promoter_holding: 0, avg_volume_10d: 17719082 },
  { symbol: 'RECLTD', name: 'REC Ltd', ltp: 508, open: 519.51, high: 525.22, low: 504.96, prev_close: 522.42, change: -14.42, change_pct: -2.76, volume: 14748111, market_cap: 134000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 618.9, week_52_low: 372.23, pe_ratio: 5.8, roe: 22.5, roce: 14.2, debt_to_equity: 7.5, dividend_yield: 3.5, promoter_holding: 52.6, avg_volume_10d: 12833828 },
  { symbol: 'SAIL', name: 'Steel Authority', ltp: 128, open: 124.49, high: 129.43, low: 123.8, prev_close: 124.91, change: 3.09, change_pct: 2.47, volume: 6659390, market_cap: 52900, sector: 'Metals', exchange: 'NSE', week_52_high: 144.66, week_52_low: 82.96, pe_ratio: 18.5, roe: 8.5, roce: 10.2, debt_to_equity: 0.8, dividend_yield: 2.8, promoter_holding: 65.0, avg_volume_10d: 4980037 },
  { symbol: 'SBICARD', name: 'SBI Cards & Payment', ltp: 785, open: 782.93, high: 788.46, low: 779.16, prev_close: 778.85, change: 6.15, change_pct: 0.79, volume: 12362865, market_cap: 74200, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1005.7, week_52_low: 662.66, pe_ratio: 35.5, roe: 22.5, roce: 14.8, debt_to_equity: 3.5, dividend_yield: 0.2, promoter_holding: 69.5, avg_volume_10d: 11248411 },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance', ltp: 1580, open: 1587.06, high: 1594.24, low: 1572.17, prev_close: 1599.84, change: -19.84, change_pct: -1.24, volume: 4896317, market_cap: 158000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1743.59, week_52_low: 1158.98, pe_ratio: 72.5, roe: 12.8, roce: 15.2, debt_to_equity: 0, dividend_yield: 0.2, promoter_holding: 55.5, avg_volume_10d: 3964667 },
  { symbol: 'SHREECEM', name: 'Shree Cement', ltp: 25800, open: 24765.11, high: 26085.51, low: 24674.92, prev_close: 24738.71, change: 1061.29, change_pct: 4.29, volume: 21777299, market_cap: 93000, sector: 'Cement', exchange: 'NSE', week_52_high: 31546.17, week_52_low: 21109.04, pe_ratio: 42.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.2, dividend_yield: 0.3, promoter_holding: 64.8, avg_volume_10d: 20244736 },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Finance', ltp: 2680, open: 2669.87, high: 2691.78, low: 2662.75, prev_close: 2673.05, change: 6.95, change_pct: 0.26, volume: 23556058, market_cap: 101000, sector: 'Financial Services', exchange: 'NSE', week_52_high: 3268.08, week_52_low: 2158.82, pe_ratio: 15.5, roe: 18.5, roce: 14.2, debt_to_equity: 4.5, dividend_yield: 1.2, promoter_holding: 25.4, avg_volume_10d: 20264875 },
  { symbol: 'SIEMENS', name: 'Siemens Ltd', ltp: 5850, open: 6040.94, high: 6057.23, low: 5826.95, prev_close: 6025.34, change: -175.34, change_pct: -2.91, volume: 14289570, market_cap: 208000, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 6879.36, week_52_low: 4963.61, pe_ratio: 82.5, roe: 15.2, roce: 18.5, debt_to_equity: 0.1, dividend_yield: 0.3, promoter_holding: 75.0, avg_volume_10d: 10679747 },
  { symbol: 'SRF', name: 'SRF Ltd', ltp: 2480, open: 2421.82, high: 2510.45, low: 2409.87, prev_close: 2416.68, change: 63.32, change_pct: 2.62, volume: 13303027, market_cap: 73600, sector: 'Chemicals', exchange: 'NSE', week_52_high: 3007.32, week_52_low: 1762.49, pe_ratio: 42.5, roe: 15.2, roce: 18.5, debt_to_equity: 0.5, dividend_yield: 0.3, promoter_holding: 50.5, avg_volume_10d: 13889247 },
  { symbol: 'SUNTV', name: 'Sun TV Network', ltp: 758, open: 723.08, high: 765.64, low: 715.9, prev_close: 725.91, change: 32.09, change_pct: 4.42, volume: 18632187, market_cap: 29900, sector: 'Consumer Services', exchange: 'NSE', week_52_high: 1013.37, week_52_low: 494.18, pe_ratio: 18.5, roe: 25.8, roce: 32.5, debt_to_equity: 0.01, dividend_yield: 4.2, promoter_holding: 75.0, avg_volume_10d: 14615275 },
  { symbol: 'SYNGENE', name: 'Syngene International', ltp: 845, open: 824.53, high: 848.6, low: 822.08, prev_close: 830.22, change: 14.78, change_pct: 1.78, volume: 565555, market_cap: 33800, sector: 'Pharma', exchange: 'NSE', week_52_high: 1024.67, week_52_low: 632.44, pe_ratio: 52.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.2, dividend_yield: 0.2, promoter_holding: 54.2, avg_volume_10d: 461777 },
  { symbol: 'TATACOMM', name: 'Tata Communications', ltp: 1785, open: 1822.46, high: 1842.76, low: 1770.89, prev_close: 1814.95, change: -29.95, change_pct: -1.65, volume: 17340930, market_cap: 50900, sector: 'Telecom', exchange: 'NSE', week_52_high: 2375.8, week_52_low: 1422.57, pe_ratio: 52.5, roe: 18.5, roce: 15.2, debt_to_equity: 1.2, dividend_yield: 1.2, promoter_holding: 58.9, avg_volume_10d: 16474285 },
  { symbol: 'TATACONSUM', name: 'Tata Consumer', ltp: 1085, open: 1075.17, high: 1093.17, low: 1065.41, prev_close: 1065.92, change: 19.08, change_pct: 1.79, volume: 16367050, market_cap: 107000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 1439.91, week_52_low: 875.22, pe_ratio: 72.5, roe: 8.5, roce: 10.2, debt_to_equity: 0.3, dividend_yield: 0.8, promoter_holding: 33.8, avg_volume_10d: 11924442 },
  { symbol: 'TATAELXSI', name: 'Tata Elxsi', ltp: 6850, open: 6975.0, high: 7056.86, low: 6785.61, prev_close: 7001.94, change: -151.94, change_pct: -2.17, volume: 7570959, market_cap: 42700, sector: 'Information Technology', exchange: 'NSE', week_52_high: 7747.96, week_52_low: 5289.36, pe_ratio: 52.5, roe: 32.5, roce: 42.5, debt_to_equity: 0.01, dividend_yield: 1.2, promoter_holding: 43.9, avg_volume_10d: 7418733 },
  { symbol: 'TORNTPHARM', name: 'Torrent Pharma', ltp: 3280, open: 3152.66, high: 3307.62, low: 3143.06, prev_close: 3152.63, change: 127.37, change_pct: 4.04, volume: 1476589, market_cap: 55600, sector: 'Pharma', exchange: 'NSE', week_52_high: 3962.26, week_52_low: 2232.3, pe_ratio: 58.5, roe: 28.5, roce: 22.8, debt_to_equity: 0.8, dividend_yield: 0.8, promoter_holding: 52.1, avg_volume_10d: 1181488 },
  { symbol: 'TORNTPOWER', name: 'Torrent Power', ltp: 1580, open: 1640.02, high: 1661.12, low: 1565.03, prev_close: 1625.01, change: -45.01, change_pct: -2.77, volume: 23794263, market_cap: 76000, sector: 'Power', exchange: 'NSE', week_52_high: 2132.83, week_52_low: 1213.55, pe_ratio: 35.5, roe: 15.2, roce: 12.8, debt_to_equity: 1.2, dividend_yield: 1.5, promoter_holding: 52.0, avg_volume_10d: 19221110 },
  { symbol: 'TVSMOTOR', name: 'TVS Motor', ltp: 2450, open: 2543.44, high: 2564.08, low: 2424.35, prev_close: 2530.47, change: -80.47, change_pct: -3.18, volume: 22943783, market_cap: 116000, sector: 'Automobile', exchange: 'NSE', week_52_high: 2806.16, week_52_low: 1828.51, pe_ratio: 62.5, roe: 25.8, roce: 28.5, debt_to_equity: 0.5, dividend_yield: 0.3, promoter_holding: 50.3, avg_volume_10d: 21886393 },
  { symbol: 'UBL', name: 'United Breweries', ltp: 1845, open: 1822.08, high: 1857.04, low: 1810.54, prev_close: 1837.1, change: 7.9, change_pct: 0.43, volume: 16918270, market_cap: 48700, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 2425.13, week_52_low: 1259.12, pe_ratio: 72.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.1, dividend_yield: 0.5, promoter_holding: 61.5, avg_volume_10d: 16537092 },
  { symbol: 'UNIONBANK', name: 'Union Bank', ltp: 128, open: 130.69, high: 132.33, low: 126.83, prev_close: 129.54, change: -1.54, change_pct: -1.19, volume: 11643234, market_cap: 87500, sector: 'Financial Services', exchange: 'NSE', week_52_high: 150.86, week_52_low: 87.14, pe_ratio: 5.2, roe: 12.8, roce: 10.2, debt_to_equity: 14.5, dividend_yield: 3.5, promoter_holding: 76.8, avg_volume_10d: 12668698 },
  { symbol: 'UPL', name: 'UPL Ltd', ltp: 548, open: 549.64, high: 557.8, low: 542.22, prev_close: 549.48, change: -1.48, change_pct: -0.27, volume: 13793543, market_cap: 41200, sector: 'Chemicals', exchange: 'NSE', week_52_high: 659.41, week_52_low: 354.5, pe_ratio: 22.5, roe: 8.5, roce: 10.2, debt_to_equity: 1.2, dividend_yield: 1.2, promoter_holding: 32.5, avg_volume_10d: 11651567 },
  { symbol: 'VOLTAS', name: 'Voltas Ltd', ltp: 1285, open: 1256.19, high: 1300.27, low: 1250.35, prev_close: 1253.05, change: 31.95, change_pct: 2.55, volume: 13955881, market_cap: 42500, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 1711.51, week_52_low: 911.74, pe_ratio: 62.5, roe: 8.5, roce: 10.2, debt_to_equity: 0.1, dividend_yield: 0.3, promoter_holding: 30.3, avg_volume_10d: 13666994 },
  { symbol: 'WHIRLPOOL', name: 'Whirlpool India', ltp: 1345, open: 1392.97, high: 1406.78, low: 1338.13, prev_close: 1379.91, change: -34.91, change_pct: -2.53, volume: 4380265, market_cap: 17000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 1664.72, week_52_low: 992.69, pe_ratio: 52.5, roe: 8.5, roce: 12.5, debt_to_equity: 0.01, dividend_yield: 0.8, promoter_holding: 75.0, avg_volume_10d: 3229497 },
  { symbol: 'YESBANK', name: 'Yes Bank', ltp: 22.5, open: 21.72, high: 22.68, low: 21.64, prev_close: 21.54, change: 0.96, change_pct: 4.44, volume: 20887507, market_cap: 70500, sector: 'Financial Services', exchange: 'NSE', week_52_high: 27.55, week_52_low: 17.53, pe_ratio: 42.5, roe: 2.5, roce: 1.8, debt_to_equity: 8.5, dividend_yield: 0, promoter_holding: 0, avg_volume_10d: 18872882 },
  { symbol: 'ZEEL', name: 'Zee Entertainment', ltp: 138, open: 140.77, high: 142.85, low: 137.29, prev_close: 139.83, change: -1.83, change_pct: -1.31, volume: 14005994, market_cap: 13200, sector: 'Consumer Services', exchange: 'NSE', week_52_high: 165.03, week_52_low: 114.6, pe_ratio: 28.5, roe: 5.8, roce: 8.2, debt_to_equity: 0.3, dividend_yield: 0.5, promoter_holding: 3.5, avg_volume_10d: 12651563 },
  { symbol: 'ZYDUSLIFE', name: 'Zydus Lifesciences', ltp: 985, open: 958.35, high: 990.51, low: 946.59, prev_close: 951.42, change: 33.58, change_pct: 3.53, volume: 10666089, market_cap: 99000, sector: 'Pharma', exchange: 'NSE', week_52_high: 1313.56, week_52_low: 716.03, pe_ratio: 22.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.1, dividend_yield: 0.5, promoter_holding: 75.0, avg_volume_10d: 10967083 },
  { symbol: 'AARTIIND', name: 'Aarti Industries', ltp: 585, open: 589.96, high: 595.64, low: 576.23, prev_close: 592.35, change: -7.35, change_pct: -1.24, volume: 12496188, market_cap: 21100, sector: 'Chemicals', exchange: 'NSE', week_52_high: 665.23, week_52_low: 429.77, pe_ratio: 35.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.5, dividend_yield: 0.5, promoter_holding: 43.0, avg_volume_10d: 10472425 },
  { symbol: 'ACC', name: 'ACC Ltd', ltp: 2280, open: 2261.18, high: 2298.06, low: 2247.2, prev_close: 2259.22, change: 20.78, change_pct: 0.92, volume: 5121983, market_cap: 42800, sector: 'Cement', exchange: 'NSE', week_52_high: 2905.57, week_52_low: 1693.92, pe_ratio: 18.5, roe: 12.5, roce: 15.8, debt_to_equity: 0.2, dividend_yield: 0.8, promoter_holding: 56.7, avg_volume_10d: 4063909 },
  { symbol: 'ABCAPITAL', name: 'Aditya Birla Capital', ltp: 198, open: 191.03, high: 200.31, low: 188.9, prev_close: 192.79, change: 5.21, change_pct: 2.7, volume: 20379518, market_cap: 48500, sector: 'Financial Services', exchange: 'NSE', week_52_high: 236.91, week_52_low: 151.65, pe_ratio: 22.5, roe: 12.8, roce: 10.2, debt_to_equity: 5.8, dividend_yield: 0.2, promoter_holding: 71.4, avg_volume_10d: 20956238 },
  { symbol: 'ABFRL', name: 'Aditya Birla Fashion', ltp: 285, open: 273.09, high: 285.71, low: 270.76, prev_close: 273.12, change: 11.88, change_pct: 4.35, volume: 14959420, market_cap: 27500, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 375.47, week_52_low: 233.29, pe_ratio: -1, roe: -5.2, roce: -3.8, debt_to_equity: 1.5, dividend_yield: 0, promoter_holding: 51.5, avg_volume_10d: 13106284 },
  { symbol: 'ALKEM', name: 'Alkem Laboratories', ltp: 5450, open: 5406.92, high: 5512.09, low: 5367.29, prev_close: 5411.58, change: 38.42, change_pct: 0.71, volume: 16542142, market_cap: 65200, sector: 'Pharma', exchange: 'NSE', week_52_high: 6205.32, week_52_low: 3909.68, pe_ratio: 28.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.1, dividend_yield: 0.8, promoter_holding: 52.1, avg_volume_10d: 17992581 },
  { symbol: 'ATUL', name: 'Atul Ltd', ltp: 6850, open: 6931.16, high: 7003.58, low: 6760.45, prev_close: 6904.55, change: -54.55, change_pct: -0.79, volume: 21382362, market_cap: 20300, sector: 'Chemicals', exchange: 'NSE', week_52_high: 9006.62, week_52_low: 4760.77, pe_ratio: 32.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.1, dividend_yield: 0.5, promoter_holding: 44.9, avg_volume_10d: 17676038 },
  { symbol: 'BALKRISIND', name: 'Balkrishna Industries', ltp: 2680, open: 2634.63, high: 2715.75, low: 2628.13, prev_close: 2621.03, change: 58.97, change_pct: 2.25, volume: 2176308, market_cap: 51800, sector: 'Automobile', exchange: 'NSE', week_52_high: 3370.88, week_52_low: 2225.02, pe_ratio: 28.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.2, dividend_yield: 0.8, promoter_holding: 58.3, avg_volume_10d: 2391698 },
  { symbol: 'BANDHANBNK', name: 'Bandhan Bank', ltp: 198, open: 192.97, high: 198.65, low: 190.99, prev_close: 193.23, change: 4.77, change_pct: 2.47, volume: 21878191, market_cap: 31900, sector: 'Financial Services', exchange: 'NSE', week_52_high: 239.76, week_52_low: 153.15, pe_ratio: 12.5, roe: 12.8, roce: 10.2, debt_to_equity: 6.5, dividend_yield: 0.5, promoter_holding: 39.9, avg_volume_10d: 23220847 },
  { symbol: 'BATAINDIA', name: 'Bata India', ltp: 1385, open: 1438.22, high: 1446.58, low: 1375.48, prev_close: 1429.75, change: -44.75, change_pct: -3.13, volume: 4066459, market_cap: 17800, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 1707.42, week_52_low: 1026.95, pe_ratio: 52.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.2, dividend_yield: 1.2, promoter_holding: 50.2, avg_volume_10d: 4135620 },
  { symbol: 'BDL', name: 'Bharat Dynamics', ltp: 1285, open: 1302.04, high: 1319.38, low: 1272.08, prev_close: 1313.1, change: -28.1, change_pct: -2.14, volume: 6400329, market_cap: 47100, sector: 'Defence', exchange: 'NSE', week_52_high: 1706.75, week_52_low: 816.98, pe_ratio: 42.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.01, dividend_yield: 0.5, promoter_holding: 74.9, avg_volume_10d: 5660834 },
  { symbol: 'BHEL', name: 'Bharat Heavy Elec', ltp: 258, open: 260.57, high: 261.12, low: 254.79, prev_close: 261.85, change: -3.85, change_pct: -1.47, volume: 22579630, market_cap: 89800, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 327.51, week_52_low: 164.99, pe_ratio: 62.5, roe: 5.8, roce: 8.2, debt_to_equity: 0.1, dividend_yield: 0.8, promoter_holding: 63.2, avg_volume_10d: 19795379 },
  { symbol: 'CANFINHOME', name: 'Can Fin Homes', ltp: 845, open: 852.79, high: 861.58, low: 838.65, prev_close: 851.3, change: -6.3, change_pct: -0.74, volume: 6627406, market_cap: 11200, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1108.07, week_52_low: 549.08, pe_ratio: 12.5, roe: 22.5, roce: 14.2, debt_to_equity: 8.5, dividend_yield: 0.8, promoter_holding: 29.9, avg_volume_10d: 5658991 },
  { symbol: 'CASTROLIND', name: 'Castrol India', ltp: 218, open: 216.06, high: 220.06, low: 214.01, prev_close: 217.2, change: 0.8, change_pct: 0.37, volume: 24820955, market_cap: 21500, sector: 'Oil & Gas', exchange: 'NSE', week_52_high: 255.89, week_52_low: 184.1, pe_ratio: 25.8, roe: 35.2, roce: 42.5, debt_to_equity: 0.1, dividend_yield: 3.5, promoter_holding: 51.0, avg_volume_10d: 23909825 },
  { symbol: 'CDSL', name: 'CDSL', ltp: 1785, open: 1810.89, high: 1830.66, low: 1764.15, prev_close: 1808.51, change: -23.51, change_pct: -1.3, volume: 1701584, market_cap: 37400, sector: 'Financial Services', exchange: 'NSE', week_52_high: 2234.11, week_52_low: 1292.66, pe_ratio: 48.5, roe: 35.2, roce: 42.5, debt_to_equity: 0.01, dividend_yield: 0.8, promoter_holding: 24.1, avg_volume_10d: 1806507 },
  { symbol: 'CESC', name: 'CESC Ltd', ltp: 178, open: 181.26, high: 183.05, low: 176.83, prev_close: 180.18, change: -2.18, change_pct: -1.21, volume: 16097138, market_cap: 23600, sector: 'Power', exchange: 'NSE', week_52_high: 223.43, week_52_low: 136.96, pe_ratio: 12.5, roe: 12.8, roce: 10.2, debt_to_equity: 0.8, dividend_yield: 2.5, promoter_holding: 52.1, avg_volume_10d: 15909950 },
  { symbol: 'CLEAN', name: 'Clean Science', ltp: 1345, open: 1330.55, high: 1358.67, low: 1312.26, prev_close: 1321.61, change: 23.39, change_pct: 1.77, volume: 16335344, market_cap: 14200, sector: 'Chemicals', exchange: 'NSE', week_52_high: 1583.38, week_52_low: 955.23, pe_ratio: 52.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.01, dividend_yield: 0.3, promoter_holding: 71.2, avg_volume_10d: 15221755 },
  { symbol: 'COCHINSHIP', name: 'Cochin Shipyard', ltp: 1485, open: 1438.87, high: 1493.67, low: 1422.01, prev_close: 1450.76, change: 34.24, change_pct: 2.36, volume: 4803181, market_cap: 38900, sector: 'Defence', exchange: 'NSE', week_52_high: 1682.56, week_52_low: 1091.26, pe_ratio: 32.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.1, dividend_yield: 1.2, promoter_holding: 72.9, avg_volume_10d: 5228722 },
  { symbol: 'CUMMINSIND', name: 'Cummins India', ltp: 3280, open: 3282.5, high: 3324.5, low: 3262.48, prev_close: 3255.58, change: 24.42, change_pct: 0.75, volume: 20704900, market_cap: 90900, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 4003.12, week_52_low: 2629.32, pe_ratio: 42.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.01, dividend_yield: 1.5, promoter_holding: 51.0, avg_volume_10d: 20676404 },
  { symbol: 'DELHIVERY', name: 'Delhivery Ltd', ltp: 385, open: 385.08, high: 390.67, low: 383.53, prev_close: 388.07, change: -3.07, change_pct: -0.79, volume: 24179255, market_cap: 28500, sector: 'Consumer Services', exchange: 'NSE', week_52_high: 506.29, week_52_low: 300.71, pe_ratio: -1, roe: -8.5, roce: -6.2, debt_to_equity: 0.01, dividend_yield: 0, promoter_holding: 0, avg_volume_10d: 26403187 },
  { symbol: 'DIXON', name: 'Dixon Technologies', ltp: 12850, open: 12402.41, high: 12936.8, low: 12250.12, prev_close: 12327.32, change: 522.68, change_pct: 4.24, volume: 841007, market_cap: 76800, sector: 'Information Technology', exchange: 'NSE', week_52_high: 15858.74, week_52_low: 9171.0, pe_ratio: 125, roe: 22.5, roce: 28.2, debt_to_equity: 0.3, dividend_yield: 0.1, promoter_holding: 33.4, avg_volume_10d: 815046 },
  { symbol: 'FACT', name: 'Fertilisers & Chemicals', ltp: 785, open: 771.81, high: 794.96, low: 760.83, prev_close: 770.51, change: 14.49, change_pct: 1.88, volume: 3154479, market_cap: 5400, sector: 'Chemicals', exchange: 'NSE', week_52_high: 909.39, week_52_low: 475.91, pe_ratio: 15.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.3, dividend_yield: 2.2, promoter_holding: 59.6, avg_volume_10d: 3323855 },
  { symbol: 'FINEORG', name: 'Fine Organic Ind', ltp: 4520, open: 4512.86, high: 4542.05, low: 4500.13, prev_close: 4475.69, change: 44.31, change_pct: 0.99, volume: 20684456, market_cap: 13800, sector: 'Chemicals', exchange: 'NSE', week_52_high: 5999.61, week_52_low: 3053.47, pe_ratio: 42.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.01, dividend_yield: 0.5, promoter_holding: 75.0, avg_volume_10d: 17857270 },
  { symbol: 'FORTIS', name: 'Fortis Healthcare', ltp: 485, open: 501.25, high: 504.24, low: 480.92, prev_close: 496.82, change: -11.82, change_pct: -2.38, volume: 2881203, market_cap: 36500, sector: 'Healthcare', exchange: 'NSE', week_52_high: 641.08, week_52_low: 307.45, pe_ratio: 52.5, roe: 8.5, roce: 10.2, debt_to_equity: 0.3, dividend_yield: 0.2, promoter_holding: 31.2, avg_volume_10d: 2539658 },
  { symbol: 'GLENMARK', name: 'Glenmark Pharma', ltp: 1245, open: 1228.21, high: 1262.8, low: 1219.06, prev_close: 1222.27, change: 22.73, change_pct: 1.86, volume: 18685590, market_cap: 35200, sector: 'Pharma', exchange: 'NSE', week_52_high: 1417.6, week_52_low: 876.13, pe_ratio: 18.5, roe: 15.2, roce: 18.5, debt_to_equity: 0.8, dividend_yield: 0.5, promoter_holding: 46.7, avg_volume_10d: 13820024 },
  { symbol: 'GMRAIRPORT', name: 'GMR Airports Infra', ltp: 78, open: 77.54, high: 79.12, low: 77.35, prev_close: 77.68, change: 0.32, change_pct: 0.41, volume: 9577983, market_cap: 47200, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 94.45, week_52_low: 65.34, pe_ratio: 250, roe: 2.5, roce: 3.2, debt_to_equity: 2.5, dividend_yield: 0, promoter_holding: 64.0, avg_volume_10d: 9981983 },
  { symbol: 'GNFC', name: 'Gujarat Narmada', ltp: 648, open: 668.52, high: 674.59, low: 638.47, prev_close: 666.05, change: -18.05, change_pct: -2.71, volume: 9287509, market_cap: 10100, sector: 'Chemicals', exchange: 'NSE', week_52_high: 777.3, week_52_low: 419.55, pe_ratio: 8.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.1, dividend_yield: 2.8, promoter_holding: 46.0, avg_volume_10d: 6955080 },
  { symbol: 'GRANULES', name: 'Granules India', ltp: 548, open: 530.12, high: 553.82, low: 524.64, prev_close: 530.6, change: 17.4, change_pct: 3.28, volume: 15130076, market_cap: 13200, sector: 'Pharma', exchange: 'NSE', week_52_high: 605.73, week_52_low: 436.59, pe_ratio: 22.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.3, dividend_yield: 0.5, promoter_holding: 41.5, avg_volume_10d: 12065139 },
  { symbol: 'GSPL', name: 'Gujarat State Petronet', ltp: 345, open: 354.27, high: 355.29, low: 340.88, prev_close: 353.81, change: -8.81, change_pct: -2.49, volume: 5575355, market_cap: 19400, sector: 'Oil & Gas', exchange: 'NSE', week_52_high: 398.13, week_52_low: 282.01, pe_ratio: 12.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.1, dividend_yield: 2.2, promoter_holding: 37.6, avg_volume_10d: 4635482 },
  { symbol: 'GUJGASLTD', name: 'Gujarat Gas', ltp: 548, open: 565.51, high: 566.66, low: 540.79, prev_close: 561.02, change: -13.02, change_pct: -2.32, volume: 4044855, market_cap: 37700, sector: 'Oil & Gas', exchange: 'NSE', week_52_high: 620.61, week_52_low: 363.14, pe_ratio: 32.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.1, dividend_yield: 0.5, promoter_holding: 60.9, avg_volume_10d: 3113724 },
  { symbol: 'HATSUN', name: 'Hatsun Agro Product', ltp: 1085, open: 1055.81, high: 1087.38, low: 1042.86, prev_close: 1065.92, change: 19.08, change_pct: 1.79, volume: 6329324, market_cap: 23400, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 1281.32, week_52_low: 698.26, pe_ratio: 82.5, roe: 18.5, roce: 15.2, debt_to_equity: 0.8, dividend_yield: 0.3, promoter_holding: 73.1, avg_volume_10d: 4563186 },
  { symbol: 'HONAUT', name: 'Honeywell Automation', ltp: 48500, open: 47374.11, high: 49067.14, low: 46986.06, prev_close: 47349.41, change: 1150.59, change_pct: 2.43, volume: 19561417, market_cap: 42900, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 59573.01, week_52_low: 30422.28, pe_ratio: 72.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.01, dividend_yield: 0.3, promoter_holding: 75.0, avg_volume_10d: 17635311 },
  { symbol: 'HUDCO', name: 'HUDCO', ltp: 228, open: 217.1, high: 230.78, low: 214.22, prev_close: 219.1, change: 8.9, change_pct: 4.06, volume: 13275554, market_cap: 45600, sector: 'Financial Services', exchange: 'NSE', week_52_high: 276.91, week_52_low: 191.75, pe_ratio: 12.5, roe: 15.2, roce: 12.8, debt_to_equity: 6.5, dividend_yield: 3.5, promoter_holding: 74.8, avg_volume_10d: 9615884 },
  { symbol: 'IPCALAB', name: 'IPCA Laboratories', ltp: 1485, open: 1477.21, high: 1501.22, low: 1464.84, prev_close: 1480.12, change: 4.88, change_pct: 0.33, volume: 22787670, market_cap: 37400, sector: 'Pharma', exchange: 'NSE', week_52_high: 1660.78, week_52_low: 920.99, pe_ratio: 35.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.2, dividend_yield: 0.5, promoter_holding: 46.3, avg_volume_10d: 21496041 },
  { symbol: 'IRB', name: 'IRB Infra Developers', ltp: 58, open: 59.51, high: 60.12, low: 57.47, prev_close: 59.78, change: -1.78, change_pct: -2.97, volume: 8467043, market_cap: 35200, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 78.22, week_52_low: 42.49, pe_ratio: 22.5, roe: 8.5, roce: 6.2, debt_to_equity: 1.8, dividend_yield: 0.5, promoter_holding: 34.5, avg_volume_10d: 7463581 },
  { symbol: 'ISEC', name: 'ICICI Securities', ltp: 785, open: 768.41, high: 793.73, low: 758.35, prev_close: 774.62, change: 10.38, change_pct: 1.34, volume: 16447458, market_cap: 25300, sector: 'Financial Services', exchange: 'NSE', week_52_high: 1014.41, week_52_low: 612.46, pe_ratio: 18.5, roe: 42.5, roce: 52.8, debt_to_equity: 2.5, dividend_yield: 2.8, promoter_holding: 74.8, avg_volume_10d: 12927853 },
  { symbol: 'ITI', name: 'ITI Ltd', ltp: 285, open: 283.14, high: 286.83, low: 280.9, prev_close: 284.69, change: 0.31, change_pct: 0.11, volume: 10691746, market_cap: 27200, sector: 'Telecom', exchange: 'NSE', week_52_high: 320.27, week_52_low: 201.41, pe_ratio: 250, roe: 1.2, roce: 0.8, debt_to_equity: 0.1, dividend_yield: 0, promoter_holding: 90.0, avg_volume_10d: 10328687 },
  { symbol: 'JKCEMENT', name: 'JK Cement', ltp: 4250, open: 4242.11, high: 4309.49, low: 4229.92, prev_close: 4271.79, change: -21.79, change_pct: -0.51, volume: 20878411, market_cap: 32800, sector: 'Cement', exchange: 'NSE', week_52_high: 4774.06, week_52_low: 2652.6, pe_ratio: 38.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.5, dividend_yield: 0.5, promoter_holding: 45.6, avg_volume_10d: 20784842 },
  { symbol: 'JKLAKSHMI', name: 'JK Lakshmi Cement', ltp: 845, open: 821.4, high: 853.13, low: 813.76, prev_close: 820.47, change: 24.53, change_pct: 2.99, volume: 8576326, market_cap: 9900, sector: 'Cement', exchange: 'NSE', week_52_high: 955.32, week_52_low: 581.7, pe_ratio: 22.5, roe: 15.2, roce: 18.5, debt_to_equity: 0.3, dividend_yield: 0.8, promoter_holding: 46.0, avg_volume_10d: 8285899 },
  { symbol: 'JSL', name: 'Jindal Stainless', ltp: 645, open: 633.9, high: 652.34, low: 624.65, prev_close: 629.27, change: 15.73, change_pct: 2.5, volume: 15210047, market_cap: 53200, sector: 'Metals', exchange: 'NSE', week_52_high: 766.2, week_52_low: 480.19, pe_ratio: 18.5, roe: 22.5, roce: 25.8, debt_to_equity: 0.5, dividend_yield: 0.3, promoter_holding: 21.5, avg_volume_10d: 11941339 },
  { symbol: 'JUSTDIAL', name: 'Just Dial Ltd', ltp: 1085, open: 1060.46, high: 1088.7, low: 1046.68, prev_close: 1066.34, change: 18.66, change_pct: 1.75, volume: 9505245, market_cap: 9100, sector: 'Information Technology', exchange: 'NSE', week_52_high: 1400.36, week_52_low: 806.72, pe_ratio: 22.5, roe: 8.5, roce: 10.2, debt_to_equity: 0.01, dividend_yield: 0, promoter_holding: 26.4, avg_volume_10d: 9722806 },
  { symbol: 'KALYANKJIL', name: 'Kalyan Jewellers', ltp: 485, open: 474.15, high: 491.13, low: 469.42, prev_close: 469.69, change: 15.31, change_pct: 3.26, volume: 16246129, market_cap: 50000, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 536.68, week_52_low: 403.65, pe_ratio: 72.5, roe: 18.5, roce: 22.8, debt_to_equity: 0.8, dividend_yield: 0.2, promoter_holding: 60.6, avg_volume_10d: 16762501 },
  { symbol: 'KEI', name: 'KEI Industries', ltp: 3850, open: 3878.13, high: 3921.31, low: 3826.84, prev_close: 3903.08, change: -53.08, change_pct: -1.36, volume: 8825704, market_cap: 34800, sector: 'Infrastructure', exchange: 'NSE', week_52_high: 4240.88, week_52_low: 3147.24, pe_ratio: 52.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.2, dividend_yield: 0.2, promoter_holding: 34.9, avg_volume_10d: 8177265 },
  { symbol: 'KPITTECH', name: 'KPIT Technologies', ltp: 1485, open: 1478.65, high: 1500.19, low: 1475.1, prev_close: 1489.32, change: -4.32, change_pct: -0.29, volume: 18779738, market_cap: 40500, sector: 'Information Technology', exchange: 'NSE', week_52_high: 1713.37, week_52_low: 1046.86, pe_ratio: 72.5, roe: 32.5, roce: 42.5, debt_to_equity: 0.1, dividend_yield: 0.3, promoter_holding: 40.3, avg_volume_10d: 15706591 },
  { symbol: 'L_TFH', name: 'L&T Finance', ltp: 148, open: 149.46, high: 151.27, low: 146.61, prev_close: 148.8, change: -0.8, change_pct: -0.54, volume: 2581447, market_cap: 36900, sector: 'Financial Services', exchange: 'NSE', week_52_high: 164.75, week_52_low: 94.62, pe_ratio: 12.5, roe: 12.8, roce: 10.2, debt_to_equity: 5.8, dividend_yield: 1.2, promoter_holding: 66.8, avg_volume_10d: 2444979 },
  { symbol: 'LAURUSLABS', name: 'Laurus Labs', ltp: 485, open: 473.83, high: 490.14, low: 469.89, prev_close: 476.0, change: 9.0, change_pct: 1.89, volume: 11330082, market_cap: 26100, sector: 'Pharma', exchange: 'NSE', week_52_high: 566.62, week_52_low: 382.54, pe_ratio: 42.5, roe: 12.8, roce: 15.2, debt_to_equity: 0.3, dividend_yield: 0.3, promoter_holding: 27.2, avg_volume_10d: 8446882 },
  { symbol: 'LICHSGFIN', name: 'LIC Housing Finance', ltp: 648, open: 645.58, high: 655.01, low: 640.2, prev_close: 648.39, change: -0.39, change_pct: -0.06, volume: 16844747, market_cap: 35600, sector: 'Financial Services', exchange: 'NSE', week_52_high: 720.16, week_52_low: 452.83, pe_ratio: 8.5, roe: 15.2, roce: 12.8, debt_to_equity: 10.2, dividend_yield: 1.8, promoter_holding: 45.2, avg_volume_10d: 15829513 },
  { symbol: 'LTTS', name: 'L&T Technology', ltp: 4850, open: 5002.83, high: 5026.57, low: 4831.65, prev_close: 5022.78, change: -172.78, change_pct: -3.44, volume: 6760227, market_cap: 51200, sector: 'Information Technology', exchange: 'NSE', week_52_high: 5732.85, week_52_low: 2919.37, pe_ratio: 35.5, roe: 25.8, roce: 32.5, debt_to_equity: 0.1, dividend_yield: 1.2, promoter_holding: 73.7, avg_volume_10d: 6752152 },
  { symbol: 'MANAPPURAM', name: 'Manappuram Finance', ltp: 198, open: 201.75, high: 204.0, low: 196.32, prev_close: 202.23, change: -4.23, change_pct: -2.09, volume: 20917177, market_cap: 16800, sector: 'Financial Services', exchange: 'NSE', week_52_high: 257.71, week_52_low: 122.37, pe_ratio: 8.5, roe: 22.5, roce: 14.2, debt_to_equity: 3.5, dividend_yield: 2.5, promoter_holding: 35.2, avg_volume_10d: 21852294 },
  { symbol: 'MARICO', name: 'Marico Ltd', ltp: 585, open: 598.28, high: 606.64, low: 577.27, prev_close: 604.09, change: -19.09, change_pct: -3.16, volume: 14606099, market_cap: 75600, sector: 'Consumer Goods', exchange: 'NSE', week_52_high: 727.36, week_52_low: 454.76, pe_ratio: 52.5, roe: 35.2, roce: 42.5, debt_to_equity: 0.01, dividend_yield: 1.5, promoter_holding: 59.6, avg_volume_10d: 12664621 },
  { symbol: 'MSUMI', name: 'Motherson Sumi Wiring', ltp: 68, open: 69.13, high: 69.56, low: 67.16, prev_close: 69.8, change: -1.8, change_pct: -2.58, volume: 15644068, market_cap: 30100, sector: 'Automobile', exchange: 'NSE', week_52_high: 88.94, week_52_low: 56.44, pe_ratio: 42.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.1, dividend_yield: 0.5, promoter_holding: 64.0, avg_volume_10d: 11502331 },
  { symbol: 'NATCOPHARM', name: 'Natco Pharma', ltp: 1085, open: 1045.36, high: 1095.48, low: 1036.15, prev_close: 1050.75, change: 34.25, change_pct: 3.26, volume: 10196284, market_cap: 19400, sector: 'Pharma', exchange: 'NSE', week_52_high: 1277.66, week_52_low: 743.09, pe_ratio: 18.5, roe: 22.5, roce: 28.2, debt_to_equity: 0.01, dividend_yield: 0.8, promoter_holding: 49.2, avg_volume_10d: 8495823 },
];

export const INDICES: IndexData[] = [
  { symbol: 'NIFTY 50', ltp: 22542.75, open: 22380, high: 22610, low: 22350, change_pct: 1.42 },
  { symbol: 'SENSEX', ltp: 74340.50, open: 73800, high: 74520, low: 73750, change_pct: 1.38 },
  { symbol: 'BANKNIFTY', ltp: 48250.80, open: 47900, high: 48420, low: 47850, change_pct: 0.95 },
];

export function getAllStocks(): Stock[] {
  return STOCKS;
}

export function getStock(symbol: string): Stock | undefined {
  return STOCKS.find(s => s.symbol === symbol);
}

export function getTopGainers(): Stock[] {
  return [...STOCKS].sort((a, b) => b.change_pct - a.change_pct).slice(0, 10);
}

export function getTopLosers(): Stock[] {
  return [...STOCKS].sort((a, b) => a.change_pct - b.change_pct).slice(0, 10);
}

export function getMostActive(): Stock[] {
  return [...STOCKS].sort((a, b) => b.volume - a.volume).slice(0, 10);
}

export function getSectorPerformance() {
  const sectors: Record<string, { stocks: Stock[]; total_change: number }> = {};
  STOCKS.forEach(s => {
    if (!sectors[s.sector]) sectors[s.sector] = { stocks: [], total_change: 0 };
    sectors[s.sector].stocks.push(s);
    sectors[s.sector].total_change += s.change_pct;
  });
  return Object.entries(sectors).map(([sector, data]) => ({
    sector,
    count: data.stocks.length,
    avg_change: data.total_change / data.stocks.length,
    stocks: data.stocks.sort((a, b) => b.change_pct - a.change_pct),
  })).sort((a, b) => b.avg_change - a.avg_change);
}

export function getStocksBySector(sector: string): Stock[] {
  return STOCKS.filter(s => s.sector === sector);
}

// Generate candlestick data
export function generateCandleData(symbol: string, days: number = 250): { time: string; open: number; high: number; low: number; close: number; volume: number }[] {
  const stock = getStock(symbol);
  const basePrice = stock?.ltp || 1000;
  const candles: { time: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  let price = basePrice * 0.7;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const volatility = 0.02 + Math.random() * 0.03;
    const trend = (basePrice - price) / basePrice * 0.05;
    const change = (Math.random() - 0.45 + trend) * volatility * price;
    
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);
    const volume = Math.floor(500000 + Math.random() * 15000000);

    candles.push({
      time: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });

    price = close;
  }

  return candles;
}

export const SCANNERS: ScannerDef[] = [
  { key: 'top_gainers', name: 'Top Gainers', description: 'Stocks with highest positive change', icon: '🔺', category: 'MVP Picks' },
  { key: 'top_losers', name: 'Top Losers', description: 'Stocks with most negative change', icon: '🔻', category: 'MVP Picks' },
  { key: 'most_active', name: 'Most Active', description: 'Highest volume stocks today', icon: '📊', category: 'MVP Picks' },
  { key: 'day_high', name: 'Day High', description: 'Stocks near intraday high', icon: '🔺', category: 'Price Levels' },
  { key: 'day_low', name: 'Day Low', description: 'Stocks near intraday low', icon: '🔻', category: 'Price Levels' },
  { key: 'week_52_high_breakout', name: '52W High Breakout', description: 'Breaking 52-week high', icon: '🏆', category: 'Price Levels' },
  { key: 'week_52_low_breakdown', name: '52W Low Breakdown', description: 'Breaking 52-week low', icon: '💥', category: 'Price Levels' },
  { key: 'up_5pct_high_vol', name: 'Up >5% + High Vol', description: 'Large gains with high volume confirmation', icon: '🚀', category: 'Performance' },
  { key: 'gap_up', name: 'Gap Up', description: 'Opened above previous close', icon: '⬆️', category: 'Performance' },
  { key: 'gap_down', name: 'Gap Down', description: 'Opened below previous close', icon: '⬇️', category: 'Performance' },
  { key: 'volume_spike', name: 'Volume Spike', description: 'Volume 3x above average', icon: '📈', category: 'Volume' },
  { key: 'high_roe', name: 'High ROE', description: 'ROE above 20%', icon: '💎', category: 'Performance' },
  { key: 'low_pe', name: 'Low PE Ratio', description: 'PE below 15', icon: '💰', category: 'Performance' },
  { key: 'high_dividend', name: 'High Dividend', description: 'Dividend yield above 3%', icon: '💵', category: 'Performance' },
];

export function runScanner(key: string): Stock[] {
  switch (key) {
    case 'top_gainers': return getTopGainers();
    case 'top_losers': return getTopLosers();
    case 'most_active': return getMostActive();
    case 'day_high': return STOCKS.filter(s => s.ltp >= s.high * 0.99).slice(0, 10);
    case 'day_low': return STOCKS.filter(s => s.ltp <= s.low * 1.01).slice(0, 10);
    case 'week_52_high_breakout': return STOCKS.filter(s => s.ltp >= s.week_52_high * 0.95).slice(0, 10);
    case 'week_52_low_breakdown': return STOCKS.filter(s => s.ltp <= s.week_52_low * 1.05).slice(0, 10);
    case 'up_5pct_high_vol': return STOCKS.filter(s => s.change_pct >= 2.5).slice(0, 10);
    case 'gap_up': return STOCKS.filter(s => s.open > s.prev_close).sort((a, b) => b.change_pct - a.change_pct).slice(0, 10);
    case 'gap_down': return STOCKS.filter(s => s.open < s.prev_close).sort((a, b) => a.change_pct - b.change_pct).slice(0, 10);
    case 'volume_spike': return STOCKS.filter(s => s.volume > (s.avg_volume_10d || 0) * 1.5).slice(0, 10);
    case 'high_roe': return STOCKS.filter(s => (s.roe || 0) >= 20).sort((a, b) => (b.roe || 0) - (a.roe || 0)).slice(0, 10);
    case 'low_pe': return STOCKS.filter(s => (s.pe_ratio || 999) > 0 && (s.pe_ratio || 999) < 20).sort((a, b) => (a.pe_ratio || 0) - (b.pe_ratio || 0)).slice(0, 10);
    case 'high_dividend': return STOCKS.filter(s => (s.dividend_yield || 0) >= 2).sort((a, b) => (b.dividend_yield || 0) - (a.dividend_yield || 0)).slice(0, 10);
    default: return getTopGainers();
  }
}

export const NEWS: NewsArticle[] = [
  { title: 'Sensex jumps 500 points as banking stocks lead rally; Nifty reclaims 22,500', source: 'Economic Times', category: 'Market', published_at: new Date().toISOString(), url: '#' },
  { title: 'RBI MPC keeps repo rate unchanged at 6.5%, shifts stance to accommodative', source: 'Moneycontrol', category: 'Economy', published_at: new Date(Date.now() - 3600000).toISOString(), url: '#' },
  { title: 'TCS Q4 results: Net profit rises 12% YoY, beats street estimates', source: 'LiveMint', category: 'Stocks', published_at: new Date(Date.now() - 7200000).toISOString(), url: '#' },
  { title: 'Adani Group FPO: Fresh issue fully subscribed on Day 2 of bidding', source: 'NDTV Profit', category: 'IPO', published_at: new Date(Date.now() - 10800000).toISOString(), url: '#' },
  { title: 'Gold price surges to ₹72,000 per 10 grams; silver at all-time high', source: 'Business Standard', category: 'Market', published_at: new Date(Date.now() - 14400000).toISOString(), url: '#' },
  { title: 'FIIs pull out ₹15,000 crore from Indian equities in March amid global uncertainty', source: 'Financial Express', category: 'Market', published_at: new Date(Date.now() - 18000000).toISOString(), url: '#' },
  { title: 'Auto stocks surge as February sales data exceeds expectations across the board', source: 'Autocar India', category: 'Stocks', published_at: new Date(Date.now() - 21600000).toISOString(), url: '#' },
  { title: 'India GDP growth forecast revised upward to 7.2% by World Bank', source: 'Reuters', category: 'Economy', published_at: new Date(Date.now() - 25200000).toISOString(), url: '#' },
  { title: 'SEBI tightens rules for F&O trading; margin requirements to increase from April', source: 'Moneycontrol', category: 'Market', published_at: new Date(Date.now() - 28800000).toISOString(), url: '#' },
];

export const FII_DII_HISTORY: FiiDiiData[] = [
  { date: '2026-03-28', fii_buy: 48000, fii_sell: 58724, fii_net: -10724, dii_buy: 22000, dii_sell: 12023, dii_net: 9977 },
  { date: '2026-03-27', fii_buy: 52000, fii_sell: 54100, fii_net: -2100, dii_buy: 19500, dii_sell: 17800, dii_net: 1700 },
  { date: '2026-03-26', fii_buy: 45000, fii_sell: 42000, fii_net: 3000, dii_buy: 18000, dii_sell: 19500, dii_net: -1500 },
  { date: '2026-03-25', fii_buy: 55000, fii_sell: 60200, fii_net: -5200, dii_buy: 24000, dii_sell: 18800, dii_net: 5200 },
  { date: '2026-03-24', fii_buy: 47000, fii_sell: 51500, fii_net: -4500, dii_buy: 21000, dii_sell: 16500, dii_net: 4500 },
  { date: '2026-03-21', fii_buy: 51000, fii_sell: 48500, fii_net: 2500, dii_buy: 17500, dii_sell: 18200, dii_net: -700 },
  { date: '2026-03-20', fii_buy: 49000, fii_sell: 53800, fii_net: -4800, dii_buy: 23000, dii_sell: 17500, dii_net: 5500 },
  { date: '2026-03-19', fii_buy: 46000, fii_sell: 50200, fii_net: -4200, dii_buy: 20500, dii_sell: 16800, dii_net: 3700 },
  { date: '2026-03-18', fii_buy: 53000, fii_sell: 49500, fii_net: 3500, dii_buy: 18000, dii_sell: 19500, dii_net: -1500 },
  { date: '2026-03-17', fii_buy: 44000, fii_sell: 52000, fii_net: -8000, dii_buy: 25000, dii_sell: 17500, dii_net: 7500 },
];

export const SECTOR_FII_ALLOCATION = [
  { name: 'Financial Services', fii_pct: 34.5 },
  { name: 'Information Technology', fii_pct: 18.9 },
  { name: 'Oil & Gas', fii_pct: 12.7 },
  { name: 'Consumer Goods', fii_pct: 8.3 },
  { name: 'Pharma', fii_pct: 6.2 },
  { name: 'Automobile', fii_pct: 5.8 },
  { name: 'Metals', fii_pct: 4.1 },
  { name: 'Power', fii_pct: 3.5 },
  { name: 'Telecom', fii_pct: 2.8 },
  { name: 'Infrastructure', fii_pct: 2.2 },
  { name: 'Defence', fii_pct: 1.0 },
];

export function generateOptionsChain(symbol: string): { chain: OptionRow[]; underlyingValue: number; expiryDates: string[]; analytics: Record<string, number> } {
  const stock = getStock(symbol);
  const spot = stock?.ltp || 22500;
  const strikeDiff = spot > 5000 ? 100 : spot > 1000 ? 50 : spot > 500 ? 25 : 10;
  const atmStrike = Math.round(spot / strikeDiff) * strikeDiff;
  
  const chain: OptionRow[] = [];
  let totalCallOI = 0, totalPutOI = 0, totalCallVol = 0, totalPutVol = 0;

  for (let i = -20; i <= 20; i++) {
    const strike = atmStrike + i * strikeDiff;
    const dist = Math.abs(i);
    const ceOI = Math.floor((30000 - dist * 1200 + Math.random() * 5000) * 75);
    const peOI = Math.floor((25000 - dist * 1000 + Math.random() * 5000) * 75);
    const ceVol = Math.floor(5000 + Math.random() * 20000);
    const peVol = Math.floor(4000 + Math.random() * 18000);
    const ceIV = 12 + dist * 0.8 + Math.random() * 3;
    const peIV = 13 + dist * 0.9 + Math.random() * 3;
    const intrinsicCE = Math.max(spot - strike, 0);
    const intrinsicPE = Math.max(strike - spot, 0);
    const ceLTP = intrinsicCE + (5 - dist * 0.2 + Math.random() * 8) * (strikeDiff / 50);
    const peLTP = intrinsicPE + (5 - dist * 0.2 + Math.random() * 8) * (strikeDiff / 50);

    totalCallOI += Math.max(ceOI, 0);
    totalPutOI += Math.max(peOI, 0);
    totalCallVol += ceVol;
    totalPutVol += peVol;

    chain.push({
      strike,
      ce: { oi: Math.max(ceOI, 500), chg_oi: Math.floor((Math.random() - 0.3) * 5000), volume: ceVol, iv: Math.round(ceIV * 10) / 10, ltp: Math.max(Math.round(ceLTP * 100) / 100, 0.5) },
      pe: { oi: Math.max(peOI, 500), chg_oi: Math.floor((Math.random() - 0.3) * 5000), volume: peVol, iv: Math.round(peIV * 10) / 10, ltp: Math.max(Math.round(peLTP * 100) / 100, 0.5) },
    });
  }

  const maxPain = atmStrike;
  const pcr = totalPutOI / (totalCallOI || 1);

  const today = new Date();
  const expiryDates: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + (i + 1) * 7 - d.getDay() + 4);
    expiryDates.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
  }

  return {
    chain,
    underlyingValue: spot,
    expiryDates,
    analytics: {
      maxPain,
      pcr: Math.round(pcr * 100) / 100,
      totalCallOI,
      totalPutOI,
      totalCallVolume: totalCallVol,
      totalPutVolume: totalPutVol,
    },
  };
}
