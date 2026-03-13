import { NextRequest, NextResponse } from "next/server";
import { loginPPI, getCurrent, getBook, estimateBond, SLEEP_BETWEEN_TICKERS_MS } from "@/lib/ppi";

type TickerInput = {
  ticker: string;
  settlement?: string;
};

type BondResult = {
  ticker: string;
  type: string | null;
  ultimo: number | null;
  tirUltimo: number | null;
  cantCompra: number | null;
  precioCompra: number | null;
  yieldCompra: number | null;
  yieldVenta: number | null;
  precioVenta: number | null;
  cantVenta: number | null;
  volumen: number | null;
  debugEstimate: unknown;
  error: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { tickers?: TickerInput[] };
    const tickers = body.tickers ?? [];

    if (!tickers.length) {
      return NextResponse.json({ error: "No tickers provided" }, { status: 400 });
    }

    const token = await loginPPI();

    const results: BondResult[] = [];
    for (const { ticker, settlement = "A-48HS" } of tickers) {
      if (results.length > 0) await new Promise((r) => setTimeout(r, SLEEP_BETWEEN_TICKERS_MS));
      try {
        const type = "ON";

        const [current, book] = await Promise.all([
          getCurrent(token, ticker, type, settlement),
          getBook(token, ticker, type, settlement),
        ]);

        const ultimo = current.price ?? null;
        const volumen = current.quantity ?? current.tradedQuantity ?? current.volume ?? null;

        // PPI usa "bids" para compradora y "offers" para vendedora
        const bestBid = book.bids?.[0] ?? null;
        const bestOffer = book.offers?.[0] ?? book.asks?.[0] ?? null;
        const precioCompra = bestBid?.price ?? null;
        const cantCompra = bestBid?.quantity ?? bestBid?.size ?? null;
        const precioVenta = bestOffer?.price ?? null;
        const cantVenta = bestOffer?.quantity ?? bestOffer?.size ?? null;

        // EstimateBond secuencial con sleep entre llamadas para evitar 429
        const resUltimo = ultimo !== null ? await estimateBond(token, ticker, ultimo) : null;
        await new Promise((r) => setTimeout(r, SLEEP_BETWEEN_TICKERS_MS));
        const resCompra = precioCompra !== null ? await estimateBond(token, ticker, precioCompra) : null;
        await new Promise((r) => setTimeout(r, SLEEP_BETWEEN_TICKERS_MS));
        const resVenta = precioVenta !== null ? await estimateBond(token, ticker, precioVenta) : null;

        results.push({
          ticker, type, ultimo, volumen,
          cantCompra, precioCompra,
          cantVenta, precioVenta,
          tirUltimo: resUltimo?.tir ?? null,
          yieldCompra: resCompra?.tir ?? null,
          yieldVenta: resVenta?.tir ?? null,
          debugEstimate: resUltimo?.raw ?? null,
          error: null,
        });
      } catch (err) {
        results.push({
          ticker, type: null, ultimo: null, tirUltimo: null, cantCompra: null,
          precioCompra: null, yieldCompra: null, yieldVenta: null, precioVenta: null,
          cantVenta: null, volumen: null, debugEstimate: null,
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }

    return NextResponse.json({ results, updatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error inesperado" },
      { status: 500 },
    );
  }
}
