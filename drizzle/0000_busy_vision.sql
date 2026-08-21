CREATE TABLE `tyov_chronicles` (
	`owner_id` text NOT NULL,
	`chronicle_id` text DEFAULT 'primary' NOT NULL,
	`title` text DEFAULT 'Unnamed Vampire' NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`owner_id`, `chronicle_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_tyov_chronicles_owner_updated` ON `tyov_chronicles` (`owner_id`,`updated_at`);