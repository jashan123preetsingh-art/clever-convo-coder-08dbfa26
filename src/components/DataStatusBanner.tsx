import { AlertTriangle, WifiOff } from 'lucide-react';

interface DataStatusBannerProps {
  isUsingMockData: boolean;
  isError?: boolean;
}

export default function DataStatusBanner({ isUsingMockData, isError }: DataStatusBannerProps) {
  if (!isUsingMockData && !isError) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/15 text-accent text-[9px] font-medium">
      {isError ? (
        <>
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Unable to fetch live data — showing cached/sample data. Check your connection.</span>
        </>
      ) : (
        <>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Live data unavailable — showing sample data. Market data may not be current.</span>
        </>
      )}
    </div>
  );
}
