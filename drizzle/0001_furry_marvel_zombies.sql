CREATE TABLE `repository_world_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`refreshed_at` integer NOT NULL,
	`refresh_after` integer NOT NULL
);
