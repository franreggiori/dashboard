import { NextResponse } from "next/server";
import { PortfolioTipo } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";

const TIPOS = new Set<PortfolioTipo>(["CONSERVADORA", "MODERADA", "AGRESIVA"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipoParam = searchParams.get("tipo");
  if (!tipoParam || !TIPOS.has(tipoParam as PortfolioTipo)) {
    return NextResponse.json({ error: "tipo" }, { status: 400 });
  }

  const tipo = tipoParam as PortfolioTipo;
  const template = await prisma.portfolioTemplate.findFirst({ where: { tipo }, include: { items: true } });
  if (!template) return NextResponse.json({ error: "not found" }, { status: 404 });

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
  template.items.forEach((item) => draw(`- ${item.activoNombre} ${item.ticker ? `(${item.ticker})` : ""} | ${item.tipoActivo} | ${item.porcentaje}%`));

  const rf = template.items.filter((item) => item.tipoActivo === "RENTA_FIJA").reduce((acc, item) => acc + item.porcentaje, 0);
  const rv = template.items.filter((item) => item.tipoActivo === "RENTA_VARIABLE").reduce((acc, item) => acc + item.porcentaje, 0);

  y -= 10;
  draw(`Totales - RF: ${rf}% | RV: ${rv}%`, 12);
  page.drawText("Material informativo. No constituye recomendación personalizada. Riesgo de mercado.", {
    x: 40,
    y: 40,
    size: 9,
    font,
  });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=propuesta-${template.tipo}.pdf`,
    },
  });
}
