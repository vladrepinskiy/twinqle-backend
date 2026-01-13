# Agent Guidelines

## Code Style

- Use `const` and arrow function syntax (no `function` keyword)
- Use double quotes for strings
- Format with Prettier before committing (`npm run format`)

## Setup

Fastify + TypeScript API with PostgreSQL. Database managed via Docker Compose. Uses Kysely for queries, Zod for validation.

**Key Files:**

- `src/index.ts` - Server entry point
- `src/routes/orders.ts` - Order management routes
- `src/config/database.ts` - Kysely database instance
- `src/db/migrations/` - Database migrations
- `src/db/seeds/` - Database seeds

**Important:** After any significant change or refactor, check if this file needs updates. Keep it concise.
