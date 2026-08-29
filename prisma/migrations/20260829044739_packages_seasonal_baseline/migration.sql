-- AlterTable
ALTER TABLE `PackagesPageContent` ADD COLUMN `seasonalBaselineEarlyRainy` DOUBLE NOT NULL DEFAULT 16.5,
    ADD COLUMN `seasonalBaselineRainy` DOUBLE NOT NULL DEFAULT 13,
    ADD COLUMN `seasonalBaselineSummer` DOUBLE NOT NULL DEFAULT 20,
    ADD COLUMN `seasonalBaselineWinter` DOUBLE NOT NULL DEFAULT 16;
