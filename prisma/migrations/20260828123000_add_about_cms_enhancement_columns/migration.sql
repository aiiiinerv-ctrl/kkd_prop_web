-- About CMS enhancement (#77): credentials section heading + Lucide icon slots
ALTER TABLE `AboutContent`
    ADD COLUMN `credSectionTitleTh` VARCHAR(191) NULL,
    ADD COLUMN `credSectionTitleEn` VARCHAR(191) NULL,
    ADD COLUMN `credSectionDescTh` TEXT NULL,
    ADD COLUMN `credSectionDescEn` TEXT NULL,
    ADD COLUMN `credRegisteredIcon` VARCHAR(40) NULL,
    ADD COLUMN `credEngineerIcon` VARCHAR(40) NULL,
    ADD COLUMN `credExperienceIcon` VARCHAR(40) NULL,
    ADD COLUMN `teamDesignIcon` VARCHAR(40) NULL,
    ADD COLUMN `teamInstallIcon` VARCHAR(40) NULL,
    ADD COLUMN `teamSupportIcon` VARCHAR(40) NULL;
