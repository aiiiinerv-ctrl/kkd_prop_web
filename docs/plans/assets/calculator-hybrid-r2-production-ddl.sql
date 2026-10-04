-- Production DDL: calculator hybrid toggle R2 (R2-S3) — three new nullable columns
-- phpMyAdmin -> database kkdprop1_kkdproperty -> SQL tab.
--
-- !! ORDER MATTERS (Lead is a critical table) !!
-- Run this DDL AND confirm step 3 (SHOW COLUMNS) lists all three columns BEFORE the
-- Passenger restart of the R2 release. If the new code starts first, Prisma selects
-- Lead.interestedBatteryKwh which does not exist yet -> every quote submit returns 500.
-- Snapshot first: phpMyAdmin Export (SQL, structure + data) of CalculatorConfig,
-- CalculatorImport and Lead.
--
-- Column names/types copied verbatim from
-- prisma/migrations/20261004050912_add_hybrid_calculator_tables_and_lead_battery/migration.sql
-- (table charset/collation already set by each table's original CREATE; unchanged).
-- Added columns are JSON / INT only: no string columns, so no column-collation concern.
--
-- Additive only: three nullable columns, no default, no DROP, no data rewrite.
-- Existing rows get NULL (= no Hybrid data / battery not stated).
--
-- Target = MariaDB 10.6 (supports ADD COLUMN IF NOT EXISTS; each ALTER is safe to re-run).
-- DO NOT run on MySQL 8 (local docker): local gets this from `npx prisma migrate dev`.

-- 0a. Pre-check (permanent gate): all three must say InnoDB. If any MyISAM, STOP.
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN ('CalculatorConfig', 'CalculatorImport', 'Lead');

-- 0b. Pre-check: already applied? (0 rows = not yet; 3 rows = already done)
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND ((TABLE_NAME = 'CalculatorConfig' AND COLUMN_NAME = 'hybridSizeTable')
     OR (TABLE_NAME = 'CalculatorImport' AND COLUMN_NAME = 'hybridRows')
     OR (TABLE_NAME = 'Lead'             AND COLUMN_NAME = 'interestedBatteryKwh'));

-- 0c. Collation pre-check: not needed (no string columns are added or modified).

-- 1. Alter (one statement per table = atomic on InnoDB).
ALTER TABLE `CalculatorConfig` ADD COLUMN IF NOT EXISTS `hybridSizeTable` JSON NULL;
ALTER TABLE `CalculatorImport` ADD COLUMN IF NOT EXISTS `hybridRows` JSON NULL;
ALTER TABLE `Lead` ADD COLUMN IF NOT EXISTS `interestedBatteryKwh` INTEGER NULL;

-- 2. Verify each table (expect the new column, Null = YES, Default = NULL).
SHOW COLUMNS FROM `CalculatorConfig` LIKE 'hybridSizeTable';
SHOW COLUMNS FROM `CalculatorImport` LIKE 'hybridRows';
SHOW COLUMNS FROM `Lead` LIKE 'interestedBatteryKwh';

-- 3. Gate before restart: must return 3.
SELECT COUNT(*) AS new_columns FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND ((TABLE_NAME = 'CalculatorConfig' AND COLUMN_NAME = 'hybridSizeTable')
     OR (TABLE_NAME = 'CalculatorImport' AND COLUMN_NAME = 'hybridRows')
     OR (TABLE_NAME = 'Lead'             AND COLUMN_NAME = 'interestedBatteryKwh'));
