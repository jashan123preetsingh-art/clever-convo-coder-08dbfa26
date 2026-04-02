import React, { useState, useMemo } from 'react';
import { Rocket, Clock, CheckCircle2, TrendingUp, TrendingDown, CalendarDays, Users } from 'lucide-react';

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
  sector: string;
}

// Realistic IPO data
const IPO_DATA: IPOItem[] = [
  // Listed recently
  { company: 'Hexaware Technologies', symbol: 'HEXAWARE', price_band: '₹674-₹708', lot_size: 21, issue_size_cr: 8750, open_date: '2025-02-12', close_date: '2025-02-14', listing_date: '2025-02-19', listing_price: 731, cmp: 695, status: 'listed', subscription_total: 2.66, subscription_retail: 0.93, subscription_hni: 1.44, subscription_qib: 4.49, listing_gain_pct: 3.2, sector: 'IT Services' },
  { company: 'Dr. Agarwals Eye Hospital', symbol: 'DRAGARWAL', price_band: '₹382-₹402', lot_size: 37, issue_size_cr: 3027, open_date: '2025-01-29', close_date: '2025-01-31', listing_date: '2025-02-05', listing_price: 445, cmp: 462, status: 'listed', subscription_total: 47.12, subscription_retail: 15.3, subscription_hni: 52.8, subscription_qib: 63.5, listing_gain_pct: 10.7, sector: 'Healthcare' },
  { company: 'Stallion India Fluorochemicals', symbol: 'STALLION', price_band: '₹85-₹90', lot_size: 165, issue_size_cr: 160, open_date: '2025-01-16', close_date: '2025-01-20', listing_date: '2025-01-23', listing_price: 118, cmp: 132, status: 'listed', subscription_total: 82.5, subscription_retail: 44.2, subscription_hni: 93.1, subscription_qib: 120.4, listing_gain_pct: 31.1, sector: 'Chemicals' },
  { company: 'Capital Infra Trust', symbol: 'CAPITALINFRA', price_band: '₹99-₹100', lot_size: 150, issue_size_cr: 2488, open_date: '2025-01-07', close_date: '2025-01-09', listing_date: '2025-01-14', listing_price: 104, cmp: 96, status: 'listed', subscription_total: 2.14, subscription_retail: 2.8, subscription_hni: 1.1, subscription_qib: 2.44, listing_gain_pct: 4.0, sector: 'Infrastructure' },
  // Ongoing
  { company: 'Ather Energy', price_band: '₹304-₹321', lot_size: 46, issue_size_cr: 2981, open_date: '2025-04-28', close_date: '2025-04-30', status: 'ongoing', subscription_total: 1.8, subscription_retail: 2.1, subscription_hni: 0.9, subscription_qib: 2.3, gmp: 45, sector: 'EV / Auto' },
  { company: 'Zepto', price_band: '₹500-₹524', lot_size: 28, issue_size_cr: 4500, open_date: '2025-04-25', close_date: '2025-04-29', status: 'ongoing', subscription_total: 3.2, subscription_retail: 5.8, subscription_hni: 2.1, subscription_qib: 3.4, gmp: 120, sector: 'E-commerce' },
  // Upcoming
  { company: 'PhonePe', price_band: 'TBA', lot_size: 0, issue_size_cr: 6000, open_date: '2025-05-15', close_date: '2025-05-19', status: 'upcoming', gmp: 0, sector: 'Fintech' },
  { company: 'Flipkart', price_band: 'TBA', lot_size: 0, issue_size_cr: 10000, open_date: '2025-06-10', close_date: '2025-06-14', status: 'upcoming', gmp: 0, sector: 'E-commerce' },
  { company: 'NSDL (National Securities Depository)', price_band: 'TBA', lot_size: 0, issue_size_cr: 3500, open_date: '2025-05-20', close_date: '2025-05-22', status: 'upcoming', sector: 'Financial Services' },
  { company: 'Tata Capital', price_band: 'TBA', lot_size: 0, issue_size_cr: 8000, open_date: '2025-07-01', close_date: '2025-07-05', status: 'upcoming', sector: 'NBFC' },
];

