import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Rocket, Clock, CheckCircle2, TrendingUp, TrendingDown, CalendarDays, Users, RefreshCw } from 'lucide-react';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface IPOItem {
  company: string;
  symbol?: string;
  price_band: string;
  lot_size: number;
  issue_size_cr: number;
  open_date: string;
  close_date: string;
  listing_date?: string;
  listing_price?: number;
  cmp?: number;
  status: 'upcoming' | 'ongoing' | 'listed';
  subscription_retail?: number;
  subscription_hni?: number;
  subscription_qib?: number;
  subscription_total?: number;
  gmp?: number;
  listing_gain_pct?: number;
  change_pct?: number;
  sector: string;
  market_cap?: number;
}

async function fetchIPOData() {
  const resp = await fetch(`${FUNCTIONS_URL}/ipo-data`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!resp.ok) throw new Error('Failed to fetch IPO data');
  return resp.json();
}

export default function IPO() {
  const [tab, setTab] = useState<'upcoming' | 'ongoing' | 'listed'>('listed');

  const { data: ipoData, isLoading } = useQuery({
    queryKey: ['ipo-data'],
    queryFn: fetchIPOData,
    staleTime: 300_000,
    refetchInterval: 300_000,
    retry: 1,
  });

  const allItems = useMemo(() => {
    if (!ipoData) return [];
    const items: IPOItem[] = [];
    if (ipoData.ongoing) items.push(...ipoData.ongoing.map((i: any) => ({ ...i, status: 'ongoing' as const })));
    if (ipoData.upcoming) items.push(...ipoData.upcoming.map((i: any) => ({ ...i, status: 'upcoming' as const })));
    if (ipoData.listed) items.push(...ipoData.listed.map((i: any) => ({ ...i, status: 'listed' as const })));
    return items;
  }, [ipoData]);

  const filtered = useMemo(() => allItems.filter(i => i.status === tab), [allItems, tab]);

  const ongoingCount = allItems.filter(i => i.status === 'ongoing').length;
  const upcomingCount = allItems.filter(i => i.status === 'upcoming').length;
  const listedCount = allItems.filter(i => i.status === 'listed').length;

  const tabs = [
    { key: 'ongoing' as const, label: 'Live / Ongoing', icon: <Clock className="w-3.5 h-3.5" />, count: ongoingCount },
    { key: 'upcoming' as const, label: 'Upcoming', icon: <Rocket className="w-3.5 h-3.5" />, count: upcomingCount },
    { key: 'listed' as const, label: 'Recently Listed', icon: <CheckCircle2 className="w-3.5 h-3.5" />, count: listedCount },
  ];

  const avgListingGain = useMemo(() => {
    const listed = allItems.filter(i => i.listing_gain_pct != null);
    if (listed.length === 0) return 0;
    return listed.reduce((a, b) => a + (b.listing_gain_pct || 0), 0) / listed.length;
  }, [allItems]);

  const totalIssueSize = useMemo(() => allItems.reduce((a, b) => a + (b.issue_size_cr || 0), 0), [allItems]);

  return (
    <div className="p-3 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-foreground tracking-tight">IPO Tracker</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Upcoming · Ongoing · Recently Listed IPOs
            {ipoData?.source === 'curated' && <span className="ml-2 text-muted-foreground/50">· Curated data</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[8px] text-muted-foreground/50">
          <RefreshCw className="w-2.5 h-2.5" />
          <span>Auto-refresh 5m</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-secondary/20 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border/30 rounded-xl p-3">
              <p className="text-[9px] text-muted-foreground font-semibold">ONGOING IPOs</p>
              <p className="text-xl font-black text-primary">{ongoingCount}</p>
            </div>
            <div className="bg-card border border-border/30 rounded-xl p-3">
              <p className="text-[9px] text-muted-foreground font-semibold">UPCOMING</p>
              <p className="text-xl font-black text-[hsl(var(--terminal-cyan))]">{upcomingCount}</p>
            </div>
            <div className="bg-card border border-border/30 rounded-xl p-3">
              <p className="text-[9px] text-muted-foreground font-semibold">AVG LISTING GAIN</p>
              <p className="text-xl font-black text-primary">{avgListingGain.toFixed(1)}%</p>
            </div>
            <div className="bg-card border border-border/30 rounded-xl p-3">
              <p className="text-[9px] text-muted-foreground font-semibold">TOTAL ISSUE SIZE</p>
              <p className="text-xl font-black text-foreground">
                {totalIssueSize > 1000 ? `₹${(totalIssueSize / 1000).toFixed(1)}K Cr` : `₹${totalIssueSize} Cr`}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold border transition-colors
                  ${tab === t.key ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary/30 text-muted-foreground border-border/20 hover:bg-secondary/50'}`}>
                {t.icon} {t.label}
                <span className="text-[9px] bg-background/50 px-1.5 py-0.5 rounded-md">{t.count}</span>
              </button>
            ))}
          </div>

          {/* IPO Cards */}
          <div className="space-y-3">
            {filtered.map((ipo, i) => (
              <div key={i} className="bg-card border border-border/30 rounded-2xl p-4 hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[13px] font-bold text-foreground">{ipo.company}</h3>
                      <span className="text-[8px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-semibold">{ipo.sector}</span>
                      {ipo.gmp != null && ipo.gmp > 0 && (
                        <span className="text-[8px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">GMP: +₹{ipo.gmp}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      {ipo.price_band && (
                        <div>
                          <span className="text-[8px] text-muted-foreground">PRICE BAND</span>
                          <p className="text-[11px] font-bold text-foreground">{ipo.price_band}</p>
                        </div>
                      )}
                      {ipo.lot_size > 0 && (
                        <div>
                          <span className="text-[8px] text-muted-foreground">LOT SIZE</span>
                          <p className="text-[11px] font-bold text-foreground">{ipo.lot_size}</p>
                        </div>
                      )}
                      {ipo.issue_size_cr > 0 && (
                        <div>
                          <span className="text-[8px] text-muted-foreground">ISSUE SIZE</span>
                          <p className="text-[11px] font-bold text-foreground">₹{ipo.issue_size_cr.toLocaleString()} Cr</p>
                        </div>
                      )}
                      {ipo.open_date && ipo.close_date && (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(ipo.open_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(ipo.close_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Listing details */}
                  {ipo.status === 'listed' && (ipo.listing_price || ipo.cmp) && (
                    <div className="text-right flex-shrink-0">
                      {ipo.listing_price && (
                        <>
                          <span className="text-[8px] text-muted-foreground">LISTING</span>
                          <p className="text-[13px] font-black text-foreground">₹{ipo.listing_price}</p>
                        </>
                      )}
                      {ipo.listing_gain_pct != null && (
                        <div className={`flex items-center gap-0.5 justify-end text-[10px] font-bold ${ipo.listing_gain_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {ipo.listing_gain_pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {ipo.listing_gain_pct >= 0 ? '+' : ''}{ipo.listing_gain_pct.toFixed(1)}%
                        </div>
                      )}
                      {ipo.cmp && (
                        <div className="mt-1">
                          <span className="text-[8px] text-muted-foreground">CMP: </span>
                          <span className="text-[10px] font-bold text-foreground">₹{ipo.cmp.toFixed(2)}</span>
                          {ipo.change_pct != null && (
                            <span className={`text-[8px] ml-1 font-bold ${ipo.change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              {ipo.change_pct >= 0 ? '+' : ''}{ipo.change_pct.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Subscription data */}
                {ipo.subscription_total != null && ipo.subscription_total > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/20">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground font-semibold">SUBSCRIPTION</span>
                      <span className={`text-[10px] font-bold ml-1 ${(ipo.subscription_total || 0) > 1 ? 'text-primary' : 'text-destructive'}`}>
                        {ipo.subscription_total?.toFixed(2)}x
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Retail', val: ipo.subscription_retail },
                        { label: 'HNI/NII', val: ipo.subscription_hni },
                        { label: 'QIB', val: ipo.subscription_qib },
                      ].map(s => (
                        s.val != null ? (
                          <div key={s.label}>
                            <span className="text-[8px] text-muted-foreground">{s.label}</span>
                            <div className="mt-1">
                              <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${(s.val || 0) >= 1 ? 'bg-primary' : 'bg-destructive/60'}`}
                                  style={{ width: `${Math.min(100, ((s.val || 0) / Math.max(1, ipo.subscription_total || 1)) * 100)}%` }} />
                              </div>
                              <span className={`text-[9px] font-bold ${(s.val || 0) >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>{s.val?.toFixed(2)}x</span>
                            </div>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-[11px] text-muted-foreground">
                {isLoading ? 'Loading IPO data...' : 'No IPOs in this category right now'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
