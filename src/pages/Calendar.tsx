import React, { useState, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, AlertTriangle, TrendingUp, Building2 } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CalendarEvent {
  date: string; // YYYY-MM-DD
  title: string;
  category: 'rbi' | 'fed' | 'earnings' | 'expiry' | 'data' | 'holiday';
  impact: 'high' | 'medium' | 'low';
  description?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  rbi: 'bg-[hsl(var(--terminal-cyan)/0.15)] text-[hsl(var(--terminal-cyan))] border-[hsl(var(--terminal-cyan)/0.3)]',
  fed: 'bg-[hsl(var(--terminal-blue)/0.15)] text-[hsl(var(--terminal-blue))] border-[hsl(var(--terminal-blue)/0.3)]',
  earnings: 'bg-primary/10 text-primary border-primary/20',
  expiry: 'bg-destructive/10 text-destructive border-destructive/20',
  data: 'bg-accent/10 text-accent border-accent/20',
  holiday: 'bg-muted text-muted-foreground border-border/30',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  rbi: <Building2 className="w-3.5 h-3.5" />,
  fed: <TrendingUp className="w-3.5 h-3.5" />,
  earnings: <TrendingUp className="w-3.5 h-3.5" />,
  expiry: <AlertTriangle className="w-3.5 h-3.5" />,
  data: <Clock className="w-3.5 h-3.5" />,
  holiday: <CalendarDays className="w-3.5 h-3.5" />,
};

