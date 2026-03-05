import { NextResponse } from "next/server";
import { getBirthdaysData } from "@/lib/csv-data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") || "6");
  const asesor = searchParams.get("asesor") || "";

  const allRows = getBirthdaysData();
  const asesores = Array.from(new Set(allRows.map((row) => row.asesor).filter(Boolean))).sort();

  const rows = allRows
    .filter((row) => row.diasFaltantes >= 0 && row.diasFaltantes <= days)
    .filter((row) => (asesor ? row.asesor === asesor : true))
    .sort((a, b) => a.diasFaltantes - b.diasFaltantes);

  return NextResponse.json({ rows, asesores });
}
