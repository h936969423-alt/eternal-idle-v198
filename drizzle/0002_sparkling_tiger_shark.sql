CREATE TABLE `gm_grant_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`character_id` text NOT NULL,
	`command` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL
);
