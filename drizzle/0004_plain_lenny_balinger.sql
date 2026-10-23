CREATE TABLE `equipment_catalog_backups` (
	`owner` text NOT NULL,
	`catalog_version` text NOT NULL,
	`payload` text NOT NULL,
	`original_revision` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`owner`, `catalog_version`)
);
