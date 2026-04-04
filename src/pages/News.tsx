import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { timeAgo } from '@/utils/format';
import { NEWS } from '@/data/mockData';
import { ExternalLink, Newspaper, CalendarDays, Search, RefreshCw, Filter } from 'lucide-react';

/** Strip any residual HTML tags and decode common HTML entities */
function cleanText(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]*>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const CATEGORIES = ['All', 'Market', 'Stocks', 'Economy', 'IPO', 'F&O', 'Earnings', 'Sector'];

const categoryColors: Record<string, string> = {
  Market: 'bg-primary/10 text-primary border-primary/20',
  Stocks: 'bg-[hsl(var(--terminal-blue)/0.1)] text-[hsl(var(--terminal-blue))] border-[hsl(var(--terminal-blue)/0.2)]',
  Economy: 'bg-accent/10 text-accent border-accent/20',
  IPO: 'bg-[hsl(var(--terminal-purple)/0.1)] text-[hsl(var(--terminal-purple))] border-[hsl(var(--terminal-purple)/0.2)]',
  'F&O': 'bg-[hsl(var(--terminal-cyan)/0.1)] text-[hsl(var(--terminal-cyan))] border-[hsl(var(--terminal-cyan)/0.2)]',
  Earnings: 'bg-[hsl(var(--terminal-amber)/0.1)] text-[hsl(var(--terminal-amber))] border-[hsl(var(--terminal-amber)/0.2)]',
  Sector: 'bg-[hsl(var(--terminal-green)/0.1)] text-[hsl(var(--terminal-green))] border-[hsl(var(--terminal-green)/0.2)]',
};

const ECONOMIC_EVENTS = [
  { date: '2026-04-01', title: 'RBI Monetary Policy Review', category: 'Policy', importance: 'high' as const, description: 'Reserve Bank of India MPC meeting for repo rate decision' },
  { date: '2026-04-03', title: 'India Services PMI', category: 'Data', importance: 'medium' as const, description: 'S&P Global India Services Purchasing Managers Index' },
  { date: '2026-04-05', title: 'India Manufacturing PMI', category: 'Data', importance: 'medium' as const, description: 'Monthly manufacturing sector activity indicator' },
  { date: '2026-04-08', title: 'CPI Inflation Data', category: 'Data', importance: 'high' as const, description: 'Consumer Price Index inflation reading for March' },
  { date: '2026-04-10', title: 'IIP Data Release', category: 'Data', importance: 'medium' as const, description: 'Index of Industrial Production for February' },
  { date: '2026-04-12', title: 'WPI Inflation', category: 'Data', importance: 'medium' as const, description: 'Wholesale Price Index inflation data' },
  { date: '2026-04-15', title: 'Q4 Earnings Season Begins', category: 'Earnings', importance: 'high' as const, description: 'IT majors TCS, Infosys kick off Q4 FY26 results' },
  { date: '2026-04-16', title: 'TCS Q4 Results', category: 'Earnings', importance: 'high' as const, description: 'Tata Consultancy Services quarterly earnings' },
  { date: '2026-04-17', title: 'Infosys Q4 Results', category: 'Earnings', importance: 'high' as const, description: 'Infosys Ltd quarterly earnings announcement' },
  { date: '2026-04-18', title: 'HDFC Bank Q4 Results', category: 'Earnings', importance: 'high' as const, description: 'HDFC Bank quarterly earnings release' },
  { date: '2026-04-20', title: 'F&O Expiry', category: 'Market', importance: 'high' as const, description: 'Monthly futures & options contract expiry' },
  { date: '2026-04-22', title: 'India Trade Balance', category: 'Data', importance: 'medium' as const, description: 'March trade deficit/surplus data' },
  { date: '2026-04-25', title: 'India GDP Advance Estimate', category: 'Data', importance: 'high' as const, description: 'Advance estimate for Q4 GDP growth' },
  { date: '2026-04-28', title: 'Reliance Q4 Results', category: 'Earnings', importance: 'high' as const, description: 'Reliance Industries quarterly earnings' },
  { date: '2026-04-30', title: 'Monthly F&O Expiry', category: 'Market', importance: 'high' as const, description: 'April series expiry for futures & options' },
  { date: '2026-03-28', title: 'Weekly F&O Expiry', category: 'Market', importance: 'medium' as const, description: 'Weekly Nifty & BankNifty options expiry' },
  { date: '2026-03-31', title: 'FY26 Year End', category: 'Policy', importance: 'high' as const, description: 'Financial year 2025-26 closing day' },
];

