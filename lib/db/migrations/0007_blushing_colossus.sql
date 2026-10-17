PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_libraries` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`filename` text NOT NULL,
	`media_type` text NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`extracted_text` text,
	`type` text DEFAULT 'reference' NOT NULL,
	`url` text,
	`include_in_context` integer DEFAULT true NOT NULL,
	`added_by` text DEFAULT 'User' NOT NULL,
	`thread_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thread_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_libraries`("id", "project_id", "filename", "media_type", "size_bytes", "extracted_text", "type", "url", "include_in_context", "added_by", "thread_id", "created_at", "updated_at") SELECT "id", "project_id", "filename", "media_type", "size_bytes", "extracted_text", "type", "url", "include_in_context", "added_by", "thread_id", "created_at", "updated_at" FROM `libraries`;--> statement-breakpoint
DROP TABLE `libraries`;--> statement-breakpoint
ALTER TABLE `__new_libraries` RENAME TO `libraries`;--> statement-breakpoint
ALTER TABLE `conversations` DROP COLUMN `agent_id`;--> statement-breakpoint
DROP TABLE `agent_skills`;--> statement-breakpoint
DROP TABLE `agents`;--> statement-breakpoint
DROP TABLE `skills`;--> statement-breakpoint
PRAGMA foreign_keys=ON;