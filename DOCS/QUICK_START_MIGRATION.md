# 🚀 QUICK START - Database Migration Guide

## ⚠️ CRITICAL: Your `ias` table doesn't exist yet!

The `ias` table exists in your TypeScript code but **NOT in your actual Supabase database**. You must execute the migration to create it.

---

## ✅ Option 1: Automated (RECOMMENDED) - 2 Minutes

### Step 1: Set Environment Variables

**Windows (PowerShell):**
```powershell
$env:SUPABASE_URL="your_supabase_url_here"
$env:SUPABASE_KEY="your_service_role_key_here"
```

**macOS/Linux:**
```bash
export SUPABASE_URL="your_supabase_url_here"
export SUPABASE_KEY="your_service_role_key_here"
```

### Step 2: Get Your Credentials

1. Go to: https://app.supabase.com
2. Select your project
3. Click **Settings** (bottom left) → **API**
4. Copy the following:
   - **Project URL** → `SUPABASE_URL`
   - **service_role secret** → `SUPABASE_KEY` (NOT the `anon` key!)

### Step 3: Run the Migration

```bash
cd c:\projeto\MONITORAMENT_2\Monitoramento-de-IA
npx tsx server/migrations/run-all-migrations.ts
```

### Step 4: Verify Success

You should see:
```
🚀 Starting Database Migrations
📍 Supabase URL: https://...
============================================================
📝 Running: Create IAs Table
✅ Migration executed successfully
...
✅ All migrations completed successfully!
```

**Done!** Your database is ready.

---

## 🔧 Option 2: Manual (Supabase Dashboard) - 5 Minutes

### If automated fails, do this manually:

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click **SQL Editor** (left sidebar)
   - Click **New Query** (top right)

3. **Copy First Migration**
   - Open file: `server/migrations/create-ias-table.sql`
   - Copy ALL content
   - Paste into SQL Editor
   - Click **Run** (green button, top right)
   - Wait for ✅ confirmation

4. **Repeat for Second Migration**
   - Open file: `server/migrations/extend-ias-table.sql`
   - Copy ALL content
   - Paste into a new query
   - Click **Run**
   - Wait for ✅ confirmation

5. **Repeat for Third Migration**
   - Open file: `server/migrations/create-bot-instances-table.sql`
   - Copy ALL content
   - Paste into a new query
   - Click **Run**
   - Wait for ✅ confirmation

**Done!** All tables are created.

---

## ✅ Verify It Worked

### Method 1: Supabase Dashboard
1. Go to **Table Editor** (left sidebar)
2. Look for `ias` table in the list
3. Click on it
4. You should see columns like:
   - `id`, `name`, `ai_name`, `consultant_name`
   - `n8n_workflow_id`, `pause_until`, `message_prefix_template`
   - And many more...

### Method 2: SQL Query
In SQL Editor, run this:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('ias', 'bot_instances');
```

Should return:
```
ias
bot_instances
```

---

## 🎯 Next Steps (After Migration)

### 1. Rebuild Your Project
```bash
npm run build
```

### 2. Start the Server
```bash
npm run dev
```

### 3. The IA Configuration System is Now Ready!

Your application now has:
- ✅ Database tables for IA management
- ✅ API endpoints for configuration (`/api/ias/:id`)
- ✅ React components for editing (`IAConfigPanel`)
- ✅ Message prefix formatting system
- ✅ N8N workflow integration support
- ✅ Pause scheduling with auto-resume

---

## 🆘 Troubleshooting

### "Table already exists"
**This is GOOD!** Means the table was already created. Skip that step.

### "Permission denied"
Your `SUPABASE_KEY` doesn't have enough permissions.

**Fix:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy the **service_role** key (NOT `anon`)
4. Update environment variable
5. Try again

### "Column ... already exists"
**This is FINE!** The SQL uses `IF NOT EXISTS` to prevent errors.

### Nothing happens (no output)
Environment variables aren't set.

**Fix:**
```bash
# Check if variables are set
echo $SUPABASE_URL
echo $SUPABASE_KEY

# If empty, set them again
export SUPABASE_URL="your_url"
export SUPABASE_KEY="your_key"

# Try again
npx tsx server/migrations/run-all-migrations.ts
```

### Still not working?
Use **Option 2** (manual Supabase Dashboard method) - it's more reliable.

---

## 📊 What Gets Created

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `ias` | AI configurations | `ai_name`, `consultant_name`, `n8n_workflow_id`, `pause_until`, `message_prefix_template` |
| `bot_instances` | Bot instance configs | Instance-specific bot settings |

---

## 📝 Checklist

- [ ] Set `SUPABASE_URL` and `SUPABASE_KEY` environment variables
- [ ] Ran migration (automated OR manual)
- [ ] Verified `ias` table exists in Supabase
- [ ] Ran `npm run build` without errors
- [ ] Started server with `npm run dev`
- [ ] Ready to test the IA configuration system!

---

## 🎓 What You Can Do Now

Once the migration is complete, you can:

1. **Create IAs with custom names**
   ```
   AI Name: "Maria Luzia" (auto-generates consultant name "Maria luzia")
   ```

2. **Configure N8N Workflows**
   ```
   Workflow ID, webhook URL, trigger type, etc.
   ```

3. **Schedule Pauses**
   ```
   Pause until: 2024-01-20 10:00 AM
   Reason: Maintenance
   Auto-resumes at specified time
   ```

4. **Customize Message Prefixes**
   ```
   *{name}:* (default)
   [{name}]
   {name}:
   → {name}:
   Custom format
   ```

5. **Edit All via Web Interface**
   - No database manipulation needed
   - Easy form in your application

---

## ❓ Questions?

Refer to:
- [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md) - Detailed explanation
- [IA_CONFIG_SETUP.md](./IA_CONFIG_SETUP.md) - Features and API documentation
- [BOT_INSTANCES_SETUP.md](./BOT_INSTANCES_SETUP.md) - Bot configuration details

---

## 🎉 You're All Set!

Your database migration is complete. The IA configuration system is now fully functional!

**Start building!** 🚀
