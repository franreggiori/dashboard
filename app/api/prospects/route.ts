import { NextResponse } from "next/server";
import { ProspectEstado } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ALLOWED_ESTADOS = new Set<ProspectEstado>([
  "PENDIENTE",
  "CONTACTADO",
  "EN_SEGUIMIENTO",
  "NEGOCIACION",
  "CERRADO",
  "PERDIDO",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") || undefined;
  const cargadoPor = searchParams.get("cargadoPor") || undefined;
  const q = searchParams.get("q") || undefined;

  const rows = await prisma.prospect.findMany({
    where: {
      ...(estado && ALLOWED_ESTADOS.has(estado as ProspectEstado) ? { estado: estado as ProspectEstado } : {}),
      ...(cargadoPor ? { cargadoPor: cargadoPor as any } : {}),
      ...(q ? { nombre: { contains: q.trim() } } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { fechaCarga: "desc" }],
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const nombre = String(body.nombre ?? "").trim();
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const existing = await prisma.prospect.findFirst({ where: { nombre } });
  if (existing && !body.force) {
    return NextResponse.json({ duplicate: true, existingId: existing.id }, { status: 409 });
  }

  const row = await prisma.prospect.create({
    data: {
      nombre,
      cargadoPor: body.cargadoPor,
      estado: ALLOWED_ESTADOS.has(body.estado) ? body.estado : "PENDIENTE",
      comentario: body.comentario ? String(body.comentario).trim() : null,
    },
  });

  return NextResponse.json(row);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.nombre === "string") data.nombre = body.nombre.trim();
  if (typeof body.estado === "string" && ALLOWED_ESTADOS.has(body.estado as ProspectEstado)) data.estado = body.estado;
  if ("comentario" in body) data.comentario = body.comentario ? String(body.comentario).trim() : null;
  if ("proximaAccionNota" in body) data.proximaAccionNota = body.proximaAccionNota ? String(body.proximaAccionNota).trim() : null;
  if ("proximaAccionFecha" in body) data.proximaAccionFecha = body.proximaAccionFecha ? new Date(body.proximaAccionFecha) : null;

  const row = await prisma.prospect.update({ where: { id }, data });
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  await prisma.prospect.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
