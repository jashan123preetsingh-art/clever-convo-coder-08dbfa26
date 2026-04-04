import { Link } from 'react-router-dom';
import { Newspaper, ExternalLink } from 'lucide-react';
import { timeAgo } from '@/utils/format';
import type { NewsArticle } from '@/types/stock';

interface NewsWidgetProps {
  newsItems: (NewsArticle & { description?: string })[];
  isLive: boolean;
}

function cleanText(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const categoryColors: Record<string, string> = {
  Market: 'bg-primary/10 text-primary',
  Stocks: 'bg-[hsl(var(--terminal-blue)/0.1)] text-[hsl(var(--terminal-blue))]',
  Economy: 'bg-accent/10 text-accent',
  IPO: 'bg-[hsl(var(--terminal-purple)/0.1)] text-[hsl(var(--terminal-purple))]',
  'F&O': 'bg-[hsl(var(--terminal-cyan)/0.1)] text-[hsl(var(--terminal-cyan))]',
  Earnings: 'bg-[hsl(var(--terminal-amber)/0.1)] text-[hsl(var(--terminal-amber))]',
  Sector: 'bg-[hsl(var(--terminal-green)/0.1)] text-[hsl(var(--terminal-green))]',
};

export default function NewsWidget({ newsItems, isLive }: NewsWidgetProps) {
  return (
    <div className="col-span-1 sm:col-span-12 lg:col-span-6">
      <div className="rounded-xl bg-card/30 border border-border/10 overflow-hidden hover:border-border/20 transition-all">
        <div className="flex items-center justify-between px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] sm:text-xs font-black text-foreground tracking-tight">Market News</span>
            {isLive && (
              <span className="text-[8px] px-2 py-0.5 rounded-md bg-primary/12 text-primary font-bold tracking-wider inline-flex items-center gap-1 ring-1 ring-primary/20">
                <span className="w-1 h-1 rounded-full bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.6)] animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <Link to="/news" className="text-[8px] sm:text-[9px] font-semibold text-primary/40 hover:text-primary transition-colors">
            All News →
          </Link>
        </div>
        <div className="divide-y divide-border/5">
          {newsItems.slice(0, 8).map((article, i) => (
            <a
              key={i}
              href={article.url !== '#' ? article.url : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2.5 py-2.5 px-3 sm:px-4 hover:bg-primary/[0.03] transition-all group cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[9px] sm:text-[10px] text-foreground leading-relaxed line-clamp-2 font-medium group-hover:text-primary transition-colors">
                  {cleanText(article.title)}
                </p>
                {'description' in article && article.description && (
                  <p className="text-[8px] text-muted-foreground/50 mt-0.5 line-clamp-1">
                    {cleanText(article.description)}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-bold ${categoryColors[article.category] || 'bg-muted/15 text-muted-foreground'}`}>
                    {article.category}
                  </span>
                  <span className="text-[8px] text-muted-foreground/35">
                    {article.source} · {timeAgo(article.published_at)}
                  </span>
                </div>
              </div>
              {article.url !== '#' && (
                <ExternalLink className="w-3 h-3 text-muted-foreground/20 group-hover:text-primary/40 transition-colors flex-shrink-0 mt-0.5" />
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
