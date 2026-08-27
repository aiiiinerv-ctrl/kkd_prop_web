# H1 — production-safe additive SQL (issue #61)

Date: 2026-08-27
Local migration: `prisma/migrations/20260827070722_add_home_cms_h1_schema/migration.sql`

Production has no `_prisma_migrations` ledger (DDL is applied by hand through
phpMyAdmin — see `docs/plans/kkd-shared-hosting-redeploy-runbook.md`). This is
the hand-applicable equivalent of the local migration, adapted per
`docs/plans/pages-cms-data-model-migration-decision.md` Phase 1:

- **Explicit `ENGINE=InnoDB`** on every `CREATE TABLE` — do not rely on the
  server default (that default was `MyISAM`; Gate D only converted the
  pre-existing 16 tables, it did not change the server/session default for
  *new* tables).
- Additive only: two new tables, one new Foreign Key. No existing table is
  touched.
- Real Foreign Key parent → child (`HomeFaqItem.homePageContentId`), matching
  the local migration exactly (`ON DELETE CASCADE ON UPDATE CASCADE`).

**Do not run this until a named owner checkpoint authorizes Home CMS DDL** (H0
foundation gates are green per issue #65, but each DDL window is still a
separate approval per `pages-cms-data-model-migration-decision.md` Phase 0/1).

## How to apply (phpMyAdmin — one statement at a time)

1. Open the production database's phpMyAdmin SQL tab.
2. Paste and run **Statement 1** alone. Confirm `HomePageContent` appears with
   0 rows and `Engine: InnoDB` in the table list.
3. Paste and run **Statement 2** alone. Confirm `HomeFaqItem` appears with 0
   rows and `Engine: InnoDB`.
4. Paste and run **Statement 3** alone (the Foreign Key). Confirm no error —
   a failure here (e.g. charset/collation mismatch) means stop and investigate
   before any backfill; it does not affect the two tables already created.
5. Re-run the verification queries at the bottom of this file and record the
   output in the after-summary on issue #61.

## Statement 1 — `CREATE TABLE HomePageContent`

