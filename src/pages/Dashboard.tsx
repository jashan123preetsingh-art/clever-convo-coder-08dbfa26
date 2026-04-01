import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { INDICES, getSectorPerformance, NEWS, getAllStocks } from '@/data/mockData';
import { useIndices, useFiiDiiData, useMarketBreadth, useBatchQuotes, useMarketMetrics } from '@/hooks/useStockData';
import { formatCurrency, formatPercent, formatVolume, timeAgo } from '@/utils/format';
import MarketBrief from '@/components/MarketBrief';
import WatchlistWidget from '@/components/WatchlistWidget';

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

// ── IST Market Hours Check ──
function isMarketHours(): boolean {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60; // minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = utcMinutes + istOffset;
  const istHour = Math.floor((istMinutes >= 0 ? istMinutes : istMinutes + 1440) / 60) % 24;
  const istMin = (istMinutes >= 0 ? istMinutes : istMinutes + 1440) % 60;
  const istDay = now.getUTCDay(); // 0=Sun, 6=Sat

  // Weekend check
  if (istDay === 0 || istDay === 6) return false;

  // Market: 9:15 AM - 3:30 PM IST
  const timeInMinutes = istHour * 60 + istMin;
  return timeInMinutes >= 555 && timeInMinutes <= 930; // 9:15=555, 15:30=930
}

// ── Data Status Badge ──
function DataBadge({ status, source }: { status: 'live' | 'delayed' | 'estimated' | 'loading' | 'unavailable' | 'market-closed'; source?: string }) {
  const config: Record<string, { text: string; bg: string; color: string; dot: boolean; ring?: string }> = {
    live: { text: 'LIVE', bg: 'bg-primary/12', color: 'text-primary', dot: true, ring: 'ring-1 ring-primary/20' },
    delayed: { text: 'MKT CLOSED', bg: 'bg-muted/15', color: 'text-muted-foreground/50', dot: false },
    estimated: { text: source === 'vix-estimate' ? 'VIX EST.' : 'EST.', bg: 'bg-accent/10', color: 'text-accent', dot: false },
    loading: { text: '···', bg: 'bg-muted/20', color: 'text-muted-foreground/60', dot: false },
    unavailable: { text: 'N/A', bg: 'bg-destructive/8', color: 'text-destructive/60', dot: false },
    'market-closed': { text: 'CLOSED', bg: 'bg-muted/15', color: 'text-muted-foreground/50', dot: false },
  };
  const c = config[status] || config.unavailable;
  return (
    <span className={`text-[7px] px-2 py-0.5 rounded-md ${c.bg} ${c.color} font-bold tracking-wider inline-flex items-center gap-1 ${c.ring || ''}`}>
      {c.dot && <span className="w-1 h-1 rounded-full bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.6)] animate-pulse" />}
      {c.text}
    </span>
  );
}

// ── Quick Action ──
function QuickAction({ icon, title, desc, to }: { icon: string; title: string; desc: string; to: string }) {
  return (
    <Link to={to}>
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
        className="p-3 sm:p-4 rounded-xl bg-card/40 border border-border/10 hover:border-primary/20 hover:bg-card/70 transition-all duration-300 flex flex-col items-center text-center gap-1.5 sm:gap-2 group cursor-pointer h-full">
        <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform duration-300">{icon}</span>
        <p className="text-[9px] sm:text-[10px] font-bold text-foreground group-hover:text-primary transition-colors leading-tight">{title}</p>
        <p className="text-[7px] text-muted-foreground/50 leading-relaxed hidden sm:block">{desc}</p>
      </motion.div>
    </Link>
  );
}

