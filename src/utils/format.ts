export function formatCurrency(value: number | null | undefined, compact = false): string {
  if (value == null || isNaN(value)) return '---';
  if (compact) {
    if (Math.abs(value) >= 1e7) return `${value < 0 ? '-' : ''}₹${(Math.abs(value) / 1e7).toFixed(2)} Cr`;
    if (Math.abs(value) >= 1e5) return `${value < 0 ? '-' : ''}₹${(Math.abs(value) / 1e5).toFixed(2)} L`;
    if (Math.abs(value) >= 1e3) return `${value < 0 ? '-' : ''}₹${(Math.abs(value) / 1e3).toFixed(1)}K`;
  }
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '---';
  return Number(value).toLocaleString('en-IN');
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '---';
  const num = Number(value);
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export function formatVolume(value: number | null | undefined): string {
  if (value == null || isNaN(Number(value))) return '---';
  const num = Number(value);
  if (num === 0) return '0';
  if (num >= 1e7) return `${(num / 1e7).toFixed(2)} Cr`;
  if (num >= 1e5) return `${(num / 1e5).toFixed(2)} L`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}

export function formatMarketCap(value: number | null | undefined): string {
  if (!value) return '---';
  const crores = Number(value);
  if (crores >= 100000) return `₹${(crores / 100000).toFixed(2)}L Cr`;
  if (crores >= 1000) return `₹${(crores / 1000).toFixed(2)}K Cr`;
  return `₹${crores.toFixed(0)} Cr`;
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
