/*
  Warnings:

  - Added the required column `refCode` to the `PromoChannel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingNumber` to the `SurveyBooking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ChannelExecutive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelExecutive_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "PromoChannel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingCapacitySetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maxPerDay" INTEGER NOT NULL DEFAULT 4,
    "maxPerSlot" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SALES',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AdminUser" ("createdAt", "email", "id", "isActive", "name", "passwordHash", "role", "updatedAt") SELECT "createdAt", "email", "id", "isActive", "name", "passwordHash", CASE WHEN "role" = 'EDITOR' THEN 'SALES' ELSE "role" END, "updatedAt" FROM "AdminUser";
DROP TABLE "AdminUser";
ALTER TABLE "new_AdminUser" RENAME TO "AdminUser";
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
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
    "assignedSalesId" TEXT,
    "lastFollowUpAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_sourceChannelId_fkey" FOREIGN KEY ("sourceChannelId") REFERENCES "PromoChannel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_assignedSalesId_fkey" FOREIGN KEY ("assignedSalesId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("avgMonthlyBill", "buildingType", "createdAt", "id", "lineId", "locale", "name", "notes", "phone", "province", "sourceChannelId", "status", "type", "updatedAt") SELECT "avgMonthlyBill", "buildingType", "createdAt", "id", "lineId", "locale", "name", "notes", "phone", "province", "sourceChannelId", CASE WHEN "status" = 'WON' THEN 'COMPLETED' WHEN "status" = 'LOST' THEN 'DISQUALIFIED' ELSE "status" END, "type", "updatedAt" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE TABLE "new_PromoChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "refCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_PromoChannel" ("id", "isActive", "nameEn", "nameTh", "slug", "sortOrder", "refCode") SELECT "id", "isActive", "nameEn", "nameTh", "slug", "sortOrder", 'CH' || printf('%03d', ROW_NUMBER() OVER (ORDER BY "sortOrder", rowid)) FROM "PromoChannel";
DROP TABLE "PromoChannel";
ALTER TABLE "new_PromoChannel" RENAME TO "PromoChannel";
CREATE UNIQUE INDEX "PromoChannel_slug_key" ON "PromoChannel"("slug");
CREATE UNIQUE INDEX "PromoChannel_refCode_key" ON "PromoChannel"("refCode");
CREATE TABLE "new_SurveyBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "preferredDate" DATETIME NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "amountThb" INTEGER NOT NULL DEFAULT 199,
    "paymentSlipKey" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "status" TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "giftSent" BOOLEAN NOT NULL DEFAULT false,
    "assignedEngineerId" TEXT,
    "assignedSalesId" TEXT,
    CONSTRAINT "SurveyBooking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SurveyBooking_assignedEngineerId_fkey" FOREIGN KEY ("assignedEngineerId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SurveyBooking_assignedSalesId_fkey" FOREIGN KEY ("assignedSalesId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SurveyBooking" ("address", "amountThb", "id", "leadId", "paymentSlipKey", "paymentStatus", "preferredDate", "timeSlot", "bookingNumber") SELECT "address", "amountThb", "id", "leadId", "paymentSlipKey", "paymentStatus", "preferredDate", "timeSlot", 'KKD-' || strftime('%Y%m%d', "preferredDate") || '-' || printf('%03d', ROW_NUMBER() OVER (PARTITION BY strftime('%Y%m%d', "preferredDate") ORDER BY rowid)) FROM "SurveyBooking";
DROP TABLE "SurveyBooking";
ALTER TABLE "new_SurveyBooking" RENAME TO "SurveyBooking";
CREATE UNIQUE INDEX "SurveyBooking_leadId_key" ON "SurveyBooking"("leadId");
CREATE UNIQUE INDEX "SurveyBooking_bookingNumber_key" ON "SurveyBooking"("bookingNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ChannelExecutive_refCode_key" ON "ChannelExecutive"("refCode");
