import { NextResponse } from "next/server";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getClientsCSVData } from "@/lib/csv-data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threshold = Number(searchParams.get("threshold") || "30000");
  const asesor = searchParams.get("asesor") || "";
  const onlyVencidos = searchParams.get("onlyVencidos") === "1";
  const q = (searchParams.get("q") || "").toLowerCase();

  const clients = getClientsCSVData().filter((c) => c.patrimonioUSD > threshold);
  const statuses = await prisma.clientReportStatus.findMany();
  const map = new Map(statuses.map((s) => [s.clientExternalId, s]));

  const merged = clients
    .map((c) => {
      const st = map.get(c.externalId);
      const days = st?.lastReportSentAt ? differenceInCalendarDays(new Date(), st.lastReportSentAt) : 9999;
      const vencido = !st?.lastReportSentAt || days > 183;
      return { ...c, lastReportSentAt: st?.lastReportSentAt || null, notes: st?.notes || "", days, estado: vencido ? "VENCIDO" : "OK" };
    })
    .filter((c) => (asesor ? c.asesor === asesor : true))
    .filter((c) => (onlyVencidos ? c.estado === "VENCIDO" : true))
    .filter((c) => c.nombre.toLowerCase().includes(q))
    .sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === "VENCIDO" ? -1 : 1;
      if (a.days !== b.days) return b.days - a.days;
      return b.patrimonioUSD - a.patrimonioUSD;
    });

  return NextResponse.json(merged);
}
