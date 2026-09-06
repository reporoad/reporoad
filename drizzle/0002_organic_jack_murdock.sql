CREATE TABLE `visitor_presence` (
	`id` text PRIMARY KEY NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_presence_last_seen` ON `visitor_presence` (`last_seen`);