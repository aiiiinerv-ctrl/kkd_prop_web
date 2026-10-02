-- Rollback helper: calculator hybrid toggle R1 (R1-S2) — use ONLY when rolling back
-- the R1 CODE while MANUAL rows exist (plan Default #2: backfill, never DELETE).
-- phpMyAdmin -> database kkdprop1_kkdproperty -> SQL tab. Run BEFORE restarting the old code.
--
-- Why: the pre-R1 Prisma client types fileName/fileKey/sha256/sizeBytes as NOT NULL and
-- throws on NULL, which would 500 /admin/pages/calculator. This fills placeholder values
-- into MANUAL rows only; history stays and audit logs keep pointing at the same rows.
-- Touches ONLY rows with source = 'MANUAL' AND fileName IS NULL. EXCEL rows are never
-- modified. Idempotent: after the first run no MANUAL row matches the WHERE any more.
-- The `source` column and relaxed NULLability stay in place (additive schema is harmless
-- to old code); do NOT drop them.
-- Note: the placeholder fileKey points at no real file, so the old UI's "download
-- original" link on those rows returns 404 — expected.

UPDATE `CalculatorImport`
   SET `fileName`  = 'manual-edit.xlsx',
       `fileKey`   = CONCAT('private/calculator-imports/', `id`, '.xlsx'),
       `sha256`    = REPEAT('0', 64),
       `sizeBytes` = 0
 WHERE `source` = 'MANUAL' AND `fileName` IS NULL;

-- Verify: must return 0.
SELECT COUNT(*) FROM `CalculatorImport`
 WHERE `fileName` IS NULL OR `fileKey` IS NULL OR `sha256` IS NULL OR `sizeBytes` IS NULL;
