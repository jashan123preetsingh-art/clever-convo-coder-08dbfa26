import React from 'react';
import type { DataStatus } from '@/types/stock';

interface DataBadgeProps {
  status: DataStatus;
  source?: string;
}

const DataBadge = React.forwardRef<HTMLSpanElement, DataBadgeProps>(({ status, source, ...props }, ref) => {
  const config: Record<string, { text: string; bg: string; color: string; dot: boolean; ring?: string }> = {
    live: { text: 'LIVE', bg: 'bg-primary/12', color: 'text-primary', dot: true, ring: 'ring-1 ring-primary/20' },
    delayed: { text: 'MKT CLOSED', bg: 'bg-muted/15', color: 'text-muted-foreground/70', dot: false },
    estimated: { text: source === 'vix-estimate' ? 'VIX EST.' : 'EST.', bg: 'bg-accent/10', color: 'text-accent', dot: false },
    loading: { text: '···', bg: 'bg-muted/20', color: 'text-muted-foreground/60', dot: false },
    unavailable: { text: 'N/A', bg: 'bg-destructive/8', color: 'text-destructive/60', dot: false },
    'market-closed': { text: 'CLOSED', bg: 'bg-muted/15', color: 'text-muted-foreground/70', dot: false },
  };
  const c = config[status] || config.unavailable;
  return (
    <span ref={ref} {...props} className={`text-[8px] px-2 py-0.5 rounded-md ${c.bg} ${c.color} font-bold tracking-wider inline-flex items-center gap-1 ${c.ring || ''}`}>
      {c.dot && <span className="w-1 h-1 rounded-full bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.6)] animate-pulse" />}
      {c.text}
    </span>
  );
});
DataBadge.displayName = 'DataBadge';

export default DataBadge;
