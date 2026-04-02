import React, { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpDown, Landmark, Shield, Zap, RefreshCw } from 'lucide-react';

interface MarketEvent {
  time: string;
  title: string;
  type: 'circuit' | 'block_deal' | 'insider' | 'sebi' | 'alert';
  impact: 'high' | 'medium' | 'low';
}

const ICON_MAP: Record<string, React.ReactNode> = {
  circuit: <Zap className="w-3.5 h-3.5 text-destructive" />,
  block_deal: <ArrowUpDown className="w-3.5 h-3.5 text-[hsl(var(--terminal-cyan))]" />,
  insider: <Landmark className="w-3.5 h-3.5 text-accent" />,
  sebi: <Shield className="w-3.5 h-3.5 text-[hsl(var(--terminal-blue))]" />,
  alert: <AlertTriangle className="w-3.5 h-3.5 text-primary" />,
};

const TYPE_LABELS: Record<string, string> = {
  circuit: 'CIRCUIT',
  block_deal: 'BLOCK DEAL',
  insider: 'INSIDER',
  sebi: 'SEBI',
  alert: 'ALERT',
};

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function fetchLiveEvents(): Promise<MarketEvent[]> {
  const resp = await fetch(`${FUNCTIONS_URL}/market-events`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!resp.ok) throw new Error('Failed to fetch events');
  const data = await resp.json();
  return data.events || [];
}

function EventsFeed() {
  const { data: events, isLoading, dataUpdatedAt } = useQuery<MarketEvent[]>({
    queryKey: ['market-events'],
    queryFn: fetchLiveEvents,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const items = events && events.length > 0 ? events : [];
  const updatedTime = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })
    : '';

  return (
    <div className="bg-card border border-border/30 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Market Events Feed
        </h3>
        <div className="flex items-center gap-2">
          {updatedTime && (
            <span className="text-[7px] text-muted-foreground/50 font-data">{updatedTime}</span>
          )}
          <span className="text-[8px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {isLoading && items.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-secondary/20 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-[10px] text-muted-foreground">
          No market events detected — market may be closed
        </div>
      ) : (
        <div className="space-y-1 max-h-[350px] overflow-y-auto">
          {items.map((event, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-secondary/20 transition-colors group">
              <span className="flex-shrink-0 mt-0.5">{ICON_MAP[event.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-foreground leading-snug">{event.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[8px] text-muted-foreground font-data">{event.time} IST</span>
                  <span className={`text-[7px] px-1.5 py-0.5 rounded font-bold border
                    ${event.type === 'circuit' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      event.type === 'block_deal' ? 'bg-[hsl(var(--terminal-cyan)/0.1)] text-[hsl(var(--terminal-cyan))] border-[hsl(var(--terminal-cyan)/0.2)]' :
                      event.type === 'insider' ? 'bg-accent/10 text-accent border-accent/20' :
                      event.type === 'sebi' ? 'bg-[hsl(var(--terminal-blue)/0.1)] text-[hsl(var(--terminal-blue))] border-[hsl(var(--terminal-blue)/0.2)]' :
                      'bg-primary/10 text-primary border-primary/20'}`}>
                    {TYPE_LABELS[event.type]}
                  </span>
                  {event.impact === 'high' && <span className="text-[7px] px-1 py-0.5 rounded bg-destructive/10 text-destructive font-bold">HIGH</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(EventsFeed);
