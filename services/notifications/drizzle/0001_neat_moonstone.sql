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
ALTER TABLE "jobs" ADD COLUMN "plan_tasks_count" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "prereq_tasks_count" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_job_id_task_index_idx" ON "tasks" USING btree ("job_id","task_index");--> statement-breakpoint
CREATE INDEX "tasks_job_id_status_idx" ON "tasks" USING btree ("job_id","status");