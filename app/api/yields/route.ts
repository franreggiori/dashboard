import { NextRequest, NextResponse } from "next/server";
import { loginPPI, getCurrent, getBook, estimateBond } from "@/lib/ppi";

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

    const results: BondResult[] = await Promise.all(
      tickers.map(async ({ ticker, settlement = "A-48HS" }) => {
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

          const [resUltimo, resCompra, resVenta] = await Promise.all([
            ultimo !== null ? estimateBond(token, ticker, ultimo) : Promise.resolve(null),
            precioCompra !== null ? estimateBond(token, ticker, precioCompra) : Promise.resolve(null),
            precioVenta !== null ? estimateBond(token, ticker, precioVenta) : Promise.resolve(null),
          ]);

          return {
            ticker, type, ultimo, volumen,
            cantCompra, precioCompra,
            cantVenta, precioVenta,
            tirUltimo: resUltimo?.tir ?? null,
            yieldCompra: resCompra?.tir ?? null,
            yieldVenta: resVenta?.tir ?? null,
            debugEstimate: resUltimo?.raw ?? null,
            error: null,
          };
        } catch (err) {
          return {
            ticker, type: null, ultimo: null, tirUltimo: null, cantCompra: null,
            precioCompra: null, yieldCompra: null, yieldVenta: null, precioVenta: null,
            cantVenta: null, volumen: null, debugEstimate: null,
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
