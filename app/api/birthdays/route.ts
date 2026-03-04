import { NextResponse } from "next/server";
import { getBirthdaysData } from "@/lib/csv-data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") || "6");
  const asesor = searchParams.get("asesor") || "";
  const data = getBirthdaysData()
    .filter((x) => x.diasFaltantes >= 0 && x.diasFaltantes <= days)
    .filter((x) => (asesor ? x.asesor === asesor : true))
    .sort((a, b) => a.diasFaltantes - b.diasFaltantes);
  return NextResponse.json(data);
}
