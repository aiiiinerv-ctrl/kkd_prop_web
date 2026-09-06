-- AlterTable
ALTER TABLE `HomePageContent` ADD COLUMN `heroMode` ENUM('HERO', 'BANNER') NOT NULL DEFAULT 'HERO';
