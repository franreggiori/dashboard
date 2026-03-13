import { NextRequest, NextResponse } from "next/server";
import { loginPPI, detectInstrumentType, getCurrent, getBook, estimateBond } from "@/lib/ppi";

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
          const type = await detectInstrumentType(token, ticker, settlement);
          if (!type) throw new Error(`Instrument not found: ${ticker}`);

          const [current, book] = await Promise.all([
            getCurrent(token, ticker, type, settlement),
            getBook(token, ticker, type, settlement),
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

          return { ticker, type, ultimo, tirUltimo, cantCompra, precioCompra, yieldCompra, yieldVenta, precioVenta, cantVenta, volumen, error: null };
        } catch (err) {
          return { ticker, type: null, ultimo: null, tirUltimo: null, cantCompra: null, precioCompra: null, yieldCompra: null, yieldVenta: null, precioVenta: null, cantVenta: null, volumen: null, error: err instanceof Error ? err.message : "Error desconocido" };
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
