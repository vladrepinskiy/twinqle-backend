# twinqle-backend

Merchant-carrier translation and robustness layer API implemented with Node.js and Postgres

## Running

### Initial Setup

```bash
# Install dependencies
npm install

# Start Postgres
docker compose up -d

# Run database migrations
npm run db:migrate

# Generate types from DB schema
npm run db:generate-types

# Seed database (optional)
npm run db:seed
```

### Local Development with Webhooks

Since Late Logistics needs to send webhooks to your local machine, you need ngrok to expose your server:

**One-time ngrok setup:**

```bash
# Install
brew install ngrok

# Sign up at https://ngrok.com (free) and get your authtoken
# Configure it (this gives you a persistent URL that never changes)
ngrok config add-authtoken YOUR_TOKEN_HERE
```

**Start development (every time):**

```bash
# Terminal 1: Start ngrok
ngrok http 5001
# Copy the HTTPS URL from output (e.g., https://abc123.ngrok-free.app)
# Update WEBHOOK_BASE_URL in .env with this URL (only needed once with authtoken!)

# Terminal 2: Start the server
npm run dev
```

**The API will be available at:**

- Local: `http://localhost:5001`
- Public (via ngrok): Your ngrok HTTPS URL
- PostgreSQL: `localhost:5432`
- Ngrok dashboard: `http://localhost:4040` (inspect incoming webhooks)

## Configuration

Create a `.env` file in the root directory:

```bash
# Server
PORT=5001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=twinqle
DB_USER=twinqle
DB_PASSWORD=twinqle_password

# Late Logistics Integration
LATE_LOGISTICS_API_URL=https://mock-carrier.onrender.com
LATE_LOGISTICS_API_KEY=carrier_api_key_1

# Webhook URL - Get from ngrok (see setup below)
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

**Important:** Configure ngrok authtoken (one-time) to get a persistent URL that never changes.

## Setup

Fastify + TypeScript API with PostgreSQL, using Kysely for type-safe database queries and Zod for request validation.

Intentionally avoided overengineering the MVP app with minimal Node.js framework and minimal Postgres setup (Prism or such feels already an overkill)

**Dependencies:**

- Fastify (web framework)
- TypeScript
- PostgreSQL (via Docker Compose)
- Kysely (SQL query builder)
- Zod (schema validation)
- Prettier (code formatting)

**Some Key Robustness Decisions**

- Generate barcodes before calling the carrier, since these will always be present in consequetive webhook updates. Used as fallback lookup key when carrier_shipment_id is missing (timeout recovery)
- `event_id` has a unique constraint in the events table. Duplicate webhooks are detected and ignored
- `canTransitionTo()` only allows forward transitions, which prevents out-of-order webhooks from corrupting state
- `SHIPMENT_CREATION_TIMEOUT_MS = 65000` (65s) to handle 50+ second cold starts
- On shipment creation timeout we stay in `creation_in_flight` status, wait for webhook to reconcile. Outdated/stale orders in this status can be manually retried by users later (after 10 minutes)
- `fetchWithOptions` utility function retries on server errors, we make several attempts with exponential backoff (1s, 2s delays)
- On order creation API returns 201 immediately, shipment creation happens in background via setImmediate
