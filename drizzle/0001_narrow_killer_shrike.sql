CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` int NOT NULL,
	`userId` int NOT NULL,
	`senderName` varchar(255) NOT NULL,
	`senderEmail` varchar(320),
	`senderPhone` varchar(30),
	`content` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`subdomain` varchar(100) NOT NULL,
	`template` varchar(100) NOT NULL DEFAULT 'modern',
	`plan` enum('starter','pro','business') NOT NULL DEFAULT 'starter',
	`primaryColor` varchar(20) DEFAULT '#6C3CE1',
	`secondaryColor` varchar(20) DEFAULT '#00D4FF',
	`logoUrl` text,
	`whatsapp` varchar(30),
	`isActive` boolean NOT NULL DEFAULT true,
	`sections` json DEFAULT ('{"hero":true,"about":true,"services":true,"gallery":true,"contact":true}'),
	`galleryImages` json DEFAULT ('[]'),
	`visitorCount` int NOT NULL DEFAULT 0,
	`messageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sites_id` PRIMARY KEY(`id`),
	CONSTRAINT `sites_subdomain_unique` UNIQUE(`subdomain`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('credit','debit') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`description` varchar(500),
	`reference` varchar(100),
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'completed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `walletBalance` decimal(10,2) DEFAULT '0.00' NOT NULL;