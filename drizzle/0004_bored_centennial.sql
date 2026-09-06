CREATE TABLE `chicken_schedule` (
	`id` integer PRIMARY KEY NOT NULL,
	`round` integer NOT NULL,
	`stop_at` integer NOT NULL,
	`started_at` integer NOT NULL,
	`depart_at` integer NOT NULL,
	`crossing_count` integer NOT NULL,
	`base_distance` integer NOT NULL
);
