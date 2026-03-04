import { existsSync, readFileSync } from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { addYears, differenceInCalendarDays, format, isValid, parse as parseDateFns, parseISO } from "date-fns";

type Row = Record<string, string | undefined>;

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BIRTHDAY_FILES = [
  // Estructura principal del repo
  path.join(process.cwd(), "data", "cumpleaños.csv"),
  path.join(process.cwd(), "data", "cumpleanos.csv"),
  // Compatibilidad con nombres anteriores
  "/mnt/data/cumpleaños.xlsx.csv",
  "/mnt/data/cumpleaños.xlsx.csv",
  path.join(process.cwd(), "data", "cumpleaños.xlsx.csv"),
  path.join(process.cwd(), "data", "cumpleaños.xlsx.csv"),
];
const DEFAULT_CLIENT_FILES = [
  // Estructura principal del repo
  path.join(process.cwd(), "data", "clientes.csv"),
  // Compatibilidad con nombres anteriores
  "/mnt/data/inviu-listado-clientes.xlsx - -listado-clientes-cval.csv",
  path.join(process.cwd(), "data", "inviu-listado-clientes.xlsx - -listado-clientes-cval.csv"),
];

function normalizeHeader(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanValue(value: string | undefined) {
  return String(value ?? "").trim();
}

function resolveCsvPath(envPath: string | undefined, fallbacks: string[]) {
  const candidates = [envPath, ...fallbacks].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`No se encontró archivo CSV. Intentados: ${candidates.join(", ")}`);
}

function loadCsvRows(filePath: string): Row[] {
  const content = readFileSync(filePath, "utf8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
    relax_column_count: true,
  }) as Row[];
}

function normalizeRow(raw: Row) {
  const row: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    row[normalizeHeader(key)] = cleanValue(value);
  }
  return row;
}

function pickFirst(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    if (row[normalizedAlias]) return row[normalizedAlias];
  }
  return "";
}

function findContaining(row: Record<string, string>, aliases: string[]) {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    if (!value) continue;
    if (aliases.some((alias) => key.includes(normalizeHeader(alias)))) return value;
  }
  return "";
}

function parseDateFlexible(value: string) {
  if (!value) return null;

  const iso = parseISO(value);
  if (isValid(iso)) return iso;

  const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "d-M-yyyy"];
  for (const fmt of formats) {
    const parsed = parseDateFns(value, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }

  return null;
}

function parseMoneyToNumber(raw: string | undefined) {
  const value = cleanValue(raw);
  if (!value) return 0;

  const stripped = value
    .replace(/usd|u\$s|ars|\$/gi, "")
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "");

  if (!stripped) return 0;

  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");

  let normalized = stripped;
  if (lastComma > lastDot) {
    normalized = stripped.replace(/\./g, "").replace(/,/g, ".");
  } else if (lastDot > lastComma) {
    normalized = stripped.replace(/,/g, "");
  } else {
    normalized = stripped.replace(/,/g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type BirthdayItem = {
  externalId: string;
  nombre: string;
  asesor: string;
  telefono: string;
  patrimonioUSD: number;
  fechaCumple: Date;
  fechaLabel: string;
  diasFaltantes: number;
};

let birthdayCache: { loadedAt: number; rows: BirthdayItem[] } | null = null;

export function getBirthdaysData() {
  if (birthdayCache && Date.now() - birthdayCache.loadedAt < DAY_MS) return birthdayCache.rows;

  const filePath = resolveCsvPath(process.env.BIRTHDAYS_CSV_PATH, DEFAULT_BIRTHDAY_FILES);
  const rows = loadCsvRows(filePath)
    .map(normalizeRow)
    .map((row) => {
      const nombre = pickFirst(row, ["nombre", "cliente"]);
      const externalId = pickFirst(row, ["n cliente", "nro cliente", "numero cliente", "cliente id"]);
      const asesor = pickFirst(row, ["asesor"]);
      const telefono = pickFirst(row, ["telefono", "telefono celular", "celular", "cel"]);
      const birthRaw = pickFirst(row, ["fecha de nacimiento", "cumpleanos", "cumpleanos 1"]);
      const patrimonioUSD = parseMoneyToNumber(findContaining(row, ["patrimonio usd", "patrimonio", "patrimonio en usd"]));
      const birthDate = parseDateFlexible(birthRaw);

      if (!nombre || !birthDate) return null;

      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      let nextBirthday = new Date(todayDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      if (nextBirthday < todayDate) nextBirthday = addYears(nextBirthday, 1);

      return {
        externalId: externalId || nombre.toLowerCase().replace(/\s+/g, "-"),
        nombre,
        asesor,
        telefono,
        patrimonioUSD,
        fechaCumple: nextBirthday,
        fechaLabel: format(nextBirthday, "dd/MM"),
        diasFaltantes: differenceInCalendarDays(nextBirthday, todayDate),
      } as BirthdayItem;
    })
    .filter(Boolean) as BirthdayItem[];

  birthdayCache = { loadedAt: Date.now(), rows };
  return rows;
}

export type CRMClientRow = {
  externalId: string;
  nombre: string;
  asesor: string;
  contacto: string;
  patrimonioUSD: number;
};

let clientsCache: { loadedAt: number; rows: CRMClientRow[] } | null = null;

export function getClientsCSVData() {
  if (clientsCache && Date.now() - clientsCache.loadedAt < DAY_MS) return clientsCache.rows;

  const filePath = resolveCsvPath(process.env.CLIENTS_CSV_PATH, DEFAULT_CLIENT_FILES);
  const rows = loadCsvRows(filePath)
    .map(normalizeRow)
    .map((row) => {
      const nombre = pickFirst(row, ["nombre", "cliente", "razon social"]);
      if (!nombre) return null;

      const externalId =
        pickFirst(row, ["n cliente", "nro cliente", "numero cliente", "cliente id"]) ||
        nombre.toLowerCase().replace(/\s+/g, "-");
      const asesor = pickFirst(row, ["asesor", "advisor"]);
      const telefono = pickFirst(row, ["telefono", "celular", "cel"]);
      const email = pickFirst(row, ["email", "mail", "correo"]);
      const patrimonioUSD = parseMoneyToNumber(findContaining(row, ["patrimonio usd", "patrimonio en usd", "patrimonio"]));

      return {
        externalId,
        nombre,
        asesor,
        contacto: telefono || email,
        patrimonioUSD,
      } as CRMClientRow;
    })
    .filter(Boolean) as CRMClientRow[];

  clientsCache = { loadedAt: Date.now(), rows };
  return rows;
}
