import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  if (!tipo) return NextResponse.json({ error: "tipo" }, { status: 400 });
  const t = await prisma.portfolioTemplate.findFirst({ where: { tipo: tipo as any }, include: { items: true } });
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let y = 800;
  const draw = (text: string, size = 11) => { page.drawText(text, { x: 40, y, size, font, color: rgb(0, 0, 0) }); y -= size + 10; };
  draw(`Propuesta de Inversión – ${t.tipo}`, 18);
  draw(`Fecha: ${new Date().toLocaleDateString("es-AR")}`);
  draw(t.descripcion || "Descripción pendiente de completar para este perfil.");
  y -= 10;
  draw("Activos:", 12);
  t.items.forEach((it) => draw(`- ${it.activoNombre} ${it.ticker ? `(${it.ticker})` : ""} | ${it.tipoActivo} | ${it.porcentaje}%`));
  const rf = t.items.filter((i) => i.tipoActivo === "RENTA_FIJA").reduce((a, b) => a + b.porcentaje, 0);
  const rv = t.items.filter((i) => i.tipoActivo === "RENTA_VARIABLE").reduce((a, b) => a + b.porcentaje, 0);
  y -= 10;
  draw(`Totales - RF: ${rf}% | RV: ${rv}%`, 12);
  page.drawText("Material informativo. No constituye recomendación personalizada. Riesgo de mercado.", { x: 40, y: 40, size: 9, font });

  const bytes = await pdf.save();
  return new NextResponse(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=propuesta-${t.tipo}.pdf` } });
}
