# twinqle-backend

Merchant-carrier translation and robustness layer API implemented with Node.js and Postgres

## Running

```bash
# Start Postgres
docker compose up -d

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Generate types from DB schema
npm run db:generate-types

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:5000` and PostgreSQL at `localhost:5432`

## Setup

Fastify + TypeScript API with PostgreSQL, using Kysely for type-safe database queries and Zod for request validation.

**Dependencies:**

- Fastify (web framework)
- TypeScript
- PostgreSQL (via Docker Compose)
- Kysely (SQL query builder)
- Zod (schema validation)
- Prettier (code formatting)

**Architecture:**

- Repository pattern for data access - each table has a repository in `src/repositories/` that encapsulates database queries and business logic
