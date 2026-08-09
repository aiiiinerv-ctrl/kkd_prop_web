-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromoChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "refCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_PromoChannel" ("id", "isActive", "nameEn", "nameTh", "refCode", "slug", "sortOrder", "type") SELECT "id", "isActive", "nameEn", "nameTh", "refCode", "slug", "sortOrder", "type" FROM "PromoChannel";
DROP TABLE "PromoChannel";
ALTER TABLE "new_PromoChannel" RENAME TO "PromoChannel";
CREATE UNIQUE INDEX "PromoChannel_slug_key" ON "PromoChannel"("slug");
CREATE UNIQUE INDEX "PromoChannel_refCode_key" ON "PromoChannel"("refCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
