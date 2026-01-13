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

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000`

## Setup

Fastify + TypeScript API with PostgreSQL, using Kysely for type-safe database queries and Zod for request validation.

**Dependencies:**

- Fastify (web framework)
- TypeScript
- PostgreSQL (via Docker Compose)
- Kysely (SQL query builder)
- Zod (schema validation)
- Prettier (code formatting)

**Available Scripts:**

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:generate-types` - Generate TypeScript types from database schema
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
