"use client";

import { useEffect, useMemo, useState } from "react";
import type { CargadoPor, PortfolioItem, PortfolioTemplate, Prospect } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TabKey = "cumples" | "prospects" | "carteras" | "crm" | "mercado" | "instrumentos";

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

function CarterasTab() {
  const [templates, setTemplates] = useState<PortfolioTemplateWithItems[]>([]);
  const [tipo, setTipo] = useState("CONSERVADORA");
  const [item, setItem] = useState({ activoNombre: "", ticker: "", tipoActivo: "RENTA_FIJA", porcentaje: 0 });

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
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Propuestas de carteras</h2>
      <div className="flex gap-2 items-center">
        {["CONSERVADORA", "MODERADA", "AGRESIVA"].map((portfolioType) => (
          <Button
            key={portfolioType}
            variant={tipo === portfolioType ? "default" : "outline"}
            onClick={() => setTipo(portfolioType)}
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

          <div className="grid grid-cols-5 gap-2">
            <Input placeholder="Activo" value={item.activoNombre} onChange={(event) => setItem({ ...item, activoNombre: event.target.value })} />
            <Input placeholder="Ticker (opcional)" value={item.ticker} onChange={(event) => setItem({ ...item, ticker: event.target.value })} />
            <Select value={item.tipoActivo} onChange={(event) => setItem({ ...item, tipoActivo: event.target.value })}>
              <option>RENTA_FIJA</option>
              <option>RENTA_VARIABLE</option>
            </Select>
            <Input type="number" min={0} max={100} value={item.porcentaje} onChange={(event) => setItem({ ...item, porcentaje: Number(event.target.value) })} />
            <Button
              onClick={async () => {
                if (!item.activoNombre.trim()) return;
                await fetch("/api/portfolios", {
                  method: "POST",
                  body: JSON.stringify({ action: "addItem", data: { ...item, activoNombre: item.activoNombre.trim(), templateId: currentTemplate.id } }),
                });
                setItem({ activoNombre: "", ticker: "", tipoActivo: "RENTA_FIJA", porcentaje: 0 });
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
                <th className="px-3 py-2 font-semibold">%</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {currentTemplate.items.map((portfolioItem) => (
                <tr className="border-t" key={portfolioItem.id}>
                  <td>{portfolioItem.activoNombre}</td>
                  <td>{portfolioItem.ticker || "-"}</td>
                  <td>{portfolioItem.tipoActivo}</td>
                  <td>{portfolioItem.porcentaje}</td>
                  <td>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        await fetch("/api/portfolios", {
                          method: "POST",
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