// Static economic calendar events for 2025-2026
const EVENTS: CalendarEvent[] = [
  // RBI Policy Dates 2025
  { date: '2025-04-09', title: 'RBI MPC Decision', category: 'rbi', impact: 'high', description: 'Monetary Policy Committee rate decision' },
  { date: '2025-06-06', title: 'RBI MPC Decision', category: 'rbi', impact: 'high', description: 'Monetary Policy Committee rate decision' },
  { date: '2025-08-08', title: 'RBI MPC Decision', category: 'rbi', impact: 'high', description: 'Monetary Policy Committee rate decision' },
  { date: '2025-10-08', title: 'RBI MPC Decision', category: 'rbi', impact: 'high', description: 'Monetary Policy Committee rate decision' },
  { date: '2025-12-05', title: 'RBI MPC Decision', category: 'rbi', impact: 'high', description: 'Monetary Policy Committee rate decision' },
  { date: '2026-02-06', title: 'RBI MPC Decision', category: 'rbi', impact: 'high', description: 'Monetary Policy Committee rate decision' },
  { date: '2026-04-10', title: 'RBI MPC Decision', category: 'rbi', impact: 'high', description: 'Monetary Policy Committee rate decision' },
  // US Fed Meetings 2025
  { date: '2025-05-07', title: 'US Fed FOMC Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision' },
  { date: '2025-06-18', title: 'US Fed FOMC Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision' },
  { date: '2025-07-30', title: 'US Fed FOMC Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision' },
  { date: '2025-09-17', title: 'US Fed FOMC Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision' },
  { date: '2025-10-29', title: 'US Fed FOMC Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision' },
  { date: '2025-12-17', title: 'US Fed FOMC Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision' },
  // F&O Expiry (last Thursday)
  { date: '2025-04-24', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2025-05-29', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2025-06-26', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2025-07-31', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2025-08-28', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2025-09-25', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2025-10-30', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2025-11-27', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2025-12-25', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2026-01-29', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2026-02-26', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2026-03-26', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  { date: '2026-04-30', title: 'Monthly F&O Expiry', category: 'expiry', impact: 'high' },
  // India GDP / CPI releases
  { date: '2025-04-14', title: 'India CPI Inflation', category: 'data', impact: 'medium', description: 'Consumer Price Index release' },
  { date: '2025-05-12', title: 'India CPI Inflation', category: 'data', impact: 'medium' },
  { date: '2025-05-30', title: 'India GDP Q4 FY25', category: 'data', impact: 'high', description: 'Quarterly GDP growth data' },
  { date: '2025-06-12', title: 'India IIP Data', category: 'data', impact: 'medium', description: 'Industrial Production Index' },
  { date: '2025-08-29', title: 'India GDP Q1 FY26', category: 'data', impact: 'high' },
  { date: '2025-11-28', title: 'India GDP Q2 FY26', category: 'data', impact: 'high' },
  // Market Holidays
  { date: '2025-04-10', title: 'Mahavir Jayanti', category: 'holiday', impact: 'low', description: 'Market Closed' },
  { date: '2025-04-14', title: 'Dr. Ambedkar Jayanti', category: 'holiday', impact: 'low', description: 'Market Closed' },
  { date: '2025-04-18', title: 'Good Friday', category: 'holiday', impact: 'low', description: 'Market Closed' },
  { date: '2025-05-01', title: 'Maharashtra Day', category: 'holiday', impact: 'low', description: 'Market Closed' },
  { date: '2025-08-15', title: 'Independence Day', category: 'holiday', impact: 'low', description: 'Market Closed' },
  { date: '2025-08-27', title: 'Ganesh Chaturthi', category: 'holiday', impact: 'low', description: 'Market Closed' },
  { date: '2025-10-02', title: 'Gandhi Jayanti', category: 'holiday', impact: 'low', description: 'Market Closed' },
  { date: '2025-10-21', title: 'Diwali (Lakshmi Puja)', category: 'holiday', impact: 'low', description: 'Market Closed' },
  { date: '2025-11-05', title: 'Guru Nanak Jayanti', category: 'holiday', impact: 'low', description: 'Market Closed' },
  { date: '2025-12-25', title: 'Christmas', category: 'holiday', impact: 'low', description: 'Market Closed' },
  { date: '2026-01-26', title: 'Republic Day', category: 'holiday', impact: 'low', description: 'Market Closed' },
  { date: '2026-03-30', title: 'Id-ul-Fitr', category: 'holiday', impact: 'low', description: 'Market Closed' },
  // Key Earnings Season
  { date: '2025-04-15', title: 'TCS Q4 Results', category: 'earnings', impact: 'high' },
  { date: '2025-04-16', title: 'Infosys Q4 Results', category: 'earnings', impact: 'high' },
  { date: '2025-04-23', title: 'HDFC Bank Q4 Results', category: 'earnings', impact: 'high' },
  { date: '2025-04-25', title: 'ICICI Bank Q4 Results', category: 'earnings', impact: 'high' },
  { date: '2025-04-28', title: 'Reliance Q4 Results', category: 'earnings', impact: 'high' },
  { date: '2025-07-14', title: 'TCS Q1 Results', category: 'earnings', impact: 'high' },
  { date: '2025-07-17', title: 'Infosys Q1 Results', category: 'earnings', impact: 'high' },
  { date: '2025-07-21', title: 'HDFC Bank Q1 Results', category: 'earnings', impact: 'high' },
  { date: '2025-10-13', title: 'TCS Q2 Results', category: 'earnings', impact: 'high' },
  { date: '2025-10-16', title: 'Infosys Q2 Results', category: 'earnings', impact: 'high' },
];

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    return EVENTS.filter(e => selectedCategory === 'all' || e.category === selectedCategory);
  }, [selectedCategory]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const eventsThisMonth = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return filteredEvents.filter(e => e.date.startsWith(prefix));
  }, [year, month, filteredEvents]);

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    eventsThisMonth.forEach(e => {
      const day = parseInt(e.date.split('-')[2]);
      if (!map[day]) map[day] = [];
      map[day].push(e);
    });
    return map;
  }, [eventsThisMonth]);

  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter(e => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 12);
  }, [filteredEvents, todayStr]);

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'rbi', label: 'RBI' },
    { key: 'fed', label: 'US Fed' },
    { key: 'expiry', label: 'F&O Expiry' },
    { key: 'earnings', label: 'Earnings' },
    { key: 'data', label: 'Eco Data' },
    { key: 'holiday', label: 'Holidays' },
  ];

  return (
    <div className="p-3 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-foreground tracking-tight">Economic Calendar</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">RBI · Fed · F&O Expiry · Earnings · Holidays</p>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map(c => (
          <button key={c.key} onClick={() => setSelectedCategory(c.key)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors duration-150
              ${selectedCategory === c.key ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary/30 text-muted-foreground border-border/20 hover:bg-secondary/50'}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-card border border-border/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-foreground">{MONTHS[month]} {year}</h2>
              <button onClick={goToday} className="text-[9px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors">TODAY</button>
            </div>
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[9px] font-bold text-muted-foreground/60 py-2">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const dayEvents = eventsByDay[day] || [];
              return (
                <div key={day}
                  className={`min-h-[60px] md:min-h-[75px] p-1 rounded-lg border transition-colors duration-100
                    ${isToday ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-secondary/20'}`}>
                  <span className={`text-[10px] font-bold ${isToday ? 'text-primary' : 'text-foreground/70'}`}>{day}</span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayEvents.slice(0, 2).map((ev, j) => (
                      <div key={j} className={`text-[7px] leading-tight px-1 py-0.5 rounded border ${CATEGORY_COLORS[ev.category]} truncate`}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[7px] text-muted-foreground text-center">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-card border border-border/30 rounded-2xl p-4">
          <h3 className="text-[12px] font-bold text-foreground mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Upcoming Events
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {upcomingEvents.map((ev, i) => {
              const d = new Date(ev.date + 'T00:00:00');
              const daysDiff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
              return (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-colors">
                  <div className="flex-shrink-0 w-10 text-center">
                    <div className="text-[16px] font-black text-foreground leading-none">{d.getDate()}</div>
                    <div className="text-[8px] text-muted-foreground font-semibold">{MONTHS[d.getMonth()].slice(0, 3).toUpperCase()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded border font-semibold ${CATEGORY_COLORS[ev.category]}`}>
                        {CATEGORY_ICONS[ev.category]}
                        {ev.category.toUpperCase()}
                      </span>
                      {ev.impact === 'high' && <span className="text-[7px] px-1 py-0.5 rounded bg-destructive/10 text-destructive font-bold">HIGH</span>}
                    </div>
                    <p className="text-[10px] font-bold text-foreground mt-1 truncate">{ev.title}</p>
                    {ev.description && <p className="text-[9px] text-muted-foreground truncate">{ev.description}</p>}
                  </div>
                  <span className={`text-[9px] font-bold flex-shrink-0 ${daysDiff <= 3 ? 'text-destructive' : daysDiff <= 7 ? 'text-accent' : 'text-muted-foreground'}`}>
                    {daysDiff === 0 ? 'TODAY' : daysDiff === 1 ? 'TMR' : `${daysDiff}d`}
                  </span>
                </div>
              );
            })}
            {upcomingEvents.length === 0 && (
              <div className="text-center py-8 text-[10px] text-muted-foreground">No upcoming events in this category</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
