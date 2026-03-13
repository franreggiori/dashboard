import { NextRequest, NextResponse } from "next/server";
import { loginPPI, getCurrent, fetchTickerData, yields2Cache, SLEEP_BETWEEN_TICKERS_MS, PPI_HEADERS } from "@/lib/ppi";

type TickerInput = {
  ticker: string;
  settlement?: string;
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
    const toUSD = (p: number) => p / mepRatio;

    const results = [];

    for (const { ticker, settlement = "A-48HS" } of tickers) {
      if (results.length > 0) {
        await new Promise((r) => setTimeout(r, SLEEP_BETWEEN_TICKERS_MS));
      }
      try {
        const data = await fetchTickerData(token, ticker, "ON", settlement, yields2Cache, toUSD);
        results.push({
          ticker,
          ultimo: data.lastPrice,
          tirUltimo: data.tirLast,
          cantCompra: data.bidQty,
          precioCompra: data.bidPx,
          yieldCompra: data.yBid,
          yieldVenta: data.yAsk,
          precioVenta: data.askPx,
          cantVenta: data.askQty,
          volumen: data.volume,
          debugEstimate: data.debugEstimate,
          error: null,
        });
      } catch (err) {
        results.push({
          ticker, ultimo: null, tirUltimo: null, cantCompra: null, precioCompra: null,
          yieldCompra: null, yieldVenta: null, precioVenta: null, cantVenta: null,
          volumen: null, debugEstimate: null,
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }

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
