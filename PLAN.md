# Regressor99 Backend Implementation Plan

This plan focuses on building the full backend core before investing more time in the frontend. The goal is to make Regressor99 a real backend product with clean architecture, durable persistence, testable engines, and clear domain boundaries.

## Current Priority

Build the backend engines that make Regressor99 valuable:

```text
Projects
  -> Benchmark Suites
  -> Benchmark Runs
  -> Metrics
  -> Baselines
  -> Regression Detection
  -> Performance Budgets
  -> Deployment Decisions
```

Frontend work should stay minimal until the backend workflow is correct.

## Guiding Architecture

We will keep the backend as a modular monolith.

Why:

- Easier to build and understand at this stage.
- Keeps all domain logic in one deployable service.
- Avoids premature microservice complexity.
- Still allows clean module boundaries.
- Benchmark workers can be extracted later if needed.

Each backend module should follow this structure:

```text
modules/<feature>/
  <feature>.routes.ts
  <feature>.controller.ts
  <feature>.service.ts
  <feature>.repository.ts
  <feature>.schemas.ts
  <feature>.types.ts
  <feature>.policies.ts
  <feature>.test.ts
```

Rules:

- Routes define URLs.
- Controllers handle HTTP request and response.
- Schemas validate input.
- Services hold business rules.
- Repositories talk to Prisma.
- Policies handle authorization.
- Tests prove behavior.

## Backend Tech Stack

Core runtime:

- Node.js
- Express.js
- TypeScript

Database:

- PostgreSQL
- Prisma ORM
- Neon PostgreSQL for the primary cloud database.
- Docker PostgreSQL only as an optional local fallback or test database.

Validation:

- Zod

Authentication:

- JWT access tokens
- Refresh token rotation
- Password hashing with Argon2 or bcrypt

Testing:

- Vitest
- Supertest for API route tests
- Test database for integration tests

Background processing:

- Start with a database-backed job model.
- Redis becomes a Phase 2 infrastructure dependency for cacheable data.
- BullMQ on Redis remains a later upgrade path if job throughput, retries, or scheduling complexity demands it.

Benchmark execution:

- Use a runner adapter architecture.
- Start with an internal HTTP runner.
- Add k6 as an optional advanced runner backend after normalized metrics are stable.
- Support bring-your-own k6 result ingestion later.

Observability:

- Structured logging with Pino later.
- Health and readiness endpoints.
- Activity logs in PostgreSQL.

## Locked Architecture Decisions

These decisions are now part of the backend direction unless we explicitly revisit them.

### Cloud Database

Regressor99 will use Neon PostgreSQL as the primary database.

Rules:

- The app runtime uses `DATABASE_URL`.
- Prisma migrations use `DIRECT_URL`.
- `DATABASE_URL` should point to the pooled Neon connection string.
- `DIRECT_URL` should point to the direct Neon connection string.
- Docker PostgreSQL remains optional for local fallback and automated test isolation.

Why:

- We need production-shaped persistence early.
- We still use real PostgreSQL features.
- Neon works cleanly with Prisma.
- Cloud database setup better matches how the project will be defended and deployed.

Prisma datasource target:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Redis Cache Strategy

Regressor99 will adopt Redis in Phase 2 for cacheable data.

Rules:

- Redis is not the source of truth.
- PostgreSQL remains the durable system of record.
- Redis should be used only for cacheable, recomputable, or short-lived data.
- Cache keys must be tenant-aware and environment-aware where applicable.
- Writes must commit to PostgreSQL first and then update or invalidate Redis.
- Missing cache entries must always fall back to PostgreSQL-backed reads.
- We are not adopting Redis as the primary job queue in Phase 2.

Initial Redis use cases:

- Project dashboard summary caches.
- Recent benchmark run list caches.
- Regression list/query caches.
- Budget summary caches.
- Short-lived verification or rate-limit support data later if needed.

Why:

- Dashboard and list views will repeatedly read the same derived data.
- Redis gives us faster read paths without weakening data correctness.
- This lets us separate caching concerns from the eventual queueing decision.

### API Key Security

API keys are not global access tokens.

Rules:

- Store only API key hashes.
- Show raw API key only once.
- API keys belong to an organization.
- API keys may also be scoped to a single project.
- API keys must have explicit scopes.
- Revoked API keys must fail immediately.
- CI/CD routes must verify the key has permission for the requested project.

Initial scopes:

```text
deployments:create
benchmark_runs:create
benchmark_runs:read
projects:read
```

### Target Ownership Verification

