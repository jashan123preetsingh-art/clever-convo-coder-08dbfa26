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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function categorize(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("ipo") || t.includes("listing")) return "IPO";
  if (
    t.includes("sensex") ||
    t.includes("nifty") ||
    t.includes("market") ||
    t.includes("rally") ||
    t.includes("crash") ||
    t.includes("bull") ||
    t.includes("bear") ||
    t.includes("fii") ||
    t.includes("dii")
  )
    return "Market";
  if (
    t.includes("rbi") ||
    t.includes("gdp") ||
    t.includes("inflation") ||
    t.includes("rate") ||
    t.includes("fiscal") ||
    t.includes("economy") ||
    t.includes("trade") ||
    t.includes("rupee")
  )
    return "Economy";
  return "Stocks";
}

async function fetchRSS(url: string): Promise<NewsItem[]> {
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
      const descMatch = block.match(/<description>([\s\S]*?)<\/description>/);

      const title = titleMatch
        ? stripHtml(extractCDATA(titleMatch[1]))
        : "";
      if (!title) continue;

      const url = linkMatch ? extractCDATA(linkMatch[1]) : "#";
      const published_at = pubDateMatch
        ? new Date(extractCDATA(pubDateMatch[1])).toISOString()
        : new Date().toISOString();
      const source = sourceMatch
        ? stripHtml(extractCDATA(sourceMatch[1]))
        : "Google News";
      const description = descMatch
        ? stripHtml(extractCDATA(descMatch[1])).slice(0, 200)
        : "";

      items.push({
        title,
        source,
        category: categorize(title),
        published_at,
        url,
        description,
      });
    }

    return items;
  } catch (e) {
    console.error("RSS fetch error:", e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch from multiple Google News RSS feeds for Indian market
    const feeds = [
      "https://news.google.com/rss/search?q=indian+stock+market+OR+sensex+OR+nifty+OR+BSE+OR+NSE&hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=india+economy+OR+RBI+OR+inflation+india&hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=IPO+india+OR+listing+NSE+BSE&hl=en-IN&gl=IN&ceid=IN:en",
    ];

    const results = await Promise.all(feeds.map(fetchRSS));
    const allNews = results.flat();

    // Deduplicate by title similarity
    const seen = new Set<string>();
    const unique = allNews.filter((item) => {
      const key = item.title.toLowerCase().slice(0, 50);
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

    // Return top 50
    const news = unique.slice(0, 50);

    return new Response(JSON.stringify({ news }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Market news error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch news", news: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
