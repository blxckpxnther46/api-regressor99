# Regressor99 Demo Walkthrough

This branch contains a small vertical slice for a project defense demo. It is intentionally simple and in-memory so the core product idea is easy to run and explain.

## Run The Demo

```bash
npm install
npm run dev
```

This starts three processes:

- API: `http://localhost:4000`
- Web app: `http://localhost:5173`
- Mock target API: `http://localhost:4100`

## Demo Services

### Regressor99 API

The backend exposes demo routes under:

```text
http://localhost:4000/api/v1/demo
```

Important routes:

```text
GET  /api/v1/demo/dashboard
POST /api/v1/demo/runs
POST /api/v1/demo/baselines/promote
POST /api/v1/demo/reset
```

### Mock Target API

The mock target API is the customer API that Regressor99 benchmarks.

It lives in:

```text
apps/mock-target
```

It exposes four benchmark scenarios:

```text
GET /api/checkout/baseline
GET /api/checkout/expanded
GET /api/checkout/slow-regression
GET /api/checkout/error-prone
```

## Scenarios

### Stable Baseline

Healthy checkout API behavior close to the accepted baseline.

Expected result:

```text
PASSED
```

### Expected API Expansion

The endpoint intentionally does more work. It is slower than the active baseline but still below the hard failure budget.

Expected result:

```text
NEEDS_REVIEW
```

This is the most important demo scenario. It shows that Regressor99 does not blindly fail every slowdown.

### Unexpected Slow Regression

The endpoint becomes much slower and fails the p95 latency budget.

Expected result:

```text
FAILED
```

### Error-Rate Regression

The endpoint has intermittent upstream failures and fails the error-rate budget.

Expected result:

```text
FAILED
```

## Baseline Promotion Demo

Run the expected API expansion scenario, then promote the latest run to baseline.

After promotion:

- The active baseline changes.
- Future expanded runs compare against the new baseline.
- The run may still warn if it exceeds the performance budget.

This demonstrates the core rule:

```text
Baseline comparison tells us what changed.
Budget evaluation tells us whether it is acceptable.
Deployment decision tells CI/CD what to do.
```

## Why This Is In-Memory

The real production direction is PostgreSQL through Prisma. The schema already exists in:

```text
apps/api/prisma/schema.prisma
```

For the defense demo, in-memory data keeps the vertical slice easy to explain:

- No database setup required.
- Reset is instant.
- The core algorithm is visible.
- The frontend can demonstrate the workflow immediately.

Later, this same flow can be moved from the demo store into real services and repositories backed by PostgreSQL.

