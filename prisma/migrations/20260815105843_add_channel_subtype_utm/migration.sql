-- AlterTable
ALTER TABLE `PromoChannel` ADD COLUMN `landingPath` VARCHAR(191) NOT NULL DEFAULT '/th/packages',
    ADD COLUMN `subType` VARCHAR(4) NULL,
    ADD COLUMN `utmCampaign` VARCHAR(60) NULL;
