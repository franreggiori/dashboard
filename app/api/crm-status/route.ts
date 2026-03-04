import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const row = await prisma.clientReportStatus.upsert({
    where: { clientExternalId: body.clientExternalId },
    create: {
      clientExternalId: body.clientExternalId,
      clientName: body.clientName,
      lastReportSentAt: body.lastReportSentAt ? new Date(body.lastReportSentAt) : null,
      notes: body.notes || null,
    },
    update: {
      clientName: body.clientName,
      lastReportSentAt: body.lastReportSentAt ? new Date(body.lastReportSentAt) : null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(row);
}
