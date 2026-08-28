-- About CMS enhancement (#87) — production DDL
-- Run in phpMyAdmin → database `kkdprop1_kkdproperty` → SQL tab
-- BEFORE Passenger restart. Idempotent — safe to re-run.
-- Verify after: SHOW COLUMNS FROM `AboutContent` LIKE 'credSection%';

ALTER TABLE `AboutContent`
    ADD COLUMN IF NOT EXISTS `credSectionTitleTh` VARCHAR(191) NULL,
    ADD COLUMN IF NOT EXISTS `credSectionTitleEn` VARCHAR(191) NULL,
    ADD COLUMN IF NOT EXISTS `credSectionDescTh` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `credSectionDescEn` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `credRegisteredIcon` VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS `credEngineerIcon` VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS `credExperienceIcon` VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS `teamDesignIcon` VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS `teamInstallIcon` VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS `teamSupportIcon` VARCHAR(40) NULL;
