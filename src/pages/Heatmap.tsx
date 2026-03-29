import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllStocks, getSectorPerformance, Stock } from '@/data/mockData';
import { stockApi } from '@/lib/api';
import { formatPercent } from '@/utils/format';

// TradingView-style color scale
function getHeatColor(pct: number): string {
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

function getTextColor(pct: number): string {
  return Math.abs(pct) >= 1 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)';
}

interface TreeNode {
  symbol: string;
  name: string;
  change_pct: number;
  market_cap: number;
  ltp: number;
  sector: string;
}

// Squarified treemap layout algorithm
function squarify(nodes: TreeNode[], x: number, y: number, w: number, h: number): { node: TreeNode; x: number; y: number; w: number; h: number }[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ node: nodes[0], x, y, w, h }];

  const total = nodes.reduce((s, n) => s + n.market_cap, 0);
  if (total === 0) return [];

  const result: { node: TreeNode; x: number; y: number; w: number; h: number }[] = [];

  // Simple slice-and-dice
  const isHorizontal = w >= h;
  let offset = 0;

  for (let i = 0; i < nodes.length; i++) {
    const ratio = nodes[i].market_cap / total;
    if (isHorizontal) {
      const nodeW = w * ratio;
      result.push({ node: nodes[i], x: x + offset, y, w: nodeW, h });
      offset += nodeW;
    } else {
      const nodeH = h * ratio;
      result.push({ node: nodes[i], x, y: y + offset, w, h: nodeH });
      offset += nodeH;
    }
  }

  return result;
}

// Sector-level treemap
function sectorTreemap(
  sectors: { sector: string; stocks: TreeNode[]; totalMcap: number }[],
  width: number, height: number
) {
  const total = sectors.reduce((s, sec) => s + sec.totalMcap, 0);
  if (total === 0) return [];

  const result: { sector: string; x: number; y: number; w: number; h: number; stocks: TreeNode[] }[] = [];
  let offset = 0;
  const isH = width >= height;

  for (const sec of sectors) {
    const ratio = sec.totalMcap / total;
    if (isH) {
      const sw = width * ratio;
      result.push({ sector: sec.sector, x: offset, y: 0, w: sw, h: height, stocks: sec.stocks });
      offset += sw;
    } else {
      const sh = height * ratio;
      result.push({ sector: sec.sector, x: 0, y: offset, w: width, h: sh, stocks: sec.stocks });
      offset += sh;
    }
  }
  return result;
}

