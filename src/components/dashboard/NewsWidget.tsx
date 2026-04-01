import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { timeAgo } from '@/utils/format';
import type { NewsArticle } from '@/types/stock';

interface NewsWidgetProps {
  newsItems: NewsArticle[];
  isLive: boolean;
}

export default function NewsWidget({ newsItems, isLive }: NewsWidgetProps) {
  return (
    <div className="col-span-1 sm:col-span-12 lg:col-span-6">
      <div className="rounded-xl bg-card/30 border border-border/10 overflow-hidden hover:border-border/20 transition-all">
        <div className="flex items-center justify-between px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] sm:text-xs font-black text-foreground tracking-tight">Market News</span>
            {isLive && <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-primary/8 text-primary font-bold tracking-wider">LIVE</span>}
          </div>
          <Link to="/news" className="text-[8px] sm:text-[9px] font-semibold text-primary/40 hover:text-primary transition-colors">All News →</Link>
        </div>
        {newsItems.slice(0, 6).map((article, i) => (
          <div key={i} className="py-2.5 px-3 sm:px-4 hover:bg-primary/[0.03] transition-all cursor-pointer">
            <p className="text-[9px] sm:text-[10px] text-foreground leading-relaxed line-clamp-2 font-medium">{article.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-[hsl(var(--terminal-blue)/0.08)] text-[hsl(var(--terminal-blue))] font-bold">{article.category}</span>
              <span className="text-[8px] text-muted-foreground/35">{article.source} · {timeAgo(article.published_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
