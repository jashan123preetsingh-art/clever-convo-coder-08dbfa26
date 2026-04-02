import React, { useMemo, useCallback } from 'react';
import WorldIndices from '@/components/dashboard/WorldIndices';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSectorPerformance, NEWS, getAllStocks } from '@/data/mockData';
import { useFiiDiiData, useMarketBreadth, useBatchQuotes, useMarketMetrics } from '@/hooks/useStockData';
import { useIndicesWithFallback } from '@/hooks/useIndicesWithFallback';
import { formatPercent } from '@/utils/format';
import { isMarketHours } from '@/utils/marketHours';
import MarketBrief from '@/components/MarketBrief';
import WatchlistWidget from '@/components/WatchlistWidget';
import EventsFeed from '@/components/dashboard/EventsFeed';
import DataBadge from '@/components/dashboard/DataBadge';
import DataStatusBanner from '@/components/DataStatusBanner';
import QuickActionsGrid from '@/components/dashboard/QuickActions';
import IndexCards from '@/components/dashboard/IndexCards';
import MetricsGrid from '@/components/dashboard/MetricsGrid';
import ExpectedMove from '@/components/dashboard/ExpectedMove';
import TopMovers from '@/components/dashboard/TopMovers';
import SectorsList from '@/components/dashboard/SectorsList';
import NewsWidget from '@/components/dashboard/NewsWidget';
import type { Stock, FiiDiiEntry } from '@/types/stock';
import LiveRefreshBadge from '@/components/LiveRefreshBadge';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function fetchLiveNews() {
  const resp = await fetch(`${FUNCTIONS_URL}/market-news`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.news as { title: string; source: string; category: string; published_at: string; url: string }[];
}



export default function Dashboard() {
  const { indices, hasLiveData, isUsingMockData, isError, refetch: refetchIndices } = useIndicesWithFallback();
  const { data: liveFiiDii, refetch: refetchFiiDii } = useFiiDiiData();
  const { data: liveBreadth, refetch: refetchBreadth } = useMarketBreadth();
  const { data: marketMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useMarketMetrics();
  const marketOpen = isMarketHours();

  const { data: liveNews } = useQuery({
    queryKey: ['dashboard-news'],
    queryFn: fetchLiveNews,
    staleTime: 300_000,
    retry: 1,
  });

  const newsItems = liveNews && liveNews.length > 0 ? liveNews : NEWS;

  const fiiDiiParsed = useMemo(() => {
    if (!liveFiiDii || !Array.isArray(liveFiiDii)) return null;
    const fii = liveFiiDii.find((d: FiiDiiEntry) => d.category?.includes('FII'));
    const dii = liveFiiDii.find((d: FiiDiiEntry) => d.category === 'DII');
    if (!fii && !dii) return null;
    return {
      fiiNet: parseFloat(fii?.netValue || '0'),
      diiNet: parseFloat(dii?.netValue || '0'),
      date: fii?.date || dii?.date || '',
    };
  }, [liveFiiDii]);

  const breadthParsed = useMemo(() => {
    if (!liveBreadth) return null;
    return { advances: liveBreadth.advances ?? 0, declines: liveBreadth.declines ?? 0, unchanged: liveBreadth.unchanged ?? 0 };
  }, [liveBreadth]);

  const liveStocks = useMemo(() => {
    if (!Array.isArray(liveBreadth?.stocks) || liveBreadth.stocks.length === 0) return [];
    return liveBreadth.stocks.filter((stock: Stock) => stock && typeof stock.ltp === 'number' && stock.ltp > 0);
  }, [liveBreadth]);

  const { baseGainers, baseLosers, baseActive, sectors, advances, declines, unchanged } = useMemo(() => {
    const fallbackStocks = getAllStocks();
    const sourceStocks: Stock[] = liveStocks.length > 0 ? liveStocks : fallbackStocks;
    const sortedByGains = [...sourceStocks].sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0));
    const sortedByLosses = [...sourceStocks].sort((a, b) => (a.change_pct ?? 0) - (b.change_pct ?? 0));
    const INDEX_SYMBOLS = new Set(['NIFTY 500', 'NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'NIFTY NEXT 50', 'NIFTY MIDCAP', 'NIFTY FIN SERVICE', 'INDIA VIX', 'SENSEX', 'BANKNIFTY', 'FINNIFTY']);
    const stocksOnly = sourceStocks.filter((s) => !INDEX_SYMBOLS.has(s.symbol) && !INDEX_SYMBOLS.has(s.name));
    const sortedByVolume = [...stocksOnly].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    return {
      baseGainers: sortedByGains.slice(0, 10),
      baseLosers: sortedByLosses.slice(0, 10),
      baseActive: sortedByVolume.slice(0, 10),
      sectors: getSectorPerformance(sourceStocks),
      advances: breadthParsed?.advances ?? sourceStocks.filter((st) => st.change_pct > 0).length,
      declines: breadthParsed?.declines ?? sourceStocks.filter((st) => st.change_pct < 0).length,
      unchanged: breadthParsed?.unchanged ?? sourceStocks.filter((st) => st.change_pct === 0).length,
    };
  }, [breadthParsed, liveStocks]);

  const hydrateSymbols = useMemo(() => {
    const syms = new Set<string>();
    [...baseGainers, ...baseLosers, ...baseActive].forEach((s) => syms.add(s.symbol));
    return Array.from(syms).slice(0, 20);
  }, [baseGainers, baseLosers, baseActive]);

  const { data: liveQuotes } = useBatchQuotes(hydrateSymbols);

  const liveQuoteMap = useMemo(() => {
    const m: Record<string, Partial<Stock>> = {};
    if (Array.isArray(liveQuotes)) liveQuotes.forEach((q: { data?: Partial<Stock>; symbol?: string }) => { if (q?.data && q.symbol) m[q.symbol] = q.data; });
    return m;
  }, [liveQuotes]);

  function hydrate(stocks: Stock[]): Stock[] {
    return stocks.map((s) => {
      const live = liveQuoteMap[s.symbol];
      if (!live) return s;
      return { ...s, ltp: live.ltp ?? s.ltp, change: live.change ?? s.change, change_pct: live.change_pct ?? s.change_pct, volume: live.volume ?? s.volume };
    });
  }

  const gainers = useMemo(() => hydrate(baseGainers), [baseGainers, liveQuoteMap]);
  const losers = useMemo(() => hydrate(baseLosers), [baseLosers, liveQuoteMap]);
  const active = useMemo(() => hydrate(baseActive), [baseActive, liveQuoteMap]);

  const niftyLtp = indices.find((i) => i.symbol === 'NIFTY 50')?.ltp || 22800;
  const bnfLtp = indices.find((i) => i.symbol === 'BANKNIFTY')?.ltp || 52200;

  const mm = marketMetrics;
  const daysToExpiry = mm?.daysToExpiry ?? '—';

  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const istTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  // Track last data update time
  const lastUpdated = useMemo(() => {
    if (!hasLiveData && !liveBreadth && !liveFiiDii) return null;
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' });
  }, [indices, liveBreadth, liveFiiDii, marketMetrics, liveQuotes]);

  return (
    <div className="p-3 sm:p-5 max-w-[1800px] mx-auto space-y-3 sm:space-y-4">
      <DataStatusBanner isUsingMockData={isUsingMockData} isError={isError} />

      {/* Welcome Header */}
      <div className="relative rounded-xl bg-card/40 border border-border/10 p-4 sm:p-6 overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-sm sm:text-base font-black text-foreground tracking-tight">{greeting}, Trader</h1>
              <DataBadge status={marketOpen ? 'live' : 'market-closed'} />
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 leading-relaxed">
              {marketOpen
                ? `Market open · ${istTime} IST · Tracking NIFTY, BANKNIFTY & 2000+ stocks`
                : `Market closed · Last close data · Opens Mon–Fri 9:15 AM IST`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <LiveRefreshBadge intervalSeconds={30} onRefresh={() => { refetchIndices(); refetchFiiDii(); refetchBreadth(); refetchMetrics(); }} />
            <Link to="/scanner" className="hidden sm:flex px-4 py-2 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 items-center gap-1.5">
              Scanner <span className="opacity-60">→</span>
            </Link>
          </div>
        </div>
      </div>


      <WorldIndices />
      <MarketBrief />
      <QuickActionsGrid />
      <IndexCards indices={indices} hasLiveData={hasLiveData} />
      <MetricsGrid
        marketMetrics={mm}
        metricsLoading={metricsLoading}
        marketOpen={marketOpen}
        advances={advances}
        declines={declines}
        unchanged={unchanged}
        hasBreadth={!!breadthParsed}
        fiiDiiParsed={fiiDiiParsed}
      />
      <ExpectedMove
        niftyLtp={niftyLtp}
        bnfLtp={bnfLtp}
        niftyMM={mm?.nifty}
        bnfMM={mm?.banknifty}
        daysToExpiry={daysToExpiry}
        metricsLoading={metricsLoading}
        marketOpen={marketOpen}
        dataSource={mm?.dataSource}
      />
      <WatchlistWidget />

      {/* Main Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2.5">
        <TopMovers gainers={gainers} losers={losers} active={active} marketOpen={marketOpen} />
        <SectorsList sectors={sectors} />
        <NewsWidget newsItems={newsItems} isLive={!!liveNews} />
      </div>

      <EventsFeed />
    </div>
  );
}
