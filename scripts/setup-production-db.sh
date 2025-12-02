#!/bin/bash

###############################################################################
# Production Database Setup Script
# Sets up the 'simonia' database with all required tables
#
# Usage:
#   ./scripts/setup-production-db.sh
#
# Prerequisites:
#   - PostgreSQL client (psql) installed
#   - DATABASE_URL environment variable set
#   - Network access to the database server
#
# What this script does:
#   1. Creates 'simonia' database (if not exists)
#   2. Runs Drizzle schema push (creates tables from shared/schema.ts)
#   3. Creates instance_bot_status table
#   4. Creates instance_contact_status table (standalone version)
#   5. Verifies all tables were created
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ ERROR: DATABASE_URL environment variable not set${NC}"
  echo ""
  echo "Set it like this:"
  echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
  echo ""
  echo "Or source your .env.production file:"
  echo "  export \$(grep -v '^#' .env.production | xargs)"
  exit 1
fi

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/database?params
DB_URL=$DATABASE_URL

# Extract components using parameter expansion and sed
DB_USER=$(echo "$DB_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASSWORD=$(echo "$DB_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$DB_URL" | sed -n 's|.*:\([0-9]\{4,5\}\)/.*|\1|p')
DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

# Default port if not found
if [ -z "$DB_PORT" ]; then
  DB_PORT=5432
fi

# Validate extraction
if [ -z "$DB_USER" ] || [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ]; then
  echo -e "${RED}❌ ERROR: Could not parse DATABASE_URL${NC}"
  echo "Expected format: postgresql://user:password@host:port/database"
  echo "Got: $DATABASE_URL"
  exit 1
fi

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Production Database Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Host:     ${YELLOW}$DB_HOST${NC}"
echo -e "  Port:     ${YELLOW}$DB_PORT${NC}"
echo -e "  User:     ${YELLOW}$DB_USER${NC}"
echo -e "  Database: ${YELLOW}$DB_NAME${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Create database
echo -e "${BLUE}[1/5]${NC} Creating database '$DB_NAME'..."
if psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
  echo -e "${YELLOW}⚠️  Database '$DB_NAME' already exists${NC}"
else
  if psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>&1; then
    echo -e "${GREEN}✅ Database '$DB_NAME' created successfully${NC}"
  else
    echo -e "${RED}❌ Failed to create database. It may already exist or you may lack permissions.${NC}"
    echo -e "${YELLOW}   Continuing anyway...${NC}"
  fi
fi
echo ""

# Step 2: Run Drizzle schema push
echo -e "${BLUE}[2/5]${NC} Running Drizzle schema push..."
echo -e "${YELLOW}   This will create tables defined in shared/schema.ts${NC}"
if npm run db:push 2>&1 | tee /tmp/drizzle-push.log; then
  echo -e "${GREEN}✅ Drizzle schema pushed successfully${NC}"
else
  echo -e "${YELLOW}⚠️  Drizzle push may have failed or tables already exist${NC}"
  echo -e "${YELLOW}   Check logs above. Continuing with manual migrations...${NC}"
fi
echo ""

# Step 3: Create instance_bot_status table
echo -e "${BLUE}[3/5]${NC} Creating instance_bot_status table..."
if [ ! -f "server/migrations/create-instance-bot-status-table.sql" ]; then
  echo -e "${RED}❌ Migration file not found: server/migrations/create-instance-bot-status-table.sql${NC}"
  exit 1
fi

if psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$DB_NAME" -f "server/migrations/create-instance-bot-status-table.sql" 2>&1 | tee /tmp/bot-status-migration.log; then
  echo -e "${GREEN}✅ instance_bot_status table created${NC}"
else
  echo -e "${YELLOW}⚠️  Table may already exist or there was an error${NC}"
fi
echo ""

# Step 4: Create instance_contact_status table (standalone version)
echo -e "${BLUE}[4/5]${NC} Creating instance_contact_status table (standalone)..."
if [ ! -f "server/migrations/create-instance-contact-status-table-standalone.sql" ]; then
  echo -e "${RED}❌ Migration file not found: server/migrations/create-instance-contact-status-table-standalone.sql${NC}"
  exit 1
fi

if psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$DB_NAME" -f "server/migrations/create-instance-contact-status-table-standalone.sql" 2>&1 | tee /tmp/contact-status-migration.log; then
  echo -e "${GREEN}✅ instance_contact_status table created${NC}"
else
  echo -e "${YELLOW}⚠️  Table may already exist or there was an error${NC}"
fi
echo ""

# Step 5: Verify tables
echo -e "${BLUE}[5/5]${NC} Verifying tables..."
echo ""
psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$DB_NAME" -c "\dt" 2>&1 | head -30

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Check for critical tables
MISSING_TABLES=()
for table in "instance_bot_status" "instance_contact_status" "users" "ias"; do
  if ! psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$DB_NAME" -tc "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table'" | grep -q 1; then
    MISSING_TABLES+=("$table")
  fi
done

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ All critical tables verified successfully!${NC}"
  echo ""
  echo -e "${GREEN}🎉 Database setup complete!${NC}"
  echo ""
  echo -e "Next steps:"
  echo -e "  1. Restart your application:"
  echo -e "     ${YELLOW}docker restart <container_name>${NC}"
  echo -e "  2. Check logs for errors:"
  echo -e "     ${YELLOW}docker logs -f <container_name>${NC}"
  echo -e "  3. Verify no more 'database simonia does not exist' errors"
else
  echo -e "${YELLOW}⚠️  Some tables are missing:${NC}"
  for table in "${MISSING_TABLES[@]}"; do
    echo -e "     - $table"
  done
  echo ""
  echo -e "${YELLOW}You may need to run additional migrations or check for errors above.${NC}"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Clean up
unset PGPASSWORD
