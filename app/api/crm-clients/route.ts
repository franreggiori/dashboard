import { differenceInCalendarDays } from "date-fns";
import { NextResponse } from "next/server";
import { getClientsCSVData } from "@/lib/csv-data";
import { prisma } from "@/lib/prisma";

const OVERDUE_DAYS = 183;

type ClientReportStatusRow = Awaited<ReturnType<typeof prisma.clientReportStatus.findMany>>[number];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const thresholdRaw = Number(searchParams.get("threshold") || "30000");
  const threshold = Number.isFinite(thresholdRaw) ? Math.max(20000, Math.min(100000, thresholdRaw)) : 30000;
  const asesor = searchParams.get("asesor") || "";
  const onlyVencidos = searchParams.get("onlyVencidos") === "1";
  const q = (searchParams.get("q") || "").toLowerCase();

  const eligibleClients = getClientsCSVData().filter((client) => client.patrimonioUSD > threshold);
  const asesores = Array.from(new Set(eligibleClients.map((client) => client.asesor).filter(Boolean))).sort();

  const statuses = await prisma.clientReportStatus.findMany();
  const statusByExternalId = new Map<string, ClientReportStatusRow>();
  for (const status of statuses as ClientReportStatusRow[]) {
    statusByExternalId.set(status.clientExternalId, status);
  }

  const rows = eligibleClients
    .map((client) => {
      const status = statusByExternalId.get(client.externalId);
      const daysSinceLastReport = status?.lastReportSentAt
        ? differenceInCalendarDays(new Date(), new Date(status.lastReportSentAt))
        : OVERDUE_DAYS + 1;
      const estado = !status?.lastReportSentAt || daysSinceLastReport > OVERDUE_DAYS ? "VENCIDO" : "OK";

      return {
        ...client,
        lastReportSentAt: status?.lastReportSentAt ?? null,
        notes: status?.notes ?? "",
        daysSinceLastReport,
        estado,
      };
    })
    .filter((row) => (asesor ? row.asesor === asesor : true))
    .filter((row) => (onlyVencidos ? row.estado === "VENCIDO" : true))
    .filter((row) => row.nombre.toLowerCase().includes(q))
    .sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === "VENCIDO" ? -1 : 1;
      if (a.daysSinceLastReport !== b.daysSinceLastReport) return b.daysSinceLastReport - a.daysSinceLastReport;
      return b.patrimonioUSD - a.patrimonioUSD;
    });

  return NextResponse.json({ rows, asesores, threshold });
}
