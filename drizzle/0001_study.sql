-- Additive generated migration; existing responses table is preserved.
CREATE TABLE `mc_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`scale_id` text NOT NULL,
	`scale_version` text NOT NULL,
	`consent_version` text NOT NULL,
	`request_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`answers_json` text DEFAULT '{}' NOT NULL,
	`scores_json` text,
	`cursor` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`participant_id`) REFERENCES `mc_participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scale_id`,`scale_version`) REFERENCES `mc_scale_versions`(`scale_id`,`version`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "status_valid" CHECK("mc_attempts"."status" IN ('draft','completed','withdrawn','expired')),
	CONSTRAINT "cursor_valid" CHECK("mc_attempts"."cursor">=0),
	CONSTRAINT "answers_valid" CHECK(json_valid("mc_attempts"."answers_json")),
	CONSTRAINT "scores_valid" CHECK("mc_attempts"."scores_json" IS NULL OR json_valid("mc_attempts"."scores_json")),
	CONSTRAINT "completion_valid" CHECK(("mc_attempts"."status"='completed' AND "mc_attempts"."scores_json" IS NOT NULL AND "mc_attempts"."completed_at" IS NOT NULL) OR ("mc_attempts"."status"<>'completed' AND "mc_attempts"."scores_json" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mc_request_unique` ON `mc_attempts` (`participant_id`,`scale_id`,`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `mc_one_draft` ON `mc_attempts` (`participant_id`,`scale_id`) WHERE "mc_attempts"."status"='draft';--> statement-breakpoint
CREATE INDEX `mc_analysis` ON `mc_attempts` (`scale_id`,`scale_version`,`status`,`started_at`);--> statement-breakpoint
CREATE TABLE `mc_consents` (
	`participant_id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`accepted_at` integer NOT NULL,
	`adult_confirmed` integer NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `mc_participants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "adult_confirmed" CHECK("mc_consents"."adult_confirmed"=1)
);
--> statement-breakpoint
CREATE TABLE `mc_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`category` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `mc_participants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "feedback_category" CHECK("mc_feedback"."category" IN ('wording','navigation','saving','results','privacy'))
);
--> statement-breakpoint
CREATE TABLE `mc_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mc_participants_token_hash_unique` ON `mc_participants` (`token_hash`);--> statement-breakpoint
CREATE TABLE `mc_scale_versions` (
	`scale_id` text NOT NULL,
	`version` text NOT NULL,
	`config_json` text NOT NULL,
	`config_hash` text NOT NULL,
	PRIMARY KEY(`scale_id`, `version`),
	CONSTRAINT "config_json_valid" CHECK(json_valid("mc_scale_versions"."config_json"))
);