Regressor99 must verify that a customer owns or controls a target API before benchmark runs are allowed.

We will support multiple verification methods so users have freedom based on their infrastructure.

Supported methods:

1. `.well-known` HTTP file verification.
2. DNS TXT record verification.
3. Verification response header.
4. Verification endpoint response body.
5. GitHub repository assisted verification later.

Benchmark runs are blocked until the target is verified.

Target verification statuses:

```text
PENDING
VERIFIED
FAILED
EXPIRED
REVOKED
```

### AI Analysis

AI is part of the product roadmap, but it must not replace deterministic backend engines.

Rules:

- Deterministic engines decide pass, warn, fail, and needs-review.
- AI explains, summarizes, and suggests.
- AI output never overrides `decisionStatus`.
- AI insights must be stored with input facts, prompt version, model, and generated output.
- AI analysis should run after metrics, budgets, regressions, and decisions exist.

AI use cases:

- Regression explanation.
- Root cause suggestions.
- Performance trend narrative.
- CI/CD summary.
- PR summary later.
- Benchmark suite suggestions later.

### Runner Strategy

Regressor99 will stand beside k6, not against it.

Rules:

- Regressor99 is not a generic load-testing replacement.
- k6 is an optional runner backend, not the product identity.
- The product owns baseline history, budget evaluation, regression records, deployment decisions, target ownership verification, audit logs, and AI analysis.
- Every runner must output normalized Regressor99 metrics.
- Runner adapters cannot directly decide pass, warn, fail, or needs-review.
- The deterministic engines make decisions after metrics are normalized.

Supported runner path:

```text
Benchmark Suite
  -> Runner Orchestrator
  -> Runner Adapter
      -> internal-http
      -> k6
      -> bring-your-own-k6-results
      -> autocannon later
      -> artillery later
  -> Normalized Metrics
  -> Baseline Engine
  -> Budget Engine
  -> Regression Engine
  -> Decision Engine
  -> AI Analysis
```

k6 integration options:

- Generate k6 script from Regressor99 suite.
- Run k6 inside a worker.
- Parse k6 summary output into normalized metrics.
- Accept k6 summary JSON uploaded from CI.
- Store original runner metadata for audit/debugging.

## Phase 1: Backend Foundation

Goal: make the API backend stable, testable, and ready for real modules.

Tasks:

- Finalize environment validation.
- Add request ID middleware.
- Add centralized logger.
- Improve error handling.
- Add async route handler helper.
- Add common response helpers.
- Add Zod validation middleware.
- Add database connection helper.
- Add base test setup.
- Add Supertest route test for `/health`.
- Add README backend commands.

Deliverables:

- API boots cleanly.
- Typecheck passes.
- Tests run.
- Health route is tested.
- Common backend utilities are ready.

Phase 1 foundation utilities:

- Request ID middleware.
- Structured request logger.
- Central logger.
- Async route handler helper.
- Zod request validation middleware.
- Stable error response shape with request IDs.
- Supertest API test harness.

## Phase 2: Data Foundation And Caching

Goal: turn the Prisma schema into a real data foundation and introduce Redis for cacheable reads.

Tasks:

- Add Neon PostgreSQL environment strategy.
- Add `DIRECT_URL` to Prisma datasource and env examples.
- Add Redis environment variables and connection strategy.
- Review `schema.prisma` model by model.
- Decide whether current schema is too large for first migration.
- Create the first migration.
- Add seed script.
- Add database reset command.
- Add transaction helper.
- Add Redis cache helper.
- Define cache key naming and invalidation rules.
- Identify which read paths are cacheable in the MVP and which must stay uncached.
- Document migration workflow.

Initial seed data:

- One user.
- One organization.
- One project.
- One benchmark suite.
- One performance budget.
- One active baseline.

Deliverables:

- `prisma migrate dev` works.
- `prisma db seed` works.
- Neon database can be migrated.
- Redis can connect locally and in deployed environments.
- Cacheable read paths have clear ownership and invalidation rules.
- Optional local/test database can be reset and rebuilt.

## Phase 3: Identity And Tenancy

Goal: implement users, organizations, membership, and auth.

Modules:

- `auth`
- `users`
- `organizations`
- `memberships`

Features:

- Register user.
- Create organization during registration.
- Login.
- Refresh token rotation.
- Logout.
- Password hashing.
- Auth middleware.
- Organization membership lookup.
- Role-based permissions.

Security rules:

