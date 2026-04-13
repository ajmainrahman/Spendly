# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
Migrated from Vercel to Replit.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (Neon serverless) + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Frontend**: React + Vite (budget-tracker)

## Artifacts

- `artifacts/budget-tracker` — React/Vite frontend, served at `/` on port 18541
- `artifacts/api-server` — Express 5 API server, served at `/api` on port 8080

## Workflows

- **Start application** — `PORT=18541 pnpm --filter @workspace/budget-tracker run dev` (port 18541)
- **API Server** — `pnpm --filter @workspace/api-server run dev` (port 8080, includes build step)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/budget-tracker run dev` — run frontend locally

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (Neon)
- `SESSION_SECRET` — JWT/session signing secret

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
