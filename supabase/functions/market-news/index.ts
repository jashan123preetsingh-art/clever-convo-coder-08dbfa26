const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  title: string;
  source: string;
  category: string;
  published_at: string;
  url: string;
  description?: string;
}

function extractCDATA(text: string): string {
  const match = text.match(/<!\[CDATA\[(.*?)\]\]>/s);
  return match ? match[1].trim() : text.trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    );
}

function stripHtml(html: string): string {
  return decodeEntities(html)
    .replace(/<[^>]*>/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function categorize(title: string): string {
  const t = title.toLowerCase();

  // IPO / Listings
  if (t.includes("ipo") || t.includes("listing") || t.includes("allotment"))
    return "IPO";

  // F&O / Options / Derivatives
  if (
    t.includes("option") ||
    t.includes("f&o") ||
    t.includes("expiry") ||
    t.includes("futures") ||
    t.includes("put") ||
    t.includes("call") ||
    t.includes("oi ") ||
    t.includes("open interest") ||
    t.includes("straddle") ||
    t.includes("premium")
  )
    return "F&O";

  // Earnings / Results
  if (
    t.includes("q1 ") ||
    t.includes("q2 ") ||
    t.includes("q3 ") ||
    t.includes("q4 ") ||
    t.includes("quarterly") ||
    t.includes("earnings") ||
    t.includes("results") ||
    t.includes("profit") ||
    t.includes("revenue") ||
    t.includes("dividend")
  )
    return "Earnings";

  // Market / Indices
  if (
    t.includes("sensex") ||
    t.includes("nifty") ||
    t.includes("market") ||
    t.includes("rally") ||
    t.includes("crash") ||
    t.includes("bull") ||
    t.includes("bear") ||
    t.includes("fii") ||
    t.includes("dii") ||
    t.includes("correction") ||
    t.includes("all-time") ||
    t.includes("record high") ||
    t.includes("bloodbath")
  )
    return "Market";

  // Economy / Macro
  if (
    t.includes("rbi") ||
    t.includes("gdp") ||
    t.includes("inflation") ||
    t.includes("rate") ||
    t.includes("fiscal") ||
    t.includes("economy") ||
    t.includes("trade") ||
    t.includes("rupee") ||
    t.includes("crude") ||
    t.includes("gold") ||
    t.includes("forex") ||
    t.includes("cpi") ||
    t.includes("wpi") ||
    t.includes("repo") ||
    t.includes("policy") ||
    t.includes("tariff")
  )
    return "Economy";

  // Sector-specific
  if (
    t.includes("bank") ||
    t.includes("it sector") ||
    t.includes("pharma") ||
    t.includes("auto") ||
    t.includes("metal") ||
    t.includes("fmcg") ||
    t.includes("real estate") ||
    t.includes("infra")
  )
    return "Sector";

  return "Stocks";
}

async function fetchRSS(
  url: string,
  defaultSource = "Google News"
): Promise<NewsItem[]> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!resp.ok) return [];
    const xml = await resp.text();

    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];

      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      const descMatch = block.match(
        /<description>([\s\S]*?)<\/description>/
      );

      const title = titleMatch
        ? stripHtml(extractCDATA(titleMatch[1]))
        : "";
      if (!title || title.length < 10) continue;

      const articleUrl = linkMatch ? extractCDATA(linkMatch[1]) : "#";
      const published_at = pubDateMatch
        ? new Date(extractCDATA(pubDateMatch[1])).toISOString()
        : new Date().toISOString();
      const source = sourceMatch
        ? stripHtml(extractCDATA(sourceMatch[1]))
        : defaultSource;
      const description = descMatch
        ? stripHtml(extractCDATA(descMatch[1])).slice(0, 300)
        : "";

      items.push({
        title,
        source,
        category: categorize(title),
        published_at,
        url: articleUrl,
        description,
      });
    }

    return items;
  } catch (e) {
    console.error(`RSS fetch error for ${url}:`, e);
    return [];
  }
}

