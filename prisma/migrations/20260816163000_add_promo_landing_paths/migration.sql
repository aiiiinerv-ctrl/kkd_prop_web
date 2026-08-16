-- CreateTable
CREATE TABLE `PromoLandingPath` (
    `id` VARCHAR(191) NOT NULL,
    `path` VARCHAR(180) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PromoLandingPath_path_key`(`path`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed the current public top-level destinations. Deterministic ids plus
-- INSERT IGNORE make the production phpMyAdmin application idempotent.
INSERT IGNORE INTO `PromoLandingPath` (`id`, `path`, `createdAt`) VALUES
    ('landing_th_packages', '/th/packages', CURRENT_TIMESTAMP(3)),
    ('landing_th_home', '/th', CURRENT_TIMESTAMP(3)),
    ('landing_th_booking', '/th/booking', CURRENT_TIMESTAMP(3)),
    ('landing_th_calculator', '/th/calculator', CURRENT_TIMESTAMP(3)),
    ('landing_th_about', '/th/about', CURRENT_TIMESTAMP(3)),
    ('landing_th_contact', '/th/contact', CURRENT_TIMESTAMP(3)),
    ('landing_th_cookie_policy', '/th/cookie-policy', CURRENT_TIMESTAMP(3)),
    ('landing_th_portfolio', '/th/portfolio', CURRENT_TIMESTAMP(3)),
    ('landing_th_services', '/th/services', CURRENT_TIMESTAMP(3)),
    ('landing_th_testimonials', '/th/testimonials', CURRENT_TIMESTAMP(3));
