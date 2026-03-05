import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";

const PORTFOLIO_TIPOS = ["CONSERVADORA", "MODERADA", "AGRESIVA"] as const;
type PortfolioTipoValue = (typeof PORTFOLIO_TIPOS)[number];
const TIPOS = new Set<PortfolioTipoValue>(PORTFOLIO_TIPOS);

type PortfolioItemRow = {
  activoNombre: string;
  ticker: string | null;
  tipoActivo: "RENTA_FIJA" | "RENTA_VARIABLE";
  porcentaje: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipoParam = searchParams.get("tipo");
  if (!tipoParam || !TIPOS.has(tipoParam as PortfolioTipoValue)) {
    return NextResponse.json({ error: "tipo" }, { status: 400 });
  }

  const tipo = tipoParam as PortfolioTipoValue;
  const template = await prisma.portfolioTemplate.findFirst({ where: { tipo }, include: { items: true } });
  if (!template) return NextResponse.json({ error: "not found" }, { status: 404 });

  const items = template.items as PortfolioItemRow[];

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let y = 800;

  const draw = (text: string, size = 11) => {
    page.drawText(text, { x: 40, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 10;
  };

  draw(`Propuesta de Inversión – ${template.tipo}`, 18);
  draw(`Fecha: ${new Date().toLocaleDateString("es-AR")}`);
  draw(template.descripcion || "Descripción pendiente de completar para este perfil.");
  y -= 10;
  draw("Activos:", 12);
  items.forEach((item: PortfolioItemRow) =>
    draw(`- ${item.activoNombre} ${item.ticker ? `(${item.ticker})` : ""} | ${item.tipoActivo} | ${item.porcentaje}%`),
  );

  const rf = items
    .filter((item: PortfolioItemRow) => item.tipoActivo === "RENTA_FIJA")
    .reduce((acc: number, item: PortfolioItemRow) => acc + item.porcentaje, 0);
  const rv = items
    .filter((item: PortfolioItemRow) => item.tipoActivo === "RENTA_VARIABLE")
    .reduce((acc: number, item: PortfolioItemRow) => acc + item.porcentaje, 0);

  y -= 10;
  draw(`Totales - RF: ${rf}% | RV: ${rv}%`, 12);
  page.drawText("Material informativo. No constituye recomendación personalizada. Riesgo de mercado.", {
    x: 40,
    y: 40,
    size: 9,
    font,
  });

  const bytes = await pdf.save();
  const body = Buffer.from(bytes);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=propuesta-${template.tipo}.pdf`,
    },
  });
}
