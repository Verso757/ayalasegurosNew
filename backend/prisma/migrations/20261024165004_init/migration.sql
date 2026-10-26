-- CreateTable
CREATE TABLE "UserRamo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ramo" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRamo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRamo_userId_ramo_key" ON "UserRamo"("userId", "ramo");
