-- AlterTable
ALTER TABLE `CalculatorConfig` ADD COLUMN `hybridSizeTable` JSON NULL;

-- AlterTable
ALTER TABLE `CalculatorImport` ADD COLUMN `hybridRows` JSON NULL;

-- AlterTable
ALTER TABLE `Lead` ADD COLUMN `interestedBatteryKwh` INTEGER NULL;
