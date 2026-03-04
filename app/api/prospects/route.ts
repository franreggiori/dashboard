import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProspectEstado } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") || undefined;
  const cargadoPor = searchParams.get("cargadoPor") || undefined;
  const q = searchParams.get("q") || undefined;
  const rows = await prisma.prospect.findMany({
    where: {
      ...(estado ? { estado: estado as ProspectEstado } : {}),
      ...(cargadoPor ? { cargadoPor: cargadoPor as any } : {}),
      ...(q ? { nombre: { contains: q } } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const nombre = String(body.nombre || "").trim();
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  const existing = await prisma.prospect.findFirst({ where: { nombre } });
  if (existing && !body.force) return NextResponse.json({ duplicate: true }, { status: 409 });
  const row = await prisma.prospect.create({
    data: {
      nombre,
      cargadoPor: body.cargadoPor,
      estado: body.estado || "PENDIENTE",
      comentario: body.comentario || null,
    },
  });
  return NextResponse.json(row);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const row = await prisma.prospect.update({ where: { id: body.id }, data: { ...body, id: undefined } });
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id" }, { status: 400 });
  await prisma.prospect.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
