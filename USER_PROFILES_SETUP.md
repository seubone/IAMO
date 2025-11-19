# User Profiles Table Setup Summary

## Current Status

The `user_profiles` table **does not exist** in your Supabase database yet.

## What Was Created

I've created the following files to help you set up the user_profiles table:

### 1. Migration SQL File
**Location**: `server/migrations/create-user-profiles-table.sql`

This is the complete SQL migration that creates:
- The `user_profiles` table with proper schema
- Foreign key relationship to `auth.users`
- Indexes for performance
- Automatic timestamp update trigger
- Row Level Security (RLS) policies

### 2. Check Script
**Location**: `scripts/check-user-profiles-table.js`

Run this to verify if the table exists and see its schema:
```bash
node scripts/check-user-profiles-table.js
```

### 3. Creation Helper Script
**Location**: `scripts/create-user-profiles-table.mjs`

Run this to get step-by-step instructions:
```bash
node scripts/create-user-profiles-table.mjs
```

### 4. Documentation
**Location**: `DOCS/USER_PROFILES_TABLE.md`

Complete documentation including:
- Table schema details
- Installation instructions
- Usage examples
- TypeScript integration
- Security considerations
- Troubleshooting guide

## Table Schema

The `user_profiles` table will have the following structure:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | NO | - | Foreign key to `auth.users(id)` |
| `name` | TEXT | YES | NULL | User's display name |
| `avatar_url` | TEXT | YES | NULL | URL to user's avatar |
| `created_at` | TIMESTAMP WITH TIME ZONE | NO | `CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NO | `CURRENT_TIMESTAMP` | Last update timestamp |

### Key Features

1. **Foreign Key Constraint**: Links to `auth.users` with CASCADE delete
2. **Unique Constraint**: One profile per user (`user_id` is unique)
3. **Auto-updating Timestamps**: `updated_at` updates automatically on changes
4. **Row Level Security**: Users can only access their own profiles
5. **Indexed**: Optimized for fast lookups by `user_id` and `created_at`

## How to Create the Table

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase SQL Editor:
   - URL: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/sql

2. Copy and paste this SQL:

```sql
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT unique_user_id UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at DESC);

-- Create update trigger function
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile"
  ON public.user_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

3. Click "Run" to execute the SQL

### Option 2: Use the Migration File

The complete SQL is also available in:
```
server/migrations/create-user-profiles-table.sql
```

## Verification

After creating the table, verify it was created successfully:

```bash
node scripts/check-user-profiles-table.js
```

Expected output:
```
✅ Table "user_profiles" exists!

✅ Current Schema:

Column Name          | Data Type       | Nullable | Default
-------------------------------------------------------------
id                   | uuid            | NO       | gen_random_uuid()
user_id              | uuid            | NO       |
name                 | text            | YES      |
avatar_url           | text            | YES      |
created_at           | timestamp       | NO       | CURRENT_TIMESTAMP
updated_at           | timestamp       | NO       | CURRENT_TIMESTAMP

📊 Total profiles in table: 0
```

## Next Steps

After creating the table:

1. **Add TypeScript Types** (optional)
   - Update `shared/schema.ts` with the user_profiles table definition
   - See `DOCS/USER_PROFILES_TABLE.md` for example code

2. **Implement Profile Creation**
   - Add profile creation to your sign-up flow
   - Or set up an automatic trigger (see documentation)

3. **Add Profile Management**
   - Create UI for users to edit their profiles
   - Implement avatar upload functionality

## Security Notes

- **RLS is Enabled**: Users can only access their own profiles
- **Cascade Delete**: When a user is deleted from `auth.users`, their profile is automatically removed
- **Unique Constraint**: Each user can only have one profile
- **Authenticated Only**: All operations require authentication

## Files Reference

| File | Purpose |
|------|---------|
| `server/migrations/create-user-profiles-table.sql` | Complete SQL migration |
| `scripts/check-user-profiles-table.js` | Verification script |
| `scripts/create-user-profiles-table.mjs` | Helper script with instructions |
| `DOCS/USER_PROFILES_TABLE.md` | Complete documentation |
| `USER_PROFILES_SETUP.md` | This summary file |

## Support

If you encounter any issues:

1. Check the documentation: `DOCS/USER_PROFILES_TABLE.md`
2. Verify your Supabase connection credentials
3. Ensure you have the correct permissions in Supabase
4. Run the check script to diagnose issues

## Supabase MCP Note

While you have the Supabase MCP configured in `.mcp.json`, I wasn't able to access it directly in this session. The MCP tools would allow for direct database queries, but since they weren't available, I created these helper scripts and SQL files instead. You can still use the Supabase MCP if you configure it properly in your Claude Code environment.
