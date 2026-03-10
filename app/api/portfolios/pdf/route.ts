import { NextResponse } from "next/server";
import { PortfolioTipo } from "@prisma/client";
import { PDFDocument, PDFPage, StandardFonts, rgb, RGB } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { AÑOS, RETORNOS, ASSET_DESCRIPTIONS, type Año } from "@/lib/portfolio-data";

// ─── Colors ────────────────────────────────────────────────────────────────
const NAVY   = rgb(0.082, 0.169, 0.318);   // #152B51
const GOLD   = rgb(0.722, 0.573, 0.173);   // #B89230
const WHITE  = rgb(1, 1, 1);
const LGRAY  = rgb(0.949, 0.949, 0.957);
const MGRAY  = rgb(0.55, 0.55, 0.6);
const DGRAY  = rgb(0.18, 0.18, 0.22);
const GREEN  = rgb(0.055, 0.49, 0.24);
const RED    = rgb(0.72, 0.1, 0.1);
const BLUE   = rgb(0.145, 0.365, 0.78);

const TIPOS = new Set<PortfolioTipo>(["CONSERVADORA", "MODERADA", "AGRESIVA"]);

// ─── Text wrap ──────────────────────────────────────────────────────────────
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    if (cur.length + word.length + 1 > maxChars) {
      if (cur) lines.push(cur);
      cur = word;
    } else {
      cur = cur ? `${cur} ${word}` : word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ─── PDF Page Manager ───────────────────────────────────────────────────────
const W = 595, H = 842;
const ML = 50, MR = 545, CONTENT_W = MR - ML;

class PageManager {
  pdf: PDFDocument;
  page!: PDFPage;
  font!: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  fontBold!: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  y = 0;

  constructor(pdf: PDFDocument) { this.pdf = pdf; }

  async init() {
    this.font     = await this.pdf.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.pdf.embedFont(StandardFonts.HelveticaBold);
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage([W, H]);
    this.y = H - 30; // start below top margin
    this.drawFooter();
  }

  drawFooter() {
    this.page.drawRectangle({ x: 0, y: 0, width: W, height: 30, color: NAVY });
    this.page.drawText(
      "Material informativo. No constituye asesoramiento de inversión personalizado. Rentabilidades pasadas no garantizan resultados futuros.",
      { x: ML, y: 10, size: 6.5, font: this.font, color: rgb(0.7, 0.75, 0.85) }
    );
  }

  ensure(height: number) {
    if (this.y - height < 50) this.newPage();
  }

  text(txt: string, { x = ML, size = 10, color = DGRAY, bold = false }: { x?: number; size?: number; color?: RGB; bold?: boolean } = {}) {
    this.page.drawText(txt, { x, y: this.y, size, font: bold ? this.fontBold : this.font, color });
    this.y -= size + 5;
  }

  textWrapped(txt: string, { size = 9.5, color = DGRAY, maxChars = 90, lineGap = 4 }: { size?: number; color?: RGB; maxChars?: number; lineGap?: number } = {}) {
    const lines = wrapText(txt, maxChars);
    for (const line of lines) {
      this.ensure(size + lineGap + 4);
      this.page.drawText(line, { x: ML, y: this.y, size, font: this.font, color });
      this.y -= size + lineGap;
    }
  }

  gap(n = 10) { this.y -= n; }

  rect(x: number, y: number, w: number, h: number, color: RGB) {
    this.page.drawRectangle({ x, y, width: w, height: h, color });
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, thickness = 0.5) {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
  }
}

// ─── Main Route ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipoParam = searchParams.get("tipo");
  if (!tipoParam || !TIPOS.has(tipoParam as PortfolioTipo)) {
    return NextResponse.json({ error: "tipo" }, { status: 400 });
  }

  const tipo = tipoParam as PortfolioTipo;
  const template = await prisma.portfolioTemplate.findFirst({ where: { tipo }, include: { items: true } });
  if (!template) return NextResponse.json({ error: "not found" }, { status: 404 });

  const pdf = await PDFDocument.create();
  const pm = new PageManager(pdf);
  await pm.init();

  const items = template.items;
  const rf = items.filter((i) => i.tipoActivo === "RENTA_FIJA").reduce((a, i) => a + i.porcentaje, 0);
  const rv = items.filter((i) => i.tipoActivo === "RENTA_VARIABLE").reduce((a, i) => a + i.porcentaje, 0);

  // ── HEADER ───────────────────────────────────────────────────────────────
  pm.rect(0, H - 90, W, 90, NAVY);
  pm.rect(0, H - 93, W, 3, GOLD);

  pm.page.drawText("WEALTH MANAGEMENT", { x: ML, y: H - 28, size: 8, font: pm.fontBold, color: rgb(0.6, 0.68, 0.82), characterSpacing: 2.5 });
  pm.page.drawText(`Propuesta de Inversion — ${tipo}`, { x: ML, y: H - 50, size: 20, font: pm.fontBold, color: WHITE });
  pm.page.drawText(`Fecha: ${new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}`, { x: ML, y: H - 72, size: 9, font: pm.font, color: rgb(0.65, 0.72, 0.85) });

  pm.y = H - 108;

  // ── COMPOSICIÓN ──────────────────────────────────────────────────────────
  pm.rect(ML, pm.y - 14, CONTENT_W, 20, LGRAY);
  pm.page.drawText("COMPOSICIÓN DE LA CARTERA", { x: ML + 6, y: pm.y - 10, size: 8.5, font: pm.fontBold, color: NAVY, characterSpacing: 1 });
  pm.y -= 24;
  pm.gap(6);

  // Intro paragraph
  const rfNames = items.filter((i) => i.tipoActivo === "RENTA_FIJA").map((i) => i.activoNombre).join(", ");
  const rvNames = items.filter((i) => i.tipoActivo === "RENTA_VARIABLE").map((i) => i.activoNombre).join(", ");
  const profileDesc =
    tipo === "CONSERVADORA" ? "conservador, priorizando la preservacion del capital y la estabilidad de los retornos"
    : tipo === "MODERADA"   ? "moderado, buscando equilibrio entre crecimiento y preservacion del capital"
    :                         "agresivo, orientado a maximizar el crecimiento a largo plazo asumiendo mayor volatilidad";

  const intro = `La presente propuesta corresponde a un perfil de inversion ${profileDesc}. La cartera esta compuesta por ${items.length} instrumento${items.length !== 1 ? "s" : ""}, con una asignacion del ${rf}% en renta fija y el ${rv}% en renta variable.${rfNames ? ` Los activos de renta fija incluyen: ${rfNames}.` : ""}${rvNames ? ` La exposicion en renta variable se canaliza a traves de: ${rvNames}.` : ""}`;

  if (template.descripcion) {
    pm.textWrapped(template.descripcion, { size: 9.5, color: MGRAY });
    pm.gap(6);
  }
  pm.textWrapped(intro, { size: 9.5 });
  pm.gap(10);

  // RF / RV bar
  const barW = CONTENT_W;
  const barH = 18;
  const rfW = (rf / 100) * barW;
  pm.rect(ML, pm.y - barH, rfW, barH, NAVY);
  if (rfW < barW) pm.rect(ML + rfW, pm.y - barH, barW - rfW, barH, BLUE);
  pm.page.drawText(`RF ${rf}%`, { x: ML + 6, y: pm.y - 13, size: 8, font: pm.fontBold, color: WHITE });
  if (rv > 0) pm.page.drawText(`RV ${rv}%`, { x: ML + rfW + 6, y: pm.y - 13, size: 8, font: pm.fontBold, color: WHITE });
  pm.y -= barH + 14;

  // ── ACTIVOS TABLE ─────────────────────────────────────────────────────────
  pm.ensure(40 + items.length * 20);
  pm.rect(ML, pm.y - 14, CONTENT_W, 20, NAVY);
  pm.page.drawText("ACTIVOS DE LA CARTERA", { x: ML + 6, y: pm.y - 10, size: 8.5, font: pm.fontBold, color: WHITE, characterSpacing: 1 });
  pm.y -= 20;

  const colW = [220, 80, 100, 60] as const;
  const headers = ["Activo", "Ticker", "Tipo", "Ponderacion"];
  pm.rect(ML, pm.y - 16, CONTENT_W, 16, LGRAY);
  let cx = ML + 6;
  headers.forEach((h, i) => {
    pm.page.drawText(h, { x: cx, y: pm.y - 12, size: 8, font: pm.fontBold, color: NAVY });
    cx += colW[i];
  });
  pm.y -= 16;

  items.forEach((item, idx) => {
    pm.ensure(20);
    if (idx % 2 === 0) pm.rect(ML, pm.y - 16, CONTENT_W, 16, rgb(0.975, 0.975, 0.98));
    cx = ML + 6;
    const row = [item.activoNombre, item.ticker || "—", item.tipoActivo === "RENTA_FIJA" ? "Renta Fija" : "Renta Variable", `${item.porcentaje}%`];
    row.forEach((val, i) => {
      const displayVal = val.length > 35 ? val.slice(0, 33) + "..." : val;
      pm.page.drawText(displayVal, { x: cx, y: pm.y - 12, size: 8.5, font: pm.font, color: DGRAY });
      cx += colW[i];
    });
    pm.y -= 16;
  });
  // Total row
  pm.rect(ML, pm.y - 16, CONTENT_W, 16, LGRAY);
  pm.page.drawText("TOTAL", { x: ML + 6, y: pm.y - 12, size: 8.5, font: pm.fontBold, color: NAVY });
  pm.page.drawText(`${rf + rv}%`, { x: ML + colW[0] + colW[1] + colW[2] + 6, y: pm.y - 12, size: 8.5, font: pm.fontBold, color: NAVY });
  pm.y -= 20;
  pm.gap(14);

  // ── SIMULACIÓN HISTÓRICA TABLE ────────────────────────────────────────────
  const simItems = items.filter((i) => RETORNOS[i.activoNombre]);
  if (simItems.length > 0) {
    pm.ensure(40 + (simItems.length + 2) * 20);

    pm.rect(ML, pm.y - 14, CONTENT_W, 20, NAVY);
    pm.page.drawText("SIMULACION HISTORICA 2020 - 2024", { x: ML + 6, y: pm.y - 10, size: 8.5, font: pm.fontBold, color: WHITE, characterSpacing: 1 });
    pm.y -= 20;

    // Header row
    const simColW = 175;
    const añoColW = (CONTENT_W - simColW - 40) / AÑOS.length;
    pm.rect(ML, pm.y - 16, CONTENT_W, 16, LGRAY);
    pm.page.drawText("Activo", { x: ML + 6, y: pm.y - 12, size: 8, font: pm.fontBold, color: NAVY });
    pm.page.drawText("Pond.", { x: ML + simColW + 6, y: pm.y - 12, size: 8, font: pm.fontBold, color: NAVY });
    AÑOS.forEach((año, i) => {
      pm.page.drawText(String(año), { x: ML + simColW + 44 + i * añoColW, y: pm.y - 12, size: 8, font: pm.fontBold, color: NAVY });
    });
    pm.y -= 16;

    // Portfolio returns
    const cartRet: Record<Año, number> = { 2020: 0, 2021: 0, 2022: 0, 2023: 0, 2024: 0 };

    simItems.forEach((item, idx) => {
      pm.ensure(20);
      if (idx % 2 === 0) pm.rect(ML, pm.y - 16, CONTENT_W, 16, rgb(0.975, 0.975, 0.98));
      const name = item.activoNombre.length > 28 ? item.activoNombre.slice(0, 26) + "..." : item.activoNombre;
      pm.page.drawText(name, { x: ML + 6, y: pm.y - 12, size: 8, font: pm.font, color: DGRAY });
      pm.page.drawText(`${item.porcentaje}%`, { x: ML + simColW + 6, y: pm.y - 12, size: 8, font: pm.font, color: DGRAY });
      AÑOS.forEach((año, i) => {
        const r = RETORNOS[item.activoNombre][año];
        cartRet[año] += (item.porcentaje / 100) * r;
        const txt = `${r >= 0 ? "+" : ""}${r.toFixed(1)}%`;
        pm.page.drawText(txt, { x: ML + simColW + 44 + i * añoColW, y: pm.y - 12, size: 8, font: pm.font, color: r >= 0 ? GREEN : RED });
      });
      pm.y -= 16;
    });

    // Cartera total row
    pm.ensure(20);
    pm.rect(ML, pm.y - 18, CONTENT_W, 18, LGRAY);
    pm.page.drawText("Cartera Total", { x: ML + 6, y: pm.y - 13, size: 8.5, font: pm.fontBold, color: NAVY });
    AÑOS.forEach((año, i) => {
      const r = cartRet[año];
      const txt = `${r >= 0 ? "+" : ""}${r.toFixed(2)}%`;
      pm.page.drawText(txt, { x: ML + simColW + 44 + i * añoColW, y: pm.y - 13, size: 8.5, font: pm.fontBold, color: r >= 0 ? GREEN : RED });
    });
    pm.y -= 22;
    pm.gap(16);

    // ── LINE CHART ───────────────────────────────────────────────────────────
    const chartH = 155;
    const chartW = CONTENT_W;
    pm.ensure(chartH + 50);

    pm.rect(ML, pm.y - 14, CONTENT_W, 20, NAVY);
    pm.page.drawText("EVOLUCION DE USD 100.000 INVERTIDOS", { x: ML + 6, y: pm.y - 10, size: 8.5, font: pm.fontBold, color: WHITE, characterSpacing: 1 });
    pm.y -= 22;

    // Background
    pm.rect(ML, pm.y - chartH, chartW, chartH, LGRAY);

    // Compute values
    let val = 100000;
    const labels = ["Inicio", "2020", "2021", "2022", "2023", "2024"];
    const values = [100000];
    for (const año of AÑOS) {
      val = val * (1 + cartRet[año] / 100);
      values.push(Math.round(val));
    }

    const minVal = Math.min(...values) * 0.97;
    const maxVal = Math.max(...values) * 1.03;
    const chartPadL = 58, chartPadR = 10, chartPadT = 10, chartPadB = 30;
    const plotW = chartW - chartPadL - chartPadR;
    const plotH = chartH - chartPadT - chartPadB;
    const chartTop = pm.y - chartPadT;
    const chartBottom = pm.y - chartH + chartPadB;

    const toX = (i: number) => ML + chartPadL + (i / (values.length - 1)) * plotW;
    const toY = (v: number) => chartBottom + ((v - minVal) / (maxVal - minVal)) * plotH;

    // Grid lines
    const gridCount = 4;
    for (let g = 0; g <= gridCount; g++) {
      const gv = minVal + (g / gridCount) * (maxVal - minVal);
      const gy = chartBottom + (g / gridCount) * plotH;
      pm.line(ML + chartPadL, gy, ML + chartW - chartPadR, gy, rgb(0.82, 0.82, 0.87), 0.4);
      const label = `$${Math.round(gv / 1000)}k`;
      pm.page.drawText(label, { x: ML + 2, y: gy - 4, size: 7, font: pm.font, color: MGRAY });
    }

    // X axis labels
    labels.forEach((lbl, i) => {
      pm.page.drawText(lbl, { x: toX(i) - (lbl.length * 2.5), y: chartBottom - 18, size: 7.5, font: pm.fontBold, color: MGRAY });
    });

    // Area fill (simple horizontal bands)
    for (let i = 0; i < values.length - 1; i++) {
      const x1 = toX(i), x2 = toX(i + 1);
      const y1 = toY(values[i]), y2 = toY(values[i + 1]);
      const steps = 20;
      for (let s = 0; s < steps; s++) {
        const t0 = s / steps, t1 = (s + 1) / steps;
        const sx1 = x1 + t0 * (x2 - x1), sx2 = x1 + t1 * (x2 - x1);
        const sy = y1 + t0 * (y2 - y1);
        pm.page.drawRectangle({ x: sx1, y: chartBottom, width: sx2 - sx1, height: Math.max(0, sy - chartBottom), color: rgb(0.145, 0.365, 0.78), opacity: 0.08 });
      }
    }

    // Line segments
    for (let i = 0; i < values.length - 1; i++) {
      pm.page.drawLine({ start: { x: toX(i), y: toY(values[i]) }, end: { x: toX(i + 1), y: toY(values[i + 1]) }, thickness: 2, color: BLUE });
    }

    // Dots + value labels
    values.forEach((v, i) => {
      pm.page.drawCircle({ x: toX(i), y: toY(v), size: 3.5, color: WHITE });
      pm.page.drawCircle({ x: toX(i), y: toY(v), size: 2.5, color: BLUE });
      const lbl = `$${Math.round(v / 1000)}k`;
      const labelX = i === values.length - 1 ? toX(i) - 18 : toX(i) - 9;
      pm.page.drawText(lbl, { x: labelX, y: toY(v) + 5, size: 7, font: pm.fontBold, color: NAVY });
    });

    pm.y -= chartH + 18;
  }

  // ── ASSET DESCRIPTIONS ────────────────────────────────────────────────────
  pm.ensure(30);
  pm.rect(ML, pm.y - 14, CONTENT_W, 20, NAVY);
  pm.page.drawText("DESCRIPCION DE LOS INSTRUMENTOS", { x: ML + 6, y: pm.y - 10, size: 8.5, font: pm.fontBold, color: WHITE, characterSpacing: 1 });
  pm.y -= 24;

  for (const item of items) {
    const desc = ASSET_DESCRIPTIONS[item.activoNombre];
    if (!desc) continue;
    const nameLines = wrapText(item.activoNombre, 75);
    const descLines = wrapText(desc, 90);
    const blockH = (nameLines.length * 12) + (descLines.length * 13) + 12;
    pm.ensure(blockH + 8);

    pm.page.drawText(item.activoNombre, { x: ML, y: pm.y, size: 9.5, font: pm.fontBold, color: NAVY });
    pm.y -= 14;
    for (const line of descLines) {
      pm.page.drawText(line, { x: ML, y: pm.y, size: 9, font: pm.font, color: DGRAY });
      pm.y -= 13;
    }
    pm.line(ML, pm.y + 4, MR, pm.y + 4, LGRAY, 0.5);
    pm.y -= 8;
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=propuesta-${tipo}.pdf`,
    },
  });
}
