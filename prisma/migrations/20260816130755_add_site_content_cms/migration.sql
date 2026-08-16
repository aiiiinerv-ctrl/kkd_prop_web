-- CreateTable
CREATE TABLE `SiteSettings` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `addressTh` VARCHAR(191) NULL,
    `addressEn` VARCHAR(191) NULL,
    `hoursTh` VARCHAR(191) NULL,
    `hoursEn` VARCHAR(191) NULL,
    `mapQuery` VARCHAR(191) NULL,
    `lineUrl` VARCHAR(191) NULL,
    `facebookUrl` VARCHAR(191) NULL,
    `instagramUrl` VARCHAR(191) NULL,
    `tiktokUrl` VARCHAR(191) NULL,
    `youtubeUrl` VARCHAR(191) NULL,
    `footerDescriptionTh` TEXT NULL,
    `footerDescriptionEn` TEXT NULL,
    `contactTitleTh` VARCHAR(191) NULL,
    `contactTitleEn` VARCHAR(191) NULL,
    `contactSubtitleTh` VARCHAR(191) NULL,
    `contactSubtitleEn` VARCHAR(191) NULL,
    `headerCtaLabelTh` VARCHAR(191) NULL,
    `headerCtaLabelEn` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageSeo` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(40) NOT NULL,
    `titleTh` VARCHAR(191) NULL,
    `titleEn` VARCHAR(191) NULL,
    `descriptionTh` TEXT NULL,
    `descriptionEn` TEXT NULL,
    `ogImageKey` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PageSeo_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AboutContent` (
    `id` VARCHAR(191) NOT NULL,
    `titleTh` VARCHAR(191) NULL,
    `titleEn` VARCHAR(191) NULL,
    `introTh` TEXT NULL,
    `introEn` TEXT NULL,
    `credRegisteredTitleTh` VARCHAR(191) NULL,
    `credRegisteredTitleEn` VARCHAR(191) NULL,
    `credRegisteredDescTh` TEXT NULL,
    `credRegisteredDescEn` TEXT NULL,
    `credEngineerTitleTh` VARCHAR(191) NULL,
    `credEngineerTitleEn` VARCHAR(191) NULL,
    `credEngineerDescTh` TEXT NULL,
    `credEngineerDescEn` TEXT NULL,
    `credExperienceTitleTh` VARCHAR(191) NULL,
    `credExperienceTitleEn` VARCHAR(191) NULL,
    `credExperienceDescTh` TEXT NULL,
    `credExperienceDescEn` TEXT NULL,
    `teamTitleTh` VARCHAR(191) NULL,
    `teamTitleEn` VARCHAR(191) NULL,
    `teamDescTh` TEXT NULL,
    `teamDescEn` TEXT NULL,
    `teamDesignTitleTh` VARCHAR(191) NULL,
    `teamDesignTitleEn` VARCHAR(191) NULL,
    `teamDesignDescTh` TEXT NULL,
    `teamDesignDescEn` TEXT NULL,
    `teamInstallTitleTh` VARCHAR(191) NULL,
    `teamInstallTitleEn` VARCHAR(191) NULL,
    `teamInstallDescTh` TEXT NULL,
    `teamInstallDescEn` TEXT NULL,
    `teamSupportTitleTh` VARCHAR(191) NULL,
    `teamSupportTitleEn` VARCHAR(191) NULL,
    `teamSupportDescTh` TEXT NULL,
    `teamSupportDescEn` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