// ── Metric Widget ──
function MetricWidget({ label, value, sub, color, icon, status }: { label: string; value: string; sub?: string; color?: string; icon?: string; status?: 'live' | 'delayed' | 'estimated' | 'loading' | 'unavailable' | 'market-closed' }) {
  const isLoading = status === 'loading' || value === '—';
  return (
    <div className={`rounded-xl bg-card/40 p-3 sm:p-4 border border-border/10 hover:border-border/25 transition-all duration-300 group ${isLoading ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>}
        <p className="text-[7px] sm:text-[8px] text-muted-foreground/50 uppercase tracking-[0.15em] font-bold flex-1">{label}</p>
        {status && status !== 'loading' && <DataBadge status={status} />}
      </div>
      <p className={`text-base sm:text-lg font-black font-data tracking-tight ${color || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[7px] text-muted-foreground/40 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Stock Row ──
function StockRow({ stock, rank, showVolume }: { stock: any; rank: number; showVolume?: boolean }) {
  const isUp = stock.change_pct >= 0;
  return (
    <Link to={`/stock/${stock.symbol}`}
      className="flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-4 hover:bg-primary/[0.03] transition-all group">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-[8px] text-muted-foreground/30 w-3 sm:w-4 font-data font-bold flex-shrink-0">{rank}</span>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-foreground group-hover:text-primary transition-colors truncate">{stock.symbol}</p>
          <p className="text-[7px] text-muted-foreground/40 truncate max-w-[80px] sm:max-w-[100px]">
            {showVolume ? formatVolume(stock.volume) + ' vol' : stock.sector}
          </p>
        </div>
      </div>
      <div className="text-right font-data flex-shrink-0">
        <p className="text-[9px] sm:text-[10px] text-foreground font-semibold">{formatCurrency(stock.ltp)}</p>
        <p className={`text-[8px] sm:text-[9px] font-bold ${isUp ? 'text-primary' : 'text-destructive'}`}>
          {isUp ? '+' : ''}{formatPercent(stock.change_pct)}
        </p>
      </div>
    </Link>
  );
}

// ── Section Header ──
function SectionHeader({ title, badge, link, linkText }: { title: string; badge?: string; link?: string; linkText?: string }) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] sm:text-xs font-black text-foreground tracking-tight">{title}</span>
        {badge && (
          <span className="text-[7px] px-1.5 py-0.5 rounded-md bg-primary/8 text-primary font-bold tracking-wider">{badge}</span>
        )}
      </div>
      {link && (
        <Link to={link} className="text-[8px] sm:text-[9px] font-semibold text-primary/40 hover:text-primary transition-colors">
          {linkText || 'View All'} →
        </Link>
      )}
    </div>
  );
}

// ── Index Card ──
function IndexCard({ idx, isLive: dataLive }: { idx: any; isLive: boolean }) {
  const isUp = (idx.change_pct || 0) >= 0;
  const marketOpen = isMarketHours();
  const displayStatus = dataLive ? (marketOpen ? 'live' : 'market-closed') : 'unavailable';

  return (
    <div className="rounded-xl bg-card/40 border border-border/10 p-4 sm:p-5 hover:border-border/25 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] sm:text-[10px] text-muted-foreground/50 font-bold tracking-wide">{idx.symbol}</span>
          <DataBadge status={displayStatus} />
        </div>
        <span className={`text-[7px] px-2 py-0.5 rounded-md font-bold ${
          isUp ? 'bg-primary/8 text-primary' : 'bg-destructive/8 text-destructive'}`}>
          {isUp ? '▲ BULL' : '▼ BEAR'}
        </span>
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="text-2xl sm:text-3xl font-black text-foreground font-data tracking-tighter">
          {Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
        <span className={`text-xs sm:text-sm font-bold font-data ${isUp ? 'text-primary' : 'text-destructive'}`}>
          {formatPercent(idx.change_pct)}
        </span>
      </div>
      <div className="mt-3 sm:mt-4">
        <div className="flex justify-between text-[7px] text-muted-foreground/35 mb-1.5 font-data">
          <span>L: {Number(idx.low).toLocaleString('en-IN')}</span>
          <span>H: {Number(idx.high).toLocaleString('en-IN')}</span>
        </div>
        <div className="h-1 bg-secondary/30 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-destructive/30 via-accent/20 to-primary/30 rounded-full" />
          {idx.high > idx.low && (
            <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-foreground shadow-md"
              style={{ left: `${Math.min(((idx.ltp - idx.low) / (idx.high - idx.low)) * 100, 100)}%`, transform: 'translate(-50%, -50%)' }} />
          )}
        </div>
      </div>
    </div>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const { data: liveIndices, isLoading: indicesLoading } = useIndices();
  const { data: liveFiiDii } = useFiiDiiData();
  const { data: liveBreadth } = useMarketBreadth();
  const { data: marketMetrics, isLoading: metricsLoading } = useMarketMetrics();
  const indices = liveIndices?.length > 0 && !liveIndices[0]?.error ? liveIndices : INDICES;
  const hasLiveData = liveIndices?.length > 0 && !liveIndices[0]?.error;
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
    const fii = liveFiiDii.find((d: any) => d.category?.includes('FII'));
    const dii = liveFiiDii.find((d: any) => d.category === 'DII');
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
    return liveBreadth.stocks.filter((stock: any) => stock && typeof stock.ltp === 'number' && stock.ltp > 0);
  }, [liveBreadth]);

  const { baseGainers, baseLosers, baseActive, sectors, advances, declines, unchanged } = useMemo(() => {
    const fallbackStocks = getAllStocks();
    const sourceStocks = liveStocks.length > 0 ? liveStocks : fallbackStocks;
    const sortedByGains = [...sourceStocks].sort((a: any, b: any) => (b.change_pct ?? 0) - (a.change_pct ?? 0));
    const sortedByLosses = [...sourceStocks].sort((a: any, b: any) => (a.change_pct ?? 0) - (b.change_pct ?? 0));
    // Filter out indices/ETFs from Most Active — only individual stocks
    const INDEX_SYMBOLS = new Set(['NIFTY 500', 'NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'NIFTY NEXT 50', 'NIFTY MIDCAP', 'NIFTY FIN SERVICE', 'INDIA VIX', 'SENSEX', 'BANKNIFTY', 'FINNIFTY']);
    const stocksOnly = sourceStocks.filter((s: any) => !INDEX_SYMBOLS.has(s.symbol) && !INDEX_SYMBOLS.has(s.name));
    const sortedByVolume = [...stocksOnly].sort((a: any, b: any) => (b.volume ?? 0) - (a.volume ?? 0));
    return {
      baseGainers: sortedByGains.slice(0, 10),
      baseLosers: sortedByLosses.slice(0, 10),
      baseActive: sortedByVolume.slice(0, 10),
      sectors: getSectorPerformance(),
      advances: breadthParsed?.advances ?? sourceStocks.filter((st: any) => st.change_pct > 0).length,
      declines: breadthParsed?.declines ?? sourceStocks.filter((st: any) => st.change_pct < 0).length,
      unchanged: breadthParsed?.unchanged ?? sourceStocks.filter((st: any) => st.change_pct === 0).length,
    };
  }, [breadthParsed, liveStocks]);

  const hydrateSymbols = useMemo(() => {
    const syms = new Set<string>();
    [...baseGainers, ...baseLosers, ...baseActive].forEach((s: any) => syms.add(s.symbol));
    return Array.from(syms).slice(0, 20);
  }, [baseGainers, baseLosers, baseActive]);

  const { data: liveQuotes } = useBatchQuotes(hydrateSymbols);

  const liveQuoteMap = useMemo(() => {
    const m: Record<string, any> = {};
    if (Array.isArray(liveQuotes)) liveQuotes.forEach((q: any) => { if (q?.data && q.symbol) m[q.symbol] = q.data; });
    return m;
  }, [liveQuotes]);

  function hydrate(stocks: any[]) {
    return stocks.map((s: any) => {
      const live = liveQuoteMap[s.symbol];
      if (!live) return s;
      return { ...s, ltp: live.ltp ?? s.ltp, change: live.change ?? s.change, change_pct: live.change_pct ?? s.change_pct, volume: live.volume ?? s.volume };
    });
  }

  const gainers = useMemo(() => hydrate(baseGainers), [baseGainers, liveQuoteMap]);
  const losers = useMemo(() => hydrate(baseLosers), [baseLosers, liveQuoteMap]);
  const active = useMemo(() => hydrate(baseActive), [baseActive, liveQuoteMap]);

  const niftyLtp = indices.find((i: any) => i.symbol === 'NIFTY 50')?.ltp || 22800;
  const bnfLtp = indices.find((i: any) => i.symbol === 'BANKNIFTY')?.ltp || 52200;

  const mm = marketMetrics;
  const vix = mm?.vix;
  const niftyMM = mm?.nifty;
  const bnfMM = mm?.banknifty;
  const daysToExpiry = mm?.daysToExpiry ?? '—';
  const dataSource = mm?.dataSource;

  // Proper status: only LIVE during market hours with real data
  function getMetricStatus(hasData: boolean): 'live' | 'delayed' | 'estimated' | 'loading' | 'unavailable' | 'market-closed' {
    if (metricsLoading) return 'loading';
    if (!hasData && !marketOpen) return 'market-closed';
    if (!hasData) return 'unavailable';
    if (!marketOpen) return 'delayed'; // has data but market closed = delayed
    if (dataSource === 'yahoo') return 'live';
    if (dataSource === 'vix-estimate') return 'estimated';
    return 'live';
  }

  function getDataStatus(hasData: boolean): 'live' | 'delayed' | 'loading' | 'market-closed' {
    if (!hasData) return 'loading';
    if (!marketOpen) return 'delayed';
    return 'live';
  }

  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  // IST time string
  const istTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  return (
    <div className="p-3 sm:p-5 max-w-[1800px] mx-auto space-y-3 sm:space-y-4">

      {/* ═══ Welcome Header ═══ */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="relative rounded-xl bg-card/40 border border-border/10 p-4 sm:p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-sm sm:text-base font-black text-foreground tracking-tight">{greeting}, Trader</h1>
              <DataBadge status={marketOpen ? 'live' : 'market-closed'} />
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/50 leading-relaxed">
              {marketOpen
                ? `Market open · ${istTime} IST · Tracking NIFTY, BANKNIFTY & 2000+ stocks`
                : `Market closed · Last close data · Opens Mon–Fri 9:15 AM IST`}
            </p>
          </div>
          <Link to="/scanner" className="hidden sm:flex px-4 py-2 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 items-center gap-1.5 flex-shrink-0">
            Scanner <span className="opacity-60">→</span>
          </Link>
        </div>
      </motion.div>

      {/* ═══ Index Ticker Strip ═══ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {indices.map((idx: any, i: number) => {
          const isUp = (idx.change_pct || 0) >= 0;
          return (
            <div key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/30 border border-border/10 whitespace-nowrap min-w-fit hover:border-border/20 transition-all">
              <span className="text-[8px] sm:text-[9px] text-muted-foreground/40 font-bold">{idx.symbol}</span>
              <span className="text-[10px] sm:text-[11px] text-foreground font-black font-data">
                {Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className={`text-[8px] sm:text-[9px] font-bold font-data ${isUp ? 'text-primary' : 'text-destructive'}`}>
                {isUp ? '▲' : '▼'} {formatPercent(idx.change_pct)}
              </span>
            </div>
          );
        })}
        <span className="text-[7px] text-muted-foreground/25 font-data whitespace-nowrap px-1.5">
          {istTime} IST
        </span>
      </div>

      {/* ═══ AI Market Brief ═══ */}
      <MarketBrief />

      {/* ═══ Quick Actions ═══ */}
      <div>
        <p className="text-[8px] sm:text-[9px] text-muted-foreground/40 font-bold mb-2 uppercase tracking-[0.15em]">Quick Actions</p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
          <QuickAction icon="📊" title="Option Chain" desc="NIFTY / BNF" to="/options" />
          <QuickAction icon="🔍" title="Scanner" desc="Find setups" to="/scanner" />
          <QuickAction icon="📐" title="Strategies" desc="Build & test" to="/options" />
          <QuickAction icon="▦" title="Heatmap" desc="Market view" to="/heatmap" />
          <QuickAction icon="⇄" title="FII / DII" desc="Fund flows" to="/fii-dii" />
          <QuickAction icon="◫" title="Sectors" desc="Rotation" to="/sectors" />
          <QuickAction icon="📈" title="OI Analysis" desc="OI trends" to="/oi-analysis" />
        </div>
      </div>

      {/* ═══ Index Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
        {indices.map((idx: any) => (
          <IndexCard key={idx.symbol} idx={idx} isLive={hasLiveData} />
        ))}
      </div>

      {/* ═══ Key Metrics ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[8px] sm:text-[9px] text-muted-foreground/40 font-bold uppercase tracking-[0.15em]">Key Metrics</p>
          {dataSource && <DataBadge status={getMetricStatus(!!vix)} source={dataSource} />}
          {mm?.timestamp && (
            <span className="text-[7px] text-muted-foreground/30 font-data ml-auto">
              {new Date(mm.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2">
          <MetricWidget icon="📊" label="Nifty PCR"
            value={niftyMM ? (niftyMM.pcr ?? 0).toFixed(2) : '—'}
            sub={bnfMM ? `BNF: ${(bnfMM.pcr ?? 0).toFixed(2)}` : undefined}
            color={niftyMM ? ((niftyMM.pcr ?? 0) > 1 ? 'text-primary' : 'text-destructive') : undefined}
            status={getMetricStatus(!!niftyMM)} />
          <MetricWidget icon="⚡" label="India VIX"
            value={vix ? (vix.value ?? 0).toFixed(2) : '—'}
            sub={vix ? `${(vix.change_pct ?? 0) >= 0 ? '+' : ''}${(vix.change_pct ?? 0).toFixed(1)}%` : undefined}
            color={vix ? ((vix.change_pct ?? 0) <= 0 ? 'text-primary' : 'text-destructive') : 'text-accent'}
            status={getMetricStatus(!!vix)} />
          <MetricWidget icon="📈" label="Adv / Dec" value={`${advances} / ${declines}`} sub={`${unchanged} unch`}
            color={advances > declines ? 'text-primary' : 'text-destructive'}
            status={getDataStatus(!!breadthParsed)} />
          <MetricWidget icon="🏦" label="FII Net"
            value={fiiDiiParsed ? `${fiiDiiParsed.fiiNet >= 0 ? '+' : ''}₹${Math.abs(Math.round(fiiDiiParsed.fiiNet)).toLocaleString('en-IN')} Cr` : '—'}
            sub={fiiDiiParsed?.date || undefined}
            color={fiiDiiParsed ? (fiiDiiParsed.fiiNet >= 0 ? 'text-primary' : 'text-destructive') : undefined}
            status={getDataStatus(!!fiiDiiParsed)} />
          <MetricWidget icon="📊" label="DII Net"
            value={fiiDiiParsed ? `${fiiDiiParsed.diiNet >= 0 ? '+' : ''}₹${Math.abs(Math.round(fiiDiiParsed.diiNet)).toLocaleString('en-IN')} Cr` : '—'}
            sub={fiiDiiParsed?.date || undefined}
            color={fiiDiiParsed ? (fiiDiiParsed.diiNet >= 0 ? 'text-primary' : 'text-destructive') : undefined}
            status={getDataStatus(!!fiiDiiParsed)} />
        </div>
      </div>

      {/* ═══ Expected Move ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
        {[
          { label: 'NIFTY', ltp: niftyLtp, metrics: niftyMM },
          { label: 'BANKNIFTY', ltp: bnfLtp, metrics: bnfMM },
        ].map((item, i) => {
          const move = item.metrics?.expectedMove;
          const straddle = item.metrics?.atmStraddle;
          const iv = item.metrics?.atmIV;
          const maxPain = item.metrics?.maxPain;
          const source = item.metrics?.source;
          const metricStatus = getMetricStatus(!!item.metrics);

          return (
            <motion.div key={item.label} variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-xl bg-card/40 border border-border/10 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] sm:text-[11px] font-black text-foreground tracking-tight">Expected Move — {item.label}</span>
                <div className="flex items-center gap-1.5">
                  <DataBadge status={metricStatus} source={source} />
                  <span className="text-[7px] px-2 py-0.5 rounded-md bg-accent/8 text-accent font-bold">
                    {daysToExpiry !== '—' ? `${daysToExpiry}D` : '—'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[7px] text-muted-foreground/40 uppercase tracking-[0.15em] mb-1">±1σ Move</p>
                  <p className="text-base sm:text-lg font-black text-primary font-data">{move != null ? `±${move}` : '—'}</p>
                  <p className="text-[7px] text-muted-foreground/30">{move != null && item.ltp ? `${(move / item.ltp * 100).toFixed(1)}%` : ''}</p>
                </div>
                <div>
                  <p className="text-[7px] text-muted-foreground/40 uppercase tracking-[0.15em] mb-1">ATM Straddle</p>
                  <p className="text-base sm:text-lg font-black text-foreground font-data">{straddle != null ? `₹${straddle}` : '—'}</p>
                  <p className="text-[7px] text-muted-foreground/30">{source === 'yahoo' ? 'Yahoo' : source === 'vix-estimate' ? 'VIX Est.' : ''}</p>
                </div>
                <div>
                  <p className="text-[7px] text-muted-foreground/40 uppercase tracking-[0.15em] mb-1">ATM IV</p>
                  <p className="text-base sm:text-lg font-black text-accent font-data">{iv != null ? `${Number(iv).toFixed(1)}%` : '—'}</p>
                  <p className="text-[7px] text-muted-foreground/30">{item.metrics ? 'Implied' : ''}</p>
                </div>
                <div>
                  <p className="text-[7px] text-muted-foreground/40 uppercase tracking-[0.15em] mb-1">Max Pain</p>
                  <p className="text-base sm:text-lg font-black text-foreground font-data">{maxPain != null ? maxPain.toLocaleString('en-IN') : '—'}</p>
                  <p className="text-[7px] text-muted-foreground/30">{maxPain ? 'Strike' : ''}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ═══ Watchlist ═══ */}
      <WatchlistWidget />

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2.5">
        {[
          { title: 'Top Gainers', badge: marketOpen ? 'LIVE' : 'CLOSE', data: gainers },
          { title: 'Top Losers', badge: marketOpen ? 'LIVE' : 'CLOSE', data: losers },
          { title: 'Most Active', badge: 'VOL', data: active, showVol: true },
        ].map((section) => (
          <div key={section.title} className="col-span-1 sm:col-span-12 lg:col-span-4">
            <div className="rounded-xl bg-card/30 border border-border/10 overflow-hidden hover:border-border/20 transition-all">
              <SectionHeader title={section.title} badge={section.badge} link="/scanner" linkText="All" />
              <div className="divide-y divide-border/5">
                {section.data.slice(0, 8).map((stock, i) => <StockRow key={stock.symbol} stock={stock} rank={i + 1} showVolume={section.showVol} />)}
              </div>
            </div>
          </div>
        ))}

        {/* Sectors */}
        <div className="col-span-1 sm:col-span-12 lg:col-span-6">
          <div className="rounded-xl bg-card/30 border border-border/10 overflow-hidden hover:border-border/20 transition-all">
            <SectionHeader title="Sector Performance" link="/sectors" linkText="View All" />
            {sectors.slice(0, 8).map((sec, i) => (
              <Link key={sec.sector} to={`/sectors/${encodeURIComponent(sec.sector)}`}
                className="flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-4 hover:bg-primary/[0.03] transition-all">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-[8px] text-muted-foreground/30 w-3 sm:w-4 font-data font-bold flex-shrink-0">{i + 1}</span>
                  <span className="text-[9px] sm:text-[10px] text-foreground font-semibold truncate">{sec.sector}</span>
                  <span className="text-[7px] text-muted-foreground/30 flex-shrink-0">({sec.count})</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <div className="w-12 sm:w-16 h-1 bg-secondary/20 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sec.avg_change >= 0 ? 'bg-primary/50' : 'bg-destructive/50'}`}
                      style={{ width: `${Math.min(Math.abs(sec.avg_change) * 18, 100)}%` }} />
                  </div>
                  <span className={`text-[8px] sm:text-[9px] font-bold w-10 sm:w-12 text-right font-data ${sec.avg_change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatPercent(sec.avg_change)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* News */}
        <div className="col-span-1 sm:col-span-12 lg:col-span-6">
          <div className="rounded-xl bg-card/30 border border-border/10 overflow-hidden hover:border-border/20 transition-all">
            <SectionHeader title="Market News" badge={liveNews ? 'LIVE' : ''} link="/news" linkText="All News" />
            {newsItems.slice(0, 6).map((article, i) => (
              <div key={i} className="py-2.5 px-3 sm:px-4 hover:bg-primary/[0.03] transition-all cursor-pointer">
                <p className="text-[9px] sm:text-[10px] text-foreground leading-relaxed line-clamp-2 font-medium">{article.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[6px] sm:text-[7px] px-1.5 py-0.5 rounded-md bg-[hsl(var(--terminal-blue)/0.08)] text-[hsl(var(--terminal-blue))] font-bold">{article.category}</span>
                  <span className="text-[7px] text-muted-foreground/35">{article.source} · {timeAgo(article.published_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
