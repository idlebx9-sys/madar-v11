-- Independent auth: password support + soft-delete for users
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `passwordHash` varchar(255);
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `emailVerifiedAt` timestamp NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `deletedAt` timestamp NULL;

-- Unique email (MySQL allows multiple NULLs with unique index)
-- Ignore error if index already exists
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);

-- Note: Foreign keys are recommended. Apply carefully on existing data.
-- Uncomment after verifying referential integrity:

-- ALTER TABLE `sites` ADD CONSTRAINT `sites_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
-- ALTER TABLE `site_versions` ADD CONSTRAINT `site_versions_site_fk` FOREIGN KEY (`siteId`) REFERENCES `sites`(`id`) ON DELETE CASCADE;
-- ALTER TABLE `messages` ADD CONSTRAINT `messages_site_fk` FOREIGN KEY (`siteId`) REFERENCES `sites`(`id`) ON DELETE CASCADE;
-- ALTER TABLE `messages` ADD CONSTRAINT `messages_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
-- ALTER TABLE `domains` ADD CONSTRAINT `domains_site_fk` FOREIGN KEY (`siteId`) REFERENCES `sites`(`id`) ON DELETE CASCADE;
-- ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
-- ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
-- ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_plan_fk` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE RESTRICT;
