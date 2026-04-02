import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { timeAgo } from '@/utils/format';
import { NEWS } from '@/data/mockData';

/** Strip any residual HTML tags and decode common HTML entities */
function cleanDescription(text: string): string {
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

const CATEGORIES = ['All', 'Market', 'Stocks', 'Economy', 'IPO'];

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

async function fetchLiveNews() {
  const resp = await fetch(`${FUNCTIONS_URL}/market-news`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!resp.ok) throw new Error('Failed to fetch news');
  const data = await resp.json();
  return data.news as { title: string; source: string; category: string; published_at: string; url: string; description?: string }[];
}

export default function News() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeView, setActiveView] = useState<'news' | 'calendar'>('news');
  const [activeEventCat, setActiveEventCat] = useState('All Events');

  const { data: liveNews, isLoading, isError } = useQuery({
    queryKey: ['market-news'],
    queryFn: fetchLiveNews,
    refetchInterval: 120_000, // refresh every 2 min
    staleTime: 60_000,
  });

  // Use live news, fallback to mock
  const allNews = liveNews && liveNews.length > 0 ? liveNews : NEWS;
  const isLive = !!(liveNews && liveNews.length > 0);

  const displayNews = activeCategory === 'All' ? allNews : allNews.filter(n => n.category === activeCategory);

  const sortedEvents = [...ECONOMIC_EVENTS].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const filteredEvents = activeEventCat === 'All Events' ? sortedEvents : sortedEvents.filter(e => e.category === activeEventCat);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-3 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-sm font-bold text-foreground tracking-wide">MARKET NEWS & CALENDAR</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] text-muted-foreground">Latest Indian market news, earnings & economic events</p>
            {isLive && (
              <span className="flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            )}
            {isLoading && (
              <span className="text-[8px] text-muted-foreground animate-pulse">Loading live news...</span>
            )}
            {isError && (
              <span className="text-[8px] text-destructive">Using cached news</span>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 bg-secondary/50 p-0.5 rounded-sm">
          <button onClick={() => setActiveView('news')}
            className={`px-3 py-1 rounded-sm text-[10px] font-semibold transition-all ${activeView === 'news' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            📰 NEWS
          </button>
          <button onClick={() => setActiveView('calendar')}
            className={`px-3 py-1 rounded-sm text-[10px] font-semibold transition-all ${activeView === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            📅 CALENDAR
          </button>
        </div>
      </div>

      {activeView === 'news' ? (
        <>
          <div className="flex gap-1 mb-3">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-sm text-[10px] font-semibold border transition-all ${activeCategory === cat ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}>
                {cat}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="t-card p-3 animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-12 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-full bg-muted rounded mb-1" />
                  <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {displayNews.map((article, i) => (
                <motion.a
                  href={article.url !== '#' ? article.url : undefined}
                  target={article.url !== '#' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="t-card p-3 hover:border-primary/30 transition-all group cursor-pointer block"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-terminal-blue/10 text-terminal-blue">{article.category}</span>
                    <span className="text-[9px] text-muted-foreground">{timeAgo(article.published_at)}</span>
                  </div>
                  <h3 className="text-[11px] font-medium text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-3">{article.title}</h3>
                  {'description' in article && article.description && (
                    <p className="text-[9px] text-muted-foreground mb-2 line-clamp-2">{cleanDescription(article.description)}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[9px] text-muted-foreground">{article.source}</span>
                    <span className="text-[9px] text-terminal-blue group-hover:underline">Read →</span>
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex gap-1 mb-3">
            {EVENT_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveEventCat(cat)}
                className={`px-3 py-1 rounded-sm text-[10px] font-semibold border transition-all ${activeEventCat === cat ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}>
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
                  className={`t-card p-3 flex items-center gap-4 ${isToday ? 'border-terminal-amber/30 bg-terminal-amber/5' : isPast ? 'opacity-50' : ''}`}>
                  <div className="w-14 text-center flex-shrink-0">
                    <p className="text-[10px] font-bold text-foreground">{new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit' })}</p>
                    <p className="text-[8px] text-muted-foreground">{new Date(event.date).toLocaleDateString('en-IN', { month: 'short' })}</p>
                  </div>
                  <div className="w-px h-8 bg-border flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-[11px] font-semibold text-foreground">{event.title}</h3>
                      {isToday && <span className="text-[8px] px-1 py-0.5 rounded bg-terminal-amber/20 text-terminal-amber animate-pulse">TODAY</span>}
                    </div>
                    <p className="text-[9px] text-muted-foreground">{event.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded ${event.category === 'Earnings' ? 'bg-terminal-blue/10 text-terminal-blue' : event.category === 'Policy' ? 'bg-terminal-amber/10 text-terminal-amber' : event.category === 'Market' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {event.category}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${event.importance === 'high' ? 'bg-destructive' : 'bg-terminal-amber'}`} />
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
