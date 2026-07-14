CREATE UNIQUE INDEX "baselines_one_active_per_suite_environment"
ON "baselines" ("suite_id", "environment")
WHERE "is_active" = true;

