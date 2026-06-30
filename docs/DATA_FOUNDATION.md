# Data Foundation

Phase 2 sets local and cloud data rules for Prisma, Neon, Redis, migrations, and seed data.

## Environment Strategy

Use these variables:

- `DATABASE_URL`: pooled PostgreSQL connection for app runtime. In Neon, use pooled connection string here.
- `DIRECT_URL`: direct PostgreSQL connection for Prisma migrations and other schema work. In Neon, use direct connection string here.
- `REDIS_URL`: Redis connection string. Local default is `redis://localhost:6379`.
- `REDIS_KEY_PREFIX`: shared prefix for all cache keys. Default `regressor99`.

Local fallback:

- PostgreSQL: Docker Compose service on `localhost:5432`
- Redis: Docker Compose service on `localhost:6379`

## Migration Workflow

First migration ships whole current schema. No split migration yet. Schema already stable enough, smaller slices would add churn without lowering real risk.

Commands:

```bash
npm run db:migrate
npm run db:seed
npm run db:reset
```

What they do:

- `db:migrate`: runs `prisma migrate dev` in `apps/api`
- `db:seed`: runs `apps/api/prisma/seed.ts`
- `db:reset`: drops local DB, reapplies migrations, reruns seed

Neon rule:

- Run migrations against `DIRECT_URL`
- Run app against `DATABASE_URL`

## Seed Data

Seed creates:

- one user
- one organization
- one owner membership
- one project
- one benchmark suite
- one suite version
- one benchmark endpoint
- one completed benchmark run
- one performance budget
- one active baseline

Seed is idempotent for repeated local resets.

## Transaction Helper

Use `runInTransaction` from `apps/api/src/db/transaction.ts` for multi-write business actions:

- registration + organization bootstrap
- suite version + endpoint writes
- baseline promotion
- run completion + metric writes

## Redis Cache Rules

Redis is cache only. PostgreSQL stays source of truth.

Initial cacheable read paths:

- project dashboard summary
- recent benchmark run list per project
- regression list per project
- budget summary per project

Key format:

```text
<prefix>:<node_env>:org:<organizationId>:project:<projectId>:<view>
```

Current keys live in `apps/api/src/cache/cache-keys.ts`.

Invalidation rule:

- write to PostgreSQL first
- then delete affected Redis keys
- next read repopulates cache from PostgreSQL

Project-level invalidation targets:

- dashboard summary
- recent benchmark runs
- regressions
- budget summary

Do not cache:

- auth/session reads
- writes
- anything used as authority check
- anything that cannot safely fall back to PostgreSQL
