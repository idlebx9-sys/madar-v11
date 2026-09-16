-- MADAR hardening: idempotent webhooks, persistent AI quota, media accounting and domain lifecycle
ALTER TABLE `site_visits` ADD COLUMN `visitDay` varchar(10) NULL;
UPDATE `site_visits` SET `visitDay` = DATE_FORMAT(`createdAt`, '%Y-%m-%d') WHERE `visitDay` IS NULL;
ALTER TABLE `site_visits` MODIFY COLUMN `visitDay` varchar(10) NOT NULL;
DELETE sv1 FROM `site_visits` sv1 JOIN `site_visits` sv2 ON sv1.siteId = sv2.siteId AND sv1.sessionHash = sv2.sessionHash AND sv1.visitDay = sv2.visitDay AND sv1.id > sv2.id WHERE sv1.sessionHash IS NOT NULL;
CREATE UNIQUE INDEX `site_visits_session_day_uq` ON `site_visits` (`siteId`,`sessionHash`,`visitDay`);
ALTER TABLE `domains` ADD COLUMN `isPrimary` boolean NOT NULL DEFAULT false;
ALTER TABLE `domains` MODIFY COLUMN `status` enum('pending','verified','active','failed','removed') NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS `media_assets` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `siteId` int NULL,
  `key` varchar(512) NOT NULL UNIQUE,
  `url` text NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `contentType` varchar(100) NOT NULL,
  `sizeBytes` bigint NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `media_assets_user_idx` (`userId`),
  INDEX `media_assets_site_idx` (`siteId`)
);

CREATE TABLE IF NOT EXISTS `ai_usage` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `day` varchar(10) NOT NULL,
  `count` int NOT NULL DEFAULT 0,
  UNIQUE KEY `ai_usage_user_day_uq` (`userId`,`day`)
);

CREATE TABLE IF NOT EXISTS `stripe_webhook_events` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `eventId` varchar(255) NOT NULL UNIQUE,
  `eventType` varchar(120) NOT NULL,
  `status` enum('processing','processed','failed') NOT NULL DEFAULT 'processing',
  `error` text NULL,
  `processedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
