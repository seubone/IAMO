# Contact Status Table Migration Guide

## Overview

This guide explains how to create the `instance_contact_status` table in your Supabase database. This table is essential for the contact status management system that allows pausing/deactivating individual contacts per WhatsApp instance.

## Table Purpose

The `instance_contact_status` table manages the status (active/paused/inactive) for each contact within a WhatsApp instance:

- **Active**: Contact receives messages normally
- **Paused**: Contact temporarily stopped (can auto-resume after duration)
- **Inactive**: Contact completely disabled (can auto-activate after duration)

## Quick Start - Manual Setup (Recommended)

### Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query** button

### Step 2: Copy Migration SQL

1. Open file: `server/migrations/create-instance-contact-status-table.sql`
2. Copy all the SQL content

### Step 3: Execute in Supabase

1. Paste the SQL into the Supabase query editor
2. Click the **Run** button (or press `Ctrl + Enter`)
3. Wait for confirmation message

### Step 4: Verify

Once executed, you should see:

```
✅ Query executed successfully
```

## Automated Setup (Optional)

If you have a custom RPC function `exec_sql` in your Supabase instance, you can run:

```bash
# TypeScript version
npx tsx server/migrations/run-contact-status-migration.ts

# Or Node.js version
node server/migrations/run-contact-status-migration.mjs
```

## Table Schema

```sql
instance_contact_status (
  id BIGSERIAL PRIMARY KEY,
  instance_id UUID (FK → Instances.id),
  instance_number VARCHAR(255),
  contact_jid VARCHAR(255),
  contact_name VARCHAR(255),

  status VARCHAR(50) - 'active' | 'paused' | 'inactive',
  pause_reason TEXT,
  inactive_reason TEXT,

  paused_at TIMESTAMP,
  paused_until TIMESTAMP,
  inactive_at TIMESTAMP,
  inactive_until TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Features After Migration

### ✅ Contact Status Management
- Pause individual contacts with optional duration
- Resume paused contacts
- Deactivate contacts completely
- Activate inactive contacts
- Set indefinite pauses/inactivations

### ✅ Automatic Expiration
- Pauses auto-resume after duration expires
- Inactivations auto-activate after duration expires
- Background job checks every 60 seconds (configurable)

### ✅ Performance
- 6 optimized indexes for fast queries
- Unique constraints prevent duplicates
- RLS policies for security

### ✅ Audit Trail
- `paused_at`, `paused_until` - pause tracking
- `inactive_at`, `inactive_until` - inactivation tracking
- `pause_reason`, `inactive_reason` - why status changed
- `created_at`, `updated_at` - audit timestamps

## API Endpoints After Migration

Once the table is created, these endpoints become available:

### Contact Management
```
GET    /api/instances/:instanceNumber/contacts
GET    /api/instances/:instanceNumber/contacts/:contactJid
GET    /api/instances/:instanceNumber/contacts/active
GET    /api/instances/:instanceNumber/contacts/paused
GET    /api/instances/:instanceNumber/contacts/inactive
GET    /api/instances/:instanceNumber/contacts/stats

POST   /api/instances/:instanceNumber/contacts/:contactJid/pause
POST   /api/instances/:instanceNumber/contacts/:contactJid/resume
POST   /api/instances/:instanceNumber/contacts/:contactJid/deactivate
POST   /api/instances/:instanceNumber/contacts/:contactJid/activate

POST   /api/instances/:instanceNumber/contacts/bulk-create
```

### Bot Status Management (Auto-Resume)
```
GET    /api/instances/:instanceNumber/bot-status/effective
GET    /api/instances/:instanceNumber/bot-status/remaining-time
POST   /api/instances/bot-status/maintenance
```

## Example Usage

### Pause a Contact
```bash
curl -X POST "http://localhost:5049/api/instances/5511999999999/contacts/5511988888888%40s.whatsapp.net/pause" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 3600000,
    "reason": "User requested pause"
  }'
```

### Get Contact Stats
```bash
curl -X GET "http://localhost:5049/api/instances/5511999999999/contacts/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
# {
#   "total": 100,
#   "active": 95,
#   "paused": 3,
#   "inactive": 2
# }
```

### Get Effective Bot Status (considers expiration)
```bash
curl -X GET "http://localhost:5049/api/instances/5511999999999/bot-status/effective" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Returns actual status even if pause expired
```

## Troubleshooting

### Query Failed Error

**Problem**: "Error: permission denied"

**Solution**:
- Make sure you're using the correct Supabase project
- Verify you have admin access to the database
- Check that SUPABASE_SERVICE_ROLE_KEY is correct

### Table Already Exists

**Problem**: "Error: relation 'instance_contact_status' already exists"

**Solution**:
- This means the table was already created ✅
- You can verify it in Supabase Dashboard > Tables
- No further action needed

### Indexes Failed

**Problem**: "Error: index already exists"

**Solution**:
- This is normal if you ran the migration multiple times
- Indexes are already created ✅
- You can continue using the system

## Files Created

```
server/migrations/
├── create-instance-contact-status-table.sql     ← Main migration file
├── run-contact-status-migration.ts              ← TypeScript runner
└── run-contact-status-migration.mjs             ← Node.js runner

server/services/
└── instance-contact-status.ts                   ← Service with 18 methods

server/routes/
└── instance-contact-status.routes.ts            ← 11 API endpoints

shared/
└── instance-contact-status.types.ts             ← TypeScript types
```

## Next Steps

1. ✅ Execute the migration SQL in Supabase
2. ✅ Verify table was created: Supabase Dashboard > Tables > instance_contact_status
3. ✅ Restart your application: `npm run dev`
4. ✅ Test the API endpoints
5. ✅ Integrate with frontend UI (optional)

## Support

If you encounter issues:

1. Check Supabase dashboard for any error messages
2. Verify all columns were created: `SELECT * FROM instance_contact_status LIMIT 0;`
3. Check RLS policies are enabled: Supabase Dashboard > Security > Policies
4. Review logs in your application

## Documentation Files

- `CONTACT_STATUS_IMPLEMENTATION.md` - Complete contact status system documentation
- `BOT_PAUSE_AUTO_RESUME.md` - Auto-resume feature documentation
- `MIGRATION_CONTACT_STATUS.md` - This file

---

**Status**: Ready for production use once migration is executed ✅
