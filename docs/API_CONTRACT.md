# Regressor99 API Contract

This document defines the initial REST API shape for Regressor99. It should guide route implementation, frontend client functions, CI/CD integration, and tests.

## API Principles

- Use REST for the MVP.
- Version all routes under `/api/v1`.
- Validate every request body, query parameter, and route parameter.
- Enforce authentication and organization authorization consistently.
- Return stable response and error shapes.
- Use cursor pagination for event-heavy lists.
- Keep CI/CD endpoints simple and reliable.

## Base URL

Local development:

```text
http://localhost:4000/api/v1
```

Production:

```text
https://api.regressor99.com/api/v1
```

## Authentication Methods

### User Session

Used by the web app.

Expected flow:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

Access tokens are short-lived. Refresh tokens are rotated and stored server-side as hashes.

### API Key

Used by CI/CD and integrations.

Header:

```text
Authorization: Bearer r99_live_xxxxx
```

API keys should be scoped to an organization or project.

## Standard Response Shape

Success:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Error:

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found.",
    "details": {}
  }
}
```

## Common HTTP Status Codes

```text
200 OK
201 Created
202 Accepted
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
429 Rate Limited
500 Internal Server Error
```

## Pagination

Use cursor pagination for lists.

Request:

```text
GET /api/v1/projects/:projectId/benchmark-runs?limit=20&cursor=run_123
```

Response:

```json
{
  "data": [],
  "meta": {
    "nextCursor": "run_456",
    "hasMore": true
  },
  "error": null
}
```

## Error Codes

Initial error code families:

```text
AUTH_INVALID_CREDENTIALS
AUTH_TOKEN_EXPIRED
AUTH_FORBIDDEN
VALIDATION_ERROR
ORGANIZATION_NOT_FOUND
PROJECT_NOT_FOUND
SUITE_NOT_FOUND
RUN_NOT_FOUND
BASELINE_NOT_FOUND
BUDGET_NOT_FOUND
REGRESSION_NOT_FOUND
API_KEY_REVOKED
CONFLICT
INTERNAL_ERROR
```

## Auth Routes

### Register

```text
POST /api/v1/auth/register
```

Request:

```json
{
  "name": "Laksh",
  "email": "laksh@example.com",
  "password": "strong-password",
  "organizationName": "Acme Engineering"
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": "user_123",
      "email": "laksh@example.com",
      "name": "Laksh"
    },
    "organization": {
      "id": "org_123",
      "name": "Acme Engineering"
    },
    "accessToken": "jwt"
  },
  "meta": {},
  "error": null
}
```

### Login

```text
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "laksh@example.com",
  "password": "strong-password"
}
```

### Refresh

```text
POST /api/v1/auth/refresh
```

Refresh token transport can be finalized during implementation. Prefer secure HTTP-only cookies for web sessions.

### Logout

```text
POST /api/v1/auth/logout
```

Revokes the active refresh token.

## Organization Routes

### List My Organizations

```text
GET /api/v1/organizations
```

### Get Organization

```text
GET /api/v1/organizations/:organizationId
```

### List Members

```text
GET /api/v1/organizations/:organizationId/members
```

### Invite Or Add Member

```text
POST /api/v1/organizations/:organizationId/members
```

Request:

```json
{
  "email": "teammate@example.com",
  "role": "DEVELOPER"
}
```

MVP note:

- We can start with direct member creation for existing users.
- Email invites can come later.

### Update Member Role

```text
PATCH /api/v1/organizations/:organizationId/members/:memberId
```

Request:

```json
{
  "role": "ADMIN"
}
```

## Project Routes

### Create Project

```text
POST /api/v1/projects
```

Request:

```json
{
  "organizationId": "org_123",
  "name": "Payment API",
  "slug": "payment-api",
  "description": "Handles payment authorization and capture.",
  "defaultBaseUrl": "https://staging-api.example.com"
}
```

### List Projects

```text
GET /api/v1/projects?organizationId=org_123
```

### Get Project

```text
GET /api/v1/projects/:projectId
```

### Update Project

```text
PATCH /api/v1/projects/:projectId
```

### Delete Or Archive Project

```text
DELETE /api/v1/projects/:projectId
```

MVP recommendation:

- Prefer soft archive over hard delete once related run history exists.

## Deployment Routes

### Create Deployment

```text
POST /api/v1/projects/:projectId/deployments
```

Request:

```json
{
  "environment": "staging",
  "commitSha": "abc123",
  "branch": "main",
  "version": "v1.4.2",
  "deployReference": "railway_dep_123",
  "deployedAt": "2026-05-30T12:00:00.000Z",
  "metadata": {
    "provider": "railway"
  }
}
```

### List Deployments

```text
GET /api/v1/projects/:projectId/deployments
```

### Get Deployment

```text
GET /api/v1/deployments/:deploymentId
```

## Benchmark Suite Routes

### Create Suite

```text
POST /api/v1/projects/:projectId/benchmark-suites
```

Request:

```json
{
  "name": "Checkout Critical Path",
  "description": "Validates checkout performance after deploy.",
  "targetBaseUrl": "https://staging-api.example.com",
  "loadProfile": {
    "virtualUsers": 25,
    "durationSeconds": 60,
    "rampUpSeconds": 10
  },
  "endpoints": [
    {
      "name": "Create Payment",
      "method": "POST",
      "path": "/payments",
      "headers": {
        "Content-Type": "application/json"
      },
      "queryParams": {},
      "body": {
        "amount": 1000,
        "currency": "USD"
      },
      "expectedStatus": 201,
      "timeoutMs": 5000,
      "assertions": []
    }
  ]
}
```

Response:

```json
{
  "data": {
    "id": "suite_123",
    "latestVersionId": "suite_version_123"
  },
  "meta": {},
  "error": null
}
```

### List Suites

```text
GET /api/v1/projects/:projectId/benchmark-suites
```

### Get Suite

```text
GET /api/v1/benchmark-suites/:suiteId
```

### Update Suite

```text
PATCH /api/v1/benchmark-suites/:suiteId
```

Important:

- Updating a suite should create a new immutable suite version.

### Archive Suite

```text
DELETE /api/v1/benchmark-suites/:suiteId
```

## Benchmark Run Routes

### Trigger Run

```text
POST /api/v1/benchmark-runs
```

Used by UI, API clients, and CI/CD.

Request:

```json
{
  "projectId": "project_123",
  "suiteId": "suite_123",
  "deploymentId": "deployment_123",
  "environment": "staging",
  "targetBaseUrl": "https://staging-api.example.com",
  "metadata": {
    "commitSha": "abc123",
    "branch": "main",
    "source": "github-actions"
  }
}
```

Response:

```json
{
  "data": {
    "runId": "run_123",
    "executionStatus": "QUEUED",
    "decisionStatus": null
  },
  "meta": {},
  "error": null
}
```

### CI/CD Trigger Shortcut

```text
POST /api/v1/ci/benchmark-runs
```

This route can create or find a deployment and trigger a run in one request.

Request:

```json
{
  "projectId": "project_123",
  "suiteId": "suite_123",
  "environment": "staging",
  "commitSha": "abc123",
  "branch": "main",
  "version": "v1.4.2",
  "deployReference": "github_run_123",
  "targetBaseUrl": "https://staging-api.example.com"
}
```

Response:

```json
{
  "data": {
    "deploymentId": "deployment_123",
    "runId": "run_123",
    "executionStatus": "QUEUED",
    "statusUrl": "https://app.regressor99.com/projects/project_123/runs/run_123"
  },
  "meta": {},
  "error": null
}
```

### Get Run

```text
GET /api/v1/benchmark-runs/:runId
```

### List Project Runs

```text
GET /api/v1/projects/:projectId/benchmark-runs
```

Filters:

```text
environment
suiteId
executionStatus
decisionStatus
cursor
limit
```

### Get Run Metrics

```text
GET /api/v1/benchmark-runs/:runId/metrics
```

### Cancel Run

```text
POST /api/v1/benchmark-runs/:runId/cancel
```

## Baseline Routes

### List Baselines

```text
GET /api/v1/benchmark-suites/:suiteId/baselines?environment=staging
```

### Get Active Baseline

```text
GET /api/v1/benchmark-suites/:suiteId/baselines/active?environment=staging
```

### Promote Run To Baseline

```text
POST /api/v1/benchmark-runs/:runId/promote-baseline
```

Request:

```json
{
  "reason": "Expected performance shift after adding fraud scoring."
}
```

Response:

```json
{
  "data": {
    "baselineId": "baseline_123",
    "versionNumber": 2,
    "isActive": true
  },
  "meta": {},
  "error": null
}
```

Rules:

- Requires completed run.
- Requires permission.
- Deactivates previous active baseline in the same comparable scope.
- Creates activity log.

## Performance Budget Routes

### Create Budget

```text
POST /api/v1/projects/:projectId/performance-budgets
```

Request:

```json
{
  "suiteId": "suite_123",
  "endpointId": null,
  "name": "Checkout p95 budget",
  "metric": "P95_LATENCY",
  "operator": "LESS_THAN",
  "warnThreshold": 220,
  "failThreshold": 300,
  "unit": "ms",
  "isHard": true
}
```

### List Budgets

```text
GET /api/v1/projects/:projectId/performance-budgets
```

### Update Budget

```text
PATCH /api/v1/performance-budgets/:budgetId
```

### Disable Budget

```text
DELETE /api/v1/performance-budgets/:budgetId
```

MVP note:

- Prefer disabling over deleting to preserve history.

### Get Run Budget Evaluations

```text
GET /api/v1/benchmark-runs/:runId/budget-evaluations
```

## Regression Routes

### List Project Regressions

```text
GET /api/v1/projects/:projectId/regressions
```

Filters:

```text
status
severity
metric
cursor
limit
```

### Get Regression

```text
GET /api/v1/regressions/:regressionId
```

### Acknowledge Regression

```text
POST /api/v1/regressions/:regressionId/acknowledge
```

Request:

```json
{
  "note": "Investigating database query change in checkout flow."
}
```

### Resolve Regression

```text
POST /api/v1/regressions/:regressionId/resolve
```

Request:

```json
{
  "resolutionReason": "Optimized payment lookup query."
}
```

### Accept Regression

```text
POST /api/v1/regressions/:regressionId/accept
```

Request:

```json
{
  "reason": "Expected performance cost from new risk scoring feature."
}
```

Accepting a regression does not automatically promote a baseline unless explicitly requested.

## Exception Routes

### Approve Exception

```text
POST /api/v1/benchmark-runs/:runId/exceptions
```

Request:

```json
{
  "reason": "Release approved for business deadline. Follow-up optimization ticket created.",
  "expiresAt": "2026-06-06T12:00:00.000Z"
}
```

Rules:

- Requires admin-level permission.
- Requires reason.
- Creates activity log.

## API Key Routes

### Create API Key

```text
POST /api/v1/projects/:projectId/api-keys
```

Request:

```json
{
  "name": "GitHub Actions staging",
  "scopes": ["benchmark_runs:create", "deployments:create"]
}
```

Response:

```json
{
  "data": {
    "id": "api_key_123",
    "name": "GitHub Actions staging",
    "key": "r99_live_xxxxx",
    "keyPrefix": "r99_live_abcd"
  },
  "meta": {},
  "error": null
}
```

Important:

- Raw key is only returned once.

### List API Keys

```text
GET /api/v1/projects/:projectId/api-keys
```

### Revoke API Key

```text
DELETE /api/v1/api-keys/:apiKeyId
```

## Activity Log Routes

### List Activity Logs

```text
GET /api/v1/organizations/:organizationId/activity-logs
```

Filters:

```text
entityType
entityId
actorUserId
cursor
limit
```

## Health Routes

### Health Check

```text
GET /api/v1/health
```

Response:

```json
{
  "data": {
    "status": "ok",
    "timestamp": "2026-05-30T12:00:00.000Z"
  },
  "meta": {},
  "error": null
}
```

### Readiness Check

```text
GET /api/v1/health/ready
```

Should verify database connectivity.

## Realtime Events

Socket.IO events:

```text
benchmark_run.queued
benchmark_run.started
benchmark_run.completed
benchmark_run.failed
budget_evaluation.completed
regression.detected
baseline.promoted
```

Realtime events should include enough information to refetch the canonical resource.

Example:

```json
{
  "runId": "run_123",
  "projectId": "project_123"
}
```

## CI/CD Behavior

For CI/CD, the simplest integration should be:

1. Deploy service to staging or preview.
2. Call `POST /api/v1/ci/benchmark-runs`.
3. Poll `GET /api/v1/benchmark-runs/:runId`.
4. Fail the pipeline if `decisionStatus` becomes `FAILED`.

Later we can support blocking wait behavior:

```text
POST /api/v1/ci/benchmark-runs?wait=true&timeoutSeconds=600
```

Do not implement blocking behavior until the async run path is stable.

## Authorization Expectations

High-level rules:

- Viewers can read project data.
- Developers can create and run suites.
- Admins can manage budgets, exceptions, and members.
- Owners can manage all organization settings.
- API keys can only perform scoped actions.

All project routes must verify that the actor belongs to the organization that owns the project.

## Versioning Strategy

Initial version:

```text
/api/v1
```

Breaking changes should create a new API version later:

```text
/api/v2
```

Internal frontend changes do not require API version bumps. Public CI/CD contract changes do.
