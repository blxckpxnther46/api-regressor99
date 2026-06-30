# Regressor99

A continuous API performance regression detection platform.

## Workspace

Regressor99 is structured as an npm workspaces monorepo:

- `apps/api` - Express, TypeScript, Prisma backend.
- `apps/web` - React, TypeScript, Vite, Tailwind frontend.
- `packages/shared` - shared contracts and domain types.

## Local Development

```bash
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Backend checks:

```bash
npm run typecheck -w @regressor99/api
npm run test -w @regressor99/api
```

API health check:

```text
http://localhost:4000/api/v1/health
```

Web app:

```text
http://localhost:5173
```

## Data Commands

```bash
npm run db:migrate
npm run db:seed
npm run db:reset
npm run db:studio
```

Local stack:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

Neon env strategy:

- `DATABASE_URL`: pooled app connection string.
- `DIRECT_URL`: direct migration connection string.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Data Foundation](docs/DATA_FOUNDATION.md)
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Database Design](docs/DATABASE_DESIGN.md)
- [API Contract](docs/API_CONTRACT.md)
- [Glossary](docs/GLOSSARY.md)
