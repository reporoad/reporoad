CREATE TABLE `chicken_clicks` (
	`id` text NOT NULL,
	`round` integer NOT NULL,
	`total` integer NOT NULL,
	PRIMARY KEY(`id`, `round`)
);
--> statement-breakpoint
CREATE INDEX `idx_chicken_round` ON `chicken_clicks` (`round`);--> statement-breakpoint
CREATE TABLE `chicken_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` integer NOT NULL,
	`nonce` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chicken_limits_time` ON `chicken_limits` (`updated_at`);