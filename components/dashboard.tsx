"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AÑOS, RETORNOS, type Año } from "@/lib/portfolio-data";
import type { CargadoPor, PortfolioItem, PortfolioTemplate, Prospect } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TabKey = "cumples" | "prospects" | "carteras" | "crm" | "mercado" | "instrumentos" | "noticias" | "tirs";

type ProspectEstado = "PENDIENTE" | "CONTACTADO" | "EN_SEGUIMIENTO" | "NEGOCIACION" | "CERRADO" | "PERDIDO";

const ESTADOS: ProspectEstado[] = ["PENDIENTE", "CONTACTADO", "EN_SEGUIMIENTO", "NEGOCIACION", "CERRADO", "PERDIDO"];

type BirthdayRow = {
  externalId: string;
  nombre: string;
  asesor: string;
  telefono: string;
  patrimonioUSD: number;
  fechaLabel: string;
  diasFaltantes: number;
};

type BirthdaysResponse = { rows: BirthdayRow[]; asesores: string[] };

type ProspectRow = Prospect;

type PortfolioTemplateWithItems = PortfolioTemplate & { items: PortfolioItem[] };

type CRMRow = {
  externalId: string;
  nombre: string;
  asesor: string;
  patrimonioUSD: number;
  lastReportSentAt: string | null;
  daysSinceLastReport: number;
  estado: "OK" | "VENCIDO";
  notes: string;
};

type CRMResponse = { rows: CRMRow[]; asesores: string[]; threshold: number };

type MarketQuote = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
};

type MarketResponse = { updatedAt: string; quotes: MarketQuote[]; error?: string };


const NAV_ITEMS: [TabKey, string][] = [
  ["cumples", "🎂 Cumpleaños"],
  ["prospects", "📋 Prospects"],
  ["carteras", "📊 Carteras"],
  ["crm", "📁 CRM Informes"],
  ["mercado", "📈 Mercado"],
  ["instrumentos", "🏦 Instrumentos"],
  ["noticias", "📰 Noticias"],
  ["tirs", "📊 TIRs"],
];

export default function Dashboard() {
  const [tab, setTab] = useState<TabKey>("cumples");

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 flex flex-col bg-slate-900 text-slate-100 shrink-0">
        <div className="px-5 py-6 border-b border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Wealth Management</p>
          <h1 className="font-bold text-lg text-white leading-tight">Dashboard</h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                tab === id
                  ? "bg-blue-600 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {tab === "cumples" && <CumplesTab />}
        {tab === "prospects" && <ProspectsTab />}
        {tab === "carteras" && <CarterasTab />}
        {tab === "crm" && <CrmTab />}
        {tab === "mercado" && <MercadoTab />}
        {tab === "instrumentos" && <InstrumentosTab />}
        {tab === "noticias" && <NoticiasTab />}
        {tab === "tirs" && <TirsTab />}
      </main>
    </div>
  );
}

