CREATE TABLE `road_registrations` (
	`name` text PRIMARY KEY NOT NULL,
	`payload` text,
	`checked_at` integer NOT NULL,
	`refresh_after` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_road_refresh` ON `road_registrations` (`refresh_after`);--> statement-breakpoint
CREATE TABLE `road_submission_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_road_limits_time` ON `road_submission_limits` (`updated_at`);