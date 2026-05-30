# Regressor99 Product Requirements

This document defines the initial product scope for Regressor99. It should guide what we build first, what we intentionally defer, and how we decide whether the MVP is successful.

## Product Summary

Regressor99 is a continuous API performance regression detection platform.

The product helps engineering teams answer one critical deployment question:

```text
Did this deployment make our API slower, less reliable, or less capable of handling expected traffic?
```

Regressor99 is not trying to replace every load testing tool. It is a deployment-aware performance regression system built around benchmark suites, historical baselines, performance budgets, and release decisions.

## Core Workflow

The first version should revolve around this workflow:

```text
Client creates benchmark suite once
        ↓
Client deploys new version
        ↓
CI/CD calls Regressor99 API
        ↓
Regressor99 queues benchmark run
        ↓
Worker hits target API
        ↓
Metrics are stored
        ↓
Run is compared against baseline
        ↓
Budgets are evaluated
        ↓
Deployment gets pass/warn/fail
```

This workflow is the spine of the product. Features that do not support this flow should usually wait.

## Target Users

### Backend Engineer

Wants to know whether code changes made an API slower before users notice.

Needs:

- Project-level API performance history
- Endpoint-level benchmark results
- Clear regression details
- CI/CD feedback

### DevOps / Platform Engineer

Wants automated deployment validation.

Needs:

- API keys
- CI/CD trigger endpoint
- Release gate result
- Reliable pass/warn/fail response
- Auditability

### Engineering Manager

Wants visibility into team and service health.

Needs:

- Project dashboard
- Open regressions
- Deployment health
- Trend summaries

### QA / SDET Engineer

Wants repeatable performance validation.

Needs:

- Benchmark suite configuration
- Assertions
- Run history
- Baseline comparison

## MVP Goals

The MVP should prove that Regressor99 can:

- Register and authenticate users.
- Create organizations and projects.
- Define benchmark suites for API endpoints.
- Trigger benchmark runs manually or through an API key.
- Execute benchmark runs through a background worker.
- Store latency, error, throughput, and request metrics.
- Compare completed runs against active baselines.
- Evaluate performance budgets.
- Produce deployment decisions: `PASSED`, `WARNED`, `FAILED`, or `NEEDS_REVIEW`.
- Create regression records when meaningful performance degradation is detected.
- Promote a completed run to a new active baseline.
- Show basic dashboard and run details in the frontend.

## MVP Non-Goals

The MVP should not include:

- AI explanations or root cause analysis.
- Full GitHub App installation flow.
- OpenAPI import.
- Postman import.
- Production traffic capture.
- Browser HAR import.
- Multi-region load generation.
- Billing.
- Enterprise SSO.
- Advanced statistical confidence scoring.
- Complex distributed queue infrastructure.
- Public marketplace or plugin system.

These are valuable later, but they should not block the core regression workflow.

## User Stories

### Authentication

As a user, I can register, log in, refresh my session, and log out so that my account is protected.

As an organization owner, I can invite or manage members so that my team can access projects.

### Project Management

As a user, I can create a project for a deployable API service so that performance data is grouped correctly.

As a user, I can view project deployments, benchmark suites, runs, budgets, baselines, and regressions.

### Benchmark Suite Management

As a developer, I can create a benchmark suite with target endpoints, request details, assertions, and load profile so that Regressor99 knows what to test.

As a developer, I can update a benchmark suite and create a new suite version so that old runs remain understandable.

### Deployment Tracking

As a CI/CD pipeline, I can notify Regressor99 about a deployment so that benchmark runs can be correlated with code changes.

As a developer, I can see which commit or branch introduced a performance change.

### Benchmark Runs

As a developer, I can trigger a benchmark run manually or from CI/CD.

As a developer, I can see run execution status, metrics, errors, and final decision.

### Baselines

As an admin or developer, I can promote a completed run to the active baseline so that future deployments compare against the accepted normal performance.

As an admin, I can see baseline history so that performance shifts are auditable.

### Performance Budgets

As an admin or developer, I can define performance budgets so that Regressor99 knows what is acceptable.