- Store password hashes only.
- Store refresh token hashes only.
- Access tokens must be short-lived.
- Refresh tokens must be revocable.
- Every tenant-owned query must check organization access.

Tests:

- Register creates user, organization, and owner membership.
- Login rejects invalid credentials.
- Refresh token rotation invalidates old token.
- Viewer cannot perform admin-only actions.

## Phase 4: Project Engine

Goal: implement projects as the main deployable API service object.

Module:

- `projects`
- `target-verification`

Features:

- Create project.
- List organization projects.
- Get project.
- Update project.
- Archive project.
- Add target base URL.
- Generate target verification token.
- Verify target ownership.
- Revoke target verification.

Important rules:

- Project slugs must be unique inside an organization.
- Project access requires organization membership.
- Prefer archive over delete.
- Benchmark runs are blocked until target ownership is verified.
- Production must block private network and internal metadata targets.

Target verification methods:

1. `.well-known` file:

```text
https://api.example.com/.well-known/regressor99-verification.txt
```

Expected content:

```text
regressor99-verification=<verification-token>
```

2. DNS TXT record:

```text
_regressor99.api.example.com TXT "<verification-token>"
```

3. Verification header:

```text
X-Regressor99-Verify: <verification-token>
```

4. Verification endpoint JSON body:

```json
{
  "regressor99Verification": "<verification-token>"
}
```

5. GitHub assisted verification later:

```text
Regressor99 checks a connected repository for regressor99.yml or deployment metadata proving project ownership.
```

Tests:

- Owner/admin can create project.
- Viewer cannot create project.
- User cannot access another organization project.
- Unverified project cannot run benchmark.
- Verified project can run benchmark.
- Wrong verification token fails.
- Private/internal target URLs are rejected in production.

## Phase 5: Deployment Engine

Goal: track deployments so performance results can be connected to code changes.

Module:

- `deployments`

Features:

- Create deployment.
- List project deployments.
- Get deployment.
- Store commit SHA, branch, environment, version, and metadata.

Important rules:

- Deployment belongs to a project.
- Deployment must be organization-scoped.
- CI/CD can create deployments through API keys later.

Tests:

- Create deployment for project.
- Query deployments by project/environment.
- Reject cross-organization access.

## Phase 6: Benchmark Suite Engine

Goal: let users define reusable benchmark suites.

Modules:

- `benchmark-suites`
- `benchmark-suite-versions`
- `benchmark-endpoints`

Features:

- Create suite.
- Create suite version.
- Add endpoints.
- Store method, path, headers, query params, body, assertions, timeout.
- List suites.
- Get suite with latest version.
- Archive suite.

Important rules:

- Suite updates create immutable versions.
- Old runs must remain connected to the exact suite version used.
- JSONB is acceptable for flexible request definitions.

Tests:

- Creating suite creates version 1.
- Updating suite creates version 2.
- Old version remains unchanged.

## Phase 7: Performance Budget Engine

Goal: define acceptable performance rules.

Module:

- `performance-budgets`

Features:

- Create budget.
- List budgets.
- Update budget.
- Disable budget.
- Support p95 latency, p99 latency, average latency, error rate, and throughput.
- Support warn and fail thresholds.

Important rules:

- Budget tells us whether performance is acceptable.
- Budget is not the same as baseline comparison.
- Hard budget failure should fail the deployment decision.

Tests:

- p95 below warn threshold passes.
- p95 between warn and fail warns.
- p95 above fail fails.
- Error rate budget works.

## Phase 8: Benchmark Runner Engine

Goal: execute benchmark suites against target APIs and collect metrics.

Modules:

- `benchmark-runs`
- `runner`
- `runner-adapters`
- `jobs`

MVP runner behavior:

- Create run as `QUEUED`.
- Worker picks queued run.
- Worker executes suite endpoints.
- Worker measures latency.
- Worker counts successes and failures.
- Worker calculates average, p50, p95, p99, error rate, throughput, request count.
- Worker stores metrics.
- Worker marks run completed or failed.

Runner adapter interface:

```text
RunnerAdapter
  name
  validateSuite()
  executeRun()
  normalizeMetrics()
```

Initial adapters:

- `internal-http`
- `k6` later
- `k6-summary-ingest` later
- `autocannon` later
- `artillery` later

Internal HTTP runner capabilities:

- Warm-up requests.
- Fixed request count.
- Duration-based runs.
- Concurrency.
- Ramp-up.
- Per-request timeout.
- Basic response assertions.
- Endpoint-level metrics.
- Suite-level metrics.

Important technical choices:

