import { NextRequest, NextResponse } from "next/server";

const PPI_BASE = "https://clientapi.portfoliopersonal.com";

type TickerInput = {
  ticker: string;
  type?: string;
  settlement?: string;
};

type BondResult = {
  ticker: string;
  ultimo: number | null;
  tirUltimo: number | null;
  cantCompra: number | null;
  precioCompra: number | null;
  yieldCompra: number | null;
  yieldVenta: number | null;
  precioVenta: number | null;
  cantVenta: number | null;
  volumen: number | null;
  error: string | null;
};

type CurrentResponse = {
  price?: number;
  quantity?: number;
  tradedQuantity?: number;
  volume?: number;
};

type BookEntry = {
  price?: number;
  quantity?: number;
  size?: number;
};

type BookResponse = {
  bids?: BookEntry[];
  asks?: BookEntry[];
};

type EstimateBondResponse = {
  yield?: number;
  tir?: number;
};

async function loginPPI(): Promise<string> {
  const res = await fetch(`${PPI_BASE}/api/1.0/Account/LoginApi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "AuthorizedClient": "API_CLI_REST",
      "ClientKey": "pp19CliApp12",
    },
    body: JSON.stringify({
      publicKey: process.env.PUBLIC_KEY,
      privateKey: process.env.PRIVATE_KEY,
    }),
  });
  if (!res.ok) throw new Error(`PPI login failed: ${res.status}`);
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

async function getCurrent(token: string, ticker: string, type: string): Promise<CurrentResponse> {
  const url = `${PPI_BASE}/api/1.0/MarketData/Current?ticker=${encodeURIComponent(ticker)}&type=${encodeURIComponent(type)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Current failed for ${ticker}: ${res.status}`);
  return res.json() as Promise<CurrentResponse>;
}

async function getBook(token: string, ticker: string, type: string): Promise<BookResponse> {
  const url = `${PPI_BASE}/api/1.0/MarketData/Book?ticker=${encodeURIComponent(ticker)}&type=${encodeURIComponent(type)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Book failed for ${ticker}: ${res.status}`);
  return res.json() as Promise<BookResponse>;
}

async function estimateBond(
  token: string,
  ticker: string,
  type: string,
  price: number,
  settlement: string,
): Promise<number | null> {
  const res = await fetch(`${PPI_BASE}/api/1.0/MarketData/EstimateBond`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ticker, type, price, settlement }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as EstimateBondResponse | number;
  if (typeof data === "number") return data;
  return data.yield ?? data.tir ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { tickers?: TickerInput[] };
    const tickers = body.tickers ?? [];

    if (!tickers.length) {
      return NextResponse.json({ error: "No tickers provided" }, { status: 400 });
    }

    const token = await loginPPI();

    const results: BondResult[] = await Promise.all(
      tickers.map(async ({ ticker, type = "BONOS", settlement = "48hs" }) => {
        try {
          const [current, book] = await Promise.all([
            getCurrent(token, ticker, type),
            getBook(token, ticker, type),
          ]);

          const ultimo = current.price ?? null;
          const volumen = current.quantity ?? current.tradedQuantity ?? current.volume ?? null;

          const bestBid = book.bids?.[0] ?? null;
          const bestAsk = book.asks?.[0] ?? null;
          const precioCompra = bestBid?.price ?? null;
          const cantCompra = bestBid?.quantity ?? bestBid?.size ?? null;
          const precioVenta = bestAsk?.price ?? null;
          const cantVenta = bestAsk?.quantity ?? bestAsk?.size ?? null;

          const [tirUltimo, yieldCompra, yieldVenta] = await Promise.all([
            ultimo !== null ? estimateBond(token, ticker, type, ultimo, settlement) : Promise.resolve(null),
            precioCompra !== null ? estimateBond(token, ticker, type, precioCompra, settlement) : Promise.resolve(null),
            precioVenta !== null ? estimateBond(token, ticker, type, precioVenta, settlement) : Promise.resolve(null),
          ]);

          return {
            ticker,
            ultimo,
            tirUltimo,
            cantCompra,
            precioCompra,
            yieldCompra,
            yieldVenta,
            precioVenta,
            cantVenta,
            volumen,
            error: null,
          };
        } catch (err) {
          return {
            ticker,
            ultimo: null,
            tirUltimo: null,
            cantCompra: null,
            precioCompra: null,
            yieldCompra: null,
            yieldVenta: null,
            precioVenta: null,
            cantVenta: null,
            volumen: null,
            error: err instanceof Error ? err.message : "Error desconocido",
          };
        }
      }),
    );

    return NextResponse.json({ results, updatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error inesperado" },
      { status: 500 },
    );
  }
}
