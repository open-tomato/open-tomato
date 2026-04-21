CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'paused', 'completed', 'failed', 'cancelled', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."worker_status" AS ENUM('idle', 'busy', 'offline', 'error');--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" text,
	"source_id" text NOT NULL,
	"branch" text NOT NULL,
	"plan_checksum" text,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"plan_tasks_count" integer,
	"prereq_tasks_count" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"task_index" integer NOT NULL,
	"task_text" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"exit_code" integer
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" text PRIMARY KEY NOT NULL,
	"status" "worker_status" DEFAULT 'offline' NOT NULL,
	"address" text NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_worker_id_status_idx" ON "jobs" USING btree ("worker_id","status");--> statement-breakpoint
CREATE INDEX "jobs_source_id_idx" ON "jobs" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "tasks_job_id_task_index_idx" ON "tasks" USING btree ("job_id","task_index");--> statement-breakpoint
CREATE INDEX "tasks_job_id_status_idx" ON "tasks" USING btree ("job_id","status");