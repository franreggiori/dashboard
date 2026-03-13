const PPI_BASE = "https://clientapi.portfoliopersonal.com";

const INSTRUMENT_TYPES = ["ON", "BONOS", "LETRAS", "ACCIONES", "CEDEARS", "ETF", "FCI"] as const;

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
  bids?: BookEntry[];
  asks?: BookEntry[];
};

export type EstimateBondResponse = {
  yield?: number;
  tir?: number;
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
  return res.json() as Promise<BookResponse>;
}

export async function estimateBond(
  token: string,
  ticker: string,
  type: string,
  price: number,
  settlement: string,
): Promise<number | null> {
  const res = await fetch(`${PPI_BASE}/api/1.0/MarketData/EstimateBond`, {
    method: "POST",
    headers: {
      ...PPI_HEADERS,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ticker, type, price, settlement }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as EstimateBondResponse | number;
  if (typeof data === "number") return data;
  return data.yield ?? data.tir ?? null;
}
