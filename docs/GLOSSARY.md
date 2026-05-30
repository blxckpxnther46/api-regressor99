# Regressor99 Glossary

This glossary defines the product and engineering language we will use across Regressor99. These terms should guide database names, API contracts, UI labels, documentation, and commit messages.

The goal is consistency. If a word has a specific meaning here, we should not casually use another word for the same concept.

## Product Identity

### Regressor99

The SaaS platform we are building. Regressor99 detects API performance regressions after deployments by comparing benchmark runs against historical baselines and performance budgets.

### Continuous API Performance Regression Detection

The main category of the product. It means every important deployment can be benchmarked, compared, scored, and judged before users experience degraded performance.

### Performance Regression Control Plane

A useful positioning phrase for Regressor99. It means the product does not only execute tests; it manages performance history, baselines, budgets, release decisions, regressions, and team workflows.

## Tenant And Access Terms

### User

A person with an account in Regressor99.

Examples:

- Backend engineer
- DevOps engineer
- Engineering manager
- QA engineer

### Organization

The top-level tenant boundary. Users belong to organizations, and organizations own projects, members, benchmark suites, deployments, runs, budgets, baselines, and regressions.

All sensitive business data should be scoped to an organization.

### Member

A user who belongs to an organization.

### Role

A permission level assigned to an organization member.

Initial roles:

- `OWNER`
- `ADMIN`
- `DEVELOPER`
- `VIEWER`

### Owner

The highest organization role. Owners can manage organization settings, members, projects, and future billing.

### Admin

A high-privilege role that can manage projects, suites, budgets, deployments, and most organization configuration.

### Developer

A role for engineers who can create and run benchmark suites, view results, and investigate regressions.

### Viewer

A read-only role for users who can view dashboards, runs, regressions, and reports without changing configuration.

### Actor

The authenticated user or API key performing an action. Backend services should receive actor context so authorization decisions are explicit.

### Policy

A reusable authorization rule.

Example:

```text
canManageProject
canCreateBenchmarkRun
canPromoteBaseline
canApproveException
```

## Project Terms

### Project

A deployable API service tracked by Regressor99.

Examples:

- Payment API
- User Service
- Authentication Service
- Checkout API

A project belongs to one organization and contains deployments, benchmark suites, runs, budgets, baselines, and regressions.

### Environment

The target runtime environment for a deployment or benchmark run.

Common values:

- `development`
- `staging`
- `preview`
- `production`

Baselines and budgets may differ per environment.

### Service

A general engineering term for an application or API. In Regressor99, the product object should usually be called a `Project`, not `Service`, to avoid naming drift.

## Deployment Terms

### Deployment

A recorded release of a project version to an environment.

Typical fields:

- Commit SHA
- Branch
- Environment
- Version
- Deployment time
- Deployment metadata

### Deploy Reference

An external identifier that links a benchmark run to a deployment.

Examples:

- Git commit SHA
- GitHub deployment ID
- Railway deployment ID
- Vercel deployment URL

### Commit SHA

The Git commit associated with a deployment or run.

### Branch

The Git branch associated with a deployment or run.

### Release Gate

A decision point in CI/CD where Regressor99 determines whether a deployment should continue, warn, or fail based on benchmark results.

### Deployment Decision

The final product-level outcome of a benchmark run for a deployment.

Initial values:

- `PASSED`
- `WARNED`
- `FAILED`
- `NEEDS_REVIEW`

This is different from execution status.

## Benchmark Configuration Terms

### Benchmark Suite

A reusable definition of what APIs to test, how to test them, and what success means.

The client creates a suite once, then CI/CD triggers runs for new deployments.

### Suite Version

An immutable version of a benchmark suite.

When a suite changes, we should create a new version so old benchmark runs can still be understood accurately.

### Benchmark Endpoint

An API endpoint included in a benchmark suite.

Typical fields:

- Name
- HTTP method
- Path
- Headers
- Query parameters
- Body
- Expected status
- Assertions

### Request Definition

The full request configuration for a benchmark endpoint.

Includes method, path, headers, query params, body, timeout, and authentication references.

### Assertion

A correctness check applied to an API response during a benchmark.

Examples:

- Status code must be `200`
- Response JSON must contain `id`
- Response time must be below a local endpoint threshold

Assertions protect basic correctness while metrics protect performance.

### Load Profile

The amount and shape of traffic used during a benchmark run.

Example fields:

- Virtual users
- Duration
- Ramp-up time
- Request rate
- Concurrency

### Virtual User

A simulated user or worker that sends requests during a benchmark.

### Ramp-Up

The period where traffic gradually increases before reaching the target load.

### Duration

How long the benchmark run should execute after startup or ramp-up.

### Target Base URL

The base URL of the client API being tested.

Example:

```text
https://staging-api.example.com
```

### Secret Reference

