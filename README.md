# Dashboard interno de asesoramiento financiero

SaaS interno en **Next.js 14 (App Router) + TypeScript + Tailwind + Prisma**.
Toda la interfaz está en español y cuenta con 4 módulos en sidebar:
1. Cumpleaños
2. Prospects
3. Propuestas de carteras
4. CRM – Informes a clientes

## Variables de entorno
Crear un archivo `.env`:

```bash
ADMIN_PASSWORD="tu_password_seguro"
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:./dev.db"

# Opcional: override de rutas CSV
# BIRTHDAYS_CSV_PATH="./data/cumpleaños.csv"
# CLIENTS_CSV_PATH="./data/clientes.csv"
```

### Producción en Vercel (Postgres)
En Vercel configurá:

```bash
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
```

> Recomendación: Vercel Postgres, Neon o Supabase.

## Instalación local
```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

Abrir: `http://localhost:3000`

## Deploy en Vercel
1. Subir repositorio a GitHub.
2. Importar proyecto en Vercel.
3. Definir variables: `ADMIN_PASSWORD`, `DATABASE_PROVIDER`, `DATABASE_URL`.
4. Ejecutar migraciones en deploy: `npx prisma migrate deploy`.

## Base de datos: ¿dónde la subo?
- **En desarrollo**: no subís nada, Prisma crea `dev.db` local (SQLite).
- **En producción**: usá una base **Postgres administrada** (Vercel Postgres / Neon / Supabase) y pegá el `DATABASE_URL` en Vercel.
- No subas `dev.db` al repo.

## Notas de CSV
La app busca por defecto (en este repo):
- `data/cumpleaños.csv`
- `data/clientes.csv`

Además mantiene compatibilidad con los nombres viejos en `/mnt/data/...`.

Si necesitás otra ubicación, seteá `BIRTHDAYS_CSV_PATH` y `CLIENTS_CSV_PATH`.

El parseo se hace server-side, normaliza headers (trim + case-insensitive + sin acentos), ignora columnas basura y cachea el resultado por 24h.
