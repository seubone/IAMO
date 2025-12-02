#!/bin/bash

# Database initialization script for production
# This script ensures the 'simonia' database exists before starting the app

# DO NOT use set -e because we want to continue even if commands fail

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable not set"
  exit 1
fi

# Parse the DATABASE_URL using a more reliable method
DB_URL=$DATABASE_URL

# Extract username (everything after :// and before :)
DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')

# Extract password (everything after user: and before @)
DB_PASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\([^@]*\)@.*/\1/p')

# Extract host (everything after @ and before :port or /database)
DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')

# Extract port (everything after host: and before /database)
DB_PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\).*/\1/p')

# Extract database name (everything after the last /)
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Default port if not specified
if [ -z "$DB_PORT" ]; then
  DB_PORT=5432
fi

echo "🔍 Database Initialization Script"
echo "=================================="
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo "=================================="

# Try to connect to PostgreSQL and create database if it doesn't exist
echo "Attempting to create database '$DB_NAME'..."

# First attempt: Try with the specific database (if it exists)
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$DB_NAME" -c "SELECT 1;" 2>/dev/null; then
  echo "✅ Database '$DB_NAME' already exists and is accessible"
else
  # Second attempt: Connect to default 'postgres' database and create our database
  echo "Database '$DB_NAME' does not exist. Attempting to create it..."

  if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "postgres" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null; then
    echo "✅ Database '$DB_NAME' created successfully"
  else
    echo "⚠️  Could not create database automatically"
    echo "  This might be OK if the database already exists or will be created by migrations"
    echo "  The application will attempt to continue..."
  fi
fi

echo "✅ Database initialization check complete"
echo ""
