CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `accountImageKey` varchar(512) DEFAULT NULL,
  `accountImageUrl` text,
  `accountNumber` varchar(255) NOT NULL,
  `accountName` varchar(255) DEFAULT NULL,
  `active` boolean NOT NULL DEFAULT true,
  `sortOrder` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_methods_active_idx` (`active`,`sortOrder`)
);

ALTER TABLE `wallet_deposit_requests`
  ADD COLUMN IF NOT EXISTS `paymentMethodId` int NULL AFTER `userId`;
