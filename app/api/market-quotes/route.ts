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

const SYMBOLS = ["SPY", "QQQ", "GC=F"];
const NAMES: Record<string, string> = {
  SPY: "SPDR S&P 500 ETF (SPY)",
  QQQ: "Invesco QQQ Trust (QQQ)",
  "GC=F": "Oro (Futuros GC=F)",
};

export async function GET() {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(SYMBOLS.join(","))}`;
    const response = await fetch(url, { next: { revalidate: 30 } });

    if (!response.ok) {
      return NextResponse.json({ error: "No se pudieron obtener cotizaciones" }, { status: 502 });
    }

    const payload = await response.json();
    const rows = (payload?.quoteResponse?.result ?? []) as any[];

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
