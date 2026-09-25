-- Home FAQ background image — production DDL
-- Map: https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/142
-- Source migration: prisma/migrations/20260925135022_add_home_faq_background/migration.sql
--
-- Run in phpMyAdmin, SQL tab, database `kkdprop1_kkdproperty`, BEFORE the
-- Passenger restart for this deploy — per docs/plans/kkd-shared-hosting-redeploy-runbook.md
-- "Second non-negotiable rule". Verify with the SHOW COLUMNS query below
-- while the old code is still serving traffic.

ALTER TABLE `HomePageContent`
  ADD COLUMN IF NOT EXISTS `faqBackgroundImageKey` VARCHAR(191) NULL;

-- Verification (must show the new column before continuing the deploy):
SHOW COLUMNS FROM `HomePageContent` LIKE 'faqBackgroundImageKey';
