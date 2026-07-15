CREATE TABLE "ai_insights" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "input_facts" JSONB NOT NULL,
  "output" JSONB NOT NULL,
  "raw_text" TEXT NOT NULL,
  "failure_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_insights_run_id_created_at_idx" ON "ai_insights" ("run_id", "created_at");
CREATE INDEX "ai_insights_project_id_created_at_idx" ON "ai_insights" ("project_id", "created_at");

ALTER TABLE "ai_insights"
ADD CONSTRAINT "ai_insights_run_id_fkey"
FOREIGN KEY ("run_id") REFERENCES "benchmark_runs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
