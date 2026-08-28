-- Idempotent production DDL: page banners + site logos (#107)
-- phpMyAdmin → database kkdprop1_kkdproperty → SQL tab
-- Safe to re-run. Verify after:
--   SHOW COLUMNS FROM `SiteSettings` LIKE 'headerLogoKey';
--   SHOW TABLES LIKE 'PageBanner';

-- SiteSettings logo columns (MariaDB 10.3+)
ALTER TABLE `SiteSettings`
  ADD COLUMN IF NOT EXISTS `headerLogoKey` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `footerLogoKey` VARCHAR(191) NULL;

CREATE TABLE IF NOT EXISTS `PageBanner` (
    `id` VARCHAR(191) NOT NULL,
    `pageSlug` VARCHAR(40) NOT NULL,
    `mode` VARCHAR(10) NOT NULL DEFAULT 'OFF',
    `version` INT NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PageBanner_pageSlug_key`(`pageSlug`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PageBannerSlide` (
    `id` VARCHAR(191) NOT NULL,
    `bannerId` VARCHAR(191) NOT NULL,
    `sortOrder` INT NOT NULL DEFAULT 0,
    `imageKey` VARCHAR(191) NOT NULL,
    `altTh` VARCHAR(191) NOT NULL,
    `altEn` VARCHAR(191) NOT NULL,
    `linkPath` VARCHAR(180) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    INDEX `PageBannerSlide_bannerId_sortOrder_idx`(`bannerId`, `sortOrder`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FK only if missing (run once; ignore error if FK already exists)
ALTER TABLE `PageBannerSlide`
  ADD CONSTRAINT `PageBannerSlide_bannerId_fkey`
  FOREIGN KEY (`bannerId`) REFERENCES `PageBanner`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Slide visibility toggle (#117) — safe on existing prod tables
ALTER TABLE `PageBannerSlide`
  ADD COLUMN IF NOT EXISTS `isActive` BOOLEAN NOT NULL DEFAULT true;