export default function IPO() {
  const [tab, setTab] = useState<'upcoming' | 'ongoing' | 'listed'>('ongoing');
  const filtered = useMemo(() => IPO_DATA.filter(i => i.status === tab), [tab]);

  const tabs = [
    { key: 'ongoing' as const, label: 'Live / Ongoing', icon: <Clock className="w-3.5 h-3.5" />, count: IPO_DATA.filter(i => i.status === 'ongoing').length },
    { key: 'upcoming' as const, label: 'Upcoming', icon: <Rocket className="w-3.5 h-3.5" />, count: IPO_DATA.filter(i => i.status === 'upcoming').length },
    { key: 'listed' as const, label: 'Recently Listed', icon: <CheckCircle2 className="w-3.5 h-3.5" />, count: IPO_DATA.filter(i => i.status === 'listed').length },
  ];

  return (
    <div className="p-3 md:p-5 space-y-4">
      <div>
        <h1 className="text-lg font-black text-foreground tracking-tight">IPO Tracker</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">Upcoming · Ongoing · Recently Listed IPOs</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border/30 rounded-xl p-3">
          <p className="text-[9px] text-muted-foreground font-semibold">ONGOING IPOs</p>
          <p className="text-xl font-black text-primary">{IPO_DATA.filter(i => i.status === 'ongoing').length}</p>
        </div>
        <div className="bg-card border border-border/30 rounded-xl p-3">
          <p className="text-[9px] text-muted-foreground font-semibold">UPCOMING</p>
          <p className="text-xl font-black text-[hsl(var(--terminal-cyan))]">{IPO_DATA.filter(i => i.status === 'upcoming').length}</p>
        </div>
        <div className="bg-card border border-border/30 rounded-xl p-3">
          <p className="text-[9px] text-muted-foreground font-semibold">AVG LISTING GAIN</p>
          <p className="text-xl font-black text-primary">
            {(IPO_DATA.filter(i => i.listing_gain_pct != null).reduce((a, b) => a + (b.listing_gain_pct || 0), 0) / Math.max(1, IPO_DATA.filter(i => i.listing_gain_pct != null).length)).toFixed(1)}%
          </p>
        </div>
        <div className="bg-card border border-border/30 rounded-xl p-3">
          <p className="text-[9px] text-muted-foreground font-semibold">TOTAL ISSUE SIZE</p>
          <p className="text-xl font-black text-foreground">₹{(IPO_DATA.reduce((a, b) => a + b.issue_size_cr, 0) / 1000).toFixed(1)}K Cr</p>
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
                  <div>
                    <span className="text-[8px] text-muted-foreground">PRICE BAND</span>
                    <p className="text-[11px] font-bold text-foreground">{ipo.price_band}</p>
                  </div>
                  <div>
                    <span className="text-[8px] text-muted-foreground">LOT SIZE</span>
                    <p className="text-[11px] font-bold text-foreground">{ipo.lot_size || 'TBA'}</p>
                  </div>
                  <div>
                    <span className="text-[8px] text-muted-foreground">ISSUE SIZE</span>
                    <p className="text-[11px] font-bold text-foreground">₹{ipo.issue_size_cr.toLocaleString()} Cr</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(ipo.open_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(ipo.close_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Listing details for listed IPOs */}
              {ipo.status === 'listed' && ipo.listing_price && (
                <div className="text-right flex-shrink-0">
                  <span className="text-[8px] text-muted-foreground">LISTING</span>
                  <p className="text-[13px] font-black text-foreground">₹{ipo.listing_price}</p>
                  <div className={`flex items-center gap-0.5 justify-end text-[10px] font-bold ${(ipo.listing_gain_pct || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {(ipo.listing_gain_pct || 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {(ipo.listing_gain_pct || 0) >= 0 ? '+' : ''}{ipo.listing_gain_pct?.toFixed(1)}%
                  </div>
                  {ipo.cmp && (
                    <div className="mt-1">
                      <span className="text-[8px] text-muted-foreground">CMP: </span>
                      <span className="text-[10px] font-bold text-foreground">₹{ipo.cmp}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Subscription data */}
            {ipo.subscription_total != null && (
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
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[11px] text-muted-foreground">No IPOs in this category</div>
        )}
      </div>
    </div>
  );
}
