ALTER TABLE "jobs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nodes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "jobs" CASCADE;--> statement-breakpoint
DROP TABLE "nodes" CASCADE;--> statement-breakpoint
DROP TABLE "tasks" CASCADE;--> statement-breakpoint
ALTER TABLE "approvals" DROP CONSTRAINT "approvals_job_id_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_job_id_jobs_id_fk";
--> statement-breakpoint
DROP TYPE "public"."job_status";--> statement-breakpoint
DROP TYPE "public"."node_status";