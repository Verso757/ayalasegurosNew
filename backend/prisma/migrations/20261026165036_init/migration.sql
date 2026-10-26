-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ramo" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CatalogItem" ("active", "createdAt", "id", "name", "ramo", "type", "updatedAt") SELECT "active", "createdAt", "id", "name", coalesce("ramo", '') AS "ramo", "type", "updatedAt" FROM "CatalogItem";
DROP TABLE "CatalogItem";
ALTER TABLE "new_CatalogItem" RENAME TO "CatalogItem";
CREATE UNIQUE INDEX "CatalogItem_type_name_ramo_key" ON "CatalogItem"("type", "name", "ramo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