// In-memory cache (survives within edge function warm instances)
let cachedNews: NewsItem[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category"); // optional filter
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      100
    );

    const now = Date.now();

    // Check cache
    if (cachedNews.length > 0 && now - cacheTimestamp < CACHE_TTL) {
      const filtered = category
        ? cachedNews.filter(
            (n) => n.category.toLowerCase() === category.toLowerCase()
          )
        : cachedNews;

      return new Response(
        JSON.stringify({
          news: filtered.slice(0, limit),
          total: filtered.length,
          cached: true,
          fetched_at: new Date(cacheTimestamp).toISOString(),
          categories: getCategoryCounts(cachedNews),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch from multiple Google News RSS feeds for comprehensive coverage
    const feeds = [
      // Core Indian market feeds
      {
        url: "https://news.google.com/rss/search?q=indian+stock+market+OR+sensex+OR+nifty+OR+BSE+OR+NSE&hl=en-IN&gl=IN&ceid=IN:en",
        source: "Google News",
      },
      {
        url: "https://news.google.com/rss/search?q=india+economy+OR+RBI+OR+inflation+india+OR+GDP+india&hl=en-IN&gl=IN&ceid=IN:en",
        source: "Google News",
      },
      {
        url: "https://news.google.com/rss/search?q=IPO+india+OR+listing+NSE+BSE+OR+allotment&hl=en-IN&gl=IN&ceid=IN:en",
        source: "Google News",
      },
      // F&O specific
      {
        url: "https://news.google.com/rss/search?q=nifty+options+OR+banknifty+expiry+OR+F%26O+india&hl=en-IN&gl=IN&ceid=IN:en",
        source: "Google News",
      },
      // Earnings / Results
      {
        url: "https://news.google.com/rss/search?q=quarterly+results+india+OR+earnings+NSE+OR+Q4+results&hl=en-IN&gl=IN&ceid=IN:en",
        source: "Google News",
      },
      // Sector-specific
      {
        url: "https://news.google.com/rss/search?q=india+banking+stocks+OR+IT+sector+OR+pharma+stocks+india&hl=en-IN&gl=IN&ceid=IN:en",
        source: "Google News",
      },
      // MoneyControl RSS
      {
        url: "https://www.moneycontrol.com/rss/latestnews.xml",
        source: "MoneyControl",
      },
      // Economic Times Markets
      {
        url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        source: "Economic Times",
      },
    ];

    const results = await Promise.allSettled(
      feeds.map((f) => fetchRSS(f.url, f.source))
    );

    const allNews: NewsItem[] = [];
    let successCount = 0;
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.length > 0) {
        allNews.push(...r.value);
        successCount++;
      }
    }

    console.log(
      `Fetched from ${successCount}/${feeds.length} feeds, total ${allNews.length} articles`
    );

    // Deduplicate by title similarity (first 60 chars lowercase)
    const seen = new Set<string>();
    const unique = allNews.filter((item) => {
      const key = item.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date, newest first
    unique.sort(
      (a, b) =>
        new Date(b.published_at).getTime() -
        new Date(a.published_at).getTime()
    );

    // Update cache
    cachedNews = unique;
    cacheTimestamp = now;

    const filtered = category
      ? unique.filter(
          (n) => n.category.toLowerCase() === category.toLowerCase()
        )
      : unique;

    const news = filtered.slice(0, limit);

    return new Response(
      JSON.stringify({
        news,
        total: filtered.length,
        cached: false,
        fetched_at: new Date().toISOString(),
        categories: getCategoryCounts(unique),
        sources_ok: successCount,
        sources_total: feeds.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Market news error:", error);
    // Return cache if available even on error
    if (cachedNews.length > 0) {
      return new Response(
        JSON.stringify({
          news: cachedNews.slice(0, 50),
          total: cachedNews.length,
          cached: true,
          error: "Partial failure, returning cached data",
          categories: getCategoryCounts(cachedNews),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Failed to fetch news", news: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getCategoryCounts(
  news: NewsItem[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const n of news) {
    counts[n.category] = (counts[n.category] || 0) + 1;
  }
  return counts;
}
