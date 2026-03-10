import { NextResponse } from "next/server";

type NewsItem = {
  title: string;
  source: string;
  link: string;
  pubDate: string;
  age: string;
};

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`));
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

function parseItems(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const now = Date.now();
  const TWO_DAYS = 48 * 60 * 60 * 1000;
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const rawTitle = extractTag(block, "title");
    const pubDate  = extractTag(block, "pubDate");
    const link     = block.match(/<link>([^<]+)<\/link>/)?.[1]?.trim()
                  || extractTag(block, "link");

    if (!rawTitle || !pubDate) continue;

    const date = new Date(pubDate);
    if (isNaN(date.getTime())) continue;
    if (now - date.getTime() > TWO_DAYS) continue;

    // Strip source suffix from Google News-style titles ("Title - Source")
    const dashIdx = rawTitle.lastIndexOf(" - ");
    const title = dashIdx !== -1 ? rawTitle.slice(0, dashIdx) : rawTitle;

    const diffMs = now - date.getTime();
    const diffH  = Math.floor(diffMs / 3600000);
    const diffM  = Math.floor(diffMs / 60000);
    const age    = diffH >= 1 ? `${diffH}h ago` : `${diffM}m ago`;

    items.push({ title, source: sourceName, link, pubDate: date.toISOString(), age });
  }

  return items;
}

const FEEDS: { url: string; source: string }[] = [
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,SPY,QQQ,AAPL&region=US&lang=en-US", source: "Yahoo Finance" },
  { url: "https://feeds.reuters.com/reuters/businessNews",  source: "Reuters"       },
  { url: "https://www.cnbc.com/id/20910258/device/rss/rss.html",                    source: "CNBC"         },
  { url: "https://feeds.marketwatch.com/marketwatch/topstories/",                   source: "MarketWatch"  },
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/rss+xml, application/xml, text/xml",
};

export async function GET() {
  try {
    const results = await Promise.allSettled(
      FEEDS.map(({ url, source }) =>
        fetch(url, { headers: HEADERS, next: { revalidate: 600 } })
          .then((r) => r.text())
          .then((xml) => parseItems(xml, source))
      )
    );

    const allItems: NewsItem[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") allItems.push(...result.value);
    }

    const seen = new Set<string>();
    const items = allItems
      .filter(({ title }) => {
        if (seen.has(title)) return false;
        seen.add(title);
        return true;
      })
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 12);

    return NextResponse.json({ items, updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las noticias" }, { status: 500 });
  }
}
