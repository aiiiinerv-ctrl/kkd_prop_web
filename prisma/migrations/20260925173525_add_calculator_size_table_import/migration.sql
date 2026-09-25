-- AlterTable
ALTER TABLE `CalculatorConfig` ADD COLUMN `sizeTable` JSON NULL,
    ADD COLUMN `sizeTableImportId` VARCHAR(40) NULL;

-- CreateTable
CREATE TABLE `CalculatorImport` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(120) NOT NULL,
    `fileKey` VARCHAR(120) NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `rows` JSON NOT NULL,
    `warnings` JSON NOT NULL,
    `uploadedById` VARCHAR(40) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CalculatorImport_createdAt_idx`(`createdAt`),
    INDEX `CalculatorImport_sha256_idx`(`sha256`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CalculatorImport` ADD CONSTRAINT `CalculatorImport_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `AdminUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
