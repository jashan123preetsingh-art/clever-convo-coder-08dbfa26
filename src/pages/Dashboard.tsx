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

// ── Data Status Badge ──
function DataBadge({ status, source }: { status: 'live' | 'estimated' | 'loading' | 'unavailable' | 'market-closed'; source?: string }) {
  const config = {
    live: { text: 'LIVE', bg: 'bg-primary/10', color: 'text-primary', dot: true },
    estimated: { text: source === 'vix-estimate' ? 'VIX EST.' : 'EST.', bg: 'bg-accent/10', color: 'text-accent', dot: false },
    loading: { text: 'LOADING', bg: 'bg-muted/20', color: 'text-muted-foreground/60', dot: false },
    unavailable: { text: 'N/A', bg: 'bg-destructive/8', color: 'text-destructive/60', dot: false },
    'market-closed': { text: 'MKT CLOSED', bg: 'bg-muted/15', color: 'text-muted-foreground/50', dot: false },
  };
  const c = config[status];
  return (
    <span className={`text-[7px] px-2 py-0.5 rounded-lg ${c.bg} ${c.color} font-bold tracking-wider inline-flex items-center gap-1`}>
      {c.dot && <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)] animate-pulse" />}
      {c.text}
    </span>
  );
}

// ── Quick Action ──
function QuickAction({ icon, title, desc, to }: { icon: string; title: string; desc: string; to: string }) {
  return (
    <Link to={to}>
      <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
        className="p-3 sm:p-4 rounded-2xl bg-card/60 border border-border/20 hover:border-primary/15 hover:bg-card/80 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.08)] transition-all duration-300 flex flex-col items-center text-center gap-1.5 sm:gap-2 group cursor-pointer h-full">
        <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-300">{icon}</span>
        <p className="text-[10px] sm:text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">{title}</p>
        <p className="text-[7px] sm:text-[8px] text-muted-foreground/70 leading-relaxed hidden sm:block">{desc}</p>
      </motion.div>
    </Link>
  );
}

