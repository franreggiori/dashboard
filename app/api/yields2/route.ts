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

    // Calcular ratio MEP implícito: AL30 (ARS) / AL30D (USD)
    const [al30, al30d] = await Promise.all([
      getCurrent(token, "AL30", "BONOS", "A-48HS"),
      getCurrent(token, "AL30D", "BONOS", "A-48HS"),
    ]);

    if (!al30.price || !al30d.price) {
      return NextResponse.json(
        { error: "No se pudo obtener precio de AL30 o AL30D para calcular ratio MEP" },
        { status: 502 },
      );
    }

    const mepRatio = al30.price / al30d.price;

    const results: BondResult[] = await Promise.all(
      tickers.map(async ({ ticker, settlement = "A-48HS" }) => {
        try {
          const type = "ON";

          const [current, book] = await Promise.all([
            getCurrent(token, ticker, type, settlement),
            getBook(token, ticker, type, settlement),
          ]);

          const ultimoARS = current.price ?? null;
          const volumen = current.quantity ?? current.tradedQuantity ?? current.volume ?? null;

          const bestBid = book.bids?.[0] ?? null;
          const bestAsk = book.asks?.[0] ?? null;
          const precioCompraARS = bestBid?.price ?? null;
          const cantCompra = bestBid?.quantity ?? bestBid?.size ?? null;
          const precioVentaARS = bestAsk?.price ?? null;
          const cantVenta = bestAsk?.quantity ?? bestAsk?.size ?? null;

          // Convertir precios ARS a USD dividiendo por el ratio MEP
          const ultimo = ultimoARS !== null ? ultimoARS / mepRatio : null;
          const precioCompra = precioCompraARS !== null ? precioCompraARS / mepRatio : null;
          const precioVenta = precioVentaARS !== null ? precioVentaARS / mepRatio : null;

          const [tirUltimo, yieldCompra, yieldVenta] = await Promise.all([
            ultimo !== null ? estimateBond(token, ticker, ultimo) : Promise.resolve(null),
            precioCompra !== null ? estimateBond(token, ticker, precioCompra) : Promise.resolve(null),
            precioVenta !== null ? estimateBond(token, ticker, precioVenta) : Promise.resolve(null),
          ]);

          return { ticker, type, ultimo, tirUltimo, cantCompra, precioCompra, yieldCompra, yieldVenta, precioVenta, cantVenta, volumen, error: null };
        } catch (err) {
          return { ticker, type: null, ultimo: null, tirUltimo: null, cantCompra: null, precioCompra: null, yieldCompra: null, yieldVenta: null, precioVenta: null, cantVenta: null, volumen: null, error: err instanceof Error ? err.message : "Error desconocido" };
        }
      }),
    );

    return NextResponse.json({
      results,
      mepRatio,
      al30ARS: al30.price,
      al30DUSD: al30d.price,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error inesperado" },
      { status: 500 },
    );
  }
}
