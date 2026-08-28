-- CalculatorConfig Phase A — apply via phpMyAdmin SQL tab
-- Database: kkdprop1_kkdproperty (select in sidebar before running)
-- Idempotent: safe to re-run before deploy restart.

CREATE TABLE IF NOT EXISTS `CalculatorConfig` (
    `id` VARCHAR(191) NOT NULL,
    `sunHoursPerDay` DOUBLE NOT NULL DEFAULT 5,
    `daysPerMonth` INTEGER NOT NULL DEFAULT 30,
    `pricePerKwhThb` DOUBLE NOT NULL DEFAULT 4.5,
    `annualSavingMonthsMultiplier` INTEGER NOT NULL DEFAULT 10,
    `minBill` INTEGER NOT NULL DEFAULT 500,
    `maxBill` INTEGER NOT NULL DEFAULT 8000,
    `stepBill` INTEGER NOT NULL DEFAULT 100,
    `billThreshold3To5Kw` INTEGER NOT NULL DEFAULT 3000,
    `billThreshold5To10Kw` INTEGER NOT NULL DEFAULT 6000,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed one row only when the table is empty (run after CREATE above).
INSERT INTO `CalculatorConfig` (
    `id`,
    `sunHoursPerDay`,
    `daysPerMonth`,
    `pricePerKwhThb`,
    `annualSavingMonthsMultiplier`,
    `minBill`,
    `maxBill`,
    `stepBill`,
    `billThreshold3To5Kw`,
    `billThreshold5To10Kw`,
    `version`,
    `updatedAt`
)
SELECT
    'calc-config-seed',
    5, 30, 4.5, 10,
    500, 8000, 100, 3000, 6000,
    1,
    CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `CalculatorConfig` LIMIT 1);

-- Verify gate (must return 11 columns before Passenger restart):
-- SHOW COLUMNS FROM `CalculatorConfig`;
