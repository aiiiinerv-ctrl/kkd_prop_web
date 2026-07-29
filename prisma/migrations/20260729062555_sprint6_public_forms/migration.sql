-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "buildingTypeOtherText" TEXT;
ALTER TABLE "Lead" ADD COLUMN "interestedSystems" JSONB;

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptpayId" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "updatedAt" DATETIME NOT NULL
);
