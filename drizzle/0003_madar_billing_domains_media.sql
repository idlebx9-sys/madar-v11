-- MADAR production hardening: site metadata, billing separation, domain verification and analytics uniqueness
ALTER TABLE `sites` MODIFY COLUMN `plan` enum('starter','pro','business') NULL DEFAULT NULL;
ALTER TABLE `sites` ADD COLUMN `tagline` varchar(255) NULL;
ALTER TABLE `sites` ADD COLUMN `description` text NULL;

ALTER TABLE `plans` ADD COLUMN `priceMonthly` decimal(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE `plans` ADD COLUMN `stripePriceId` varchar(255) NULL;

CREATE INDEX `site_visits_session_day_idx` ON `site_visits` (`siteId`,`sessionHash`,`createdAt`);
CREATE INDEX `domains_site_idx` ON `domains` (`siteId`);
CREATE INDEX `domains_status_idx` ON `domains` (`status`);
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`userId`);
CREATE UNIQUE INDEX `subscriptions_provider_uq` ON `subscriptions` (`provider`,`providerSubscriptionId`);

UPDATE `plans` SET `priceMonthly`=0.00 WHERE `key`='starter';
UPDATE `plans` SET `priceMonthly`=49.00 WHERE `key`='pro';
UPDATE `plans` SET `priceMonthly`=149.00 WHERE `key`='business';
