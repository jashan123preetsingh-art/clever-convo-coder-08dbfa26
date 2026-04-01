import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { INDICES, getTopGainers, getTopLosers, getMostActive, getSectorPerformance, NEWS, getAllStocks } from '@/data/mockData';
import { useIndices } from '@/hooks/useStockData';
import { formatCurrency, formatPercent, formatVolume, timeAgo } from '@/utils/format';
import MarketBrief from '@/components/MarketBrief';
import WatchlistWidget from '@/components/WatchlistWidget';

// ── Quick Action ──
function QuickAction({ icon, title, desc, to }: { icon: string; title: string; desc: string; to: string }) {
  return (
    <Link to={to}>
      <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
        className="p-4 rounded-2xl bg-card/60 border border-border/20 hover:border-primary/15 hover:bg-card/80 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.08)] transition-all duration-300 flex flex-col items-center text-center gap-2 group cursor-pointer h-full">
        <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{icon}</span>
        <p className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">{title}</p>
        <p className="text-[8px] text-muted-foreground/70 leading-relaxed">{desc}</p>
      </motion.div>
    </Link>
  );
}

// ── Metric Widget ──
function MetricWidget({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color?: string; icon?: string }) {
  return (
    <div className="rounded-2xl bg-card/50 p-4 border border-border/15 hover:border-border/30 transition-all duration-300 group">
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span className="text-xs opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span>}
        <p className="text-[8px] text-muted-foreground/60 uppercase tracking-[0.15em] font-bold">{label}</p>
      </div>
      <p className={`text-xl font-black font-data tracking-tight ${color || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[8px] text-muted-foreground/50 mt-1">{sub}</p>}
    </div>
  );
}

// ── Stock Row ──
function StockRow({ stock, rank, showVolume }: { stock: any; rank: number; showVolume?: boolean }) {
  return (
    <Link to={`/stock/${stock.symbol}`}
      className="flex items-center justify-between py-2.5 px-4 hover:bg-primary/3 transition-all group">
      <div className="flex items-center gap-3">
        <span className="text-[9px] text-muted-foreground/40 w-4 font-data font-bold">{rank}</span>
        <div>
          <p className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">{stock.symbol}</p>
          <p className="text-[8px] text-muted-foreground/50 truncate max-w-[100px]">
            {showVolume ? formatVolume(stock.volume) + ' vol' : stock.sector}
          </p>
        </div>
      </div>
      <div className="text-right font-data">
        <p className="text-[10px] text-foreground font-semibold">{formatCurrency(stock.ltp)}</p>
        <p className={`text-[9px] font-bold ${stock.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
          {stock.change_pct >= 0 ? '+' : ''}{formatPercent(stock.change_pct)}
        </p>
      </div>
    </Link>
  );
}

// ── Section Header ──
function SectionHeader({ title, badge, link, linkText }: { title: string; badge?: string; link?: string; linkText?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-3">
      <div className="flex items-center gap-2.5">
        <span className="text-[12px] font-black text-foreground tracking-tight">{title}</span>
        {badge && (
          <span className="text-[7px] px-2 py-0.5 rounded-lg bg-primary/8 text-primary font-bold tracking-wider">{badge}</span>
        )}
      </div>
      {link && (
        <Link to={link} className="text-[9px] font-semibold text-primary/50 hover:text-primary transition-colors">
          {linkText || 'View All'} →
        </Link>
      )}
    </div>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const { data: liveIndices } = useIndices();
  const indices = liveIndices?.length > 0 && !liveIndices[0]?.error ? liveIndices : INDICES;
  const isLive = liveIndices?.length > 0 && !liveIndices[0]?.error;

  const { gainers, losers, active, sectors, advances, declines, unchanged } = useMemo(() => {
    const g = getTopGainers();
    const l = getTopLosers();
    const a = getMostActive();
    const s = getSectorPerformance();
    const all = getAllStocks();
    return {
      gainers: g, losers: l, active: a, sectors: s,
      advances: all.filter(st => st.change_pct > 0).length,
      declines: all.filter(st => st.change_pct < 0).length,
      unchanged: all.filter(st => st.change_pct === 0).length,
    };
  }, []);

  const niftyLtp = indices.find((i: any) => i.symbol === 'NIFTY 50')?.ltp || 22800;
  const expectedMove = Math.round(niftyLtp * 0.014);
  const bnfLtp = indices.find((i: any) => i.symbol === 'BANKNIFTY')?.ltp || 52200;
  const bnfExpectedMove = Math.round(bnfLtp * 0.019);

  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="p-5 max-w-[1800px] mx-auto space-y-5">
      {/* ═══ Welcome ═══ */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="relative rounded-2xl bg-card/50 border border-border/20 p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/4 via-transparent to-[hsl(var(--terminal-cyan)/0.02)] pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">👋 {greeting}, Trader!</h1>
            <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-xl leading-relaxed">
              Your F&O command center — track indices, analyze OI, scan for opportunities, and build strategies.
            </p>
          </div>
          <Link to="/scanner" className="hidden sm:flex px-5 py-2.5 rounded-xl text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/15 items-center gap-2">
            Start Scanning <span>→</span>
          </Link>
        </div>
      </motion.div>

      {/* ═══ Index Ticker ═══ */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 will-change-scroll">
        {indices.map((idx: any, i: number) => (
          <div key={i}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card/40 border border-border/15 whitespace-nowrap min-w-fit hover:border-border/30 transition-all">
            <span className="text-[10px] text-muted-foreground/50 font-bold">{idx.symbol}</span>
            <span className="text-[12px] text-foreground font-black font-data">
              {Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className={`text-[10px] font-bold font-data ${(idx.change_pct || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {(idx.change_pct || 0) >= 0 ? '▲' : '▼'} {formatPercent(idx.change_pct)}
            </span>
            {isLive && i === 0 && (
              <span className="text-[7px] text-primary font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]" /> LIVE
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ═══ AI Market Brief ═══ */}
      <MarketBrief />

      {/* ═══ Quick Actions ═══ */}
      <div>
        <p className="text-[10px] text-muted-foreground/50 font-bold mb-3 uppercase tracking-[0.15em]">⚡ Quick Actions</p>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2.5">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {indices.map((idx: any, i: number) => (
          <motion.div key={i} variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-card/50 border border-border/15 p-5 hover:border-border/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-muted-foreground/50 font-bold tracking-[0.15em]">{idx.symbol}</span>
              <span className={`text-[8px] px-2.5 py-0.5 rounded-lg font-bold ${
                (idx.change_pct || 0) >= 0 ? 'bg-primary/8 text-primary' : 'bg-destructive/8 text-destructive'}`}>
                {(idx.change_pct || 0) >= 0 ? '▲ BULL' : '▼ BEAR'}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-foreground font-data tracking-tight">
                {Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className={`text-sm font-bold font-data ${(idx.change_pct || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(idx.change_pct)}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[8px] text-muted-foreground/40 mb-1.5 font-data">
                <span>L: {Number(idx.low).toLocaleString('en-IN')}</span>
                <span>H: {Number(idx.high).toLocaleString('en-IN')}</span>
              </div>
              <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-destructive/40 via-accent/30 to-primary/40 rounded-full" />
                {idx.high > idx.low && (
                  <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-foreground shadow-lg"
                    style={{ left: `${Math.min(((idx.ltp - idx.low) / (idx.high - idx.low)) * 100, 100)}%`, transform: 'translate(-50%, -50%)' }} />
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Key Metrics ═══ */}
      <div>
        <p className="text-[10px] text-muted-foreground/50 font-bold mb-3 uppercase tracking-[0.15em]">📈 Key Metrics</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <MetricWidget icon="📊" label="Nifty PCR" value="1.24" sub="BNF: 0.89" color="text-primary" />
          <MetricWidget icon="⚡" label="India VIX" value="25.27" sub="-5.4%" color="text-accent" />
          <MetricWidget icon="📈" label="Adv / Dec" value={`${advances} / ${declines}`} sub={`${unchanged} unch`}
            color={advances > declines ? 'text-primary' : 'text-destructive'} />
          <MetricWidget icon="🏦" label="FII Net" value="-₹4,367 Cr" sub="27-Mar" color="text-destructive" />
          <MetricWidget icon="📊" label="DII Net" value="+₹3,566 Cr" sub="27-Mar" color="text-primary" />
          <MetricWidget icon="💹" label="F&O Turnover" value="₹98.5K Cr" sub="Premium" />
        </div>
      </div>

      {/* ═══ Expected Move ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { label: 'NIFTY', ltp: niftyLtp, move: expectedMove, iv: '13.4%' },
          { label: 'BANKNIFTY', ltp: bnfLtp, move: bnfExpectedMove, iv: '15.2%' },
        ].map((item, i) => (
          <motion.div key={item.label} variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.15 + i * 0.05 }}
            className="rounded-2xl bg-card/50 border border-border/15 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-black text-foreground tracking-tight">📊 Expected Move — {item.label}</span>
              <span className="text-[8px] px-2.5 py-0.5 rounded-lg bg-accent/8 text-accent font-bold">4D to Expiry</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[8px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">±IE Move</p>
                <p className="text-xl font-black text-primary font-data">±{item.move}</p>
                <p className="text-[8px] text-muted-foreground/40">{(item.move / item.ltp * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[8px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">ATM Straddle</p>
                <p className="text-xl font-black text-foreground font-data">₹{Math.round(item.move * 0.85)}</p>
                <p className="text-[8px] text-muted-foreground/40">Implied</p>
              </div>
              <div>
                <p className="text-[8px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">IV Rank</p>
                <p className="text-xl font-black text-accent font-data">{item.iv}</p>
                <p className="text-[8px] text-muted-foreground/40">Annualized</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Watchlist ═══ */}
      <WatchlistWidget />

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-12 gap-3">
        {[
          { title: 'Top Gainers', badge: 'LIVE', data: gainers },
          { title: 'Top Losers', badge: 'LIVE', data: losers },
          { title: 'Most Active', badge: 'VOL', data: active, showVol: true },
        ].map((section) => (
          <div key={section.title} className="col-span-12 lg:col-span-4">
            <div className="rounded-2xl bg-card/40 border border-border/15 overflow-hidden hover:border-border/25 transition-all">
              <SectionHeader title={section.title} badge={section.badge} link="/scanner" linkText="All" />
              <div className="divide-y divide-border/5">
                {section.data.slice(0, 8).map((stock, i) => <StockRow key={stock.symbol} stock={stock} rank={i + 1} showVolume={section.showVol} />)}
              </div>
            </div>
          </div>
        ))}

        {/* Sectors */}
        <div className="col-span-12 lg:col-span-6">
          <div className="rounded-2xl bg-card/40 border border-border/15 overflow-hidden hover:border-border/25 transition-all">
            <SectionHeader title="Sector Performance" link="/sectors" linkText="View All" />
            {sectors.slice(0, 8).map((sec, i) => (
              <Link key={sec.sector} to={`/sectors/${encodeURIComponent(sec.sector)}`}
                className="flex items-center justify-between py-2.5 px-4 hover:bg-primary/3 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-muted-foreground/40 w-4 font-data font-bold">{i + 1}</span>
                  <span className="text-[10px] text-foreground font-semibold">{sec.sector}</span>
                  <span className="text-[8px] text-muted-foreground/40">({sec.count})</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sec.avg_change >= 0 ? 'bg-primary/60' : 'bg-destructive/60'}`}
                      style={{ width: `${Math.min(Math.abs(sec.avg_change) * 18, 100)}%` }} />
                  </div>
                  <span className={`text-[9px] font-bold w-12 text-right font-data ${sec.avg_change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatPercent(sec.avg_change)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* News */}
        <div className="col-span-12 lg:col-span-6">
          <div className="rounded-2xl bg-card/40 border border-border/15 overflow-hidden hover:border-border/25 transition-all">
            <SectionHeader title="Market News" link="/news" linkText="All News" />
            {NEWS.slice(0, 6).map((article, i) => (
              <div key={i} className="py-3 px-4 hover:bg-primary/3 transition-all cursor-pointer">
                <p className="text-[10px] text-foreground leading-relaxed line-clamp-2 font-medium">{article.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[7px] px-2 py-0.5 rounded-lg bg-[hsl(var(--terminal-blue)/0.08)] text-[hsl(var(--terminal-blue))] font-bold">{article.category}</span>
                  <span className="text-[8px] text-muted-foreground/40">{article.source} · {timeAgo(article.published_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
