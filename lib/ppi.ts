const PPI_BASE = "https://clientapi.portfoliopersonal.com";

const INSTRUMENT_TYPES = ["ON", "BONOS", "LETRAS", "ACCIONES", "CEDEARS", "ETF", "FCI"] as const;

const MAX_RETRIES = 4;
const BACKOFF_BASE_SEC = 0.35;
const BACKOFF_CAP_SEC = 6.0;

export const SLEEP_BETWEEN_TICKERS_MS = 20;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type BondCache = {
  lastPrice: number | null;
  volume: number | null;
  bidPx: number | null;
  bidQty: number | null;
  askPx: number | null;
  askQty: number | null;
  tirLast: number | null;
  yBid: number | null;
  yAsk: number | null;
  debugEstimate: unknown;
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
  offers?: BookEntry[];
  asks?: BookEntry[];
};

// ─── Cachés globales (persisten en instancia caliente de Vercel) ──────────────

// Caché completo por ticker para yields (precios ARS directos)
export const yieldsCache = new Map<string, BondCache>();

// Caché completo por ticker para yields2 (precios ajustados por ratio MEP)
export const yields2Cache = new Map<string, BondCache>();

// TIR por "ticker:price" — compartido entre yields y yields2
const tirCache = new Map<string, number | null>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const PPI_HEADERS = {
  "AuthorizedClient": "API_CLI_REST",
  "ClientKey": "pp19CliApp12",
  "Accept": "application/json",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;
    if (attempt === MAX_RETRIES) return res;
    const backoff = Math.min(BACKOFF_BASE_SEC * Math.pow(2, attempt), BACKOFF_CAP_SEC);
    await sleep(backoff * 1000);
  }
  return fetch(url, options);
}