// ── Metric Widget ──
function MetricWidget({ label, value, sub, color, icon, status }: { label: string; value: string; sub?: string; color?: string; icon?: string; status?: 'live' | 'estimated' | 'loading' | 'unavailable' | 'market-closed' }) {
  const isLoading = status === 'loading' || value === '—';
  return (
    <div className={`rounded-2xl bg-card/50 p-3 sm:p-4 border border-border/15 hover:border-border/30 transition-all duration-300 group ${isLoading ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
        {icon && <span className="text-[10px] sm:text-xs opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span>}
        <p className="text-[7px] sm:text-[8px] text-muted-foreground/60 uppercase tracking-[0.15em] font-bold flex-1">{label}</p>
        {status && status !== 'loading' && <DataBadge status={status} />}
      </div>
      <p className={`text-lg sm:text-xl font-black font-data tracking-tight ${color || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[7px] sm:text-[8px] text-muted-foreground/50 mt-0.5 sm:mt-1">{sub}</p>}
    </div>
  );
}

// ── Stock Row ──
function StockRow({ stock, rank, showVolume }: { stock: any; rank: number; showVolume?: boolean }) {
  return (
    <Link to={`/stock/${stock.symbol}`}
      className="flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-4 hover:bg-primary/3 transition-all group">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-[8px] sm:text-[9px] text-muted-foreground/40 w-3 sm:w-4 font-data font-bold flex-shrink-0">{rank}</span>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-foreground group-hover:text-primary transition-colors truncate">{stock.symbol}</p>
          <p className="text-[7px] sm:text-[8px] text-muted-foreground/50 truncate max-w-[80px] sm:max-w-[100px]">
            {showVolume ? formatVolume(stock.volume) + ' vol' : stock.sector}
          </p>
        </div>
      </div>
      <div className="text-right font-data flex-shrink-0">
        <p className="text-[9px] sm:text-[10px] text-foreground font-semibold">{formatCurrency(stock.ltp)}</p>
        <p className={`text-[8px] sm:text-[9px] font-bold ${stock.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
          {stock.change_pct >= 0 ? '+' : ''}{formatPercent(stock.change_pct)}
        </p>
      </div>
    </Link>
  );
}

// ── Section Header ──
function SectionHeader({ title, badge, link, linkText }: { title: string; badge?: string; link?: string; linkText?: string }) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
      <div className="flex items-center gap-2 sm:gap-2.5">
        <span className="text-[11px] sm:text-[12px] font-black text-foreground tracking-tight">{title}</span>
        {badge && (
          <span className="text-[7px] px-2 py-0.5 rounded-lg bg-primary/8 text-primary font-bold tracking-wider">{badge}</span>
        )}
      </div>
      {link && (
        <Link to={link} className="text-[8px] sm:text-[9px] font-semibold text-primary/50 hover:text-primary transition-colors">
          {linkText || 'View All'} →
        </Link>
      )}
    </div>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const { data: liveIndices, isLoading: indicesLoading } = useIndices();
  const { data: liveFiiDii } = useFiiDiiData();
  const { data: liveBreadth } = useMarketBreadth();
  const { data: marketMetrics, isLoading: metricsLoading } = useMarketMetrics();
  const indices = liveIndices?.length > 0 && !liveIndices[0]?.error ? liveIndices : INDICES;
  const isLive = liveIndices?.length > 0 && !liveIndices[0]?.error;

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
    return {
      advances: liveBreadth.advances ?? 0,
      declines: liveBreadth.declines ?? 0,
      unchanged: liveBreadth.unchanged ?? 0,
    };
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
    const sortedByVolume = [...sourceStocks].sort((a: any, b: any) => (b.volume ?? 0) - (a.volume ?? 0));
    const s = getSectorPerformance();
    return {
      baseGainers: sortedByGains.slice(0, 10),
      baseLosers: sortedByLosses.slice(0, 10),
      baseActive: sortedByVolume.slice(0, 10),
      sectors: s,
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
    if (Array.isArray(liveQuotes)) {
      liveQuotes.forEach((q: any) => {
        if (q?.data && q.symbol) m[q.symbol] = q.data;
      });
    }
    return m;
  }, [liveQuotes]);

  function hydrate(stocks: any[]) {
    return stocks.map((s: any) => {
      const live = liveQuoteMap[s.symbol];
      if (!live) return s;
      return {
        ...s, ltp: live.ltp ?? s.ltp, change: live.change ?? s.change,
        change_pct: live.change_pct ?? s.change_pct, open: live.open ?? s.open,
        high: live.high ?? s.high, low: live.low ?? s.low, volume: live.volume ?? s.volume,
      };
    });
  }

  const gainers = useMemo(() => hydrate(baseGainers), [baseGainers, liveQuoteMap]);
  const losers = useMemo(() => hydrate(baseLosers), [baseLosers, liveQuoteMap]);
  const active = useMemo(() => hydrate(baseActive), [baseActive, liveQuoteMap]);

  const niftyLtp = indices.find((i: any) => i.symbol === 'NIFTY 50')?.ltp || 22800;
  const bnfLtp = indices.find((i: any) => i.symbol === 'BANKNIFTY')?.ltp || 52200;

  // Real metrics
  const mm = marketMetrics;
  const vix = mm?.vix;
  const niftyMM = mm?.nifty;
  const bnfMM = mm?.banknifty;
  const daysToExpiry = mm?.daysToExpiry ?? '—';
  const fnoTurnover = mm?.fnoTurnover;
  const isMarketOpen = mm?.marketOpen;
  const dataSource = mm?.dataSource;

  // Determine metric status
  function getMetricStatus(hasData: boolean): 'live' | 'estimated' | 'loading' | 'unavailable' | 'market-closed' {
    if (metricsLoading) return 'loading';
    if (!hasData && isMarketOpen === false) return 'market-closed';
    if (!hasData) return 'unavailable';
    if (dataSource === 'yahoo') return 'live';
    if (dataSource === 'vix-estimate') return 'estimated';
    return 'live';
  }

  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="p-3 sm:p-5 max-w-[1800px] mx-auto space-y-3 sm:space-y-5">
      {/* ═══ Welcome ═══ */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="relative rounded-2xl bg-card/50 border border-border/20 p-4 sm:p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/4 via-transparent to-[hsl(var(--terminal-cyan)/0.02)] pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight">👋 {greeting}, Trader!</h1>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground/60 mt-1 max-w-xl leading-relaxed">
              Your F&O command center — track indices, analyze OI, scan for opportunities.
            </p>
            {isMarketOpen === false && (
              <p className="text-[9px] text-muted-foreground/40 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" /> Market Closed — showing last available data
              </p>
            )}
          </div>
          <Link to="/scanner" className="hidden sm:flex px-5 py-2.5 rounded-xl text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/15 items-center gap-2 flex-shrink-0">
            Start Scanning <span>→</span>
          </Link>
        </div>
      </motion.div>

      {/* ═══ Index Ticker ═══ */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1 will-change-scroll scrollbar-none">
        {indices.map((idx: any, i: number) => (
          <div key={i}
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-card/40 border border-border/15 whitespace-nowrap min-w-fit hover:border-border/30 transition-all">
            <span className="text-[9px] sm:text-[10px] text-muted-foreground/50 font-bold">{idx.symbol}</span>
            <span className="text-[11px] sm:text-[12px] text-foreground font-black font-data">
              {Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className={`text-[9px] sm:text-[10px] font-bold font-data ${(idx.change_pct || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {(idx.change_pct || 0) >= 0 ? '▲' : '▼'} {formatPercent(idx.change_pct)}
            </span>
            {isLive && i === 0 && <DataBadge status="live" />}
          </div>
        ))}
      </div>

      {/* ═══ AI Market Brief ═══ */}
      <MarketBrief />

      {/* ═══ Quick Actions ═══ */}
      <div>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground/50 font-bold mb-2 sm:mb-3 uppercase tracking-[0.15em]">⚡ Quick Actions</p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-2.5">
          <QuickAction icon="📊" title="Option Chain" desc="NIFTY / BANKNIFTY" to="/options" />
          <QuickAction icon="🔍" title="Scanner" desc="Find setups" to="/scanner" />
          <QuickAction icon="📐" title="Strategies" desc="Build & test" to="/options" />
          <QuickAction icon="▦" title="Heatmap" desc="Market view" to="/heatmap" />
          <QuickAction icon="⇄" title="FII / DII" desc="Fund flows" to="/fii-dii" />
          <QuickAction icon="◫" title="Sectors" desc="Rotation" to="/sectors" />
          <QuickAction icon="📈" title="OI Analysis" desc="OI trends" to="/oi-analysis" />
        </div>
      </div>

      {/* ═══ Index Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {indices.map((idx: any, i: number) => (
          <div key={i}
            className="rounded-2xl bg-card/50 border border-border/15 p-4 sm:p-5 hover:border-border/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground/50 font-bold tracking-[0.15em]">{idx.symbol}</span>
              <span className={`text-[7px] sm:text-[8px] px-2 sm:px-2.5 py-0.5 rounded-lg font-bold ${
                (idx.change_pct || 0) >= 0 ? 'bg-primary/8 text-primary' : 'bg-destructive/8 text-destructive'}`}>
                {(idx.change_pct || 0) >= 0 ? '▲ BULL' : '▼ BEAR'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl font-black text-foreground font-data tracking-tight">
                {Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className={`text-xs sm:text-sm font-bold font-data ${(idx.change_pct || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(idx.change_pct)}
              </span>
            </div>
            <div className="mt-3 sm:mt-4">
              <div className="flex justify-between text-[7px] sm:text-[8px] text-muted-foreground/40 mb-1 sm:mb-1.5 font-data">
                <span>L: {Number(idx.low).toLocaleString('en-IN')}</span>
                <span>H: {Number(idx.high).toLocaleString('en-IN')}</span>
              </div>
              <div className="h-1 sm:h-1.5 bg-secondary/40 rounded-full overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-destructive/40 via-accent/30 to-primary/40 rounded-full" />
                {idx.high > idx.low && (
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-foreground shadow-lg"
                    style={{ left: `${Math.min(((idx.ltp - idx.low) / (idx.high - idx.low)) * 100, 100)}%`, transform: 'translate(-50%, -50%)' }} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Key Metrics ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground/50 font-bold uppercase tracking-[0.15em]">📈 Key Metrics</p>
          {dataSource && <DataBadge status={dataSource === 'yahoo' ? 'live' : dataSource === 'vix-estimate' ? 'estimated' : metricsLoading ? 'loading' : 'unavailable'} source={dataSource} />}
          {mm?.timestamp && (
            <span className="text-[7px] text-muted-foreground/40 font-data ml-auto">
              Updated: {new Date(mm.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
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
            color={advances > declines ? 'text-primary' : 'text-destructive'} status="live" />
          <MetricWidget icon="🏦" label="FII Net"
            value={fiiDiiParsed ? `${fiiDiiParsed.fiiNet >= 0 ? '+' : ''}₹${Math.abs(Math.round(fiiDiiParsed.fiiNet)).toLocaleString('en-IN')} Cr` : '—'}
            sub={fiiDiiParsed?.date || undefined}
            color={fiiDiiParsed ? (fiiDiiParsed.fiiNet >= 0 ? 'text-primary' : 'text-destructive') : undefined}
            status={fiiDiiParsed ? 'live' : 'loading'} />
          <MetricWidget icon="📊" label="DII Net"
            value={fiiDiiParsed ? `${fiiDiiParsed.diiNet >= 0 ? '+' : ''}₹${Math.abs(Math.round(fiiDiiParsed.diiNet)).toLocaleString('en-IN')} Cr` : '—'}
            sub={fiiDiiParsed?.date || undefined}
            color={fiiDiiParsed ? (fiiDiiParsed.diiNet >= 0 ? 'text-primary' : 'text-destructive') : undefined}
            status={fiiDiiParsed ? 'live' : 'loading'} />
          <MetricWidget icon="💹" label="F&O Turnover"
            value={fnoTurnover != null && fnoTurnover > 0 ? `₹${fnoTurnover > 1000 ? (fnoTurnover / 1000).toFixed(1) + 'K' : fnoTurnover.toFixed(0)} Cr` : '—'}
            sub={daysToExpiry !== '—' ? `${daysToExpiry}D to expiry` : undefined}
            status={getMetricStatus(fnoTurnover != null && fnoTurnover > 0)} />
        </div>
      </div>

      {/* ═══ Expected Move ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
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
            <motion.div key={item.label} variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.15 + i * 0.05 }}
              className="rounded-2xl bg-card/50 border border-border/15 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-[11px] sm:text-[12px] font-black text-foreground tracking-tight">📊 Expected Move — {item.label}</span>
                <div className="flex items-center gap-1.5">
                  <DataBadge status={metricStatus} source={source} />
                  <span className="text-[7px] sm:text-[8px] px-2 sm:px-2.5 py-0.5 rounded-lg bg-accent/8 text-accent font-bold">
                    {daysToExpiry !== '—' ? `${daysToExpiry}D` : '—'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <p className="text-[7px] sm:text-[8px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">±1σ Move</p>
                  <p className="text-lg sm:text-xl font-black text-primary font-data">{move != null ? `±${move}` : '—'}</p>
                  <p className="text-[7px] sm:text-[8px] text-muted-foreground/40">{move != null && item.ltp ? `${(move / item.ltp * 100).toFixed(1)}%` : ''}</p>
                </div>
                <div>
                  <p className="text-[7px] sm:text-[8px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">ATM Straddle</p>
                  <p className="text-lg sm:text-xl font-black text-foreground font-data">{straddle != null ? `₹${straddle}` : '—'}</p>
                  <p className="text-[7px] sm:text-[8px] text-muted-foreground/40">{source === 'yahoo' ? 'Yahoo' : source === 'vix-estimate' ? 'VIX Est.' : ''}</p>
                </div>
                <div>
                  <p className="text-[7px] sm:text-[8px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">ATM IV</p>
                  <p className="text-lg sm:text-xl font-black text-accent font-data">{iv != null ? `${Number(iv).toFixed(1)}%` : '—'}</p>
                  <p className="text-[7px] sm:text-[8px] text-muted-foreground/40">{item.metrics ? 'Implied' : ''}</p>
                </div>
                <div>
                  <p className="text-[7px] sm:text-[8px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">Max Pain</p>
                  <p className="text-lg sm:text-xl font-black text-foreground font-data">{maxPain != null ? maxPain.toLocaleString('en-IN') : '—'}</p>
                  <p className="text-[7px] sm:text-[8px] text-muted-foreground/40">{maxPain ? 'Strike' : ''}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ═══ Watchlist ═══ */}
      <WatchlistWidget />

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3">
        {[
          { title: 'Top Gainers', badge: 'LIVE', data: gainers },
          { title: 'Top Losers', badge: 'LIVE', data: losers },
          { title: 'Most Active', badge: 'VOL', data: active, showVol: true },
        ].map((section) => (
          <div key={section.title} className="col-span-1 sm:col-span-12 lg:col-span-4">
            <div className="rounded-2xl bg-card/40 border border-border/15 overflow-hidden hover:border-border/25 transition-all">
              <SectionHeader title={section.title} badge={section.badge} link="/scanner" linkText="All" />
              <div className="divide-y divide-border/5">
                {section.data.slice(0, 8).map((stock, i) => <StockRow key={stock.symbol} stock={stock} rank={i + 1} showVolume={section.showVol} />)}
              </div>
            </div>
          </div>
        ))}

        {/* Sectors */}
        <div className="col-span-1 sm:col-span-12 lg:col-span-6">
          <div className="rounded-2xl bg-card/40 border border-border/15 overflow-hidden hover:border-border/25 transition-all">
            <SectionHeader title="Sector Performance" link="/sectors" linkText="View All" />
            {sectors.slice(0, 8).map((sec, i) => (
              <Link key={sec.sector} to={`/sectors/${encodeURIComponent(sec.sector)}`}
                className="flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-4 hover:bg-primary/3 transition-all">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-[8px] sm:text-[9px] text-muted-foreground/40 w-3 sm:w-4 font-data font-bold flex-shrink-0">{i + 1}</span>
                  <span className="text-[9px] sm:text-[10px] text-foreground font-semibold truncate">{sec.sector}</span>
                  <span className="text-[7px] sm:text-[8px] text-muted-foreground/40 flex-shrink-0">({sec.count})</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <div className="w-12 sm:w-16 h-1 sm:h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sec.avg_change >= 0 ? 'bg-primary/60' : 'bg-destructive/60'}`}
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
          <div className="rounded-2xl bg-card/40 border border-border/15 overflow-hidden hover:border-border/25 transition-all">
            <SectionHeader title="Market News" badge={liveNews ? 'LIVE' : ''} link="/news" linkText="All News" />
            {newsItems.slice(0, 6).map((article, i) => (
              <div key={i} className="py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-primary/3 transition-all cursor-pointer">
                <p className="text-[9px] sm:text-[10px] text-foreground leading-relaxed line-clamp-2 font-medium">{article.title}</p>
                <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                  <span className="text-[6px] sm:text-[7px] px-1.5 sm:px-2 py-0.5 rounded-lg bg-[hsl(var(--terminal-blue)/0.08)] text-[hsl(var(--terminal-blue))] font-bold">{article.category}</span>
                  <span className="text-[7px] sm:text-[8px] text-muted-foreground/40">{article.source} · {timeAgo(article.published_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
