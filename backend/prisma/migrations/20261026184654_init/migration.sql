-- CreateTable
CREATE TABLE "HistoricalPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "folio" TEXT NOT NULL,
    "policyNumber" TEXT,
    "ramo" TEXT NOT NULL,
    "status" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "source" TEXT NOT NULL DEFAULT 'CSV',
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoricalPolicy_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalPolicy_folio_key" ON "HistoricalPolicy"("folio");