async function getTir(
  token: string,
  ticker: string,
  price: number,
): Promise<{ tir: number | null; raw: unknown }> {
  const cacheKey = `${ticker}:${price}`;
  if (tirCache.has(cacheKey)) {
    return { tir: tirCache.get(cacheKey) ?? null, raw: null };
  }
  const date = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    ticker, date, quantityType: "PAPELES", quantity: "100", price: String(price),
  });
  const res = await fetchWithRetry(`${PPI_BASE}/api/1.0/MarketData/Bonds/Estimate?${params}`, {
    headers: { ...PPI_HEADERS, "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`EstimateBond failed for ${ticker}: ${res.status} — ${body}`);
  }
  const data = await res.json() as unknown;
  const obj = data as Record<string, unknown>;
  const tir =
    typeof data === "number" ? data :
    typeof obj.tir === "number" ? obj.tir :
    typeof obj.yield === "number" ? obj.yield :
    typeof obj.rate === "number" ? obj.rate :
    typeof obj.internalRate === "number" ? obj.internalRate :
    typeof obj.tna === "number" ? obj.tna :
    typeof obj.tea === "number" ? obj.tea :
    null;
  tirCache.set(cacheKey, tir);
  return { tir, raw: data };
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function loginPPI(): Promise<string> {
  const res = await fetch(`${PPI_BASE}/api/1.0/Account/LoginApi`, {
    method: "POST",
    headers: {
      ...PPI_HEADERS,
      "ApiKey": process.env.PPI_PUBLIC_KEY ?? "",
      "ApiSecret": process.env.PPI_PRIVATE_KEY ?? "",
    },
  });
  if (!res.ok) throw new Error(`PPI login failed: ${res.status}`);
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

export async function getCurrent(
  token: string, ticker: string, type: string, settlement: string,
): Promise<CurrentResponse> {
  const url = `${PPI_BASE}/api/1.0/MarketData/Current?ticker=${encodeURIComponent(ticker)}&type=${encodeURIComponent(type)}&settlement=${encodeURIComponent(settlement)}`;
  const res = await fetch(url, { headers: { ...PPI_HEADERS, "Authorization": `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Current failed for ${ticker}: ${res.status} — ${body}`);
  }
  return res.json() as Promise<CurrentResponse>;
}

/**
 * Obtiene todos los datos de un ticker con caché inteligente:
 *  - Si lastPrice no cambió → devuelve todo del caché (0 llamadas a Book/EstimateBond)
 *  - Si lastPrice cambió → llama Book y solo llama EstimateBond para los precios que cambiaron
 *
 * @param priceTransform  Función opcional para transformar precios antes de EstimateBond
 *                        (ej: dividir por ratio MEP en yields2)
 * @param cache           Mapa de caché a usar (yieldsCache o yields2Cache)
 */
export async function fetchTickerData(
  token: string,
  ticker: string,
  type: string,
  settlement: string,
  cache: Map<string, BondCache>,
  priceTransform: (p: number) => number = (p) => p,
): Promise<BondCache> {
  const current = await getCurrent(token, ticker, type, settlement);
  const newPrice = current.price ?? null;
  const newVolume = current.quantity ?? current.tradedQuantity ?? current.volume ?? null;

  const cached = cache.get(ticker);

  // Si el precio no cambió, devolver todo del caché
  if (cached && newPrice !== null && newPrice === cached.lastPrice) {
    return { ...cached, volume: newVolume };
  }

  // Precio cambió (o primer fetch) → obtener book
  const bookUrl = `${PPI_BASE}/api/1.0/MarketData/Book?ticker=${encodeURIComponent(ticker)}&type=${encodeURIComponent(type)}&settlement=${encodeURIComponent(settlement)}`;
  const bookRes = await fetch(bookUrl, {
    headers: { ...PPI_HEADERS, "Authorization": `Bearer ${token}` },
  });
  if (!bookRes.ok) {
    const body = await bookRes.text();
    throw new Error(`Book failed for ${ticker}: ${bookRes.status} — ${body}`);
  }
  const book = await bookRes.json() as BookResponse;

  const bestBid = book.bids?.[0] ?? null;
  const bestOffer = book.offers?.[0] ?? book.asks?.[0] ?? null;
  const bidPx = bestBid?.price ?? null;
  const bidQty = bestBid?.quantity ?? bestBid?.size ?? null;
  const askPx = bestOffer?.price ?? null;
  const askQty = bestOffer?.quantity ?? bestOffer?.size ?? null;

  // Aplicar transformación de precio (para yields2: dividir por ratio MEP)
  const transformedLast = newPrice !== null ? priceTransform(newPrice) : null;
  const transformedBid  = bidPx !== null ? priceTransform(bidPx) : null;
  const transformedAsk  = askPx !== null ? priceTransform(askPx) : null;

  // TIR last: siempre recalcular si lastPrice cambió
  let tirLast: number | null = null;
  let debugEstimate: unknown = null;
  if (transformedLast !== null) {
    await sleep(SLEEP_BETWEEN_TICKERS_MS);
    const res = await getTir(token, ticker, transformedLast);
    tirLast = res.tir;
    debugEstimate = res.raw;
  }

  // yBid: reusar caché si bidPx no cambió
  let yBid: number | null = null;
  if (transformedBid !== null) {
    if (cached && bidPx === cached.bidPx && cached.yBid !== null) {
      yBid = cached.yBid;
    } else {
      await sleep(SLEEP_BETWEEN_TICKERS_MS);
      yBid = (await getTir(token, ticker, transformedBid)).tir;
    }
  }

  // yAsk: reusar caché si askPx no cambió
  let yAsk: number | null = null;
  if (transformedAsk !== null) {
    if (cached && askPx === cached.askPx && cached.yAsk !== null) {
      yAsk = cached.yAsk;
    } else {
      await sleep(SLEEP_BETWEEN_TICKERS_MS);
      yAsk = (await getTir(token, ticker, transformedAsk)).tir;
    }
  }

  const result: BondCache = {
    lastPrice: newPrice,
    volume: newVolume,
    bidPx,
    bidQty,
    askPx,
    askQty,
    tirLast,
    yBid,
    yAsk,
    debugEstimate,
  };

  cache.set(ticker, result);
  return result;
}
