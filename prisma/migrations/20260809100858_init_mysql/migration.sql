-- CreateTable
CREATE TABLE `AdminUser` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'SALES', 'FINANCE', 'CHANNEL_EXECUTIVE') NOT NULL DEFAULT 'SALES',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `linkedChannelExecutiveId` VARCHAR(191) NULL,

    UNIQUE INDEX `AdminUser_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromoChannel` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nameTh` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `type` ENUM('INDIVIDUAL', 'COMPANY', 'PLATFORM') NOT NULL DEFAULT 'INDIVIDUAL',
    `refCode` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PromoChannel_slug_key`(`slug`),
    UNIQUE INDEX `PromoChannel_refCode_key`(`refCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelExecutive` (
    `id` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `refCode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ChannelExecutive_refCode_key`(`refCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('QUOTE', 'SURVEY') NOT NULL,
    `status` ENUM('NEW', 'ASSIGNED', 'CONTACTED', 'QUOTED', 'SIGNED', 'INSTALLING', 'COMPLETED', 'DISQUALIFIED') NOT NULL DEFAULT 'NEW',
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `lineId` VARCHAR(191) NULL,
    `referrerName` VARCHAR(191) NULL,
    `province` VARCHAR(191) NOT NULL,
    `buildingType` ENUM('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'OTHER') NOT NULL,
    `buildingTypeOtherText` VARCHAR(191) NULL,
    `avgMonthlyBill` INTEGER NULL,
    `interestedSystems` JSON NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'th',
    `sourceChannelId` VARCHAR(191) NULL,
    `autoSourceChannelId` VARCHAR(191) NULL,
    `autoSourceExecutiveId` VARCHAR(191) NULL,
    `assignedSalesId` VARCHAR(191) NULL,
    `lastFollowUpAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Lead_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyBooking` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `bookingNumber` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `preferredDate` DATETIME(3) NOT NULL,
    `timeSlot` ENUM('MORNING', 'AFTERNOON') NOT NULL,
    `amountThb` INTEGER NOT NULL DEFAULT 199,
    `paymentSlipKey` VARCHAR(191) NOT NULL,
    `paymentStatus` ENUM('PENDING_REVIEW', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
    `status` ENUM('PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARED', 'SURVEYED', 'DESIGNED', 'SIGNED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    `giftSent` BOOLEAN NOT NULL DEFAULT false,
    `assignedEngineerId` VARCHAR(191) NULL,
    `assignedSalesId` VARCHAR(191) NULL,

    UNIQUE INDEX `SurveyBooking_leadId_key`(`leadId`),
    UNIQUE INDEX `SurveyBooking_bookingNumber_key`(`bookingNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingCapacitySetting` (
    `id` VARCHAR(191) NOT NULL,
    `maxPerDay` INTEGER NOT NULL DEFAULT 4,
    `maxPerSlot` INTEGER NOT NULL DEFAULT 2,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentSettings` (
    `id` VARCHAR(191) NOT NULL,
    `promptpayId` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `bankAccountNumber` VARCHAR(191) NULL,
    `bankAccountName` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `kind` ENUM('SYSTEM', 'MAINTENANCE') NOT NULL,
    `titleTh` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `descriptionTh` TEXT NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `featuresTh` JSON NULL,
    `featuresEn` JSON NULL,
    `imageKey` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Service_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Package` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nameTh` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `sizeKw` DOUBLE NOT NULL,
    `priceThb` INTEGER NOT NULL,
    `isPopular` BOOLEAN NOT NULL DEFAULT false,
    `suitableTh` TEXT NOT NULL,
    `suitableEn` TEXT NOT NULL,
    `featuresTh` JSON NOT NULL,
    `featuresEn` JSON NOT NULL,
    `seasonalProduction` JSON NOT NULL,
    `imageKey` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Package_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PortfolioProject` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `titleTh` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `descriptionTh` TEXT NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `category` ENUM('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'OTHER') NOT NULL,
    `province` VARCHAR(191) NOT NULL,
    `systemSizeKw` DOUBLE NOT NULL,
    `imageKeys` JSON NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PortfolioProject_slug_key`(`slug`),
    INDEX `PortfolioProject_category_isPublished_idx`(`category`, `isPublished`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Testimonial` (
    `id` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `quoteTh` TEXT NOT NULL,
    `quoteEn` TEXT NOT NULL,
    `role` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `photoKey` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Testimonial_isPublished_sortOrder_idx`(`isPublished`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN') NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdminUser` ADD CONSTRAINT `AdminUser_linkedChannelExecutiveId_fkey` FOREIGN KEY (`linkedChannelExecutiveId`) REFERENCES `ChannelExecutive`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelExecutive` ADD CONSTRAINT `ChannelExecutive_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `PromoChannel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_sourceChannelId_fkey` FOREIGN KEY (`sourceChannelId`) REFERENCES `PromoChannel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_autoSourceChannelId_fkey` FOREIGN KEY (`autoSourceChannelId`) REFERENCES `PromoChannel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_autoSourceExecutiveId_fkey` FOREIGN KEY (`autoSourceExecutiveId`) REFERENCES `ChannelExecutive`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_assignedSalesId_fkey` FOREIGN KEY (`assignedSalesId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyBooking` ADD CONSTRAINT `SurveyBooking_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyBooking` ADD CONSTRAINT `SurveyBooking_assignedEngineerId_fkey` FOREIGN KEY (`assignedEngineerId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyBooking` ADD CONSTRAINT `SurveyBooking_assignedSalesId_fkey` FOREIGN KEY (`assignedSalesId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Testimonial` ADD CONSTRAINT `Testimonial_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `PortfolioProject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `AdminUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
