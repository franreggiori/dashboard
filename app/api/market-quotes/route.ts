import { NextResponse } from "next/server";

type Quote = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  marketTime: string | null;
};

type YahooChartMeta = {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  currency?: string;
  regularMarketTime?: number;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{ meta?: YahooChartMeta }>;
    error?: { description?: string };
  };
};

const SYMBOLS: Record<string, string> = {
  SPY: "S&P 500 ETF",
  QQQ: "Nasdaq 100 ETF",
  IWM: "Russell 2000 ETF",
  "GC=F": "Oro (Futuros)",
  FXI: "China Large-Cap ETF",
  EEM: "Emerging Markets ETF",
  AAPL: "Apple",
  MSFT: "Microsoft",
  GOOGL: "Alphabet",
  AMZN: "Amazon",
  META: "Meta",
  NVDA: "NVIDIA",
  TSLA: "Tesla",
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchQuote(symbol: string): Promise<Quote> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  try {
    const response = await fetch(url, { headers: HEADERS, next: { revalidate: 30 } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = (await response.json()) as YahooChartResponse;
    const meta = payload.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice ?? null;
    const change = meta?.regularMarketChange ?? null;
    const changePercent = meta?.regularMarketChangePercent ?? null;
    return {
      symbol,
      name: SYMBOLS[symbol] ?? symbol,
      price,
      change,
      changePercent,
      currency: meta?.currency ?? "USD",
      marketTime: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    };
  } catch {
    return { symbol, name: SYMBOLS[symbol] ?? symbol, price: null, change: null, changePercent: null, currency: "USD", marketTime: null };
  }
}

export async function GET() {
  try {
    const quotes = await Promise.all(Object.keys(SYMBOLS).map(fetchQuote));
    return NextResponse.json({ updatedAt: new Date().toISOString(), quotes });
  } catch {
    return NextResponse.json({ error: "Error inesperado consultando mercado" }, { status: 500 });
  }
}
