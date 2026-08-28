-- Idempotent production DDL: hide/show + reorder banner slides
-- phpMyAdmin → database kkdprop1_kkdproperty → SQL tab
-- Safe to re-run.

ALTER TABLE `PageBannerSlide`
  ADD COLUMN IF NOT EXISTS `isActive` BOOLEAN NOT NULL DEFAULT true;

-- Verify gate (must show isActive before Passenger restart):
-- SHOW COLUMNS FROM `PageBannerSlide`;
