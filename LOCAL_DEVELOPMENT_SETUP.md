# Local Development Setup

This guide helps you run the Monitor IA application locally on Windows for development.

## Problem: Database Connection

Your local machine cannot connect directly to the VPS database at `31.97.255.54:5432`. You need a local PostgreSQL database for development.

## Solution: Local PostgreSQL with Docker

### Prerequisites

- Docker installed on Windows
- Docker Desktop running

### Setup Steps

#### Step 1: Start PostgreSQL Containers

Run the development docker-compose file to start local PostgreSQL databases:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will start:
- **simonia database**: Port 5432 (main application database)
- **evolution database**: Port 5433 (WhatsApp integration database)

Both use the default credentials:
- User: `postgres`
- Password: `postgres`

#### Step 2: Verify Databases Are Running

```bash
docker-compose -f docker-compose.dev.yml ps
```

You should see both containers running.

#### Step 3: Initialize Databases (First Time Only)

Run the database migrations to create tables:

```bash
npm run db:migrate
```

Or if that command doesn't exist, the application will auto-migrate on startup.

#### Step 4: Start the Application

The `.env.local` file is already configured to use localhost databases:

```bash
npm run dev
```

The application will:
- Load `.env.local` which overrides `.env`
- Connect to PostgreSQL on `localhost:5432`
- Start server on port 5051
- Start frontend dev server on port 5173

#### Step 5: Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5051
- **Backend Health**: http://localhost:5051/health

### Environment Variables

**`.env.local`** (used for local development) contains:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/simonia
EVOLUTION_DB_HOST=localhost
EVOLUTION_DB_PORT=5432
EVOLUTION_DB_NAME=evolution
```

**`.env`** (used on VPS) contains:
```
DATABASE_URL=postgresql://postgres:d4b5507303632dbd23b1@31.97.255.54:5432/simonia
EVOLUTION_DB_HOST=31.97.255.54
EVOLUTION_DB_PORT=5432
EVOLUTION_DB_NAME=chatwoot
```

The application automatically loads `.env.local` when it exists, overriding `.env` values.

### Stopping Development Database

```bash
docker-compose -f docker-compose.dev.yml down
```

To also remove persistent data:
```bash
docker-compose -f docker-compose.dev.yml down -v
```

## Deploying to VPS

When deploying to the VPS:

1. The application uses `.env` (not `.env.local`)
2. It connects to the VPS PostgreSQL instance at `31.97.255.54:5432`
3. The VPS databases are already created and populated

### Using SSH Tunnel (Alternative)

If you prefer to develop against the VPS database, create an SSH tunnel:

```bash
ssh -L 5432:31.97.255.54:5432 root@31.97.255.54
```

Then update `.env.local`:
```
DATABASE_URL=postgresql://postgres:d4b5507303632dbd23b1@localhost:5432/simonia
EVOLUTION_DB_HOST=localhost
```

Keep the tunnel open in another terminal while developing.

## Troubleshooting

### Error: `connect ECONNREFUSED 31.97.255.54:5432`
- Your local machine cannot reach the VPS
- Use Docker PostgreSQL (recommended) or SSH tunnel

### Error: `database does not exist`
- Ensure containers are running: `docker-compose -f docker-compose.dev.yml ps`
- Run migrations: `npm run db:migrate`

### Error: `password authentication failed`
- Check `.env.local` has correct credentials (`postgres:postgres`)
- Containers use default credentials for development only

### Ports Already in Use
If port 5432 or 5433 are already in use:
- Edit `docker-compose.dev.yml` to use different ports
- Update `.env.local` to match the new ports
