-- MADAR 0006: Auth tokens (email verify / password reset) + refresh tokens
CREATE TABLE IF NOT EXISTS `auth_tokens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `type` enum('email_verify','password_reset') NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `auth_tokens_id` PRIMARY KEY(`id`),
  CONSTRAINT `auth_tokens_hash_uq` UNIQUE(`tokenHash`)
);
CREATE INDEX `auth_tokens_user_type_idx` ON `auth_tokens` (`userId`,`type`);

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `revokedAt` timestamp NULL,
  `userAgent` varchar(255),
  `ip` varchar(45),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`),
  CONSTRAINT `refresh_tokens_hash_uq` UNIQUE(`tokenHash`)
);
CREATE INDEX `refresh_tokens_user_idx` ON `refresh_tokens` (`userId`);
