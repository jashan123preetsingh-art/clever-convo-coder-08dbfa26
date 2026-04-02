import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllStocks, Stock } from '@/data/mockData';
import { stockApi } from '@/lib/api';
import { formatPercent } from '@/utils/format';
import { useBatchQuotes } from '@/hooks/useStockData';
import { useTheme } from '@/hooks/useTheme';

function getHeatColor(pct: number, isDark = true): string {
  if (isDark) {
    if (pct >= 3) return 'hsl(145, 63%, 32%)';
    if (pct >= 2) return 'hsl(145, 55%, 26%)';
    if (pct >= 1) return 'hsl(145, 45%, 20%)';
    if (pct >= 0.3) return 'hsl(145, 35%, 16%)';
    if (pct > 0) return 'hsl(145, 25%, 13%)';
    if (pct === 0) return 'hsl(225, 18%, 12%)';
    if (pct > -0.3) return 'hsl(0, 25%, 15%)';
    if (pct > -1) return 'hsl(0, 40%, 20%)';
    if (pct > -2) return 'hsl(0, 50%, 26%)';
    if (pct > -3) return 'hsl(0, 58%, 32%)';
    return 'hsl(0, 65%, 38%)';
  }
  // Light mode — brighter, more saturated
  if (pct >= 3) return 'hsl(145, 55%, 42%)';
  if (pct >= 2) return 'hsl(145, 48%, 48%)';
  if (pct >= 1) return 'hsl(145, 40%, 55%)';
  if (pct >= 0.3) return 'hsl(145, 32%, 65%)';
  if (pct > 0) return 'hsl(145, 22%, 75%)';
  if (pct === 0) return 'hsl(225, 15%, 82%)';
  if (pct > -0.3) return 'hsl(0, 22%, 75%)';
  if (pct > -1) return 'hsl(0, 35%, 65%)';
  if (pct > -2) return 'hsl(0, 45%, 55%)';
  if (pct > -3) return 'hsl(0, 52%, 48%)';
  return 'hsl(0, 58%, 42%)';
}

function getTextColor(_pct: number, isDark = true): string {
  if (isDark) return 'rgba(255,255,255,0.95)';
  return 'rgba(0,0,0,0.9)';
}

interface TreeNode {
  symbol: string;
  name: string;
  change_pct: number;
  market_cap: number;
  ltp: number;
  sector: string;
}

type Rect = { x: number; y: number; w: number; h: number };
type LayoutItem = { node: TreeNode; x: number; y: number; w: number; h: number };

function squarify(nodes: TreeNode[], x: number, y: number, w: number, h: number): LayoutItem[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ node: nodes[0], x, y, w, h }];

  const totalArea = w * h;
  const totalValue = nodes.reduce((s, n) => s + (n.market_cap || 1), 0);
  if (totalValue === 0) return [];

  const items = nodes.map(n => ({ node: n, area: ((n.market_cap || 1) / totalValue) * totalArea }));
  return layoutSquarified(items, { x, y, w, h });
}

