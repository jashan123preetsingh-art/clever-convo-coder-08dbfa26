import React, { memo } from 'react';
import { AlertTriangle, ArrowUpDown, Landmark, Shield, Zap } from 'lucide-react';

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

// Sample events — in production these would come from an API
const SAMPLE_EVENTS: MarketEvent[] = [
  { time: '15:22', title: 'Suzlon Energy hit upper circuit at ₹58.40 (+5%)', type: 'circuit', impact: 'high' },
  { time: '14:45', title: 'Block deal: Axis Bank — 2.5 Cr shares at ₹1,142', type: 'block_deal', impact: 'high' },
  { time: '14:30', title: 'SEBI orders regarding F&O trading limits effective May 1', type: 'sebi', impact: 'medium' },
  { time: '13:15', title: 'Promoter of IRFC bought 50L shares via open market', type: 'insider', impact: 'medium' },
  { time: '12:50', title: 'Vodafone Idea hit lower circuit at ₹7.85 (-5%)', type: 'circuit', impact: 'high' },
  { time: '11:30', title: 'HDFC AMC — mutual fund inflow up 18% MoM', type: 'alert', impact: 'low' },
  { time: '10:45', title: 'Block deal: Trent Ltd — 1.2 Cr shares at ₹5,850', type: 'block_deal', impact: 'medium' },
  { time: '10:15', title: 'SEBI circular: New margin framework for currency derivatives', type: 'sebi', impact: 'medium' },
  { time: '09:45', title: 'Nifty crosses 24,500 — new all-time high', type: 'alert', impact: 'high' },
  { time: '09:30', title: 'Adani Power promoter pledge reduced to 3.2%', type: 'insider', impact: 'low' },
];

function EventsFeed() {
  return (
    <div className="bg-card border border-border/30 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Market Events Feed
        </h3>
        <span className="text-[8px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          LIVE
        </span>
      </div>
      <div className="space-y-1 max-h-[350px] overflow-y-auto">
        {SAMPLE_EVENTS.map((event, i) => (
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
    </div>
  );
}

export default memo(EventsFeed);
