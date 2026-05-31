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
npm run prisma:generate -w @regressor99/api
npm run dev
```

API health check:

```text
http://localhost:4000/api/v1/health
```

Web app:

```text
http://localhost:5173
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Database Design](docs/DATABASE_DESIGN.md)
- [API Contract](docs/API_CONTRACT.md)
- [Glossary](docs/GLOSSARY.md)
