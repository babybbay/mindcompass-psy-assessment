CREATE TABLE `mc_maintenance` (
	`key` text PRIMARY KEY NOT NULL,
	`ran_at` integer NOT NULL,
	`expired_drafts` integer DEFAULT 0 NOT NULL,
	`deleted_attempts` integer DEFAULT 0 NOT NULL,
	`deleted_feedback` integer DEFAULT 0 NOT NULL,
	`deleted_participants` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "maintenance_key" CHECK("mc_maintenance"."key" IN ('scheduled','manual'))
);