A placeholder that points to a stored secret instead of storing sensitive values directly in suite configuration.

Example:

```text
{{secret.PAYMENT_API_TOKEN}}
```

## Benchmark Execution Terms

### Benchmark Run

One execution of a benchmark suite against a target API, usually associated with a deployment.

A run produces metrics, budget evaluations, and possibly regression records.

### Run Trigger

The source that started a benchmark run.

Examples:

- Manual UI action
- API call
- CI/CD pipeline
- GitHub Actions
- Webhook

### Runner

The component that sends HTTP requests to the target API and collects timing, error, and throughput data.

In the MVP this can be an internal HTTP runner. Later, k6 can become an additional runner backend.

### Worker

A background process that picks up queued runs, executes benchmark work, stores metrics, evaluates budgets, and emits realtime updates.

### Job

A queued background task.

For MVP, benchmark runs can act as jobs. Later, a dedicated job table or queue system can be introduced.

### Execution Status

The lifecycle state of a benchmark run as a background task.

Initial values:

- `QUEUED`
- `RUNNING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

Execution status says whether the run finished technically. It does not say whether the deployment passed.

### Decision Status

The product judgment after a run completes.

Initial values:

- `PASSED`
- `WARNED`
- `FAILED`
- `NEEDS_REVIEW`

Decision status says whether the deployment should continue, warn, fail, or require human review.

## Metric Terms

### Metric

A measured performance value from a benchmark run.

Examples:

- Average latency
- p50 latency
- p95 latency
- p99 latency
- Error rate
- Throughput
- Request count

### Latency

The time taken for the target API to respond to a request.

Usually measured in milliseconds.

### Average Latency

The arithmetic mean response time across requests.

Useful, but can hide slow outliers. Percentiles are usually more useful for user experience.

### Percentile

A value below which a percentage of requests completed.

Example:

```text
p95 = 200ms
```

This means 95% of requests completed in 200ms or less.

### p50

The median latency. Half of requests were faster and half were slower.

### p95

The 95th percentile latency. This is one of the most important metrics for API performance because it captures slow user experiences better than the average.

### p99

The 99th percentile latency. Useful for tail latency and high-reliability systems.

### Tail Latency

The slowest portion of requests, usually represented by p95, p99, or higher percentiles.

### Error Rate

The percentage of requests that failed.

Failures can include network errors, timeouts, 5xx responses, or failed assertions depending on suite configuration.

### Throughput

The amount of successful work completed per unit of time.

Usually measured as requests per second.

### RPS

Requests per second.

### Request Count

The total number of requests attempted during a benchmark run.

### Timeout

The maximum allowed time for a request before it is considered failed.

### Sample Size

The number of requests used to calculate metrics. Small sample sizes can make results noisy.

## Baseline Terms

### Baseline

A known-good performance reference used to compare future benchmark runs.

A baseline answers:

```text
What does normal performance look like for this suite, endpoint, environment, and load profile?
```

### Active Baseline

The current baseline used for comparisons.

Only one baseline should be active for a comparable scope at a time.

### Historical Baseline

An old baseline that is no longer active but is kept for audit history and trend analysis.

### Baseline Version

The version number or sequence of a baseline.

Example:

```text
Baseline v1 -> p95 180ms
Baseline v2 -> p95 260ms
```

### Baseline Promotion

The act of turning a completed benchmark run into the new active baseline.

This should require permission and a reason.

### Baseline Drift

A slow change in performance over time that may not look severe in a single deployment but becomes meaningful across many runs.

### Expected Performance Shift

A performance change that is intentionally accepted because the API behavior became heavier or broader.

Example:

```text
The endpoint now calculates fraud risk and returns more data.
```

Expected shifts should be reviewed and may result in baseline promotion.

## Performance Budget Terms

### Performance Budget

A rule that defines acceptable performance.

Examples:

- p95 must be below 200ms
- Error rate must be below 1%
- Throughput must be above 500 RPS

### Budget Rule

One condition inside a performance budget.

Example:

```text
p95 < 200ms
```

### Budget Evaluation

The result of applying performance budget rules to a benchmark run.

### Budget Result

The pass, warn, or fail result for a budget evaluation.

Initial values:

- `PASS`
- `WARN`
- `FAIL`

### Warning Threshold

A softer threshold that indicates performance is concerning but not necessarily release-blocking.

Example:

```text
p95 warn at 220ms
```

### Failure Threshold

A hard threshold that should fail the deployment decision when violated.

Example:

```text
p95 fail at 300ms
```

### Hard Budget

A budget rule that must not be violated.

Hard budget failures usually result in a failed deployment decision.

### Soft Budget

A budget rule that can warn without blocking release.

Soft budgets are useful during early rollout or for less critical endpoints.

## Regression Terms

### Regression

A detected performance degradation compared with a baseline.

Example:

```text
p95 increased from 180ms to 260ms
```

### Regression Record

A durable database record that tracks a detected regression.

Regression records can be reviewed, acknowledged, resolved, or linked to deployments.

### Regression Type

The category of performance degradation.

Initial types:

- `LATENCY`
- `ERROR_RATE`
- `THROUGHPUT`

### Severity

How serious a regression is.

Initial values:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

### Change Percent

The percentage difference between the current metric and the baseline metric.

Example:

```text
Baseline p95: 180ms
Current p95: 260ms
Change: +44.4%
```

### Confidence Score

A later-stage score that estimates how likely it is that a detected change is real rather than noise.

This should not be an MVP dependency.

### Noise

Metric variation caused by unstable environments, small sample sizes, network conditions, cold starts, shared infrastructure, or other factors unrelated to code changes.

### Flaky Run

A benchmark run whose result is unreliable because of noise, infrastructure issues, target API instability, or insufficient sample size.

### Acknowledgement

A user action indicating that a regression has been seen and accepted for investigation.

### Resolution

A user action indicating that a regression has been fixed, accepted, or closed.

### Exception

A temporary approval to continue despite a failed budget or regression.

Exceptions should require a reason, approver, and expiration.

## Decision Terms

### Pass

The run completed and did not violate the relevant decision rules.

### Warn

The run completed, but Regressor99 found something concerning that does not block release.

Examples:

- Regression detected but budget still passes
- Soft budget exceeded
- Sample size too small

### Fail

The run completed and violated a hard release rule.

Examples:

- Hard performance budget failed
- Error rate exceeded failure threshold
- Critical endpoint regressed beyond allowed limits

### Needs Review

The run requires human decision.

Common case:

```text
Performance regressed compared with baseline, but budgets still pass.
```

The team can investigate, approve an exception, or promote a new baseline.

### Expected Change

A user-approved explanation for why performance changed.

Expected changes may lead to baseline promotion.

### Unexpected Regression

A performance degradation that was not intended and should be investigated or fixed.

## Integration Terms

### API Key

A credential used by external systems, such as CI/CD pipelines, to call Regressor99.

API keys should be scoped to an organization or project and should have limited permissions.

### Webhook

An HTTP callback used to receive events from external systems.

Examples:

- Deployment created
- Benchmark requested
- Build completed

### CI/CD Trigger

A pipeline step that calls Regressor99 to start a benchmark run.

### GitHub Actions Integration

The simplest initial GitHub integration. A workflow stores a Regressor99 API key and calls our API after deployment.

### GitHub App

A later, deeper integration that can read repo metadata, detect config files, create check runs, and comment on pull requests.

### Check Run

A GitHub status/check result that can appear on a commit or pull request.

Example:

```text
Regressor99 Performance Budget: failed
```

### Pull Request Comment

A comment posted by Regressor99 summarizing benchmark results for a PR.

## Configuration Terms

### `regressor99.yml`

A possible future config file clients can keep in their repository to define suites, load profiles, budgets, and project mapping.

This should be introduced after the manual suite builder or basic API workflow.

### OpenAPI Import

A future feature that creates benchmark suite drafts from an OpenAPI specification.

### Postman Import

A future feature that creates benchmark suite drafts from a Postman collection.

### Runner Backend

The execution engine used to perform benchmark traffic.

Possible runner backends:

- Internal HTTP runner
- k6
- Autocannon

Regressor99 should treat runner backends as implementation details behind the same run and metric model.

## Audit And Observability Terms

### Activity Log

An audit trail of important user or system actions.

Examples:

- Project created
- Suite updated
- Run triggered
- Baseline promoted
- Exception approved
- Regression acknowledged

### Audit Trail

The complete history that explains who changed what, when, and why.

### Event

A domain occurrence inside Regressor99.

Examples:

- `benchmark_run.started`
- `benchmark_run.completed`
- `regression.detected`
- `baseline.promoted`

### Realtime Event

A Socket.IO event sent to the frontend so the UI can update quickly.

Realtime events are notifications, not the source of truth.

### Source Of Truth

The canonical persisted state in PostgreSQL.

The frontend should refetch canonical data after receiving realtime events.

## Terms To Avoid Or Use Carefully

### Test

Use carefully because it can mean correctness test, load test, benchmark run, or API assertion.

Prefer more specific terms:

- `Benchmark Suite`
- `Benchmark Run`
- `Assertion`
- `Budget Evaluation`

### Service

Use `Project` for the Regressor99 product object. Use `service` only in general architecture discussions.

### Threshold

Use `Budget Rule`, `Warning Threshold`, or `Failure Threshold` when discussing product behavior.

### Failure

Be specific about what failed:

- Execution failed
- Budget failed
- Deployment decision failed
- Assertion failed

These mean different things.

