-- Home hero toggle — production DDL
-- Map: https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/132
-- Source migration: prisma/migrations/20260906174233_add_home_hero_mode/migration.sql
--
-- Run in phpMyAdmin, SQL tab, database `kkdprop1_kkdproperty`, BEFORE the
-- Passenger restart for this deploy — per docs/plans/kkd-shared-hosting-redeploy-runbook.md
-- "Second non-negotiable rule". Verify with the SHOW COLUMNS query below
-- while the old code is still serving traffic.

ALTER TABLE `HomePageContent`
  ADD COLUMN IF NOT EXISTS `heroMode` ENUM('HERO', 'BANNER') NOT NULL DEFAULT 'HERO';

-- Verification (must show the new column before continuing the deploy):
-- SHOW COLUMNS FROM `HomePageContent` LIKE 'heroMode';
