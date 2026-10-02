-- Production DDL: calculator hybrid toggle R1 (R1-S2) — CalculatorImport source + nullable file fields
-- phpMyAdmin -> database kkdprop1_kkdproperty -> SQL tab. Run BEFORE the Passenger restart (R1-S7).
-- Snapshot first: phpMyAdmin Export (SQL, structure + data) of CalculatorConfig + CalculatorImport.
--
-- Column names/types copied verbatim from
-- prisma/migrations/20261002165047_calculator_import_source_manual/migration.sql
-- (table charset/collation utf8mb4 / utf8mb4_unicode_ci already set by the table's
-- original CREATE; this DDL does not change them).
--
-- Additive/relaxing only: one new NOT NULL column with a default (existing rows become
-- 'EXCEL') + four columns relaxed to NULL. No DROP, no data rewrite beyond the default.
--
-- Engine/version checked 2026-10-02 (read-only): production = MariaDB 10.6.24
-- (utf8mb4_unicode_ci, CalculatorImport = InnoDB), so `ADD COLUMN IF NOT EXISTS` is
-- supported and the ALTER below is safe to re-run (MODIFY is idempotent by nature).
-- DO NOT run this file on MySQL 8 (local docker): it has no ADD COLUMN IF NOT EXISTS.
-- Local databases get this change from `npx prisma migrate dev` instead.
-- If a MySQL 8 host ever needs it: run step 0b, and only run the ALTER if `source`
-- is not listed; if it IS listed, run just the MODIFY lines.

-- 0a. Pre-check (permanent gate): must say InnoDB. If MyISAM, STOP.
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CalculatorImport';

-- 0b. Pre-check: has this already been applied? (0 rows = not yet; 1 row = already done)
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CalculatorImport' AND COLUMN_NAME = 'source';

-- 0c. Pre-check: column-level collation (MODIFY without a charset clause resets a
--     column to the table default). Expect utf8mb4_unicode_ci on id/fileName/fileKey/
--     sha256/uploadedById and utf8mb4_bin on the JSON columns rows/warnings (not
--     touched here). Checked read-only 2026-10-02: exactly that. If fileName/fileKey/
--     sha256 differ from utf8mb4_unicode_ci, STOP and record it before running step 1.
SELECT COLUMN_NAME, COLLATION_NAME FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CalculatorImport' AND COLLATION_NAME IS NOT NULL;

-- 1. Alter (one statement = atomic on InnoDB).
ALTER TABLE `CalculatorImport`
    ADD COLUMN IF NOT EXISTS `source` VARCHAR(10) NOT NULL DEFAULT 'EXCEL',
    MODIFY `fileName` VARCHAR(120) NULL,
    MODIFY `fileKey` VARCHAR(120) NULL,
    MODIFY `sha256` CHAR(64) NULL,
    MODIFY `sizeBytes` INTEGER NULL;

-- 2. Verify.
SHOW CREATE TABLE `CalculatorImport`;
SELECT `source`, COUNT(*) FROM `CalculatorImport` GROUP BY `source`;  -- expect EXCEL only
