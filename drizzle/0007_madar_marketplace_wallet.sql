-- MADAR marketplace + wallet migration.
-- Historical SaaS billing tables are intentionally removed only after the new application code is deployed.
ALTER TABLE `sites` DROP COLUMN IF EXISTS `plan`;
ALTER TABLE `users` DROP COLUMN IF EXISTS `walletBalance`;
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `stripe_webhook_events`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `plans`;

CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `key` varchar(100) NOT NULL UNIQUE,
  `value` text NOT NULL,
  `updatedBy` int NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS `purchase_requests` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `fullName` varchar(255) NOT NULL,
  `email` varchar(320) NOT NULL,
  `whatsapp` varchar(40) NOT NULL,
  `phone` varchar(40) NULL,
  `requestedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewedAt` timestamp NULL,
  `reviewedBy` int NULL,
  `rejectionReason` text NULL,
  `adminNotes` text NULL,
  `status` enum('pending','approved','rejected','cancelled','completed') NOT NULL DEFAULT 'pending',
  `siteId` int NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `purchase_requests_user_idx` (`userId`), INDEX `purchase_requests_status_idx` (`status`), INDEX `purchase_requests_requested_at_idx` (`requestedAt`)
);
CREATE TABLE IF NOT EXISTS `wallets` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `baseCurrency` varchar(3) NOT NULL DEFAULT 'SAR',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS `wallet_deposit_requests` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `txId` varchar(255) NOT NULL,
  `screenshotKey` varchar(512) NOT NULL,
  `screenshotUrl` text NOT NULL,
  `note` text NULL,
  `status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `rejectionReason` text NULL,
  `reviewedBy` int NULL,
  `reviewedAt` timestamp NULL,
  `idempotencyKey` varchar(100) NOT NULL UNIQUE,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `wallet_deposit_requests_user_idx` (`userId`), INDEX `wallet_deposit_requests_status_idx` (`status`), INDEX `wallet_deposit_requests_txid_idx` (`txId`)
);
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `walletId` int NOT NULL,
  `userId` int NOT NULL,
  `type` enum('deposit','purchase','conversion','conversion_fee','refund','admin_credit','admin_debit','adjustment') NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `balanceBefore` decimal(18,2) NOT NULL,
  `balanceAfter` decimal(18,2) NOT NULL,
  `referenceType` varchar(64) NULL,
  `referenceId` varchar(100) NULL,
  `description` varchar(500) NULL,
  `idempotencyKey` varchar(100) NOT NULL UNIQUE,
  `metadata` json NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `wallet_transactions_wallet_idx` (`walletId`,`createdAt`), INDEX `wallet_transactions_user_idx` (`userId`,`createdAt`), INDEX `wallet_transactions_type_idx` (`type`)
);
CREATE TABLE IF NOT EXISTS `currency_rates` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `fromCurrency` varchar(3) NOT NULL,
  `toCurrency` varchar(3) NOT NULL,
  `rate` decimal(18,8) NOT NULL,
  `active` boolean NOT NULL DEFAULT TRUE,
  `updatedBy` int NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `currency_rates_pair_uq` (`fromCurrency`,`toCurrency`)
);
CREATE TABLE IF NOT EXISTS `currency_exchange_transactions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `fromCurrency` varchar(3) NOT NULL,
  `toCurrency` varchar(3) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `feeAmount` decimal(18,2) NOT NULL,
  `feeCurrency` varchar(3) NOT NULL,
  `netAmount` decimal(18,2) NOT NULL,
  `exchangeRate` decimal(18,8) NOT NULL,
  `convertedAmount` decimal(18,2) NOT NULL,
  `idempotencyKey` varchar(100) NOT NULL UNIQUE,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `currency_exchange_user_idx` (`userId`,`createdAt`)
);
CREATE TABLE IF NOT EXISTS `site_purchases` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `purchaseRequestId` int NOT NULL UNIQUE,
  `siteId` int NULL UNIQUE,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `status` enum('paid','refunded') NOT NULL DEFAULT 'paid',
  `paidAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `refundedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `site_purchases_user_idx` (`userId`,`createdAt`)
);
CREATE TABLE IF NOT EXISTS `platform_revenue` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `type` enum('site_purchase','conversion_fee','adjustment') NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `userId` int NULL,
  `referenceType` varchar(64) NULL,
  `referenceId` varchar(100) NULL,
  `metadata` json NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `platform_revenue_type_idx` (`type`,`createdAt`)
);

INSERT INTO `platform_settings` (`key`,`value`) VALUES
('site_purchase_enabled','true'),
('site_purchase_price','500.00'),
('site_purchase_currency','USD'),
('exchange_fee_percent','2.00'),
('sar_to_try_rate','1.00000000'),
('try_to_sar_rate','1.00000000'),
('binance_pay_id',''),
('binance_uid',''),
('binance_wallet_address',''),
('binance_network',''),
('binance_asset',''),
('payment_instructions','')
ON DUPLICATE KEY UPDATE `key`=`key`;
