CREATE TYPE "public"."plan_status" AS ENUM('backlog', 'ready', 'dispatched', 'running', 'completed', 'failed', 'cancelled', 'blocked', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."requirement_status" AS ENUM('pending_validation', 'validated', 'planning', 'planned', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."roadmap_status" AS ENUM('draft', 'ready', 'running', 'completed', 'failed', 'cancelled', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'running', 'done', 'failed', 'blocked');--> statement-breakpoint
CREATE TABLE "execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid,
	"roadmap_id" uuid,
	"event_type" text NOT NULL,
	"status_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"depends_on_plan_id" uuid NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"repository" text NOT NULL,
	"branch" text,
	"status" "plan_status" DEFAULT 'backlog' NOT NULL,
	"executor_job_id" uuid,
	"plan_checksum" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_metadata" jsonb,
	"name" text NOT NULL,
	"description" text,
	"repository" text,
	"identifier" text,
	"status" "requirement_status" DEFAULT 'pending_validation' NOT NULL,
	"validation_issues" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"execution_order" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "roadmap_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"task_index" integer NOT NULL,
	"task_text" text NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"exit_code" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_dependencies" ADD CONSTRAINT "plan_dependencies_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_dependencies" ADD CONSTRAINT "plan_dependencies_depends_on_plan_id_plans_id_fk" FOREIGN KEY ("depends_on_plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_plans" ADD CONSTRAINT "roadmap_plans_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_plans" ADD CONSTRAINT "roadmap_plans_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "execution_logs_plan_id_idx" ON "execution_logs" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "execution_logs_roadmap_id_idx" ON "execution_logs" USING btree ("roadmap_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_dependencies_unique_idx" ON "plan_dependencies" USING btree ("plan_id","depends_on_plan_id");--> statement-breakpoint
CREATE INDEX "plans_requirement_id_idx" ON "plans" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "plans_status_idx" ON "plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "plans_executor_job_id_idx" ON "plans" USING btree ("executor_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "requirements_entity_type_entity_id_idx" ON "requirements" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "requirements_status_idx" ON "requirements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "requirements_identifier_idx" ON "requirements" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_plans_roadmap_order_idx" ON "roadmap_plans" USING btree ("roadmap_id","execution_order");--> statement-breakpoint
CREATE INDEX "roadmap_plans_plan_id_idx" ON "roadmap_plans" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "tasks_plan_id_task_index_idx" ON "tasks" USING btree ("plan_id","task_index");--> statement-breakpoint
CREATE INDEX "tasks_plan_id_status_idx" ON "tasks" USING btree ("plan_id","status");