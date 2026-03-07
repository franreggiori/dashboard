import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CargadoPor = "FRAN" | "DANI" | "AGUSTINA";
type ProspectEstado = "PENDIENTE" | "CONTACTADO" | "EN_SEGUIMIENTO" | "NEGOCIACION" | "CERRADO" | "PERDIDO";

const ALLOWED_ESTADOS = new Set<ProspectEstado>([
  "PENDIENTE",
  "CONTACTADO",
  "EN_SEGUIMIENTO",
  "NEGOCIACION",
  "CERRADO",
  "PERDIDO",
]);

const ALLOWED_CARGADO_POR = new Set<CargadoPor>(["FRAN", "DANI", "AGUSTINA"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") || undefined;
  const cargadoPor = searchParams.get("cargadoPor") || undefined;
  const q = searchParams.get("q") || undefined;

  const rows = await prisma.prospect.findMany({
    where: {
      ...(estado && ALLOWED_ESTADOS.has(estado as ProspectEstado) ? { estado: estado as ProspectEstado } : {}),
      ...(cargadoPor && ALLOWED_CARGADO_POR.has(cargadoPor as CargadoPor) ? { cargadoPor: cargadoPor as CargadoPor } : {}),
      ...(q ? { nombre: { contains: q.trim() } } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { fechaCarga: "desc" }],
  });

  return NextResponse.json(rows);
}

type ProspectPostBody = {
  nombre?: string;
  cargadoPor?: CargadoPor;
  estado?: ProspectEstado;
  comentario?: string;
  force?: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json()) as ProspectPostBody;
  const nombre = String(body.nombre ?? "").trim();
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  if (!body.cargadoPor || !ALLOWED_CARGADO_POR.has(body.cargadoPor)) {
    return NextResponse.json({ error: "cargadoPor inválido" }, { status: 400 });
  }

  const existing = await prisma.prospect.findFirst({ where: { nombre } });
  if (existing && !body.force) {
    return NextResponse.json({ duplicate: true, existingId: existing.id }, { status: 409 });
  }

  const row = await prisma.prospect.create({
    data: {
      nombre,
      cargadoPor: body.cargadoPor,
      estado: body.estado && ALLOWED_ESTADOS.has(body.estado) ? body.estado : "PENDIENTE",
      comentario: body.comentario ? String(body.comentario).trim() : null,
    },
  });

  return NextResponse.json(row);
}

type ProspectPatchBody = {
  id?: string;
  nombre?: string;
  estado?: ProspectEstado;
  comentario?: string | null;
  proximaAccionNota?: string | null;
  proximaAccionFecha?: string | null;
};

export async function PATCH(req: Request) {
  const body = (await req.json()) as ProspectPatchBody;
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.nombre === "string") data.nombre = body.nombre.trim();
  if (typeof body.estado === "string" && ALLOWED_ESTADOS.has(body.estado)) data.estado = body.estado;
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
