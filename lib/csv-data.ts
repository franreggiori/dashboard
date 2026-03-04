import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { addYears, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

const BIRTHDAYS_PATH = "/mnt/data/cumpleaños.xlsx.csv";
const CLIENTS_PATH = "/mnt/data/inviu-listado-clientes.xlsx - -listado-clientes-cval.csv";

type Row = Record<string, string>;

function normalizeHeader(h: string) {
  return h.trim().toLowerCase();
}

function toNumber(raw: string | undefined) {
  if (!raw) return 0;
  const cleaned = raw.replace(/usd|\$/gi, "").replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export type BirthdayItem = {
  nombre: string;
  asesor: string;
  telefono: string;
  patrimonioUSD?: number;
  fechaCumple: Date;
  diasFaltantes: number;
  fechaLabel: string;
};

let birthdaysCache: { data: BirthdayItem[]; loadedAt: number } | null = null;
let clientsCache: { data: ClientCSV[]; loadedAt: number } | null = null;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getBirthdaysData() {
  if (birthdaysCache && Date.now() - birthdaysCache.loadedAt < DAY_MS) return birthdaysCache.data;
  const content = readFileSync(BIRTHDAYS_PATH, "utf8");
  const records: Row[] = parse(content, { columns: true, skip_empty_lines: true });
  const mapped = records
    .map((record) => {
      const normalized = Object.fromEntries(Object.entries(record).map(([k, v]) => [normalizeHeader(k), String(v ?? "").trim()]));
      const nombre = normalized["nombre"] || "";
      const asesor = normalized["asesor"] || "";
      const telefono = normalized["telefono"] || "";
      const fechaNacimiento = normalized["fecha de nacimiento"];
      const patrimonioUSD = toNumber(normalized["patrimonio usd"] || normalized["patrimonio"]);
      const birth = parseISO(fechaNacimiento);
      if (!nombre || !isValid(birth)) return null;
      const now = new Date();
      let next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
      if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next = addYears(next, 1);
      return {
        nombre,
        asesor,
        telefono,
        patrimonioUSD,
        fechaCumple: next,
        diasFaltantes: differenceInCalendarDays(next, new Date(now.getFullYear(), now.getMonth(), now.getDate())),
        fechaLabel: format(next, "dd/MM"),
      } as BirthdayItem;
    })
    .filter(Boolean) as BirthdayItem[];
  birthdaysCache = { data: mapped, loadedAt: Date.now() };
  return mapped;
}

export type ClientCSV = {
  externalId: string;
  nombre: string;
  asesor?: string;
  contacto?: string;
  patrimonioUSD: number;
};

function pickByKeys(row: Record<string, string>, keys: string[]) {
  const entries = Object.entries(row);
  for (const [k, v] of entries) {
    const nk = normalizeHeader(k);
    if (keys.some((kk) => nk.includes(kk))) return String(v ?? "").trim();
  }
  return "";
}

export function getClientsCSVData() {
  if (clientsCache && Date.now() - clientsCache.loadedAt < DAY_MS) return clientsCache.data;
  const content = readFileSync(CLIENTS_PATH, "utf8");
  const records: Row[] = parse(content, { columns: true, skip_empty_lines: true });
  const data = records
    .map((row) => {
      const nombre = pickByKeys(row, ["nombre", "cliente"]);
      const external = pickByKeys(row, ["n° cliente", "nro cliente", "cliente id"]);
      const asesor = pickByKeys(row, ["asesor"]);
      const telefono = pickByKeys(row, ["telefono", "teléfono", "cel"]);
      const email = pickByKeys(row, ["email", "mail"]);
      const patrimonioRaw = pickByKeys(row, ["patrimonio usd", "patrimonio en usd", "patrimonio"]);
      const patrimonioUSD = toNumber(patrimonioRaw);
      if (!nombre) return null;
      const externalId = external || nombre.toLowerCase().replace(/\s+/g, "-");
      return { externalId, nombre, asesor, contacto: telefono || email, patrimonioUSD };
    })
    .filter(Boolean) as ClientCSV[];
  clientsCache = { data, loadedAt: Date.now() };
  return data;
}
