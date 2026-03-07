import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PortfolioTipoValue = "CONSERVADORA" | "MODERADA" | "AGRESIVA";

async function ensureTemplates() {
  for (const tipo of ["CONSERVADORA", "MODERADA", "AGRESIVA"] as const satisfies PortfolioTipoValue[]) {
    await prisma.portfolioTemplate.upsert({ where: { tipo }, update: {}, create: { tipo } });
  }
}

export async function GET() {
  await ensureTemplates();
  const templates = await prisma.portfolioTemplate.findMany({ include: { items: true }, orderBy: { tipo: "asc" } });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === "addItem") {
    const row = await prisma.portfolioItem.create({ data: body.data });
    return NextResponse.json(row);
  }
  if (body.action === "deleteItem") {
    await prisma.portfolioItem.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "updateItem") {
    const row = await prisma.portfolioItem.update({ where: { id: body.id }, data: body.data });
    return NextResponse.json(row);
  }
  if (body.action === "updateDescripcion") {
    const row = await prisma.portfolioTemplate.update({ where: { id: body.id }, data: { descripcion: body.descripcion } });
    return NextResponse.json(row);
  }
  return NextResponse.json({ error: "action" }, { status: 400 });
}