- Use internal HTTP runner first.
- Use warm-up request before measured samples.
- Use timeouts.
- Store enough error detail to debug failed runs.
- Keep runner backend replaceable.
- Verify target ownership before executing any benchmark.
- Prevent SSRF by blocking private/internal IP ranges in production.
- Normalize all runner output before baseline, budget, regression, and decision engines run.

Tests:

- Runner computes metrics correctly.
- Failed HTTP responses increase error count.
- Timeout is treated as failure.
- Completed run stores metrics.
- Runner refuses unverified targets.
- Runner refuses unsafe target hosts.
- Runner adapter normalizes metrics into the Regressor99 metric shape.

## Phase 8B: k6 Adapter Engine

Goal: support teams that already use k6 or need advanced load-generation capability.

Module:

- `runner-adapters/k6`

Features:

- Generate k6 scripts from Regressor99 benchmark suites.
- Execute k6 from a worker process.
- Read k6 summary output.
- Convert k6 metrics into normalized Regressor99 metrics.
- Store original k6 summary JSON as runner metadata.
- Support bring-your-own k6 summary ingestion from CI.

Important rules:

- k6 does not replace the Regressor99 decision engine.
- k6 thresholds may be stored as runner metadata, but Regressor99 budgets remain the source of deployment decisions.
- k6 results must still be connected to organization, project, suite, deployment, baseline, and budget records.

Tests:

- Generated k6 script contains expected endpoint and load profile.
- k6 summary JSON maps correctly to normalized metrics.
- Missing required k6 metrics returns a stable validation error.
- Uploaded k6 summary cannot be attached to another organization's project.

## Phase 9: Baseline Engine

Goal: support active and historical performance baselines.

Module:

- `baselines`

Features:

- Get active baseline.
- Promote completed run to baseline.
- Deactivate previous active baseline.
- Store baseline metric snapshot.
- Store reason and approver.
- Keep baseline history.

Important rules:

- Baseline tells us what changed.
- Budget tells us whether the change is acceptable.
- Baseline promotion requires a reason.
- Never silently overwrite baseline history.

PostgreSQL feature:

- Use a partial unique index for one active baseline per suite/environment.

Tests:

- Promote run creates new baseline.
- Previous baseline becomes inactive.
- Promotion requires completed run.
- Future comparisons use new baseline.

## Phase 10: Regression Detection Engine

Goal: detect meaningful performance degradation compared with active baseline.

Module:

- `regressions`

Features:

- Compare run metrics to baseline metrics.
- Detect latency regression.
- Detect error-rate regression.
- Detect throughput regression.
- Calculate percentage change.
- Classify severity.
- Create regression records.

Initial deterministic rules:

- p95 increase >= 20% means latency regression.
- error rate increase > 0 means error-rate regression.
- throughput drop >= 20% means throughput regression.

Later improvements:

- Rolling baseline comparison.
- Confidence scoring.
- Noise detection.
- Statistical significance.

Tests:

- No regression when run is close to baseline.
- Regression is created when p95 increases significantly.
- Severity calculation works.
- Regression stores baseline and current values.

## Phase 11: Decision Engine

Goal: produce final deployment decisions.

Module:

- `decision-engine`

Inputs:

- Run execution status.
- Regression comparison.
- Budget evaluations.
- Exceptions.

Outputs:

- `PASSED`
- `WARNED`
- `FAILED`
- `NEEDS_REVIEW`

Rules:

- Execution failure means no valid performance decision.
- Hard budget failure means `FAILED`.
- Regression with passing budget means `NEEDS_REVIEW`.
- Soft budget warning means `WARNED`.
- No regression and budgets pass means `PASSED`.

Tests:

- Passing run returns `PASSED`.
- Regression but budget pass returns `NEEDS_REVIEW`.
- Budget failure returns `FAILED`.
- Soft warning returns `WARNED`.

## Phase 12: CI/CD API Key Engine

Goal: allow CI/CD systems to trigger benchmark runs safely.

Modules:

- `api-keys`
- `ci`

Features:

- Create API key.
- Store only key hash.
- Show raw key once.
- Scope key to organization or project.
- Add explicit API key scopes.
- Revoke API key.
- Trigger benchmark run through API key.

CI route:

```text
POST /api/v1/ci/benchmark-runs
```

Tests:

- API key can trigger scoped run.
- Revoked key is rejected.
- Key cannot access another project.
- Key without `benchmark_runs:create` cannot trigger runs.
- Key cannot trigger runs for unverified targets.

## Phase 13: Activity Log Engine