const EVENT_CATEGORIES = ['All Events', 'Policy', 'Data', 'Earnings', 'Market'];

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface LiveNewsItem {
  title: string;
  source: string;
  category: string;
  published_at: string;
  url: string;
  description?: string;
}

interface NewsResponse {
  news: LiveNewsItem[];
  total?: number;
  cached?: boolean;
  fetched_at?: string;
  categories?: Record<string, number>;
  sources_ok?: number;
  sources_total?: number;
}

async function fetchLiveNews(): Promise<NewsResponse> {
  const resp = await fetch(`${FUNCTIONS_URL}/market-news`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!resp.ok) throw new Error('Failed to fetch news');
  return resp.json();
}

export default function News() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeView, setActiveView] = useState<'news' | 'calendar'>('news');
  const [activeEventCat, setActiveEventCat] = useState('All Events');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: newsResponse, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['market-news'],
    queryFn: fetchLiveNews,
    refetchInterval: 90_000, // 90 seconds
    staleTime: 60_000,
  });

  const liveNews = newsResponse?.news;
  const allNews = liveNews && liveNews.length > 0 ? liveNews : NEWS;
  const isLive = !!(liveNews && liveNews.length > 0);

  const categoryCounts = useMemo(() => {
    if (newsResponse?.categories) return newsResponse.categories;
    const counts: Record<string, number> = {};
    for (const n of allNews) {
      counts[n.category] = (counts[n.category] || 0) + 1;
    }
    return counts;
  }, [allNews, newsResponse]);

  const displayNews = useMemo(() => {
    let filtered = activeCategory === 'All' ? allNews : allNews.filter(n => n.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.source.toLowerCase().includes(q) ||
        (n as any).description?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [allNews, activeCategory, searchQuery]);

  const sortedEvents = useMemo(() =>
    [...ECONOMIC_EVENTS].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    []
  );
  const filteredEvents = activeEventCat === 'All Events' ? sortedEvents : sortedEvents.filter(e => e.category === activeEventCat);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-3 max-w-[1600px] mx-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-foreground tracking-wide">MARKET NEWS & CALENDAR</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-[10px] text-muted-foreground">Latest Indian market news, earnings & economic events</p>
            {isLive && (
              <span className="flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-md bg-primary/12 text-primary font-bold ring-1 ring-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.6)] animate-pulse" />
                LIVE · {newsResponse?.total ?? allNews.length} articles
              </span>
            )}
            {newsResponse?.sources_ok != null && (
              <span className="text-[8px] text-muted-foreground/40">
                {newsResponse.sources_ok}/{newsResponse.sources_total} sources
              </span>
            )}
            {newsResponse?.fetched_at && (
              <span className="text-[8px] text-muted-foreground/30 font-data">
                Updated {timeAgo(newsResponse.fetched_at)}
              </span>
            )}
            {isLoading && (
              <span className="text-[8px] text-muted-foreground animate-pulse">Loading...</span>
            )}
            {isError && (
              <span className="text-[8px] text-destructive">Using cached news</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground/50 hover:text-foreground disabled:opacity-30"
            title="Refresh news"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex gap-0.5 bg-secondary/50 p-0.5 rounded-lg">
            <button onClick={() => setActiveView('news')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1.5 ${activeView === 'news' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Newspaper className="w-3 h-3" /> NEWS
            </button>
            <button onClick={() => setActiveView('calendar')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1.5 ${activeView === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <CalendarDays className="w-3 h-3" /> CALENDAR
            </button>
          </div>
        </div>
      </div>

      {activeView === 'news' ? (
        <>
          {/* Search + Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40" />
              <input
                type="text"
                placeholder="Search news..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-secondary/50 border border-border/20 text-[10px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-all"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.filter(cat => cat === 'All' || (categoryCounts[cat] ?? 0) > 0).map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${
                    activeCategory === cat
                      ? (categoryColors[cat]?.replace('bg-', 'bg-').replace('text-', 'text-') || 'bg-primary/10 text-primary border-primary/30')
                      : 'bg-secondary/40 text-muted-foreground border-border/20 hover:text-foreground hover:bg-secondary/60'
                  }`}>
                  {cat}
                  {cat !== 'All' && categoryCounts[cat] ? (
                    <span className="ml-1 opacity-60">{categoryCounts[cat]}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground/40">
              {displayNews.length} {displayNews.length === 1 ? 'article' : 'articles'}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-card/30 border border-border/10 p-3 animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-12 bg-muted/30 rounded" />
                    <div className="h-3 w-16 bg-muted/30 rounded" />
                  </div>
                  <div className="h-4 w-full bg-muted/30 rounded mb-1" />
                  <div className="h-4 w-3/4 bg-muted/30 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-muted/30 rounded" />
                </div>
              ))}
            </div>
          ) : displayNews.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-[11px] text-muted-foreground/50">
                {searchQuery ? `No articles matching "${searchQuery}"` : 'No news available for this category'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {displayNews.map((article, i) => (
                <motion.a
                  href={article.url !== '#' ? article.url : undefined}
                  target={article.url !== '#' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  key={`${article.title.slice(0, 30)}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  className="rounded-xl bg-card/30 border border-border/10 p-3 hover:border-primary/20 hover:bg-card/50 transition-all group cursor-pointer block"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-bold ${categoryColors[article.category] || 'bg-muted/15 text-muted-foreground'}`}>
                      {article.category}
                    </span>
                    <span className="text-[8px] text-muted-foreground/40 font-data">{timeAgo(article.published_at)}</span>
                    {i === 0 && isLive && (
                      <span className="text-[7px] px-1 py-0.5 rounded bg-primary/10 text-primary font-bold">NEW</span>
                    )}
                  </div>
                  <h3 className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors mb-1.5 line-clamp-3 leading-relaxed">
                    {cleanText(article.title)}
                  </h3>
                  {'description' in article && (article as any).description && (
                    <p className="text-[9px] text-muted-foreground/50 mb-2 line-clamp-2 leading-relaxed">
                      {cleanText((article as any).description)}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/10">
                    <span className="text-[8px] text-muted-foreground/50 font-medium">{article.source}</span>
                    {article.url !== '#' && (
                      <span className="text-[8px] text-primary/40 group-hover:text-primary font-semibold flex items-center gap-0.5 transition-colors">
                        Read <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex gap-1 flex-wrap">
            {EVENT_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveEventCat(cat)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${
                  activeEventCat === cat
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-secondary/40 text-muted-foreground border-border/20 hover:text-foreground'
                }`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            {filteredEvents.map((event, i) => {
              const isPast = event.date < today;
              const isToday = event.date === today;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                  className={`rounded-xl bg-card/30 border border-border/10 p-3 flex items-center gap-4 transition-all ${
                    isToday ? 'border-accent/30 bg-accent/5' : isPast ? 'opacity-40' : 'hover:border-border/20'
                  }`}>
                  <div className="w-14 text-center flex-shrink-0">
                    <p className="text-[11px] font-bold text-foreground">{new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit' })}</p>
                    <p className="text-[8px] text-muted-foreground/60">{new Date(event.date).toLocaleDateString('en-IN', { month: 'short' })}</p>
                  </div>
                  <div className="w-px h-8 bg-border/20 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-[11px] font-semibold text-foreground">{event.title}</h3>
                      {isToday && <span className="text-[7px] px-1.5 py-0.5 rounded-md bg-accent/15 text-accent font-bold animate-pulse">TODAY</span>}
                    </div>
                    <p className="text-[9px] text-muted-foreground/50">{event.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-bold ${
                      event.category === 'Earnings' ? 'bg-[hsl(var(--terminal-blue)/0.1)] text-[hsl(var(--terminal-blue))]'
                        : event.category === 'Policy' ? 'bg-accent/10 text-accent'
                        : event.category === 'Market' ? 'bg-primary/10 text-primary'
                        : 'bg-secondary/50 text-muted-foreground'
                    }`}>
                      {event.category}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${event.importance === 'high' ? 'bg-destructive shadow-[0_0_4px_hsl(var(--destructive)/0.4)]' : 'bg-accent/60'}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
