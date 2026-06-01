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
npm run dev
```

`npm run dev` starts the API, web app, and mock target API together.

API health check:

```text
http://localhost:4000/api/v1/health
```

Web app:

```text
http://localhost:5173
```

Mock target API:

```text
http://localhost:4100/health
```

Demo walkthrough:

- [Demo Walkthrough](docs/DEMO_WALKTHROUGH.md)

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Database Design](docs/DATABASE_DESIGN.md)
- [API Contract](docs/API_CONTRACT.md)
- [Glossary](docs/GLOSSARY.md)
