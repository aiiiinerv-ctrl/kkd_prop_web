-- Production DDL: calculator size-table Excel import (S3, #148/#149)
-- phpMyAdmin -> database kkdprop1_kkdproperty -> SQL tab
-- Additive only (expand/contract, F5) — no DROP, no column removal.
-- Column names/types copied verbatim from
-- prisma/migrations/20260925173525_add_calculator_size_table_import/migration.sql
-- Safe to re-run (idempotent where MySQL/MariaDB allows — see
-- docs/plans/kkd-shared-hosting-redeploy-runbook.md "ADD COLUMN IF NOT EXISTS").

-- 0. Pre-check (permanent gate per myisam-innodb-atomicity-investigation.md):
--    both rows must say InnoDB. If either is MyISAM, STOP — the FK below
--    cannot be created and audited writes would not be atomic.
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('AdminUser', 'CalculatorConfig');

-- 1. New columns on the existing CalculatorConfig singleton.
ALTER TABLE `CalculatorConfig`
    ADD COLUMN IF NOT EXISTS `sizeTable` JSON NULL,
    ADD COLUMN IF NOT EXISTS `sizeTableImportId` VARCHAR(40) NULL;

-- 2. New history/draft table for Excel uploads.
--    FK is declared inline inside CREATE TABLE so the whole statement is a
--    no-op (including the FK) when the table already exists — MySQL has no
--    "ADD CONSTRAINT IF NOT EXISTS".
CREATE TABLE IF NOT EXISTS `CalculatorImport` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(120) NOT NULL,
    `fileKey` VARCHAR(120) NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `rows` JSON NOT NULL,
    `warnings` JSON NOT NULL,
    `uploadedById` VARCHAR(40) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `CalculatorImport_createdAt_idx` (`createdAt`),
    INDEX `CalculatorImport_sha256_idx` (`sha256`),
    CONSTRAINT `CalculatorImport_uploadedById_fkey`
        FOREIGN KEY (`uploadedById`) REFERENCES `AdminUser`(`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Verify.
SHOW COLUMNS FROM `CalculatorConfig` WHERE Field IN ('sizeTable', 'sizeTableImportId');
SHOW CREATE TABLE `CalculatorImport`;
SHOW COLUMNS FROM `CalculatorImport`;
