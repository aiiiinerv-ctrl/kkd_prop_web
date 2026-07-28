-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "lineId" TEXT,
    "province" TEXT NOT NULL,
    "buildingType" TEXT NOT NULL,
    "avgMonthlyBill" INTEGER,
    "locale" TEXT NOT NULL DEFAULT 'th',
    "sourceChannelId" TEXT,
    "autoSourceChannelId" TEXT,
    "autoSourceExecutiveId" TEXT,
    "assignedSalesId" TEXT,
    "lastFollowUpAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_sourceChannelId_fkey" FOREIGN KEY ("sourceChannelId") REFERENCES "PromoChannel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_autoSourceChannelId_fkey" FOREIGN KEY ("autoSourceChannelId") REFERENCES "PromoChannel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_autoSourceExecutiveId_fkey" FOREIGN KEY ("autoSourceExecutiveId") REFERENCES "ChannelExecutive" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_assignedSalesId_fkey" FOREIGN KEY ("assignedSalesId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("assignedSalesId", "avgMonthlyBill", "buildingType", "createdAt", "id", "lastFollowUpAt", "lineId", "locale", "name", "notes", "phone", "province", "sourceChannelId", "status", "type", "updatedAt") SELECT "assignedSalesId", "avgMonthlyBill", "buildingType", "createdAt", "id", "lastFollowUpAt", "lineId", "locale", "name", "notes", "phone", "province", "sourceChannelId", "status", "type", "updatedAt" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
