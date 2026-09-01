CREATE TABLE `arkham_characters` (
	`owner_id` text NOT NULL,
	`character_id` text NOT NULL,
	`name` text DEFAULT 'Unnamed Investigator' NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`owner_id`, `character_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_arkham_characters_owner_updated` ON `arkham_characters` (`owner_id`,`updated_at`);