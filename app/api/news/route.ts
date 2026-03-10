import { NextResponse } from "next/server";

type NewsItem = {
  title: string;
  source: string;
  link: string;
  pubDate: string;
};

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`));
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

function parseItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const rawTitle = extractTag(block, "title");
    const link = extractTag(block, "link") || block.match(/<link>([^<]+)<\/link>/)?.[1] || "";
    const pubDate = extractTag(block, "pubDate");

    // Title format from Google News: "Headline - Source Name"
    const dashIdx = rawTitle.lastIndexOf(" - ");
    const title = dashIdx !== -1 ? rawTitle.slice(0, dashIdx) : rawTitle;
    const source = dashIdx !== -1 ? rawTitle.slice(dashIdx + 3) : "";

    if (title) items.push({ title, source, link, pubDate });
  }
  return items;
}

const FEEDS = [
  "https://news.google.com/rss/search?q=stock+market+wall+street+fed&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=mercados+financieros+acciones+economia&hl=es-419&gl=AR&ceid=AR:es",
];

export async function GET() {
  try {
    const results = await Promise.allSettled(
      FEEDS.map((url) =>
        fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 900 }, // cache 15 min
        }).then((r) => r.text())
      )
    );

    const allItems: NewsItem[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...parseItems(result.value));
      }
    }

    // Sort by date descending, deduplicate by title, take top 8
    const seen = new Set<string>();
    const items = allItems
      .filter((item) => {
        if (seen.has(item.title)) return false;
        seen.add(item.title);
        return true;
      })
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 8);

    return NextResponse.json({ items, updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las noticias" }, { status: 500 });
  }
}
