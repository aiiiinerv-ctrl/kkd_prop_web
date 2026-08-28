-- AlterTable
ALTER TABLE `SiteSettings` ADD COLUMN `footerLogoKey` VARCHAR(191) NULL,
    ADD COLUMN `headerLogoKey` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PageBanner` (
    `id` VARCHAR(191) NOT NULL,
    `pageSlug` VARCHAR(40) NOT NULL,
    `mode` VARCHAR(10) NOT NULL DEFAULT 'OFF',
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PageBanner_pageSlug_key`(`pageSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageBannerSlide` (
    `id` VARCHAR(191) NOT NULL,
    `bannerId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `imageKey` VARCHAR(191) NOT NULL,
    `altTh` VARCHAR(191) NOT NULL,
    `altEn` VARCHAR(191) NOT NULL,
    `linkPath` VARCHAR(180) NULL,

    INDEX `PageBannerSlide_bannerId_sortOrder_idx`(`bannerId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PageBannerSlide` ADD CONSTRAINT `PageBannerSlide_bannerId_fkey` FOREIGN KEY (`bannerId`) REFERENCES `PageBanner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
