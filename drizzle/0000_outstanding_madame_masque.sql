CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`city` text NOT NULL,
	`purpose` text NOT NULL,
	`story` text NOT NULL,
	`consent_version` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_applications_email_created` ON `applications` (`email`,`created_at`);