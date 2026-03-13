import { NextRequest, NextResponse } from "next/server";

const PPI_BASE = "https://clientapi.portfoliopersonal.com";
const PPI_HEADERS = {
  "AuthorizedClient": "API_CLI_REST",
  "ClientKey":        "pp19CliApp12",
  "Accept":           "application/json",
};

const MAX_RETRIES      = 4;
const BACKOFF_BASE_MS  = 350;
const BACKOFF_CAP_MS   = 6000;
const SLEEP_TICKERS_MS = 20;
const RETRYABLE        = new Set([429, 500, 502, 503, 504]);

// Caché TIR: "ticker:usdPrice" → tir  (persiste en instancia caliente de Vercel)
const tirCache = new Map<string, number | null>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ppiGet(url: string, token: string): Promise<unknown> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: { ...PPI_HEADERS, Authorization: `Bearer ${token}` },
    });
    if (res.ok) return res.json();
    if (!RETRYABLE.has(res.status) || attempt === MAX_RETRIES) {
      const body = await res.text();
      throw new Error(`PPI ${res.status}: ${body}`);
    }
    await sleep(Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_CAP_MS));
  }
  throw new Error("unreachable");
}

async function getTir(token: string, ticker: string, usdPrice: number): Promise<number | null> {
  const key = `${ticker}:${usdPrice}`;
  if (tirCache.has(key)) return tirCache.get(key) ?? null;

  const date   = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({ ticker, date, quantityType: "PAPELES", quantity: "100", price: String(usdPrice) });
  const data   = await ppiGet(`${PPI_BASE}/api/1.0/MarketData/Bonds/Estimate?${params}`, token);
  const o      = data as Record<string, unknown>;
  const tir    =
    typeof data    === "number" ? data    :
    typeof o.tir   === "number" ? o.tir   :
    typeof o.yield === "number" ? o.yield :
    typeof o.rate  === "number" ? o.rate  :
    null;

  tirCache.set(key, tir);
  return tir;
}

// ─── Route ────────────────────────────────────────────────────────────────────

type TickerInput = { ticker: string; settlement?: string };

export async function POST(req: NextRequest) {
  try {
    const { tickers = [] } = (await req.json()) as { tickers?: TickerInput[] };
    if (!tickers.length) return NextResponse.json({ error: "No tickers provided" }, { status: 400 });

    // Login
    const loginRes = await fetch(`${PPI_BASE}/api/1.0/Account/LoginApi`, {
      method: "POST",
      headers: { ...PPI_HEADERS, ApiKey: process.env.PPI_PUBLIC_KEY ?? "", ApiSecret: process.env.PPI_PRIVATE_KEY ?? "" },
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const { accessToken: token } = (await loginRes.json()) as { accessToken: string };

    // Ratio MEP: AL30 (ARS) / AL30D (USD), ambos tipo BONOS
    const [al30, al30d] = await Promise.all([
      ppiGet(`${PPI_BASE}/api/1.0/MarketData/Current?ticker=AL30&type=BONOS&settlement=A-48HS`,  token),
      ppiGet(`${PPI_BASE}/api/1.0/MarketData/Current?ticker=AL30D&type=BONOS&settlement=A-48HS`, token),
    ]);
    const al30Price  = (al30  as Record<string, unknown>).price as number | null ?? null;
    const al30dPrice = (al30d as Record<string, unknown>).price as number | null ?? null;
    if (!al30Price || !al30dPrice) {
      return NextResponse.json({ error: "No se pudo obtener AL30 o AL30D para ratio MEP" }, { status: 502 });
    }
    const mepRatio = al30Price / al30dPrice;

    const results = [];

    for (const { ticker, settlement = "A-24HS" } of tickers) {
      if (results.length > 0) await sleep(SLEEP_TICKERS_MS);
      try {
        const type = "ON";
        const qs   = `ticker=${encodeURIComponent(ticker)}&type=${encodeURIComponent(type)}&settlement=${encodeURIComponent(settlement)}`;

        const [current, book] = await Promise.all([
          ppiGet(`${PPI_BASE}/api/1.0/MarketData/Current?${qs}`, token),
          ppiGet(`${PPI_BASE}/api/1.0/MarketData/Book?${qs}`,    token),
        ]);

        const c      = current as Record<string, unknown>;
        const b      = book    as Record<string, unknown>;
        const bids   = (b.bids   as Record<string, unknown>[] | undefined) ?? [];
        const offers = ((b.offers ?? b.asks) as Record<string, unknown>[] | undefined) ?? [];

        // Precios en ARS (para mostrar en tabla)
        const lastPriceARS = typeof c.price    === "number" ? c.price    : null;
        const volume       = typeof c.quantity === "number" ? c.quantity :
                             typeof c.tradedQuantity === "number" ? c.tradedQuantity : null;
        const bidPxARS     = typeof bids[0]?.price    === "number" ? (bids[0].price    as number) : null;
        const bidQty       = typeof bids[0]?.quantity === "number" ? (bids[0].quantity as number) : null;
        const askPxARS     = typeof offers[0]?.price    === "number" ? (offers[0].price    as number) : null;
        const askQty       = typeof offers[0]?.quantity === "number" ? (offers[0].quantity as number) : null;

        // Precios en USD (para EstimateBond)
        const lastPriceUSD = lastPriceARS !== null ? lastPriceARS / mepRatio : null;
        const bidPxUSD     = bidPxARS     !== null ? bidPxARS     / mepRatio : null;
        const askPxUSD     = askPxARS     !== null ? askPxARS     / mepRatio : null;

        await sleep(SLEEP_TICKERS_MS);
        const tirLast = lastPriceUSD !== null ? await getTir(token, ticker, lastPriceUSD) : null;
        await sleep(SLEEP_TICKERS_MS);
        const yBid    = bidPxUSD     !== null ? await getTir(token, ticker, bidPxUSD)     : null;
        await sleep(SLEEP_TICKERS_MS);
        const yAsk    = askPxUSD     !== null ? await getTir(token, ticker, askPxUSD)     : null;

        // Tabla muestra precios ARS originales
        results.push({ ticker, lastPrice: lastPriceARS, volume, bidPx: bidPxARS, bidQty, askPx: askPxARS, askQty, tirLast, yBid, yAsk, error: null });
      } catch (err) {
        results.push({ ticker, lastPrice: null, volume: null, bidPx: null, bidQty: null, askPx: null, askQty: null, tirLast: null, yBid: null, yAsk: null, error: err instanceof Error ? err.message : "Error desconocido" });
      }
    }

    return NextResponse.json({ results, mepRatio, al30ARS: al30Price, al30DUSD: al30dPrice, updatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error inesperado" }, { status: 500 });
  }
}
