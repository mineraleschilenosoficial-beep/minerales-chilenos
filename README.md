# Minerales Chilenos

Monorepo bootstrap for the Minerales Chilenos platform.

## Stack

- Web: Next.js (`apps/web`)
- API: NestJS (`apps/api`)
- Shared contracts: Zod (`packages/contracts`)
- Shared domain types/enums: TypeScript (`packages/types`)
- Shared tooling config: `packages/config`
- Task runner: Turbo
- Package manager: Yarn

## Workspace Layout

```txt
apps/
  web/
  api/
packages/
  contracts/
  types/
  config/
```

### API Module Structure

```txt
apps/api/src/
  database/
    prisma.service.ts
  modules/
    health/
      health.controller.ts
    companies/
      data/
      models/
      companies.controller.ts
      companies.service.ts
    company-requests/
      models/
      company-requests.controller.ts
      company-requests.service.ts
```

## Getting Started

```bash
yarn install
yarn dev
```

Default local ports:

- Web: `http://localhost:3000`
- API health check: `http://localhost:4000/health`

## Quality Commands

```bash
yarn lint
yarn typecheck
yarn test
yarn audit
```

## API Environment

Create `apps/api/.env` with:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/minerales_chilenos?schema=public"
```

Prisma commands:

```bash
yarn workspace @minerales/api prisma:generate
yarn workspace @minerales/api prisma:migrate:dev
```
