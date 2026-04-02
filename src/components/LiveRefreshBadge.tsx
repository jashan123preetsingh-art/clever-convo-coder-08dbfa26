import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface LiveRefreshBadgeProps {
  intervalSeconds?: number;
  onRefresh: () => void;
  isFetching?: boolean;
  label?: string;
}

export default function LiveRefreshBadge({
  intervalSeconds = 30,
  onRefresh,
  isFetching = false,
  label = 'LIVE',
}: LiveRefreshBadgeProps) {
  const [secondsLeft, setSecondsLeft] = useState(intervalSeconds);

  const triggerRefresh = useCallback(() => {
    onRefresh();
    setSecondsLeft(intervalSeconds);
  }, [onRefresh, intervalSeconds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          triggerRefresh();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [intervalSeconds, triggerRefresh]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = ((intervalSeconds - secondsLeft) / intervalSeconds) * 100;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={triggerRefresh}
        disabled={isFetching}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group"
        title="Force refresh now"
      >
        <span className="relative flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)] animate-pulse" />
          <span className="text-primary">{label}</span>
        </span>
        {isFetching && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground font-mono flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin text-primary" />
              SYNCING…
            </span>
          </>
        )}
        </span>
      </button>

      {/* Thin progress bar underneath */}
      <div className="hidden md:block w-16 h-1 rounded-full bg-secondary/50 overflow-hidden">
        <div
          className="h-full bg-primary/60 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