```sql
CREATE TABLE `HomePageContent` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(40) NOT NULL DEFAULT 'home',
    `heroKickerTh` VARCHAR(191) NULL,
    `heroKickerEn` VARCHAR(191) NULL,
    `heroTitleWhiteTh` VARCHAR(191) NULL,
    `heroTitleWhiteEn` VARCHAR(191) NULL,
    `heroTitleGoldTh` VARCHAR(191) NULL,
    `heroTitleGoldEn` VARCHAR(191) NULL,
    `heroSubtitleTh` TEXT NULL,
    `heroSubtitleEn` TEXT NULL,
    `heroAltTh` VARCHAR(191) NULL,
    `heroAltEn` VARCHAR(191) NULL,
    `heroImageKey` VARCHAR(191) NULL,
    `ctaPrimaryLabelTh` VARCHAR(191) NULL,
    `ctaPrimaryLabelEn` VARCHAR(191) NULL,
    `ctaSecondaryLabelTh` VARCHAR(191) NULL,
    `ctaSecondaryLabelEn` VARCHAR(191) NULL,
    `quickContactLabelTh` VARCHAR(191) NULL,
    `quickContactLabelEn` VARCHAR(191) NULL,
    `proofLabelTh` VARCHAR(191) NULL,
    `proofLabelEn` VARCHAR(191) NULL,
    `proofTitleTh` VARCHAR(191) NULL,
    `proofTitleEn` VARCHAR(191) NULL,
    `proofItem1Th` VARCHAR(191) NULL,
    `proofItem1En` VARCHAR(191) NULL,
    `proofItem2Th` VARCHAR(191) NULL,
    `proofItem2En` VARCHAR(191) NULL,
    `proofItem3Th` VARCHAR(191) NULL,
    `proofItem3En` VARCHAR(191) NULL,
    `feature1LabelTh` VARCHAR(191) NULL,
    `feature1LabelEn` VARCHAR(191) NULL,
    `feature2LabelTh` VARCHAR(191) NULL,
    `feature2LabelEn` VARCHAR(191) NULL,
    `feature3LabelTh` VARCHAR(191) NULL,
    `feature3LabelEn` VARCHAR(191) NULL,
    `feature4LabelTh` VARCHAR(191) NULL,
    `feature4LabelEn` VARCHAR(191) NULL,
    `showLatestWorks` BOOLEAN NOT NULL DEFAULT true,
    `latestWorksHeadingTh` VARCHAR(191) NULL,
    `latestWorksHeadingEn` VARCHAR(191) NULL,
    `metric1LabelTh` VARCHAR(191) NULL,
    `metric1LabelEn` VARCHAR(191) NULL,
    `metric1ValueTh` VARCHAR(191) NULL,
    `metric1ValueEn` VARCHAR(191) NULL,
    `metric2LabelTh` VARCHAR(191) NULL,
    `metric2LabelEn` VARCHAR(191) NULL,
    `metric2ValueTh` VARCHAR(191) NULL,
    `metric2ValueEn` VARCHAR(191) NULL,
    `metric3LabelTh` VARCHAR(191) NULL,
    `metric3LabelEn` VARCHAR(191) NULL,
    `metric3ValueTh` VARCHAR(191) NULL,
    `metric3ValueEn` VARCHAR(191) NULL,
    `viewAllLabelTh` VARCHAR(191) NULL,
    `viewAllLabelEn` VARCHAR(191) NULL,
    `showServicesCta` BOOLEAN NOT NULL DEFAULT true,
    `servicesCtaBadgeTh` VARCHAR(191) NULL,
    `servicesCtaBadgeEn` VARCHAR(191) NULL,
    `servicesCtaTitleTh` VARCHAR(191) NULL,
    `servicesCtaTitleEn` VARCHAR(191) NULL,
    `servicesCtaTextTh` TEXT NULL,
    `servicesCtaTextEn` TEXT NULL,
    `servicesCtaLinkLabelTh` VARCHAR(191) NULL,
    `servicesCtaLinkLabelEn` VARCHAR(191) NULL,
    `showFaq` BOOLEAN NOT NULL DEFAULT true,
    `faqBadgeTh` VARCHAR(191) NULL,
    `faqBadgeEn` VARCHAR(191) NULL,
    `faqTitleTh` VARCHAR(191) NULL,
    `faqTitleEn` VARCHAR(191) NULL,
    `faqIntroTh` TEXT NULL,
    `faqIntroEn` TEXT NULL,
    `faqLineButtonLabelTh` VARCHAR(191) NULL,
    `faqLineButtonLabelEn` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HomePageContent_key_key`(`key`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Statement 2 — `CREATE TABLE HomeFaqItem`

```sql
CREATE TABLE `HomeFaqItem` (
    `id` VARCHAR(191) NOT NULL,
    `homePageContentId` VARCHAR(191) NOT NULL,
    `questionTh` VARCHAR(191) NOT NULL,
    `questionEn` VARCHAR(191) NOT NULL,
    `answerTh` TEXT NOT NULL,
    `answerEn` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HomeFaqItem_homePageContentId_sortOrder_key`(`homePageContentId`, `sortOrder`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Statement 3 — Foreign Key

```sql
ALTER TABLE `HomeFaqItem` ADD CONSTRAINT `HomeFaqItem_homePageContentId_fkey`
  FOREIGN KEY (`homePageContentId`) REFERENCES `HomePageContent`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
```

## Verification queries (read-only, run after Statement 3)

```sql
-- Both must report InnoDB
SELECT TABLE_NAME, ENGINE, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('HomePageContent', 'HomeFaqItem');

-- Must return exactly 1 row: HomeFaqItem_homePageContentId_fkey
SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'HomeFaqItem'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Both must be 0 immediately after DDL (before backfill runs)
SELECT
  (SELECT COUNT(*) FROM HomePageContent) AS home_rows,
  (SELECT COUNT(*) FROM HomeFaqItem) AS faq_rows;
```

## Agent-side read-only re-verification

`scripts/pma-readonly-query.mts` runs a single `SELECT`/`SHOW` statement
against production through phpMyAdmin's own SSO + AJAX endpoint (the read-only
path proven in `docs/plans/pages-cms-innodb-conversion-runbook.md` Gate A) and
prints the phpMyAdmin "Showing rows ... Query took ..." marker as live-execution
proof. It hard-refuses anything that isn't `SELECT`/`SHOW`/`DESCRIBE`/`EXPLAIN`
— DDL must still be pasted into the phpMyAdmin SQL tab by a human, never run
through this script.

```bash
npx tsx scripts/pma-readonly-query.mts "SELECT TABLE_NAME, ENGINE, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'kkdprop1_kkdproperty' AND TABLE_NAME IN ('HomePageContent', 'HomeFaqItem')"
```

Gotcha specific to this AJAX path (not the phpMyAdmin UI): the AJAX session
does not carry a `USE <db>` the way the SQL tab's sidebar-selected database
does, so `DATABASE()` resolves to nothing here — use the explicit schema name
`kkdprop1_kkdproperty` in `WHERE TABLE_SCHEMA = ...` when running the
verification queries above through this script. A human running the same
queries in the actual phpMyAdmin SQL tab (sidebar already on the right
database) does not need this substitution.

Pre-DDL baseline captured 2026-08-27 (confirms clean slate before Statement 1):
`HomePageContent`/`HomeFaqItem` — zero rows, i.e. tables do not exist yet; no
FK named `HomeFaqItem_homePageContentId_fkey` exists yet.

## Rollback

Additive only — no existing table or column is touched. If a statement fails
partway, drop only the tables/constraint that statement 1-3 successfully
created (`DROP TABLE` in reverse order) and re-run from the failed statement.
The old application does not reference either table, so leaving them empty and
unused is also a safe stop state (per the mother decision doc's rollback
matrix: "Additive DDL fails → old app keeps serving").
