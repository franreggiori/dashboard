-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "cargadoPor" TEXT NOT NULL,
    "fechaCarga" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "comentario" TEXT,
    "proximaAccionFecha" DATETIME,
    "proximaAccionNota" TEXT,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "PortfolioTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT
);

CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "activoNombre" TEXT NOT NULL,
    "ticker" TEXT,
    "tipoActivo" TEXT NOT NULL,
    "porcentaje" REAL NOT NULL,
    CONSTRAINT "PortfolioItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PortfolioTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ClientReportStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientExternalId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "lastReportSentAt" DATETIME,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "PortfolioTemplate_tipo_key" ON "PortfolioTemplate"("tipo");
CREATE UNIQUE INDEX "ClientReportStatus_clientExternalId_key" ON "ClientReportStatus"("clientExternalId");
