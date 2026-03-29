import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { INDICES, getTopGainers, getTopLosers, getMostActive, getSectorPerformance, NEWS, getAllStocks } from '@/data/mockData';
import { useIndices, useMarketBreadth } from '@/hooks/useStockData';
import { formatCurrency, formatPercent, formatVolume, timeAgo } from '@/utils/format';
import MarketBrief from '@/components/MarketBrief';

// ── Quick Action Card ──
function QuickAction({ icon, title, desc, to }: { icon: string; title: string; desc: string; to: string }) {
  return (
    <Link to={to}>
      <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
        className="t-card p-4 flex flex-col items-center text-center gap-2 cursor-pointer group hover:border-primary/30 transition-all">
        <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
        <p className="text-[11px] font-bold text-foreground">{title}</p>
        <p className="text-[8px] text-muted-foreground leading-relaxed">{desc}</p>
      </motion.div>
    </Link>
  );
}

// ── Market Metric Widget ──
function MetricWidget({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color?: string; icon?: string }) {
  return (
    <div className="bg-card rounded-lg p-3 border border-border/40">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-xs">{icon}</span>}
        <p className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className={`text-lg font-black font-data tracking-tight ${color || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[8px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Stock Row ──
function StockRow({ stock, rank, showVolume }: { stock: any; rank: number; showVolume?: boolean }) {
  return (
    <Link to={`/stock/${stock.symbol}`}
      className="flex items-center justify-between py-2 px-3.5 hover:bg-secondary/40 transition-all group border-b border-border/10 last:border-0">
      <div className="flex items-center gap-2.5">
        <span className="text-[9px] text-muted-foreground w-4 font-data font-medium">{rank}</span>
        <div>
          <p className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors">{stock.symbol}</p>
          <p className="text-[8px] text-muted-foreground truncate max-w-[100px]">
            {showVolume ? formatVolume(stock.volume) + ' vol' : stock.sector}
          </p>
        </div>
      </div>
      <div className="text-right font-data">
        <p className="text-[10px] text-foreground font-medium">{formatCurrency(stock.ltp)}</p>
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
    <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-foreground tracking-wide">{title}</span>
        {badge && <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{badge}</span>}
      </div>
      {link && (
        <Link to={link} className="text-[9px] font-medium text-primary/70 hover:text-primary transition-colors">
          {linkText || 'View All'} →
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: liveIndices } = useIndices();
  const indices = liveIndices?.length > 0 && !liveIndices[0]?.error ? liveIndices : INDICES;
  const isLive = liveIndices?.length > 0 && !liveIndices[0]?.error;

  const gainers = getTopGainers();
  const losers = getTopLosers();
  const active = getMostActive();
  const sectors = getSectorPerformance();
  const allStocks = getAllStocks();

  // Compute market breadth from mock data
  const advances = allStocks.filter(s => s.change_pct > 0).length;
  const declines = allStocks.filter(s => s.change_pct < 0).length;
  const unchanged = allStocks.filter(s => s.change_pct === 0).length;

  // Simulated expected move
  const niftyLtp = indices.find((i: any) => i.symbol === 'NIFTY 50')?.ltp || 22800;
  const expectedMove = Math.round(niftyLtp * 0.014);
  const bnfLtp = indices.find((i: any) => i.symbol === 'BANKNIFTY')?.ltp || 52200;
  const bnfExpectedMove = Math.round(bnfLtp * 0.019);

  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="p-4 max-w-[1800px] mx-auto space-y-4">
      {/* ═══ Welcome Banner ═══ */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="t-card p-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-foreground">👋 {greeting}, Trader!</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Your F&O command center — track indices, analyze OI, scan for opportunities, and build strategies. All in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/scanner" className="px-3.5 py-2 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm glow-primary">
            Start Scanning →
          </Link>
        </div>
      </motion.div>

      {/* ═══ Live Index Ticker Bar ═══ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {indices.map((idx: any, i: number) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary/40 border border-border/30 whitespace-nowrap min-w-fit">
            <span className="text-[10px] text-muted-foreground font-bold">{idx.symbol}</span>
            <span className="text-[12px] text-foreground font-black font-data">
              {Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className={`text-[10px] font-bold font-data ${(idx.change_pct || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {(idx.change_pct || 0) >= 0 ? '▲' : '▼'} {formatPercent(idx.change_pct)}
            </span>
            {isLive && i === 0 && (
              <span className="text-[7px] text-primary font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> LIVE
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* ═══ AI Market Brief ═══ */}
      <MarketBrief />

      {/* ═══ Quick Actions ═══ */}
      <div>
        <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase tracking-wider">⚡ Quick Actions <span className="text-muted-foreground/50">— Jump to any tool instantly</span></p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <QuickAction icon="📊" title="Option Chain" desc="NIFTY / BANKNIFTY chain" to="/options" />
          <QuickAction icon="🔍" title="Scanner" desc="Find opportunities" to="/scanner" />
          <QuickAction icon="📐" title="Strategy Builder" desc="Build & backtest" to="/options" />
          <QuickAction icon="▦" title="Heatmap" desc="Market overview" to="/heatmap" />
          <QuickAction icon="⇄" title="FII / DII" desc="Institutional flows" to="/fii-dii" />
          <QuickAction icon="◫" title="Sectors" desc="Sector rotation" to="/sectors" />
          <QuickAction icon="📈" title="OI Analysis" desc="Call/Put OI trends" to="/oi-analysis" />
        </div>
      </div>

      {/* ═══ Index Cards (Expanded) ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {indices.map((idx: any, i: number) => (
          <motion.div key={i} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="t-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground font-bold tracking-wider">{idx.symbol}</span>
              <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${
                (idx.change_pct || 0) >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                {(idx.change_pct || 0) >= 0 ? '▲ BULL' : '▼ BEAR'}
              </span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-black text-foreground font-data tracking-tight">
                {Number(idx.ltp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className={`text-sm font-bold font-data ${(idx.change_pct || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(idx.change_pct)}
              </span>
            </div>
            {/* Day range bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[8px] text-muted-foreground mb-1 font-data">
                <span>L: {Number(idx.low).toLocaleString('en-IN')}</span>
                <span>H: {Number(idx.high).toLocaleString('en-IN')}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-destructive/60 via-accent/40 to-primary/60 rounded-full" />
                {idx.high > idx.low && (
                  <div className="absolute top-0 w-1.5 h-1.5 rounded-full bg-foreground border border-background"
                    style={{ left: `${Math.min(((idx.ltp - idx.low) / (idx.high - idx.low)) * 100, 100)}%`, transform: 'translateX(-50%)' }} />
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Key Market Metrics ═══ */}
      <div>
        <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase tracking-wider">📈 Key Market Metrics <span className="text-muted-foreground/50">— VIX, PCR, Market Breadth</span></p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <MetricWidget icon="📊" label="Nifty PCR" value="1.24" sub="BNF: 0.89" color="text-primary" />
          <MetricWidget icon="⚡" label="India VIX" value="25.27" sub="-5.4%" color="text-accent" />
          <MetricWidget icon="📈" label="Adv / Dec" value={`${advances} / ${declines}`} sub={`${unchanged} unchanged`}
            color={advances > declines ? 'text-primary' : 'text-destructive'} />
          <MetricWidget icon="🏦" label="FII Net (Cr)" value="-₹4,367" sub="27-Mar-2026" color="text-destructive" />
          <MetricWidget icon="📊" label="DII Net (Cr)" value="+₹3,566" sub="27-Mar-2026" color="text-primary" />
          <MetricWidget icon="💹" label="F&O Turnover" value="₹98.5K Cr" sub="Total premium" />
        </div>
      </div>

      {/* ═══ Expected Move ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="t-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">📊</span>
              <span className="text-[11px] font-bold text-foreground">Expected Move — NIFTY</span>
            </div>
            <span className="text-[8px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold">4D to Expiry</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">±IE Move</p>
              <p className="text-lg font-black text-primary font-data">±{expectedMove}</p>
              <p className="text-[8px] text-muted-foreground">{(expectedMove / niftyLtp * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">ATM Straddle</p>
              <p className="text-lg font-black text-foreground font-data">₹{Math.round(expectedMove * 0.85)}</p>
              <p className="text-[8px] text-muted-foreground">Market Implied</p>
            </div>
            <div>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">IV Rank</p>
              <p className="text-lg font-black text-accent font-data">13.4%</p>
              <p className="text-[8px] text-muted-foreground">Annualized</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="t-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">📊</span>
              <span className="text-[11px] font-bold text-foreground">Expected Move — BANKNIFTY</span>
            </div>
            <span className="text-[8px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold">4D to Expiry</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">±IE Move</p>
              <p className="text-lg font-black text-primary font-data">±{bnfExpectedMove}</p>
              <p className="text-[8px] text-muted-foreground">{(bnfExpectedMove / bnfLtp * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">ATM Straddle</p>
              <p className="text-lg font-black text-foreground font-data">₹{Math.round(bnfExpectedMove * 0.85)}</p>
              <p className="text-[8px] text-muted-foreground">Market Implied</p>
            </div>
            <div>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">IV Rank</p>
              <p className="text-lg font-black text-accent font-data">15.2%</p>
              <p className="text-[8px] text-muted-foreground">Annualized</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-12 gap-3">
        {/* Gainers */}
        <div className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Top Gainers" badge="LIVE" link="/scanner" linkText="All" />
            {gainers.slice(0, 8).map((stock, i) => <StockRow key={stock.symbol} stock={stock} rank={i + 1} />)}
          </div>
        </div>

        {/* Losers */}
        <div className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Top Losers" badge="LIVE" link="/scanner" linkText="All" />
            {losers.slice(0, 8).map((stock, i) => <StockRow key={stock.symbol} stock={stock} rank={i + 1} />)}
          </div>
        </div>

        {/* Most Active */}
        <div className="col-span-12 lg:col-span-4">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Most Active" badge="VOL" link="/scanner" linkText="All" />
            {active.slice(0, 8).map((stock, i) => <StockRow key={stock.symbol} stock={stock} rank={i + 1} showVolume />)}
          </div>
        </div>

        {/* Sectors */}
        <div className="col-span-12 lg:col-span-6">
          <div className="t-card overflow-hidden">
            <SectionHeader title="Sector Performance" link="/sectors" linkText="View All" />
            {sectors.slice(0, 8).map((sec, i) => (
              <Link key={sec.sector} to={`/sectors/${encodeURIComponent(sec.sector)}`}
                className="flex items-center justify-between py-2 px-3.5 hover:bg-secondary/30 transition-all border-b border-border/10 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-[9px] text-muted-foreground w-4 font-data">{i + 1}</span>
                  <span className="text-[10px] text-foreground font-medium">{sec.sector}</span>
                  <span className="text-[8px] text-muted-foreground">({sec.count})</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-14 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sec.avg_change >= 0 ? 'bg-primary' : 'bg-destructive'}`}
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
          <div className="t-card overflow-hidden">
            <SectionHeader title="Market News" link="/news" linkText="All News" />
            {NEWS.slice(0, 6).map((article, i) => (
              <div key={i} className="py-2.5 px-3.5 hover:bg-secondary/30 transition-all border-b border-border/10 last:border-0 cursor-pointer">
                <p className="text-[10px] text-foreground leading-relaxed line-clamp-2 font-medium">{article.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--terminal-blue)/0.1)] text-[hsl(var(--terminal-blue))] font-bold">{article.category}</span>
                  <span className="text-[8px] text-muted-foreground">{article.source} · {timeAgo(article.published_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
