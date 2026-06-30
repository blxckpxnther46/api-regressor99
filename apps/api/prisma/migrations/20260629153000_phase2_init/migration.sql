-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER');

-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS');

-- CreateEnum
CREATE TYPE "TriggerSource" AS ENUM ('MANUAL', 'API', 'CI_CD', 'WEBHOOK', 'GITHUB_ACTIONS');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('PASSED', 'WARNED', 'FAILED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "BudgetMetric" AS ENUM ('AVERAGE_LATENCY', 'P50_LATENCY', 'P95_LATENCY', 'P99_LATENCY', 'ERROR_RATE', 'THROUGHPUT');

-- CreateEnum
CREATE TYPE "BudgetOperator" AS ENUM ('LESS_THAN', 'LESS_THAN_OR_EQUAL', 'GREATER_THAN', 'GREATER_THAN_OR_EQUAL');

-- CreateEnum
CREATE TYPE "BudgetResult" AS ENUM ('PASS', 'WARN', 'FAIL');

-- CreateEnum
CREATE TYPE "RegressionType" AS ENUM ('LATENCY', 'ERROR_RATE', 'THROUGHPUT');

-- CreateEnum
CREATE TYPE "RegressionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RegressionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ACCEPTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_token_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "default_base_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "commit_sha" TEXT,
    "branch" TEXT,
    "version" TEXT,
    "deploy_reference" TEXT,
    "deployed_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_suites" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target_base_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benchmark_suites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_suite_versions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "suite_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "load_profile" JSONB NOT NULL,
    "config_hash" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_suite_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_endpoints" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "suite_version_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL,
    "path" TEXT NOT NULL,
    "headers" JSONB,
    "query_params" JSONB,
    "body" JSONB,
    "expected_status" INTEGER NOT NULL,
    "assertions" JSONB,
    "timeout_ms" INTEGER NOT NULL DEFAULT 5000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "suite_id" TEXT NOT NULL,
    "suite_version_id" TEXT NOT NULL,
    "deployment_id" TEXT,
    "triggered_by_user_id" TEXT,
    "triggered_by_api_key_id" TEXT,
    "trigger_source" "TriggerSource" NOT NULL,
    "environment" TEXT NOT NULL,
    "target_base_url" TEXT NOT NULL,
    "execution_status" "ExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "decision_status" "DecisionStatus",
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benchmark_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_run_metrics" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "endpoint_id" TEXT,
    "request_count" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL,
    "error_count" INTEGER NOT NULL,
    "average_latency_ms" DOUBLE PRECISION NOT NULL,
    "p50_latency_ms" DOUBLE PRECISION NOT NULL,
    "p95_latency_ms" DOUBLE PRECISION NOT NULL,
    "p99_latency_ms" DOUBLE PRECISION NOT NULL,
    "min_latency_ms" DOUBLE PRECISION NOT NULL,
    "max_latency_ms" DOUBLE PRECISION NOT NULL,
    "throughput_rps" DOUBLE PRECISION NOT NULL,
    "error_rate" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_run_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baselines" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "suite_id" TEXT NOT NULL,
    "suite_version_id" TEXT NOT NULL,
    "source_run_id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT NOT NULL,
    "promoted_by_user_id" TEXT,
    "active_from" TIMESTAMP(3) NOT NULL,
    "active_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baseline_metrics" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "baseline_id" TEXT NOT NULL,
    "endpoint_id" TEXT,
    "request_count" INTEGER NOT NULL,
    "average_latency_ms" DOUBLE PRECISION NOT NULL,
    "p50_latency_ms" DOUBLE PRECISION NOT NULL,
    "p95_latency_ms" DOUBLE PRECISION NOT NULL,
    "p99_latency_ms" DOUBLE PRECISION NOT NULL,
    "throughput_rps" DOUBLE PRECISION NOT NULL,
    "error_rate" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baseline_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_budgets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "suite_id" TEXT,
    "endpoint_id" TEXT,
    "name" TEXT NOT NULL,
    "metric" "BudgetMetric" NOT NULL,
    "operator" "BudgetOperator" NOT NULL,
    "warn_threshold" DOUBLE PRECISION,
    "fail_threshold" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "is_hard" BOOLEAN NOT NULL DEFAULT true,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_evaluations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "metric" "BudgetMetric" NOT NULL,
    "actual_value" DOUBLE PRECISION NOT NULL,
    "warn_threshold" DOUBLE PRECISION,
    "fail_threshold" DOUBLE PRECISION NOT NULL,
    "result" "BudgetResult" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regressions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "baseline_id" TEXT NOT NULL,
    "endpoint_id" TEXT,
    "deployment_id" TEXT,
    "type" "RegressionType" NOT NULL,
    "metric" "BudgetMetric" NOT NULL,
    "baseline_value" DOUBLE PRECISION NOT NULL,
    "current_value" DOUBLE PRECISION NOT NULL,
    "change_percent" DOUBLE PRECISION NOT NULL,
    "severity" "RegressionSeverity" NOT NULL,
    "status" "RegressionStatus" NOT NULL DEFAULT 'OPEN',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_by_user_id" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_by_user_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_exceptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "approved_by_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_api_key_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_members_user_id_organization_id_idx" ON "organization_members"("user_id", "organization_id");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_role_idx" ON "organization_members"("organization_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_expires_at_idx" ON "refresh_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "projects_organization_id_created_at_idx" ON "projects"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organization_id_slug_key" ON "projects"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "deployments_project_id_deployed_at_idx" ON "deployments"("project_id", "deployed_at");

-- CreateIndex
CREATE INDEX "deployments_project_id_environment_deployed_at_idx" ON "deployments"("project_id", "environment", "deployed_at");

-- CreateIndex
CREATE INDEX "deployments_project_id_commit_sha_idx" ON "deployments"("project_id", "commit_sha");

-- CreateIndex
CREATE INDEX "benchmark_suites_project_id_created_at_idx" ON "benchmark_suites"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "benchmark_suites_project_id_is_active_idx" ON "benchmark_suites"("project_id", "is_active");

-- CreateIndex
CREATE INDEX "benchmark_suite_versions_suite_id_version_number_idx" ON "benchmark_suite_versions"("suite_id", "version_number");

-- CreateIndex
CREATE INDEX "benchmark_suite_versions_suite_id_created_at_idx" ON "benchmark_suite_versions"("suite_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "benchmark_suite_versions_suite_id_version_number_key" ON "benchmark_suite_versions"("suite_id", "version_number");

-- CreateIndex
CREATE INDEX "benchmark_endpoints_suite_version_id_idx" ON "benchmark_endpoints"("suite_version_id");

-- CreateIndex
CREATE INDEX "benchmark_runs_project_id_created_at_idx" ON "benchmark_runs"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "benchmark_runs_project_id_environment_created_at_idx" ON "benchmark_runs"("project_id", "environment", "created_at");

-- CreateIndex
CREATE INDEX "benchmark_runs_suite_id_created_at_idx" ON "benchmark_runs"("suite_id", "created_at");

-- CreateIndex
CREATE INDEX "benchmark_runs_project_id_execution_status_created_at_idx" ON "benchmark_runs"("project_id", "execution_status", "created_at");

-- CreateIndex
CREATE INDEX "benchmark_runs_project_id_decision_status_created_at_idx" ON "benchmark_runs"("project_id", "decision_status", "created_at");

-- CreateIndex
CREATE INDEX "benchmark_runs_deployment_id_idx" ON "benchmark_runs"("deployment_id");

-- CreateIndex
CREATE INDEX "benchmark_run_metrics_run_id_idx" ON "benchmark_run_metrics"("run_id");

-- CreateIndex
CREATE INDEX "benchmark_run_metrics_run_id_endpoint_id_idx" ON "benchmark_run_metrics"("run_id", "endpoint_id");

-- CreateIndex
CREATE INDEX "benchmark_run_metrics_endpoint_id_created_at_idx" ON "benchmark_run_metrics"("endpoint_id", "created_at");

-- CreateIndex
CREATE INDEX "baselines_suite_id_environment_is_active_idx" ON "baselines"("suite_id", "environment", "is_active");

-- CreateIndex
CREATE INDEX "baselines_project_id_environment_created_at_idx" ON "baselines"("project_id", "environment", "created_at");

-- CreateIndex
CREATE INDEX "baselines_source_run_id_idx" ON "baselines"("source_run_id");

-- CreateIndex
CREATE INDEX "baseline_metrics_baseline_id_idx" ON "baseline_metrics"("baseline_id");

-- CreateIndex
CREATE INDEX "baseline_metrics_baseline_id_endpoint_id_idx" ON "baseline_metrics"("baseline_id", "endpoint_id");

-- CreateIndex
CREATE INDEX "performance_budgets_project_id_is_enabled_idx" ON "performance_budgets"("project_id", "is_enabled");

-- CreateIndex
CREATE INDEX "performance_budgets_suite_id_is_enabled_idx" ON "performance_budgets"("suite_id", "is_enabled");

-- CreateIndex
CREATE INDEX "performance_budgets_endpoint_id_is_enabled_idx" ON "performance_budgets"("endpoint_id", "is_enabled");

-- CreateIndex
CREATE INDEX "budget_evaluations_run_id_idx" ON "budget_evaluations"("run_id");

-- CreateIndex
CREATE INDEX "budget_evaluations_budget_id_created_at_idx" ON "budget_evaluations"("budget_id", "created_at");

-- CreateIndex
CREATE INDEX "budget_evaluations_run_id_result_idx" ON "budget_evaluations"("run_id", "result");

-- CreateIndex
CREATE INDEX "regressions_project_id_created_at_idx" ON "regressions"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "regressions_project_id_status_created_at_idx" ON "regressions"("project_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "regressions_run_id_idx" ON "regressions"("run_id");

-- CreateIndex
CREATE INDEX "regressions_deployment_id_idx" ON "regressions"("deployment_id");

-- CreateIndex
CREATE INDEX "regressions_severity_created_at_idx" ON "regressions"("severity", "created_at");

-- CreateIndex
CREATE INDEX "decision_exceptions_project_id_expires_at_idx" ON "decision_exceptions"("project_id", "expires_at");

-- CreateIndex
CREATE INDEX "decision_exceptions_run_id_idx" ON "decision_exceptions"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_organization_id_project_id_idx" ON "api_keys"("organization_id", "project_id");

-- CreateIndex
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");

-- CreateIndex
CREATE INDEX "activity_logs_organization_id_created_at_idx" ON "activity_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_created_at_idx" ON "activity_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_actor_user_id_created_at_idx" ON "activity_logs"("actor_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_suites" ADD CONSTRAINT "benchmark_suites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_suite_versions" ADD CONSTRAINT "benchmark_suite_versions_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "benchmark_suites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_suite_versions" ADD CONSTRAINT "benchmark_suite_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_endpoints" ADD CONSTRAINT "benchmark_endpoints_suite_version_id_fkey" FOREIGN KEY ("suite_version_id") REFERENCES "benchmark_suite_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "benchmark_suites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_suite_version_id_fkey" FOREIGN KEY ("suite_version_id") REFERENCES "benchmark_suite_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_triggered_by_api_key_id_fkey" FOREIGN KEY ("triggered_by_api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_run_metrics" ADD CONSTRAINT "benchmark_run_metrics_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "benchmark_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_run_metrics" ADD CONSTRAINT "benchmark_run_metrics_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "benchmark_endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "benchmark_suites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_suite_version_id_fkey" FOREIGN KEY ("suite_version_id") REFERENCES "benchmark_suite_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_source_run_id_fkey" FOREIGN KEY ("source_run_id") REFERENCES "benchmark_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_promoted_by_user_id_fkey" FOREIGN KEY ("promoted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baseline_metrics" ADD CONSTRAINT "baseline_metrics_baseline_id_fkey" FOREIGN KEY ("baseline_id") REFERENCES "baselines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baseline_metrics" ADD CONSTRAINT "baseline_metrics_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "benchmark_endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_budgets" ADD CONSTRAINT "performance_budgets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_budgets" ADD CONSTRAINT "performance_budgets_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "benchmark_suites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_budgets" ADD CONSTRAINT "performance_budgets_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "benchmark_endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_evaluations" ADD CONSTRAINT "budget_evaluations_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "benchmark_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_evaluations" ADD CONSTRAINT "budget_evaluations_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "performance_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regressions" ADD CONSTRAINT "regressions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regressions" ADD CONSTRAINT "regressions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "benchmark_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regressions" ADD CONSTRAINT "regressions_baseline_id_fkey" FOREIGN KEY ("baseline_id") REFERENCES "baselines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regressions" ADD CONSTRAINT "regressions_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "benchmark_endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regressions" ADD CONSTRAINT "regressions_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regressions" ADD CONSTRAINT "regressions_acknowledged_by_user_id_fkey" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regressions" ADD CONSTRAINT "regressions_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_exceptions" ADD CONSTRAINT "decision_exceptions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_exceptions" ADD CONSTRAINT "decision_exceptions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "benchmark_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_exceptions" ADD CONSTRAINT "decision_exceptions_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_api_key_id_fkey" FOREIGN KEY ("actor_api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "baselines_one_active_per_suite_env_idx"
ON "baselines"("suite_id", "environment")
WHERE "is_active" = true;
