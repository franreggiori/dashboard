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

type YahooQuoteRow = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  regularMarketTime?: number;
};

type YahooQuoteResponse = {
  quoteResponse?: {
    result?: YahooQuoteRow[];
  };
};

const SYMBOLS = [
  "SPY", "QQQ", "IWM", "GC=F", "FXI", "EEM",
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
] as const;

const NAMES: Record<string, string> = {
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

export async function GET() {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(SYMBOLS.join(","))}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "No se pudieron obtener cotizaciones" }, { status: 502 });
    }

    const payload = (await response.json()) as YahooQuoteResponse;
    const rows = payload.quoteResponse?.result ?? [];

    const mapped: Quote[] = SYMBOLS.map((symbol) => {
      const row = rows.find((item) => item.symbol === symbol);
      return {
        symbol,
        name: NAMES[symbol] ?? symbol,
        price: typeof row?.regularMarketPrice === "number" ? row.regularMarketPrice : null,
        change: typeof row?.regularMarketChange === "number" ? row.regularMarketChange : null,
        changePercent: typeof row?.regularMarketChangePercent === "number" ? row.regularMarketChangePercent : null,
        currency: row?.currency || "USD",
        marketTime: row?.regularMarketTime ? new Date(row.regularMarketTime * 1000).toISOString() : null,
      };
    });

    return NextResponse.json({ updatedAt: new Date().toISOString(), quotes: mapped });
  } catch {
    return NextResponse.json({ error: "Error inesperado consultando mercado" }, { status: 500 });
  }
}
