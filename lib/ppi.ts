const PPI_BASE = "https://clientapi.portfoliopersonal.com";

const INSTRUMENT_TYPES = ["ON", "BONOS", "LETRAS", "ACCIONES", "CEDEARS", "ETF", "FCI"] as const;

const MAX_RETRIES = 4;
const BACKOFF_BASE_SEC = 0.35;
const BACKOFF_CAP_SEC = 6.0;

export const SLEEP_BETWEEN_TICKERS_MS = 20;

// Caché en memoria: clave = "ticker:price" → tir
// Persiste mientras el proceso de Node esté activo (instancia caliente en Vercel)
const tirCache = new Map<string, number | null>();

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
  // unreachable but satisfies TypeScript
  return fetch(url, options);
}

export const PPI_HEADERS = {
  "AuthorizedClient": "API_CLI_REST",
  "ClientKey": "pp19CliApp12",
  "Accept": "application/json",
};

export type CurrentResponse = {
  price?: number;
  quantity?: number;
  tradedQuantity?: number;
  volume?: number;
};

export type BookEntry = {
  price?: number;
  quantity?: number;
  size?: number;
};

export type BookResponse = {
  // PPI usa "bids" para compradora y "offers" para vendedora
  bids?: BookEntry[];
  offers?: BookEntry[];
  // por si acaso usa asks
  asks?: BookEntry[];
};

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

export async function detectInstrumentType(
  token: string,
  ticker: string,
  settlement: string,
): Promise<string | null> {
  for (const type of INSTRUMENT_TYPES) {
    const url = `${PPI_BASE}/api/1.0/MarketData/Current?ticker=${encodeURIComponent(ticker)}&type=${encodeURIComponent(type)}&settlement=${encodeURIComponent(settlement)}`;
    const res = await fetch(url, {
      headers: { ...PPI_HEADERS, "Authorization": `Bearer ${token}` },
    });
    if (res.ok) return type;
  }
  return null;
}

export async function getCurrent(
  token: string,
  ticker: string,
  type: string,
  settlement: string,
): Promise<CurrentResponse> {
  const url = `${PPI_BASE}/api/1.0/MarketData/Current?ticker=${encodeURIComponent(ticker)}&type=${encodeURIComponent(type)}&settlement=${encodeURIComponent(settlement)}`;
  const res = await fetch(url, {
    headers: { ...PPI_HEADERS, "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Current failed for ${ticker}: ${res.status} — ${body}`);
  }
  return res.json() as Promise<CurrentResponse>;
}

export async function getBook(
  token: string,
  ticker: string,
  type: string,
  settlement: string,
): Promise<BookResponse> {
  const url = `${PPI_BASE}/api/1.0/MarketData/Book?ticker=${encodeURIComponent(ticker)}&type=${encodeURIComponent(type)}&settlement=${encodeURIComponent(settlement)}`;
  const res = await fetch(url, {
    headers: { ...PPI_HEADERS, "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Book failed for ${ticker}: ${res.status} — ${body}`);
  }
  const data = await res.json() as BookResponse;
  return data;
}

// Retorna { tir, raw, cached } — raw para debugging, cached indica si vino del caché
export async function estimateBond(
  token: string,
  ticker: string,
  price: number,
): Promise<{ tir: number | null; raw: unknown; cached: boolean }> {
  const cacheKey = `${ticker}:${price}`;
  if (tirCache.has(cacheKey)) {
    return { tir: tirCache.get(cacheKey) ?? null, raw: null, cached: true };
  }

  const date = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    ticker,
    date,
    quantityType: "PAPELES",
    quantity: "100",
    price: String(price),
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
  return { tir, raw: data, cached: false };
}