As a CI/CD pipeline, I can receive a pass/warn/fail decision based on budget evaluation.

### Regressions

As a developer, I can see detected regressions so that I know which metric, endpoint, and deployment changed.

As a developer, I can acknowledge or resolve regressions so that the team can track follow-up work.

### Exceptions

As an admin, I can approve an exception for a failed deployment decision when there is a justified business reason.

Exceptions must require a reason and should expire.

## Core Product Objects

### Organization

The tenant that owns all project data.

### Project

A deployable API service.

### Deployment

A recorded release of a project version to an environment.

### Benchmark Suite

A reusable definition of what to test.

### Suite Version

An immutable version of a benchmark suite.

### Benchmark Run

One execution of a suite against a target API.

### Metric

A measured result from a benchmark run.

### Baseline

A known-good performance reference.

### Performance Budget

A rule that defines acceptable performance.

### Budget Evaluation

The result of applying budgets to a run.

### Regression

A detected degradation compared with a baseline.

### Activity Log

An audit record of important user or system actions.

## Decision Model

Regressor99 should separate technical execution status from product decision status.

Execution status:

- `QUEUED`
- `RUNNING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

Decision status:

- `PASSED`
- `WARNED`
- `FAILED`
- `NEEDS_REVIEW`

Rules:

- A run can execute successfully but still produce a failed deployment decision.
- A run can detect regression but still pass hard performance budgets.
- A run can require review if performance changed but the change may be intentional.
- Hard budget failure should usually result in `FAILED`.
- Regression without hard budget failure should usually result in `WARNED` or `NEEDS_REVIEW`.

## Baseline And Budget Philosophy

Baseline comparison tells us what changed.

Performance budgets tell us whether the change is acceptable.

Human review tells us whether a new performance level should become the accepted normal.

Example:

```text
Old baseline p95: 180ms
Current run p95: 260ms
Budget: p95 < 300ms

Regression detected: yes
Budget failed: no
Decision: WARNED or NEEDS_REVIEW
Action: investigate or promote new baseline
```

## MVP Success Criteria

The MVP is successful if we can demonstrate this end-to-end:

1. Create an organization.
2. Create a project.
3. Create a benchmark suite for at least one endpoint.
4. Create a deployment record with commit metadata.
5. Trigger a benchmark run using an API key.
6. Execute the run through a worker.
7. Store p50, p95, p99, average latency, error rate, throughput, and request count.
8. Compare the run against an active baseline.
9. Evaluate at least one performance budget.
10. Produce a clear deployment decision.
11. Create a regression record when performance meaningfully degrades.
12. Promote a run to a new active baseline with an audit reason.

## Product Risks

### Noisy Results

API performance can vary because of network conditions, cold starts, shared staging infrastructure, database state, or small sample sizes.

Mitigation:

- Store sample size.
- Track environment.
- Use budgets and baselines separately.
- Add retries carefully.
- Add confidence scoring later.

### Legitimate Performance Shifts

An API can become slower because it intentionally does more work.

Mitigation:

- Support `NEEDS_REVIEW`.
- Support baseline promotion.
- Require reasons for expected shifts.
- Keep baseline history.

### Secret Handling

Benchmark suites may need authentication headers.

Mitigation:

- Avoid storing raw secrets in long-term suite JSON where possible.
- Use secret references later.
- Restrict access to suite configuration.

### Overbuilding The Runner

Building a perfect load testing engine can distract from the product.

Mitigation:

- Start with a simple internal HTTP runner.
- Keep runner backends replaceable.
- Consider k6 integration later.

### Competing With Broad Platforms

k6, Datadog, Speedscale, Checkly, and others overlap with parts of the problem.

Mitigation:

- Focus tightly on deployment regression decisions.
- Do not position Regressor99 as a generic load testing replacement.

## Future Features

Potential later features:

- GitHub App integration.
- GitHub Checks and PR comments.
- OpenAPI import.
- Postman import.
- `regressor99.yml` repo config.
- k6 runner backend.
- Rolling baselines.
- Statistical confidence scoring.
- Root cause suggestions.
- AI trend summaries.
- Multi-region runners.
- Billing and plans.
- Enterprise SSO.

