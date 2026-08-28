-- Idempotent production DDL: CalculatorConfig Phase A (#102)
-- phpMyAdmin → database kkdprop1_kkdproperty → SQL tab
-- Safe to re-run. Verify after:
--   SHOW TABLES LIKE 'CalculatorConfig';
--   SELECT COUNT(*) FROM `CalculatorConfig`;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
