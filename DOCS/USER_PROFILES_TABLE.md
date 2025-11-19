# User Profiles Table Documentation

## Overview

The `user_profiles` table stores additional user information that extends the Supabase Auth `auth.users` table. It's designed to work seamlessly with Supabase Authentication and includes Row Level Security (RLS) policies to ensure users can only access their own data.

## Table Schema

### Columns

| Column Name | Data Type | Nullable | Default | Description |
|------------|-----------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key for the profile |
| `user_id` | UUID | NO | - | Foreign key to `auth.users(id)` with CASCADE delete |
| `name` | TEXT | YES | NULL | User's display name |
| `avatar_url` | TEXT | YES | NULL | URL to user's avatar image |
| `created_at` | TIMESTAMP WITH TIME ZONE | NO | `CURRENT_TIMESTAMP` | When the profile was created |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NO | `CURRENT_TIMESTAMP` | When the profile was last updated |

### Constraints

- **Primary Key**: `id` (UUID)
- **Foreign Key**: `user_id` references `auth.users(id)` with `ON DELETE CASCADE`
- **Unique Constraint**: `user_id` (one profile per user)

### Indexes

- `idx_user_profiles_user_id` - Index on `user_id` for fast lookups
- `idx_user_profiles_created_at` - Index on `created_at` (descending) for sorting

## Features

### Automatic Timestamp Updates

The table includes a trigger that automatically updates the `updated_at` column whenever a row is modified:

```sql
CREATE TRIGGER trigger_update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profiles_updated_at();
```

### Row Level Security (RLS)

The table has RLS enabled with the following policies:

1. **View Own Profile**: Users can only view their own profile
   ```sql
   USING (auth.uid() = user_id)
   ```

2. **Insert Own Profile**: Users can only create their own profile
   ```sql
   WITH CHECK (auth.uid() = user_id)
   ```

3. **Update Own Profile**: Users can only update their own profile
   ```sql
   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
   ```

4. **Delete Own Profile**: Users can only delete their own profile
   ```sql
   USING (auth.uid() = user_id)
   ```

## Installation

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project SQL Editor:
   - URL: `https://app.supabase.com/project/YOUR_PROJECT_ID/sql`

2. Copy the contents of `server/migrations/create-user-profiles-table.sql`

3. Paste and execute the SQL

### Option 2: Using the Check Script

Run the check script to see if the table exists and get the SQL:

```bash
node scripts/check-user-profiles-table.js
```

### Option 3: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
npx supabase db push
```

## Verification

After creating the table, verify it exists by running:

```bash
node scripts/check-user-profiles-table.js
```

You should see output like:

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

## Usage Examples

### JavaScript/TypeScript with Supabase Client

#### Create a Profile

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// After user signs up
const { data: authData } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Create profile
const { data, error } = await supabase
  .from('user_profiles')
  .insert({
    user_id: authData.user.id,
    name: 'John Doe',
    avatar_url: 'https://example.com/avatar.jpg'
  });
```

#### Read a Profile

```typescript
// Get current user's profile
const { data: { user } } = await supabase.auth.getUser();

const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', user.id)
  .single();

console.log(data);
// {
//   id: 'uuid',
//   user_id: 'uuid',
//   name: 'John Doe',
//   avatar_url: 'https://example.com/avatar.jpg',
//   created_at: '2024-01-01T00:00:00Z',
//   updated_at: '2024-01-01T00:00:00Z'
// }
```

#### Update a Profile

```typescript
const { data: { user } } = await supabase.auth.getUser();

const { data, error } = await supabase
  .from('user_profiles')
  .update({
    name: 'Jane Doe',
    avatar_url: 'https://example.com/new-avatar.jpg'
  })
  .eq('user_id', user.id);
```

#### Delete a Profile

```typescript
const { data: { user } } = await supabase.auth.getUser();

const { error } = await supabase
  .from('user_profiles')
  .delete()
  .eq('user_id', user.id);
```

### Automatic Profile Creation on Sign Up

You can create a database trigger to automatically create a profile when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Integration with Your Application

### TypeScript Types

Add this to your `shared/schema.ts`:

```typescript
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
```

## Troubleshooting

### Table Already Exists

If the table already exists and you want to recreate it:

```sql
DROP TABLE IF EXISTS public.user_profiles CASCADE;
```

Then run the migration again.

### Permission Errors

If you get permission errors, make sure you're using the service role key for administrative operations or the anon key for user operations with proper authentication.

### Foreign Key Constraint Errors

If you get foreign key errors when inserting, make sure the `user_id` exists in `auth.users`:

```typescript
// Verify user exists
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user.id);
```

## Files

- **Migration SQL**: `server/migrations/create-user-profiles-table.sql`
- **Check Script**: `scripts/check-user-profiles-table.js`
- **Documentation**: `DOCS/USER_PROFILES_TABLE.md` (this file)

## Related Tables

This table is designed to work with:
- `auth.users` (Supabase Auth) - The main authentication table
- Potentially other tables in your application that reference user data

## Security Considerations

1. **RLS Enabled**: All policies ensure users can only access their own data
2. **Foreign Key Cascade**: When a user is deleted from `auth.users`, their profile is automatically deleted
3. **Unique Constraint**: Ensures one profile per user
4. **Authenticated Only**: All policies require authentication

## Next Steps

1. Create the table using one of the installation methods above
2. Verify the table exists using the check script
3. Add TypeScript types to your schema
4. Implement profile creation in your sign-up flow
5. Add profile editing functionality to your application
