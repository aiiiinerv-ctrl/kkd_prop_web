-- CreateTable
CREATE TABLE `CalculatorConfig` (
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
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
