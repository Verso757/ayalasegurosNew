-- CreateTable
CREATE TABLE "DocumentRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ramo" TEXT NOT NULL,
    "clientType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "RequestDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RequestDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequestDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "DocumentRequirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRequirement_ramo_clientType_name_key" ON "DocumentRequirement"("ramo", "clientType", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RequestDocument_requestId_requirementId_key" ON "RequestDocument"("requestId", "requirementId");
