CREATE TYPE "public"."approval_status" AS ENUM('pending', 'granted', 'denied', 'expired');--> statement-breakpoint
CREATE TYPE "public"."approval_type" AS ENUM('prerequisite', 'human-loop');--> statement-breakpoint
CREATE TYPE "public"."entity_kind" AS ENUM('executor', 'mail', 'push', 'reminder', 'prompt', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'paused', 'completed', 'failed', 'cancelled', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."node_status" AS ENUM('idle', 'busy', 'offline', 'error');--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"entity_kind" "entity_kind" NOT NULL,
	"approval_type" "approval_type" NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"description" text NOT NULL,
	"options" jsonb,
	"decision_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"entity_kind" "entity_kind" NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_id" text NOT NULL,
	"entity_kind" "entity_kind" DEFAULT 'executor' NOT NULL,
	"source_id" text NOT NULL,
	"branch" text NOT NULL,
	"plan_checksum" text,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"status" "node_status" DEFAULT 'offline' NOT NULL,
	"address" text NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approvals_job_id_status_idx" ON "approvals" USING btree ("job_id","status");--> statement-breakpoint
CREATE INDEX "approvals_status_idx" ON "approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_job_id_created_at_idx" ON "events" USING btree ("job_id","created_at");--> statement-breakpoint
CREATE INDEX "events_entity_kind_idx" ON "events" USING btree ("entity_kind");--> statement-breakpoint
CREATE INDEX "jobs_node_id_status_idx" ON "jobs" USING btree ("node_id","status");--> statement-breakpoint
CREATE INDEX "jobs_source_id_idx" ON "jobs" USING btree ("source_id");