function layoutSquarified(items: { node: TreeNode; area: number }[], rect: Rect): LayoutItem[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ node: items[0].node, x: rect.x, y: rect.y, w: rect.w, h: rect.h }];

  const results: LayoutItem[] = [];
  let remaining = [...items];

  while (remaining.length > 0) {
    const row: { node: TreeNode; area: number }[] = [remaining[0]];
    remaining = remaining.slice(1);
    let bestAspect = worstAspect(row, rect);

    while (remaining.length > 0) {
      const candidate = [...row, remaining[0]];
      const newAspect = worstAspect(candidate, rect);
      if (newAspect <= bestAspect) {
        row.push(remaining[0]);
        remaining = remaining.slice(1);
        bestAspect = newAspect;
      } else {
        break;
      }
    }

    const rowArea = row.reduce((s, r) => s + r.area, 0);
    const vertical = rect.w >= rect.h;

    if (vertical) {
      const rowW = rect.h > 0 ? rowArea / rect.h : rect.w;
      let yOff = rect.y;
      for (const item of row) {
        const itemH = rowW > 0 ? item.area / rowW : rect.h;
        results.push({ node: item.node, x: rect.x, y: yOff, w: rowW, h: itemH });
        yOff += itemH;
      }
      rect = { x: rect.x + rowW, y: rect.y, w: Math.max(rect.w - rowW, 0), h: rect.h };
    } else {
      const rowH = rect.w > 0 ? rowArea / rect.w : rect.h;
      let xOff = rect.x;
      for (const item of row) {
        const itemW = rowH > 0 ? item.area / rowH : rect.w;
        results.push({ node: item.node, x: xOff, y: rect.y, w: itemW, h: rowH });
        xOff += itemW;
      }
      rect = { x: rect.x, y: rect.y + rowH, w: rect.w, h: Math.max(rect.h - rowH, 0) };
    }
  }

  return results;
}

function worstAspect(row: { area: number }[], rect: Rect): number {
  const totalArea = row.reduce((s, r) => s + r.area, 0);
  const side = rect.w >= rect.h ? rect.h : rect.w;
  if (side === 0 || totalArea === 0) return Infinity;
  const rowLen = totalArea / side;
  let worst = 0;
  for (const item of row) {
    const otherSide = item.area / rowLen;
    const aspect = Math.max(rowLen / otherSide, otherSide / rowLen);
    if (aspect > worst) worst = aspect;
  }
  return worst;
}

function sectorTreemap(
  sectors: { sector: string; stocks: TreeNode[]; totalMcap: number }[],
  width: number, height: number
) {
  const fakeNodes: TreeNode[] = sectors.map(s => ({
    symbol: s.sector, name: s.sector, change_pct: 0, market_cap: s.totalMcap, ltp: 0, sector: s.sector,
  }));
  const layout = squarify(fakeNodes, 0, 0, width, height);
  return layout.map((item, i) => ({
    sector: sectors[i].sector,
    x: item.x, y: item.y, w: item.w, h: item.h,
    stocks: sectors[i].stocks,
  }));
}

// Skeleton placeholder for loading state
function HeatmapSkeleton() {
  return (
    <div className="relative rounded-lg overflow-hidden border border-border/40 animate-pulse" style={{ width: '100%', paddingBottom: '46.875%' }}>
      <div className="absolute inset-0 bg-secondary/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] text-muted-foreground">Loading live market data...</p>
        </div>
      </div>
    </div>
  );
}