Goal: make important actions auditable.

Module:

- `activity-logs`

Events to log:

- User registered.
- Project created.
- Suite created or updated.
- Run triggered.
- Run completed.
- Baseline promoted.
- Budget changed.
- Regression detected.
- Exception approved.
- API key created or revoked.

Tests:

- Important service actions create activity logs.
- Activity logs are organization-scoped.

## Phase 14: Exception Engine

Goal: allow controlled release override for real-world cases.

Module:

- `decision-exceptions`

Features:

- Approve exception for a run.
- Require reason.
- Require admin or owner.
- Require expiration.
- Include exception in final decision context.

Tests:

- Admin can approve exception.
- Developer cannot approve exception.
- Expired exception no longer applies.

## Phase 15: AI Analysis Engine

Goal: add AI-assisted explanations and summaries without making AI the source of truth.

Module:

- `ai-analysis`

Features:

- Generate regression explanation.
- Generate run summary.
- Generate possible root cause suggestions.
- Generate CI/CD-friendly summary.
- Store AI insight records.
- Track prompt version and model.
- Allow users to regenerate an insight.

Important rules:

- AI reads facts produced by deterministic engines.
- AI cannot change `decisionStatus`.
- AI cannot silently create or resolve regressions.
- AI output should be labeled as assistance, not proof.
- AI prompts should include only necessary structured facts.

Suggested insight types:

```text
REGRESSION_EXPLANATION
ROOT_CAUSE_SUGGESTIONS
TREND_NARRATIVE
CI_SUMMARY
SUITE_RECOMMENDATION
```

Suggested table:

```text
ai_insights
  id
  organization_id
  project_id
  run_id
  regression_id
  insight_type
  prompt_version
  model
  input_facts
  output_text
  confidence_label
  created_at
```

Tests:

- AI insight can be created for a completed run.
- AI insight stores input facts and output.
- AI insight cannot override run decision.
- Cross-organization access is rejected.

## Backend API Route Roadmap

Initial route groups:

```text
/api/v1/auth
/api/v1/organizations
/api/v1/projects
/api/v1/projects/:projectId/target-verification
/api/v1/projects/:projectId/deployments
/api/v1/projects/:projectId/benchmark-suites
/api/v1/benchmark-suites/:suiteId/runs
/api/v1/benchmark-runs/:runId
/api/v1/benchmark-runs/:runId/metrics
/api/v1/benchmark-runs/:runId/runner-metadata
/api/v1/benchmark-runs/:runId/promote-baseline
/api/v1/projects/:projectId/performance-budgets
/api/v1/projects/:projectId/regressions
/api/v1/ci/benchmark-runs
/api/v1/ci/k6-summary
/api/v1/ai-insights
```

## Testing Strategy

Use three test levels.

### Unit Tests

For pure logic:

- Budget evaluation.
- Regression detection.
- Decision engine.
- Permission policies.
- Metric calculation.

### Integration Tests

For database behavior:

- Repositories.
- Transactions.
- Baseline promotion.
- Tenant isolation.
- Run completion writes.

### API Tests

For route behavior:

- Auth.
- Project CRUD.
- Suite creation.
- Run trigger.
- CI trigger.

## First Build Order

The first real backend implementation should happen in this order:

1. Backend utilities and test harness.
2. Neon PostgreSQL configuration, Prisma migration, Redis cache foundation, and seed.
3. Auth and organizations.
4. Projects and target ownership verification.
5. Benchmark suites.
6. Performance budgets.
7. Benchmark runs and metric calculation.
8. Runner adapter interface and internal HTTP runner.
9. Baseline promotion.
10. Regression detection.
11. Decision engine.
12. CI/CD API key trigger.
13. k6 summary ingestion.
14. k6 worker adapter.
15. Activity logs and exceptions.
16. AI analysis.

## What We Are Not Doing Yet

For now, do not prioritize:

- Full frontend polish.
- GitHub App integration.
- Billing.
- OpenAPI import.
- Postman import.
- Production traffic capture.
- Multi-region runners.
- BullMQ-based distributed job orchestration.
- Building a full custom load-testing language before the core regression workflow is stable.

These come after the backend core is reliable.

## Definition Of Done For Each Backend Module

A backend module is not done until:

- Routes exist.
- Inputs are validated with Zod.
- Business logic lives in services.
- Database access lives in repositories.
- Authorization is enforced.
- Tests cover success and failure paths.
- Errors use stable error codes.
- Activity logging is considered.
- Documentation is updated if API behavior changes.
