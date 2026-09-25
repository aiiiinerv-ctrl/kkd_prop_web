-- DEFERRED: apply on prod only in the cleanup follow-up (after S10 + soak).
-- S9 production deploy must NOT run this migration — columns stay on prod for
-- expand/contract rollback (docs/plans/calculator-excel-import-sprints.md Default #1).
-- Local/dev: safe to apply via `prisma migrate deploy`.

ALTER TABLE `CalculatorConfig` DROP COLUMN `sunHoursPerDay`,
    DROP COLUMN `daysPerMonth`,
    DROP COLUMN `pricePerKwhThb`,
    DROP COLUMN `billThreshold3To5Kw`,
    DROP COLUMN `billThreshold5To10Kw`;
