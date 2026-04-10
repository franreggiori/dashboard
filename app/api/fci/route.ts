import { NextResponse } from "next/server";

const PPI_BASE = "https://clientapi.portfoliopersonal.com";
const PPI_HEADERS = {
  "AuthorizedClient": "API_CLI_REST",
  "ClientKey": "pp19CliApp12",
  "Accept": "application/json",
};

const FCI_TICKERS = [
  { ticker: "RFDL10000", name: "Gainvest Renta Fija Dólares Clase A" },
  { ticker: "GAL.AHPL.A", name: "Galileo Ahorro Plus Clase A" },
];

async function loginPPI(): Promise<string> {
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

async function fetchHistorico(
  token: string,
  ticker: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ fecha: string; precio: number }[]> {
  const url = `${PPI_BASE}/api/1.0/MarketData/Search?ticker=${encodeURIComponent(ticker)}&type=FCI&dateFrom=${dateFrom}&dateTo=${dateTo}&settlement=A-48HS`;
  const res = await fetch(url, {
    headers: { ...PPI_HEADERS, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MarketData/Search failed for ${ticker}: ${res.status} — ${body}`);
  }
  const data = (await res.json()) as Array<{ date?: string; price?: number; closePrice?: number; close?: number }>;
  return data
    .map((d) => ({
      fecha: (d.date ?? "").slice(0, 10),
      precio: d.price ?? d.closePrice ?? d.close ?? 0,
    }))
    .filter((d) => d.fecha && d.precio > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function GET() {
  try {
    const token = await loginPPI();

    const now = new Date();
    const dateTo = now.toISOString().slice(0, 10);
    // Extendemos a 40 días para garantizar que "Hace 30D" siempre tenga datos,
    // incluso si el último CP disponible es varios días anterior a hoy.
    const dateFromDate = new Date(now);
    dateFromDate.setDate(dateFromDate.getDate() - 40);
    const dateFrom = dateFromDate.toISOString().slice(0, 10);

    const results = await Promise.all(
      FCI_TICKERS.map(async ({ ticker, name }) => {
        const rows = await fetchHistorico(token, ticker, dateFrom, dateTo);
        return { ticker, name, rows };
      }),
    );

    // Usar la última fecha disponible en los datos como referencia,
    // no la fecha real de hoy (puede que el último CP sea del día anterior).
    const lastFecha = results
      .flatMap((f) => f.rows.map((r) => r.fecha))
      .sort()
      .at(-1) ?? dateTo;

    return NextResponse.json({ dateFrom, dateTo: lastFecha, fondos: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
