-- Idempotent production DDL: HTML sitemap config (#115)
-- phpMyAdmin → database kkdprop1_kkdproperty → SQL tab
-- Safe to re-run. Verify after:
--   SHOW COLUMNS FROM `SiteSettings` LIKE 'sitemapConfigJson';

ALTER TABLE `SiteSettings`
  ADD COLUMN IF NOT EXISTS `sitemapConfigJson` JSON NULL;

-- Optional PageSeo row for /sitemap metadata (upsert-safe)
INSERT INTO `PageSeo` (
  `id`, `key`, `titleTh`, `titleEn`, `descriptionTh`, `descriptionEn`,
  `robotsIndex`, `robotsFollow`, `updatedAt`
)
SELECT
  'sitemap-seo-seed',
  'sitemap',
  'แผนผังเว็บไซต์ | KKD PROPERTY',
  'Site Map | KKD PROPERTY',
  'แผนผังเว็บไซต์ KKD PROPERTY — ลิงก์ไปยังทุกหน้าหลัก บริการ แพ็กเกจ และช่องทางติดต่อ',
  'KKD PROPERTY site map — links to all main pages, services, packages, and contact channels.',
  1,
  1,
  NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `PageSeo` WHERE `key` = 'sitemap');