export default function Heatmap() {
  const [liveStocks, setLiveStocks] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const mockStocks = getAllStocks();

  // Fetch live quotes in batches
  useEffect(() => {
    const fetchLive = async () => {
      setLoading(true);
      try {
        const symbols = mockStocks.map(s => s.symbol);
        // Batch in groups of 15
        const batches: string[][] = [];
        for (let i = 0; i < symbols.length; i += 15) {
          batches.push(symbols.slice(i, i + 15));
        }

        const results = await Promise.all(
          batches.map(batch => stockApi.getBatchQuotes(batch).catch(() => []))
        );

        const map = new Map<string, any>();
        for (const batch of results) {
          if (!Array.isArray(batch)) continue;
          for (const item of batch) {
            if (item.data) map.set(item.symbol, item.data);
          }
        }
        setLiveStocks(map);
        setLastUpdate(new Date());
      } catch { /* silent */ }
      setLoading(false);
    };

    fetchLive();
    const interval = setInterval(fetchLive, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  // Merge live + mock data
  const stocks: TreeNode[] = useMemo(() => {
    return mockStocks.map(s => {
      const live = liveStocks.get(s.symbol);
      return {
        symbol: s.symbol,
        name: live?.name || s.name,
        change_pct: live?.change_pct ?? s.change_pct,
        market_cap: live?.market_cap || s.market_cap || 100000,
        ltp: live?.ltp ?? s.ltp,
        sector: s.sector,
      };
    }).sort((a, b) => b.market_cap - a.market_cap);
  }, [mockStocks, liveStocks]);

  // Group by sector
  const sectorGroups = useMemo(() => {
    const groups: Record<string, { stocks: TreeNode[]; totalMcap: number }> = {};
    for (const s of stocks) {
      if (!groups[s.sector]) groups[s.sector] = { stocks: [], totalMcap: 0 };
      groups[s.sector].stocks.push(s);
      groups[s.sector].totalMcap += s.market_cap;
    }
    return Object.entries(groups)
      .map(([sector, data]) => ({
        sector,
        stocks: data.stocks.sort((a, b) => b.market_cap - a.market_cap),
        totalMcap: data.totalMcap,
      }))
      .sort((a, b) => b.totalMcap - a.totalMcap);
  }, [stocks]);

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
            {stocks.length} stocks · {liveStocks.size > 0 ? `${liveStocks.size} live` : 'Loading...'} · Sector weighted
            {lastUpdate && <span className="ml-2">Updated {lastUpdate.toLocaleTimeString('en-IN', { hour12: false })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
          <div className="flex items-center gap-0.5">
            {[{ l: '-3%', c: -3 }, { l: '-2%', c: -2 }, { l: '-1%', c: -1 }, { l: '0%', c: 0 }, { l: '+1%', c: 1 }, { l: '+2%', c: 2 }, { l: '+3%', c: 3 }].map((item, i) => (
              <div key={i} className="w-9 h-4 rounded-sm text-[7px] flex items-center justify-center font-mono"
                style={{ backgroundColor: getHeatColor(item.c), color: getTextColor(item.c) }}>
                {item.l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Treemap */}
      <div className="relative rounded-lg overflow-hidden border border-border/40" style={{ width: '100%', paddingBottom: `${(HEIGHT / WIDTH) * 100}%` }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {sectorLayout.map((sec) => {
            const stockLayout = squarify(sec.stocks, sec.x, sec.y, sec.w, sec.h);
            const avgChange = sectorAvgChange[sec.sector] ?? 0;

            return (
              <g key={sec.sector}>
                {/* Sector label */}
                {sec.w > 80 && sec.h > 30 && (
                  <text
                    x={sec.x + 5} y={sec.y + 12}
                    fill="rgba(255,255,255,0.35)" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif"
                  >
                    {sec.sector} ›
                  </text>
                )}

                {/* Stock tiles */}
                {stockLayout.map(({ node, x, y, w, h }) => {
                  const isLarge = w > 70 && h > 45;
                  const isMedium = w > 45 && h > 30;
                  const isSmall = w > 25 && h > 20;

                  return (
                    <g key={node.symbol}>
                      <Link to={`/stock/${node.symbol}`}>
                        <rect
                          x={x + 0.5} y={y + 0.5}
                          width={Math.max(w - 1, 1)} height={Math.max(h - 1, 1)}
                          fill={getHeatColor(node.change_pct)}
                          rx="2" ry="2"
                          className="cursor-pointer transition-opacity hover:opacity-80"
                          stroke="hsl(225, 25%, 8%)" strokeWidth="0.5"
                        />
                        {isLarge && (
                          <>
                            <text x={x + w / 2} y={y + h / 2 - 6} textAnchor="middle"
                              fill={getTextColor(node.change_pct)} fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">
                              {node.symbol}
                            </text>
                            <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle"
                              fill={getTextColor(node.change_pct)} fontSize="11" fontWeight="600" fontFamily="JetBrains Mono, monospace">
                              {node.change_pct >= 0 ? '+' : ''}{node.change_pct.toFixed(2)}%
                            </text>
                          </>
                        )}
                        {!isLarge && isMedium && (
                          <>
                            <text x={x + w / 2} y={y + h / 2 - 3} textAnchor="middle"
                              fill={getTextColor(node.change_pct)} fontSize="9" fontWeight="700" fontFamily="Inter, sans-serif">
                              {node.symbol.slice(0, 7)}
                            </text>
                            <text x={x + w / 2} y={y + h / 2 + 9} textAnchor="middle"
                              fill={getTextColor(node.change_pct)} fontSize="8" fontWeight="600" fontFamily="JetBrains Mono, monospace">
                              {node.change_pct >= 0 ? '+' : ''}{node.change_pct.toFixed(1)}%
                            </text>
                          </>
                        )}
                        {!isLarge && !isMedium && isSmall && (
                          <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle"
                            fill={getTextColor(node.change_pct)} fontSize="7" fontWeight="600" fontFamily="Inter, sans-serif">
                            {node.symbol.slice(0, 5)}
                          </text>
                        )}
                      </Link>
                    </g>
                  );
                })}

                {/* Sector border */}
                <rect
                  x={sec.x} y={sec.y} width={sec.w} height={sec.h}
                  fill="none" stroke="hsl(225, 25%, 8%)" strokeWidth="2"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sector summary bar */}
      <div className="flex flex-wrap gap-2 mt-3">
        {sectorGroups.slice(0, 12).map((sg) => {
          const avg = sectorAvgChange[sg.sector] ?? 0;
          return (
            <Link key={sg.sector} to={`/sectors/${encodeURIComponent(sg.sector)}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary/40 hover:bg-secondary/60 border border-border/30 transition-colors">
              <span className="text-[10px] text-foreground font-medium">{sg.sector}</span>
              <span className={`text-[10px] font-semibold font-data ${avg >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {avg >= 0 ? '+' : ''}{avg.toFixed(2)}%
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
