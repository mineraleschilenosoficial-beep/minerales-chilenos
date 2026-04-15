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
