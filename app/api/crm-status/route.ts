import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toDateOrNull(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(req: Request) {
  const body = await req.json();
  const clientExternalId = String(body.clientExternalId ?? "").trim();
  const clientName = String(body.clientName ?? "").trim();

  if (!clientExternalId || !clientName) {
    return NextResponse.json({ error: "clientExternalId y clientName son requeridos" }, { status: 400 });
  }

  const row = await prisma.clientReportStatus.upsert({
    where: { clientExternalId },
    create: {
      clientExternalId,
      clientName,
      lastReportSentAt: toDateOrNull(body.lastReportSentAt),
      notes: body.notes ? String(body.notes).trim() : null,
    },
    update: {
      clientName,
      lastReportSentAt: toDateOrNull(body.lastReportSentAt),
      notes: body.notes ? String(body.notes).trim() : null,
    },
  });

  return NextResponse.json(row);
}