export default function Heatmap() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [maxPerSector, setMaxPerSector] = useState(12);
  const mockStocks = useMemo(() => getAllStocks(), []);

  // Only fetch top 120 stocks by market cap
  const topSymbols = useMemo(() => {
    return [...mockStocks]
      .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
      .slice(0, 120)
      .map(s => s.symbol);
  }, [mockStocks]);

  const { data: liveQuotes, isLoading } = useBatchQuotes(topSymbols);

  const liveMap = useMemo(() => {
    const m = new Map<string, any>();
    if (Array.isArray(liveQuotes)) {
      for (const item of liveQuotes) {
        if (item?.data) m.set(item.symbol, item.data);
      }
    }
    return m;
  }, [liveQuotes]);

  // Use ONLY live data — skip stocks without live quotes
  const allStocks: TreeNode[] = useMemo(() => {
    return mockStocks
      .map(s => {
        const live = liveMap.get(s.symbol);
        if (!live || !live.ltp || live.ltp <= 0) return null; // Skip if no live data
        return {
          symbol: s.symbol,
          name: live.name || s.name,
          change_pct: live.change_pct ?? 0,
          market_cap: live.market_cap || s.market_cap || 100000,
          ltp: live.ltp,
          sector: s.sector,
        };
      })
      .filter((s): s is TreeNode => s !== null)
      .sort((a, b) => b.market_cap - a.market_cap);
  }, [mockStocks, liveMap]);

  // Group by sector, keep only top N stocks per sector by market cap
  const sectorGroups = useMemo(() => {
    const groups: Record<string, { stocks: TreeNode[]; totalMcap: number }> = {};
    for (const s of allStocks) {
      if (!groups[s.sector]) groups[s.sector] = { stocks: [], totalMcap: 0 };
      groups[s.sector].stocks.push(s);
      groups[s.sector].totalMcap += s.market_cap;
    }
    return Object.entries(groups)
      .map(([sector, data]) => {
        const sortedStocks = data.stocks.sort((a, b) => b.market_cap - a.market_cap);
        const topStocks = sortedStocks.slice(0, maxPerSector);
        const topMcap = topStocks.reduce((s, st) => s + st.market_cap, 0);
        return {
          sector,
          stocks: topStocks,
          totalMcap: topMcap,
          fullCount: data.stocks.length,
        };
      })
      .filter(g => g.stocks.length > 0)
      .sort((a, b) => b.totalMcap - a.totalMcap);
  }, [allStocks, maxPerSector]);

  const displayedCount = sectorGroups.reduce((s, g) => s + g.stocks.length, 0);

  const WIDTH = 1600;
  const HEIGHT = 750;

  const sectorLayout = useMemo(() => sectorTreemap(sectorGroups, WIDTH, HEIGHT), [sectorGroups]);

  const sectorAvgChange = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sg of sectorGroups) {
      const avg = sg.stocks.reduce((s, st) => s + st.change_pct, 0) / sg.stocks.length;
      map[sg.sector] = avg;
    }
    return map;
  }, [sectorGroups]);

  return (
    <div className="p-3 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-sm font-bold text-foreground tracking-wide">MARKET HEATMAP</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {displayedCount} stocks · {liveMap.size > 0 ? `${liveMap.size} live` : 'Loading...'} · Top {maxPerSector}/sector
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
          <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-0.5 border border-border/20">
            {[8, 12, 20].map(n => (
              <button key={n} onClick={() => setMaxPerSector(n)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-bold transition-all ${maxPerSector === n ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                Top {n}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            {[{ l: '-3%', c: -3 }, { l: '-2%', c: -2 }, { l: '-1%', c: -1 }, { l: '0%', c: 0 }, { l: '+1%', c: 1 }, { l: '+2%', c: 2 }, { l: '+3%', c: 3 }].map((item, i) => (
              <div key={i} className="w-9 h-4 rounded-sm text-[8px] flex items-center justify-center font-mono"
                style={{ backgroundColor: getHeatColor(item.c, isDark), color: getTextColor(item.c, isDark) }}>
                {item.l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Treemap or Skeleton */}
      {isLoading && liveMap.size === 0 ? (
        <HeatmapSkeleton />
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-border/40" style={{ width: '100%', paddingBottom: `${(HEIGHT / WIDTH) * 100}%` }}>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {sectorLayout.map((sec) => {
              const HEADER_H = sec.h > 50 ? 16 : 0;
              const stockArea = { x: sec.x, y: sec.y + HEADER_H, w: sec.w, h: Math.max(sec.h - HEADER_H, 0) };
              const stockLayout = squarify(sec.stocks, stockArea.x, stockArea.y, stockArea.w, stockArea.h);

              return (
                <g key={sec.sector}>
                  {/* Sector border */}
                  <rect
                    x={sec.x} y={sec.y} width={sec.w} height={sec.h}
                    fill="none" stroke={isDark ? 'hsl(225, 30%, 14%)' : 'hsl(225, 15%, 85%)'} strokeWidth="2"
                  />

                  {/* Sector header bar */}
                  {HEADER_H > 0 && sec.w > 60 && (
                    <>
                      <rect x={sec.x + 1} y={sec.y + 1} width={sec.w - 2} height={HEADER_H - 1}
                        fill={isDark ? 'hsla(225, 25%, 8%, 0.85)' : 'hsla(225, 15%, 95%, 0.85)'} />
                      <text x={sec.x + 8} y={sec.y + 11.5}
                        fill={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'} fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif"
                        style={{ textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                        {sec.sector} ›
                      </text>
                    </>
                  )}

                  {/* Stock tiles */}
                  {stockLayout.map(({ node, x, y, w, h }) => {
                    // Dynamic font sizing based on tile dimensions
                    const minDim = Math.min(w, h);
                    const isXL = w > 80 && h > 50;
                    const isLarge = w > 55 && h > 38;
                    const isMedium = w > 35 && h > 24;
                    const isSmall = w > 22 && h > 16;
                    
                    // Calculate max chars that fit in the tile width (roughly 7px per char at size 12)
                    const symFontSize = isXL ? 13 : isLarge ? 11 : isMedium ? 9 : 7;
                    const charWidth = symFontSize * 0.65;
                    const maxChars = Math.max(2, Math.floor((w - 6) / charWidth));
                    const displaySymbol = node.symbol.length > maxChars ? node.symbol.slice(0, maxChars) : node.symbol;
                    
                    const pctFontSize = isXL ? 11 : isLarge ? 10 : isMedium ? 8 : 7;
                    const pctVal = node.change_pct ?? 0;
                    const pctText = isXL || isLarge 
                      ? `${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(2)}%`
                      : `${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(1)}%`;

                    const showPct = (isXL || isLarge || isMedium) && h > 28;
                    const textColor = getTextColor(node.change_pct, isDark);

                    return (
                      <g key={node.symbol}>
                        <Link to={`/stock/${node.symbol}`}>
                          <rect
                            x={x + 0.5} y={y + 0.5}
                            width={Math.max(w - 1, 1)} height={Math.max(h - 1, 1)}
                            fill={getHeatColor(node.change_pct, isDark)}
                            rx="2" ry="2"
                            className="cursor-pointer transition-opacity hover:opacity-80"
                            stroke={isDark ? 'hsl(225, 25%, 8%)' : 'hsl(225, 15%, 92%)'} strokeWidth="0.5"
                          />
                          {/* Clip text to tile bounds */}
                          <clipPath id={`clip-${node.symbol}`}>
                            <rect x={x + 1} y={y + 1} width={Math.max(w - 2, 0)} height={Math.max(h - 2, 0)} />
                          </clipPath>
                          <g clipPath={`url(#clip-${node.symbol})`}>
                            {(isXL || isLarge || isMedium || isSmall) && (
                              <text 
                                x={x + w / 2} 
                                y={showPct ? y + h / 2 - (pctFontSize * 0.4) : y + h / 2 + symFontSize * 0.35}
                                textAnchor="middle"
                                fill={textColor} fontSize={symFontSize} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
                                {displaySymbol}
                              </text>
                            )}
                            {showPct && (
                              <text 
                                x={x + w / 2} 
                                y={y + h / 2 + (symFontSize * 0.6) + 2}
                                textAnchor="middle"
                                fill={textColor} fontSize={pctFontSize} fontWeight="600" fontFamily="JetBrains Mono, monospace">
                                {pctText}
                              </text>
                            )}
                          </g>
                        </Link>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Sector summary bar */}
      <div className="flex flex-wrap gap-2 mt-3">
        {sectorGroups.slice(0, 12).map((sg) => {
          const avg = sectorAvgChange[sg.sector] ?? 0;
          return (
            <Link key={sg.sector} to={`/sectors/${encodeURIComponent(sg.sector)}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary/40 hover:bg-secondary/60 border border-border/30 transition-colors">
              <span className="text-[10px] text-foreground font-medium">{sg.sector}</span>
              <span className={`text-[10px] font-semibold font-data ${avg >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {avg >= 0 ? '+' : ''}{Number(avg).toFixed(2)}%
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
