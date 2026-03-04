# Dashboard interno de asesoramiento financiero

Aplicación SaaS interna construida con **Next.js 14 (App Router) + TypeScript + Tailwind/shadcn-style UI + Prisma**.

## Funcionalidades
- Login simple con `ADMIN_PASSWORD` y cookie de sesión.
- Sidebar con módulos:
  1. Cumpleaños (desde CSV, próximos N días, filtro por asesor).
  2. Prospects (CRUD completo con filtros, edición y borrado).
  3. Propuestas de carteras (Conservadora/Moderada/Agresiva, CRUD de activos y PDF).
  4. CRM – Informes a clientes (merge CSV + DB para seguimiento semestral, vencidos primero).

## Variables de entorno
Crear `.env`:

```bash
ADMIN_PASSWORD="tu_password"
DATABASE_URL="file:./dev.db"
```

> En producción (Vercel + Postgres) usar `DATABASE_URL` de tu proveedor Postgres.

## Ejecutar local
```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

Abrir `http://localhost:3000`.

## Deploy en Vercel
1. Subir repo a GitHub.
2. Importar proyecto en Vercel.
3. Definir variables:
   - `ADMIN_PASSWORD`
   - `DATABASE_URL` (Postgres)
4. Ejecutar migraciones de Prisma en deploy (build command o CI):
   - `npx prisma migrate deploy`

## Base de datos
- Desarrollo local: SQLite (`dev.db`) generado automáticamente con Prisma.
- Producción: Postgres (cambiar `DATABASE_URL`).
- Tabla extra para CRM: `ClientReportStatus` guarda la fecha de último informe enviado por cliente.

## Notas de datos CSV
La app espera estos archivos en el filesystem:
- `/mnt/data/cumpleaños.xlsx.csv`
- `/mnt/data/inviu-listado-clientes.xlsx - -listado-clientes-cval.csv`

Se parsean server-side con cache en memoria diaria.
