-- AlterTable
ALTER TABLE `AboutContent` ADD COLUMN `key` VARCHAR(40) NOT NULL DEFAULT 'about',
    ADD COLUMN `showCredentials` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showGlobalCta` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showStats` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showTeam` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showTestimonials` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `statsCustomersLabelEn` VARCHAR(191) NULL,
    ADD COLUMN `statsCustomersLabelTh` VARCHAR(191) NULL,
    ADD COLUMN `statsEngineersLabelEn` VARCHAR(191) NULL,
    ADD COLUMN `statsEngineersLabelTh` VARCHAR(191) NULL,
    ADD COLUMN `statsProjectsLabelEn` VARCHAR(191) NULL,
    ADD COLUMN `statsProjectsLabelTh` VARCHAR(191) NULL,
    ADD COLUMN `statsYearsLabelEn` VARCHAR(191) NULL,
    ADD COLUMN `statsYearsLabelTh` VARCHAR(191) NULL,
    ADD COLUMN `testimonialsSubtitleEn` TEXT NULL,
    ADD COLUMN `testimonialsSubtitleTh` TEXT NULL,
    ADD COLUMN `testimonialsTitleEn` VARCHAR(191) NULL,
    ADD COLUMN `testimonialsTitleTh` VARCHAR(191) NULL,
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `PageSeo` ADD COLUMN `canonicalPathEn` VARCHAR(191) NULL,
    ADD COLUMN `canonicalPathTh` VARCHAR(191) NULL,
    ADD COLUMN `ogDescriptionEn` TEXT NULL,
    ADD COLUMN `ogDescriptionTh` TEXT NULL,
    ADD COLUMN `ogTitleEn` VARCHAR(191) NULL,
    ADD COLUMN `ogTitleTh` VARCHAR(191) NULL,
    ADD COLUMN `robotsFollow` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `robotsIndex` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `SiteSettings` ADD COLUMN `ctaPrimaryLabelEn` VARCHAR(191) NULL,
    ADD COLUMN `ctaPrimaryLabelTh` VARCHAR(191) NULL,
    ADD COLUMN `ctaSecondaryLabelEn` VARCHAR(191) NULL,
    ADD COLUMN `ctaSecondaryLabelTh` VARCHAR(191) NULL,
    ADD COLUMN `ctaSubtitleEn` TEXT NULL,
    ADD COLUMN `ctaSubtitleTh` TEXT NULL,
    ADD COLUMN `ctaTitleEn` VARCHAR(191) NULL,
    ADD COLUMN `ctaTitleTh` VARCHAR(191) NULL,
    ADD COLUMN `ctaVersion` INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `AboutFeaturedTestimonial` (
    `id` VARCHAR(191) NOT NULL,
    `aboutContentId` VARCHAR(191) NOT NULL,
    `testimonialId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL,

    UNIQUE INDEX `AboutFeaturedTestimonial_aboutContentId_testimonialId_key`(`aboutContentId`, `testimonialId`),
    UNIQUE INDEX `AboutFeaturedTestimonial_aboutContentId_sortOrder_key`(`aboutContentId`, `sortOrder`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServicesPageContent` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(40) NOT NULL DEFAULT 'services',
    `titleTh` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `subtitleTh` TEXT NULL,
    `subtitleEn` TEXT NULL,
    `systemsTitleTh` VARCHAR(191) NULL,
    `systemsTitleEn` VARCHAR(191) NULL,
    `showSystems` BOOLEAN NOT NULL DEFAULT true,
    `maintenanceTitleTh` VARCHAR(191) NULL,
    `maintenanceTitleEn` VARCHAR(191) NULL,
    `showMaintenance` BOOLEAN NOT NULL DEFAULT true,
    `showGlobalCta` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServicesPageContent_key_key`(`key`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PackagesPageContent` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(40) NOT NULL DEFAULT 'packages',
    `titleTh` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `subtitleTh` TEXT NULL,
    `subtitleEn` TEXT NULL,
    `emptyTh` TEXT NULL,
    `emptyEn` TEXT NULL,
    `seasonalTitleTh` VARCHAR(191) NULL,
    `seasonalTitleEn` VARCHAR(191) NULL,
    `seasonalSubtitleTh` TEXT NULL,
    `seasonalSubtitleEn` TEXT NULL,
    `showSeasonal` BOOLEAN NOT NULL DEFAULT true,
    `paybackTitleTh` VARCHAR(191) NULL,
    `paybackTitleEn` VARCHAR(191) NULL,
    `paybackOnGridTh` TEXT NULL,
    `paybackOnGridEn` TEXT NULL,
    `paybackHybridTh` TEXT NULL,
    `paybackHybridEn` TEXT NULL,
    `paybackOffGridTh` TEXT NULL,
    `paybackOffGridEn` TEXT NULL,
    `showPayback` BOOLEAN NOT NULL DEFAULT true,
    `showGlobalCta` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PackagesPageContent_key_key`(`key`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PortfolioPageContent` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(40) NOT NULL DEFAULT 'portfolio',
    `titleTh` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `subtitleTh` TEXT NULL,
    `subtitleEn` TEXT NULL,
    `imageDisclaimerTh` TEXT NULL,
    `imageDisclaimerEn` TEXT NULL,
    `emptyTh` TEXT NULL,
    `emptyEn` TEXT NULL,
    `showGlobalCta` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PortfolioPageContent_key_key`(`key`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalculatorPageContent` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(40) NOT NULL DEFAULT 'calculator',
    `eyebrowTh` VARCHAR(191) NULL,
    `eyebrowEn` VARCHAR(191) NULL,
    `titleTh` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `subtitleTh` TEXT NULL,
    `subtitleEn` TEXT NULL,
    `panelTitleTh` VARCHAR(191) NULL,
    `panelTitleEn` VARCHAR(191) NULL,
    `panelIntroTh` TEXT NULL,
    `panelIntroEn` TEXT NULL,
    `packagesEyebrowTh` VARCHAR(191) NULL,
    `packagesEyebrowEn` VARCHAR(191) NULL,
    `packagesTitleTh` VARCHAR(191) NULL,
    `packagesTitleEn` VARCHAR(191) NULL,
    `packagesSubtitleTh` TEXT NULL,
    `packagesSubtitleEn` TEXT NULL,
    `showPackages` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CalculatorPageContent_key_key`(`key`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `AboutContent_key_key` ON `AboutContent`(`key`);

-- AddForeignKey
ALTER TABLE `AboutFeaturedTestimonial` ADD CONSTRAINT `AboutFeaturedTestimonial_aboutContentId_fkey` FOREIGN KEY (`aboutContentId`) REFERENCES `AboutContent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AboutFeaturedTestimonial` ADD CONSTRAINT `AboutFeaturedTestimonial_testimonialId_fkey` FOREIGN KEY (`testimonialId`) REFERENCES `Testimonial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