function CumplesTab() {
  const [days, setDays] = useState(6);
  const [asesor, setAsesor] = useState("");
  const [rows, setRows] = useState<BirthdayRow[]>([]);
  const [asesores, setAsesores] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/birthdays?days=${days}&asesor=${encodeURIComponent(asesor)}`)
      .then((response) => response.json())
      .then((payload: BirthdaysResponse) => {
        setRows(payload.rows ?? []);
        setAsesores(payload.asesores ?? []);
      });
  }, [days, asesor]);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Próximos cumpleaños</h2>
      <div className="flex gap-3">
        <Select value={String(days)} onChange={(event) => setDays(Number(event.target.value))}>
          {Array.from({ length: 12 }).map((_, index) => {
            const value = index + 3;
            return (
              <option key={value} value={value}>
                Próximos {value} días
              </option>
            );
          })}
        </Select>

        <Select value={asesor} onChange={(event) => setAsesor(event.target.value)}>
          <option value="">Todos los asesores</option>
          {asesores.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-left">
            <th className="px-3 py-2 font-semibold">Nombre</th>
            <th className="px-3 py-2 font-semibold">Asesor</th>
            <th className="px-3 py-2 font-semibold">Cumple</th>
            <th className="px-3 py-2 font-semibold">Días faltantes</th>
            <th className="px-3 py-2 font-semibold">Teléfono</th>
            <th className="px-3 py-2 font-semibold">Patrimonio USD</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.externalId}-${row.fechaLabel}`} className="border-t">
              <td>{row.nombre}</td>
              <td>{row.asesor || "-"}</td>
              <td>{row.fechaLabel}</td>
              <td>{row.diasFaltantes}</td>
              <td>
                {row.telefono ? (
                  <button type="button" onClick={() => navigator.clipboard.writeText(row.telefono)} className="underline">
                    {row.telefono}
                  </button>
                ) : (
                  "-"
                )}
              </td>
              <td>{row.patrimonioUSD ? `USD ${Number(row.patrimonioUSD).toLocaleString("es-AR")}` : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ProspectsTab() {
  const [rows, setRows] = useState<ProspectRow[]>([]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [cargadoPor, setCargadoPor] = useState("");
  const [nombre, setNombre] = useState("");
  const [nuevoPor, setNuevoPor] = useState<CargadoPor>("FRAN");
  const [nuevoEstado, setNuevoEstado] = useState<ProspectEstado>("PENDIENTE");
  const [editing, setEditing] = useState<ProspectRow | null>(null);

  const load = () => {
    fetch(`/api/prospects?estado=${estado}&cargadoPor=${cargadoPor}&q=${encodeURIComponent(q)}`)
      .then((response) => response.json() as Promise<ProspectRow[]>)
      .then(setRows);
  };

  useEffect(load, [q, estado, cargadoPor]);

  async function createProspect(force = false) {
    const trimmedName = nombre.trim();
    if (!trimmedName) {
      alert("El nombre es obligatorio.");
      return;
    }

    const response = await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: trimmedName, cargadoPor: nuevoPor, estado: nuevoEstado, force }),
    });

    if (response.status === 409) {
      if (confirm("Ya existe un prospect con ese nombre exacto. ¿Querés crearlo igual?")) {
        await createProspect(true);
      }
      return;
    }

    setNombre("");
    load();
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Prospects</h2>

      <div className="rounded border p-3 space-y-2">
        <h3 className="font-medium">Nuevo prospect</h3>
        <div className="grid grid-cols-4 gap-2">
          <Input placeholder="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} />
          <Select value={nuevoPor} onChange={(event) => setNuevoPor(event.target.value as CargadoPor)}>
            <option>FRAN</option>
            <option>DANI</option>
            <option>AGUSTINA</option>
          </Select>
          <Select value={nuevoEstado} onChange={(event) => setNuevoEstado(event.target.value as ProspectEstado)}>
            {ESTADOS.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
          <Button onClick={() => createProspect()}>Agregar</Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Buscar por nombre" value={q} onChange={(event) => setQ(event.target.value)} />
        <Select value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </Select>
        <Select value={cargadoPor} onChange={(event) => setCargadoPor(event.target.value)}>
          <option value="">Todos</option>
          <option>FRAN</option>
          <option>DANI</option>
          <option>AGUSTINA</option>
        </Select>
      </div>

      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-left">
            <th className="px-3 py-2 font-semibold">Nombre</th>
            <th className="px-3 py-2 font-semibold">Cargado por</th>
            <th className="px-3 py-2 font-semibold">Fecha carga</th>
            <th className="px-3 py-2 font-semibold">Estado</th>
            <th className="px-3 py-2 font-semibold">Última actualización</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t cursor-pointer" onClick={() => setEditing(row)}>
              <td>{row.nombre}</td>
              <td>{row.cargadoPor}</td>
              <td>{new Date(row.fechaCarga).toLocaleDateString("es-AR")}</td>
              <td>
                <Select
                  value={row.estado}
                  onClick={(event) => event.stopPropagation()}
                  onChange={async (event) => {
                    await fetch("/api/prospects", {
                      method: "PATCH",
                      body: JSON.stringify({ id: row.id, estado: event.target.value }),
                    });
                    load();
                  }}
                >
                  {ESTADOS.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </Select>
              </td>
              <td>{new Date(row.updatedAt).toLocaleDateString("es-AR")}</td>
              <td>
                <Button
                  variant="destructive"
                  onClick={async (event) => {
                    event.stopPropagation();
                    if (confirm("¿Seguro que querés borrar este prospect?")) {
                      await fetch(`/api/prospects?id=${row.id}`, { method: "DELETE" });
                      load();
                    }
                  }}
                >
                  Borrar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="fixed inset-0 bg-black/35 grid place-items-center" onClick={() => setEditing(null)}>
          <div className="bg-white p-4 rounded w-[560px] space-y-2" onClick={(event) => event.stopPropagation()}>
            <h4 className="font-semibold">Editar prospect</h4>
            <Input value={editing.nombre} onChange={(event) => setEditing({ ...editing, nombre: event.target.value })} />
            <Select value={editing.estado} onChange={(event) => setEditing({ ...editing, estado: event.target.value as ProspectEstado })}>
              {ESTADOS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
            <Textarea
              rows={5}
              placeholder="Comentario"
              value={editing.comentario || ""}
              onChange={(event) => setEditing({ ...editing, comentario: event.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={editing.proximaAccionFecha ? String(editing.proximaAccionFecha).slice(0, 10) : ""}
                onChange={(event) => setEditing({ ...editing, proximaAccionFecha: event.target.value || null } as unknown as ProspectRow)}
              />
              <Input
                placeholder="Próxima acción"
                value={editing.proximaAccionNota || ""}
                onChange={(event) => setEditing({ ...editing, proximaAccionNota: event.target.value })}
              />
            </div>
            <Button
              onClick={async () => {
                await fetch("/api/prospects", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(editing),
                });
                setEditing(null);
                load();
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

const ACTIVOS_PREDEFINIDOS = [
  { label: "SPY",                                  ticker: "SPY",   tipoActivo: "RENTA_VARIABLE" },
  { label: "QQQ",                                  ticker: "QQQ",   tipoActivo: "RENTA_VARIABLE" },
  { label: "EEM (ETF Emerging Markets)",           ticker: "EEM",   tipoActivo: "RENTA_VARIABLE" },
  { label: "Neuberguer Global Equity MEGATRENDS",  ticker: "",      tipoActivo: "RENTA_VARIABLE" },
  { label: "GAINVEST RENTA FIJA DOLAR",            ticker: "",      tipoActivo: "RENTA_FIJA"     },
  { label: "OBLIGACIONES NEGOCIABLES",             ticker: "",      tipoActivo: "RENTA_FIJA"     },
  { label: "PIMCO INCOME FUND",                    ticker: "",      tipoActivo: "RENTA_FIJA"     },
  { label: "BARINGS PRIVATE CREDIT",               ticker: "",      tipoActivo: "RENTA_FIJA"     },
  { label: "BARINGS GLOBAL SECURES BONDS",         ticker: "",      tipoActivo: "RENTA_FIJA"     },
  { label: "GOLD",                                 ticker: "GC=F",  tipoActivo: "RENTA_VARIABLE" },
  { label: "DOW JONES (DIA)",                      ticker: "DIA",   tipoActivo: "RENTA_VARIABLE" },
  { label: "IWM (Russell 2000)",                   ticker: "IWM",   tipoActivo: "RENTA_VARIABLE" },
];

const FONDOS_ESTIMADOS = new Set([
  "Neuberguer Global Equity MEGATRENDS",
  "PIMCO INCOME FUND",
  "BARINGS PRIVATE CREDIT",
  "BARINGS GLOBAL SECURES BONDS",
]);

function fmt(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function SimulacionHistorica({ items }: { items: { activoNombre: string; porcentaje: number }[] }) {
  const retornos = items.filter((i) => RETORNOS[i.activoNombre]);

  const retornosCartera: Record<Año, number> = { 2021: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 0 };
  for (const año of AÑOS) {
    for (const item of retornos) {
      retornosCartera[año] += (item.porcentaje / 100) * RETORNOS[item.activoNombre][año];
    }
  }

  let valor = 100000;
  const chartData = [{ year: "Inicio", valor: 100000 }];
  for (const año of AÑOS) {
    valor = valor * (1 + retornosCartera[año] / 100);
    chartData.push({ year: String(año), valor: Math.round(valor) });
  }

  const hayEstimados = items.some((i) => FONDOS_ESTIMADOS.has(i.activoNombre));

  return (
    <div className="space-y-4 border rounded-xl p-4 bg-white">
      <h3 className="font-semibold text-slate-700">Simulación histórica 2021–2025</h3>

      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-left">
            <th className="px-3 py-2 font-semibold">Activo</th>
            <th className="px-3 py-2 font-semibold text-right">Pond.</th>
            {AÑOS.map((a) => <th key={a} className="px-3 py-2 font-semibold text-right">{a}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const r = RETORNOS[item.activoNombre];
            return (
              <tr key={item.activoNombre} className="border-t">
                <td className="px-3 py-2">
                  {item.activoNombre}
                  {FONDOS_ESTIMADOS.has(item.activoNombre) && <span className="text-xs text-slate-400 ml-1">*</span>}
                </td>
                <td className="px-3 py-2 text-right">{item.porcentaje}%</td>
                {AÑOS.map((a) => (
                  <td key={a} className={`px-3 py-2 text-right font-medium ${r ? (r[a] >= 0 ? "text-emerald-600" : "text-red-600") : "text-slate-400"}`}>
                    {r ? fmt(r[a]) : "—"}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr className="border-t bg-slate-50 font-semibold">
            <td className="px-3 py-2">Cartera total</td>
            <td className="px-3 py-2 text-right">—</td>
            {AÑOS.map((a) => (
              <td key={a} className={`px-3 py-2 text-right ${retornosCartera[a] >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {fmt(retornosCartera[a])}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Evolución de USD 100.000 invertidos</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => [`$${v.toLocaleString("en-US")}`, "Valor cartera"]} />
            <Line type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {hayEstimados && (
        <p className="text-xs text-slate-400">* Rendimientos de fondos con ISIN son aproximados basados en el perfil de riesgo del instrumento.</p>
      )}
    </div>
  );
}

function CarterasTab() {
  const [templates, setTemplates] = useState<PortfolioTemplateWithItems[]>([]);
  const [tipo, setTipo] = useState("CONSERVADORA");
  const [activoSeleccionado, setActivoSeleccionado] = useState(ACTIVOS_PREDEFINIDOS[0].label);
  const [porcentaje, setPorcentaje] = useState(0);
  const [verSimulacion, setVerSimulacion] = useState(false);

  const load = () =>
    fetch("/api/portfolios")
      .then((response) => response.json() as Promise<PortfolioTemplateWithItems[]>)
      .then(setTemplates);
  useEffect(() => { load(); }, []);

  const currentTemplate = useMemo(() => templates.find((template) => template.tipo === tipo), [templates, tipo]);
  const totalPercent = useMemo(
    () => (currentTemplate?.items || []).reduce((acc: number, current) => acc + Number(current.porcentaje), 0),
    [currentTemplate],
  );

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">Propuestas de carteras</h2>
      <div className="flex gap-2 items-center flex-wrap">
        {["CONSERVADORA", "MODERADA", "AGRESIVA"].map((portfolioType) => (
          <Button
            key={portfolioType}
            variant={tipo === portfolioType ? "default" : "outline"}
            onClick={() => { setTipo(portfolioType); setVerSimulacion(false); }}
          >
            {portfolioType}
          </Button>
        ))}
        <Badge className={totalPercent === 100 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}>
          Total: {totalPercent}%
        </Badge>
        <Button variant="outline" onClick={() => window.open(`/api/portfolios/pdf?tipo=${tipo}`, "_blank")}>Descargar PDF</Button>
      </div>

      {currentTemplate && (
        <>
          <Textarea
            placeholder="Descripción del perfil"
            value={currentTemplate.descripcion || ""}
            onChange={async (event) => {
              const descripcion = event.target.value;
              setTemplates((prev) => prev.map((template) => (template.id === currentTemplate.id ? { ...template, descripcion } : template)));
              await fetch("/api/portfolios", {
                method: "POST",
                body: JSON.stringify({ action: "updateDescripcion", id: currentTemplate.id, descripcion }),
              });
            }}
          />

          <div className="grid grid-cols-3 gap-2">
            <Select value={activoSeleccionado} onChange={(e) => setActivoSeleccionado(e.target.value)}>
              {ACTIVOS_PREDEFINIDOS.map((a) => (
                <option key={a.label} value={a.label}>{a.label}</option>
              ))}
            </Select>
            <Input
              type="number" min={0} max={100} placeholder="Ponderación (%)"
              value={porcentaje || ""}
              onChange={(e) => setPorcentaje(Number(e.target.value))}
            />
            <Button
              onClick={async () => {
                if (!porcentaje) return;
                const activo = ACTIVOS_PREDEFINIDOS.find((a) => a.label === activoSeleccionado)!;
                await fetch("/api/portfolios", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "addItem",
                    data: { activoNombre: activo.label, ticker: activo.ticker, tipoActivo: activo.tipoActivo, porcentaje, templateId: currentTemplate.id },
                  }),
                });
                setPorcentaje(0);
                load();
              }}
            >
              Agregar
            </Button>
          </div>

          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-left">
                <th className="px-3 py-2 font-semibold">Activo</th>
                <th className="px-3 py-2 font-semibold">Ticker</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold text-right">%</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {currentTemplate.items.map((portfolioItem) => (
                <tr className="border-t hover:bg-slate-50" key={portfolioItem.id}>
                  <td className="px-3 py-2">{portfolioItem.activoNombre}</td>
                  <td className="px-3 py-2 text-slate-500">{portfolioItem.ticker || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{portfolioItem.tipoActivo}</td>
                  <td className="px-3 py-2 text-right font-medium">{portfolioItem.porcentaje}%</td>
                  <td className="px-3 py-2">
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        await fetch("/api/portfolios", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "deleteItem", id: portfolioItem.id }),
                        });
                        load();
                      }}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {currentTemplate.items.length > 0 && (
            <Button variant="outline" onClick={() => setVerSimulacion((v) => !v)}>
              {verSimulacion ? "Ocultar simulación" : "Ver simulación histórica 2021–2025"}
            </Button>
          )}

          {verSimulacion && currentTemplate.items.length > 0 && (
            <SimulacionHistorica items={currentTemplate.items.map((i) => ({ activoNombre: i.activoNombre, porcentaje: i.porcentaje }))} />
          )}
        </>
      )}
    </section>
  );
}

function CrmTab() {
  const [threshold, setThreshold] = useState(30000);
  const [asesor, setAsesor] = useState("");
  const [onlyVencidos, setOnlyVencidos] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CRMRow[]>([]);
  const [asesores, setAsesores] = useState<string[]>([]);
  const [editing, setEditing] = useState<CRMRow | null>(null);

  const load = () => {
    fetch(`/api/crm-clients?threshold=${threshold}&asesor=${encodeURIComponent(asesor)}&onlyVencidos=${onlyVencidos ? 1 : 0}&q=${encodeURIComponent(q)}`)
      .then((response) => response.json())
      .then((payload: CRMResponse) => {
        setRows(payload.rows ?? []);
        setAsesores(payload.asesores ?? []);
        if (typeof payload.threshold === "number") setThreshold(payload.threshold);
      });
  };

  useEffect(load, [threshold, asesor, onlyVencidos, q]);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">CRM – Informes a clientes</h2>

      <div className="flex gap-2 items-center">
        <Input
          type="number"
          min={20000}
          max={100000}
          value={threshold}
          onChange={(event) => setThreshold(Number(event.target.value || 30000))}
        />

        <Select value={asesor} onChange={(event) => setAsesor(event.target.value)}>
          <option value="">Todos los asesores</option>
          {asesores.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>

        <label className="flex gap-1 text-sm">
          <input type="checkbox" checked={onlyVencidos} onChange={(event) => setOnlyVencidos(event.target.checked)} />
          Solo vencidos
        </label>

        <Input placeholder="Buscar por nombre" value={q} onChange={(event) => setQ(event.target.value)} />
      </div>

      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-left">
            <th className="px-3 py-2 font-semibold">Nombre</th>
            <th className="px-3 py-2 font-semibold">Asesor</th>
            <th className="px-3 py-2 font-semibold">Patrimonio USD</th>
            <th className="px-3 py-2 font-semibold">Último informe</th>
            <th className="px-3 py-2 font-semibold">Días desde último envío</th>
            <th className="px-3 py-2 font-semibold">Estado</th>
            <th className="px-3 py-2 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.externalId} className={`border-t ${row.estado === "VENCIDO" ? "bg-red-50" : ""}`}>
              <td>{row.nombre}</td>
              <td>{row.asesor || "-"}</td>
              <td>USD {Number(row.patrimonioUSD).toLocaleString("es-AR")}</td>
              <td>{row.lastReportSentAt ? new Date(row.lastReportSentAt).toLocaleDateString("es-AR") : "-"}</td>
              <td>{row.daysSinceLastReport}</td>
              <td>
                <Badge className={row.estado === "VENCIDO" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>{row.estado}</Badge>
              </td>
              <td className="space-x-1">
                <Button
                  onClick={async () => {
                    await fetch("/api/crm-status", {
                      method: "POST",
                      body: JSON.stringify({
                        clientExternalId: row.externalId,
                        clientName: row.nombre,
                        lastReportSentAt: new Date().toISOString(),
                        notes: row.notes,
                      }),
                    });
                    load();
                  }}
                >
                  Marcar enviado hoy
                </Button>
                <Button variant="outline" onClick={() => setEditing(row)}>
                  Editar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="fixed inset-0 bg-black/35 grid place-items-center" onClick={() => setEditing(null)}>
          <div className="bg-white p-4 rounded w-[540px]" onClick={(event) => event.stopPropagation()}>
            <h4 className="font-semibold mb-2">Editar seguimiento de informe</h4>
            <Input
              type="date"
              value={editing.lastReportSentAt ? new Date(editing.lastReportSentAt).toISOString().slice(0, 10) : ""}
              onChange={(event) => setEditing({ ...editing, lastReportSentAt: event.target.value || null })}
            />
            <Textarea
              className="mt-2"
              rows={4}
              value={editing.notes || ""}
              onChange={(event) => setEditing({ ...editing, notes: event.target.value })}
            />
            <Button
              className="mt-2"
              onClick={async () => {
                await fetch("/api/crm-status", {
                  method: "POST",
                  body: JSON.stringify({
                    clientExternalId: editing.externalId,
                    clientName: editing.nombre,
                    lastReportSentAt: editing.lastReportSentAt,
                    notes: editing.notes,
                  }),
                });
                setEditing(null);
                load();
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}


function MercadoTab() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const response = await fetch("/api/market-quotes", { cache: "no-store" });
      const payload = (await response.json()) as MarketResponse;
      if (!response.ok) {
        setError(payload?.error || "No se pudieron cargar las cotizaciones.");
        return;
      }
      setQuotes(payload.quotes || []);
      setUpdatedAt(payload.updatedAt || "");
    } catch {
      setError("No se pudieron cargar las cotizaciones.");
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const etfs = quotes.filter((q) => ["SPY", "QQQ", "IWM", "GC=F", "FXI", "EEM"].includes(q.symbol));
  const mag7 = quotes.filter((q) => ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"].includes(q.symbol));
  const adrs = quotes.filter((q) => ["GGAL", "BMA", "YPF", "MELI", "PAM", "TGS", "CEPU", "LOMA", "BIOX", "GLOB", "DESP", "VIST", "TEO", "IRS"].includes(q.symbol));

  const QuoteCard = ({ quote }: { quote: MarketQuote }) => {
    const positive = typeof quote.change === "number" && quote.change >= 0;
    const hasData = quote.price !== null;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{quote.symbol}</span>
          {hasData && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
              {positive ? "▲" : "▼"} {quote.changePercent !== null ? `${Math.abs(quote.changePercent).toFixed(2)}%` : ""}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400 truncate">{quote.name}</p>
        <p className="text-xl font-bold text-slate-800">
          {quote.price !== null ? `$${Number(quote.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
        </p>
        {hasData && quote.change !== null && (
          <p className={`text-xs font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}>
            {positive ? "+" : ""}{quote.change.toFixed(2)} hoy
          </p>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Mercado</h2>
          {updatedAt && (
            <p className="text-xs text-slate-400 mt-0.5">Actualizado: {new Date(updatedAt).toLocaleString("es-AR")}</p>
          )}
        </div>
        <Button variant="outline" onClick={load}>Actualizar</Button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">ETFs e Índices</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {etfs.map((quote) => <QuoteCard key={quote.symbol} quote={quote} />)}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Magnificent 7</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {mag7.map((quote) => <QuoteCard key={quote.symbol} quote={quote} />)}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">ADRs Argentinos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {adrs.map((quote) => <QuoteCard key={quote.symbol} quote={quote} />)}
        </div>
      </div>
    </section>
  );
}

const INSTRUMENTOS = [
  { nombre: "PIMCO LOW DURATION INCOME FUND", isin: "IE00BDT57T44", tipo: "BONOS INV. GRADE" },
  { nombre: "BARINGS GLOBAL SECURES BONDS", isin: "IE00BK71B469", tipo: "BONOS HIGH YIELD" },
  { nombre: "BSF Emerging Markets Short Duration Bond Fund A2 USD", isin: "LU1706559744", tipo: "BONOS EMERGENTES" },
  { nombre: "Barings Private Credit Corporation (BPCC)", isin: "XS2658535799", tipo: "CREDITO PRIVADO" },
  { nombre: "Neuberguer Global Equity MEGATRENDS", isin: "IE00BFMHRM44", tipo: "ACCIONES" },
  { nombre: "Man Global Investment", isin: "IE000GDY7UP9", tipo: "BONOS DISCRESIONAL" },
  { nombre: "Robeco BP US Premium Equities D USD", isin: "LU0226953718", tipo: "EQUITY VALUE" },
];

function InstrumentosTab() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">Instrumentos</h2>
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-left">
            <th className="px-3 py-2 font-semibold">Nombre</th>
            <th className="px-3 py-2 font-semibold">ISIN</th>
            <th className="px-3 py-2 font-semibold">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {INSTRUMENTOS.map((inst) => (
            <tr key={inst.isin} className="border-t hover:bg-slate-50">
              <td className="px-3 py-2 font-medium">{inst.nombre}</td>
              <td className="px-3 py-2 font-mono text-slate-500">{inst.isin}</td>
              <td className="px-3 py-2">
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700">{inst.tipo}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

type NewsItem = { title: string; source: string; link: string; pubDate: string; age: string };
type NewsResponse = { items: NewsItem[]; updatedAt: string; error?: string };

const SOURCE_STYLES: Record<string, string> = {
  "Yahoo Finance": "bg-purple-50 text-purple-700 border-purple-200",
  "Reuters":       "bg-orange-50 text-orange-700 border-orange-200",
  "CNBC":          "bg-blue-50 text-blue-700 border-blue-200",
  "MarketWatch":   "bg-green-50 text-green-700 border-green-200",
};

function NoticiasTab() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/news");
      const data = (await res.json()) as NewsResponse;
      if (data.error) { setError(data.error); return; }
      setItems(data.items ?? []);
      setUpdatedAt(data.updatedAt ?? "");
    } catch {
      setError("No se pudieron cargar las noticias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Market News</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : "Loading..."}
            {" · "}Last 48 hours · Yahoo Finance, Reuters, CNBC, MarketWatch
          </p>
        </div>
        <Button variant="outline" onClick={load}>Refresh</Button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 animate-pulse space-y-2">
              <div className="h-3 bg-slate-100 rounded w-1/4" />
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SOURCE_STYLES[item.source] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                  {item.source}
                </span>
                <span className="text-xs text-slate-400">{item.age}</span>
              </div>
              <p className="font-medium text-slate-800 leading-snug text-sm flex-1 group-hover:text-blue-700 transition-colors">
                {item.title}
              </p>
              <div className="flex items-center gap-1 mt-3 text-xs text-blue-500 font-medium">
                Read more <span>→</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <p className="text-sm text-slate-400 text-center py-8">No recent news found in the last 48 hours.</p>
      )}
    </section>
  );
}

// ─── TIRs ────────────────────────────────────────────────────────────────────

type BondRow = {
  ticker: string;
  lastPrice: number | null;
  tirLast: number | null;
  bidQty: number | null;
  bidPx: number | null;
  yBid: number | null;
  yAsk: number | null;
  askPx: number | null;
  askQty: number | null;
  volume: number | null;
  error: string | null;
};

type YieldsResponse = {
  results: BondRow[];
  updatedAt: string;
  error?: string;
};

type Yields2Response = YieldsResponse & {
  mepRatio: number;
  al30ARS: number;
  al30DUSD: number;
};

const VENCIMIENTOS: Record<string, string> = {
  AFCID: "07/11/2026", ARC1D: "01/08/2031", BACGD: "23/06/2029", BGC4D: "13/11/2026",
  BYCHD: "10/10/2028", BYCVD: "31/08/2026", CAC5D: "25/08/2028", CS38D: "03/03/2026",
  CS47D: "15/11/2028", DNC3D: "22/11/2026", GN43D: "08/03/2027", IRCFD: "22/06/2028",
  IRCLD: "10/06/2026", IRCND: "23/10/2027", IRCOD: "23/10/2029", LOC3D: "11/03/2026",
  MGCND: "04/10/2028", MGCQD: "06/08/2028", PN35D: "27/09/2029", PN38D: "11/08/2027",
  PN42D: "17/04/2027", RC2CD: "06/10/2026", RCCRD: "09/05/2027", T662D: "31/08/2026",
  TLC1D: "18/07/2026", TLCMD: "18/07/2031", TLCOD: "28/11/2028", TLCQD: "02/07/2027",
  VBC1D: "11/03/2027", VBC2D: "05/09/2026", VSCOD: "06/03/2027", VSCPD: "22/11/2029",
  VSCWD: "-", YFCKD: "21/11/2026", YFCLD: "21/11/2028", YM37D: "07/05/2027",
  YMCID: "30/06/2029", YMCVD: "28/05/2026", YMCYD: "10/10/2028",
};

const TICKERS_YIELDS = [
  "AFCID", "ARC1D", "BACGD", "BGC4D", "BYCHD", "BYCVD", "CAC5D", "CS38D", "CS47D", "DNC3D",
  "GN43D", "IRCFD", "IRCLD", "IRCND", "IRCOD", "LOC3D", "MGCND", "MGCQD", "PN35D", "PN38D",
  "PN42D", "RC2CD", "RCCRD", "T662D", "TLC1D", "TLCMD", "TLCOD", "TLCQD", "VBC1D", "VBC2D",
  "VSCOD", "VSCPD", "VSCWD", "YFCKD", "YFCLD", "YM37D", "YMCID", "YMCVD", "YMCYD",
].map((ticker) => ({ ticker, type: "BONOS", settlement: "A-24HS" }));

const TICKERS_YIELDS2 = [
  "AFCIO", "ARC1O", "BACGO", "BGC4O", "BYCHO", "BYCVO", "CAC5O", "CS38O", "CS47O", "DNC3O",
  "GN43O", "IRCFO", "IRCLO", "IRCNO", "IRCOO", "LOC3O", "MGCNO", "MGCQO", "PN35O", "PN38O",
  "PN42O", "RC2CO", "RCCRO", "T662O", "TLC1O", "TLCMO", "TLCOO", "TLCQO", "VBC1O", "VBC2O",
  "VSCOO", "VSCPO", "VSCWO", "YFCKO", "YFCLO", "YM37O", "YMCIO", "YMCVO", "YMCYO",
].map((ticker) => ({ ticker, type: "BONOS", settlement: "A-24HS" }));

function fmtPrice(v: number | null) {
  if (v === null) return "-";
  return v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtYield(v: number | null) {
  if (v === null) return "-";
  const pct = v * 100;
  return `${pct.toFixed(2)}%`;
}

function fmtQty(v: number | null) {
  if (v === null) return "-";
  return v.toLocaleString("es-AR");
}

function BondsTable({ rows, getVencimiento }: { rows: BondRow[]; getVencimiento: (ticker: string) => string }) {
  const headers = [
    "TICKER", "ÚLTIMO", "TIR ÚLTIMO",
    "CANT COMPRA", "PRECIO COMPRA", "YIELD COMPRA",
    "YIELD VENTA", "PRECIO VENTA", "CANT VENTA",
    "VOLUMEN", "VENCIMIENTO",
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-right">
            <th className="px-3 py-2 font-semibold text-left">TICKER</th>
            {headers.slice(1).map((h) => (
              <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ticker} className="border-t hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 font-semibold text-slate-800">{row.ticker}</td>
              {row.error ? (
                <td colSpan={10} className="px-3 py-2 text-red-500 text-xs">{row.error}</td>
              ) : (
                <>
                  <td className="px-3 py-2 text-right">{fmtPrice(row.lastPrice)}</td>
                  <td className="px-3 py-2 text-right font-medium text-blue-700">{fmtYield(row.tirLast)}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{fmtQty(row.bidQty)}</td>
                  <td className="px-3 py-2 text-right">{fmtPrice(row.bidPx)}</td>
                  <td className={`px-3 py-2 text-right font-medium ${row.yBid != null && row.yBid <= 0.05 ? "text-red-600" : "text-slate-700"}`}>{fmtYield(row.yBid)}</td>
                  <td className={`px-3 py-2 text-right font-medium ${row.yAsk != null && row.yAsk > 0.06 ? "text-emerald-700" : "text-slate-700"}`}>{fmtYield(row.yAsk)}</td>
                  <td className="px-3 py-2 text-right">{fmtPrice(row.askPx)}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{fmtQty(row.askQty)}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{fmtQty(row.volume)}</td>
                  <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">{getVencimiento(row.ticker)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TirsTab() {
  const [yields, setYieldsState] = useState<YieldsResponse | null>(() => {
    try {
      const stored = localStorage.getItem("tirs_yields");
      return stored ? (JSON.parse(stored) as YieldsResponse) : null;
    } catch { return null; }
  });
  const [yields2, setYields2State] = useState<Yields2Response | null>(() => {
    try {
      const stored = localStorage.getItem("tirs_yields2");
      return stored ? (JSON.parse(stored) as Yields2Response) : null;
    } catch { return null; }
  });
  const [loadingYields, setLoadingYields] = useState(false);
  const [loadingYields2, setLoadingYields2] = useState(false);
  const [errorYields, setErrorYields] = useState<string | null>(null);
  const [errorYields2, setErrorYields2] = useState<string | null>(null);

  function setYields(data: YieldsResponse) {
    try { localStorage.setItem("tirs_yields", JSON.stringify(data)); } catch { /* ignore */ }
    setYieldsState(data);
  }

  function setYields2(data: Yields2Response) {
    try { localStorage.setItem("tirs_yields2", JSON.stringify(data)); } catch { /* ignore */ }
    setYields2State(data);
  }

  async function fetchYields() {
    setLoadingYields(true);
    setErrorYields(null);
    try {
      const res = await fetch("/api/yields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: TICKERS_YIELDS }),
      });
      const data = (await res.json()) as YieldsResponse;
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setYields(data);
    } catch (err) {
      setErrorYields(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoadingYields(false);
    }
  }

  async function fetchYields2() {
    setLoadingYields2(true);
    setErrorYields2(null);
    try {
      const res = await fetch("/api/yields2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: TICKERS_YIELDS2 }),
      });
      const data = (await res.json()) as Yields2Response;
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setYields2(data);
    } catch (err) {
      setErrorYields2(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoadingYields2(false);
    }
  }

  return (
    <section className="space-y-8">
      <h2 className="text-xl font-bold text-slate-800">TIRs de Bonos</h2>

      {/* Yields */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-700">Yields</h3>
            {yields?.updatedAt && (
              <p className="text-xs text-slate-400 mt-0.5">
                Actualizado {new Date(yields.updatedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={fetchYields} disabled={loadingYields}>
            {loadingYields ? "Cargando…" : "Actualizar Yields"}
          </Button>
        </div>

        {errorYields && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorYields}</p>
        )}

        {yields?.results ? (
          <BondsTable rows={yields.results} getVencimiento={(t) => VENCIMIENTOS[t] ?? "-"} />
        ) : (
          !loadingYields && (
            <p className="text-sm text-slate-400 text-center py-8 border border-dashed rounded-lg">
              Presioná &quot;Actualizar Yields&quot; para cargar los datos.
            </p>
          )
        )}

        {loadingYields && (
          <div className="space-y-2">
            {TICKERS_YIELDS.map((t) => (
              <div key={t.ticker} className="h-8 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        )}
      </div>

      {/* Yields2 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-700">Yields2 (precio ajustado por ratio MEP: AL30 / AL30D)</h3>
            {yields2?.updatedAt && (
              <p className="text-xs text-slate-400 mt-0.5">
                Actualizado {new Date(yields2.updatedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                {yields2.mepRatio != null && (
                  <> · Ratio MEP: <span className="font-medium text-slate-600">{yields2.mepRatio.toFixed(2)}</span> (AL30 ${yields2.al30ARS?.toFixed(2)} / AL30D ${yields2.al30DUSD?.toFixed(2)})</>
                )}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={fetchYields2} disabled={loadingYields2}>
            {loadingYields2 ? "Cargando…" : "Actualizar Yields2"}
          </Button>
        </div>

        {errorYields2 && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorYields2}</p>
        )}

        {yields2?.results ? (
          <BondsTable rows={yields2.results} getVencimiento={(t) => VENCIMIENTOS[t.slice(0, -1) + "D"] ?? "-"} />
        ) : (
          !loadingYields2 && (
            <p className="text-sm text-slate-400 text-center py-8 border border-dashed rounded-lg">
              Presioná &quot;Actualizar Yields2&quot; para cargar los datos.
            </p>
          )
        )}

        {loadingYields2 && (
          <div className="space-y-2">
            {TICKERS_YIELDS2.map((t) => (
              <div key={t.ticker} className="h-8 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
