# Setup N8N Workflows Feature

This guide will help you set up the N8N Workflows feature for managing workflows per Evolution instance.

## Prerequisites

- Supabase project set up and configured
- Environment variables:
  - `SUPABASE_URL` - Your Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database operations
  - `SUPABASE_KEY` - Public key for client-side operations

## Step 1: Create the Database Table

The N8N Workflows feature requires a new table in your Supabase database. Follow one of these approaches:

### Option A: Automatic Migration (Recommended)

Run the migration script:

```bash
npx tsx server/migrations/run-instance-workflows-migration.ts
```

This will automatically create:
- `instance_n8n_workflows` table
- Indexes for performance optimization
- Triggers for automatic timestamp updates
- RLS policies for authenticated users

### Option B: Manual Setup via Supabase Dashboard

If the automatic migration doesn't work, create the table manually:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/)
2. Select your project
3. Navigate to **SQL Editor**
4. Click **"New Query"**
5. Copy the entire content from: [`server/migrations/create-instance-n8n-workflows-table.sql`](./server/migrations/create-instance-n8n-workflows-table.sql)
6. Paste it into the SQL editor
7. Click **"Run"**

## Step 2: Verify the Table Was Created

In Supabase Dashboard:

1. Navigate to **Database** → **Tables**
2. You should see `instance_n8n_workflows` table
3. Verify it has these columns:
   - `id` (BIGSERIAL PRIMARY KEY)
   - `instance_id` (UUID)
   - `instance_number` (VARCHAR)
   - `workflow_id` (VARCHAR)
   - `workflow_name` (VARCHAR)
   - `webhook_url` (TEXT)
   - `trigger_type` (VARCHAR)
   - `is_active` (BOOLEAN)
   - `last_triggered_at` (TIMESTAMP)
   - `last_error_message` (TEXT)
   - `last_error_at` (TIMESTAMP)
   - `config` (JSONB)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

## Step 3: Verify RLS Policies

Make sure RLS (Row Level Security) is enabled:

1. In Supabase Dashboard, go to **Authentication** → **Policies**
2. Check that policies exist for `instance_n8n_workflows` table
3. Policies should allow `authenticated` users to SELECT, INSERT, UPDATE, DELETE

If policies are missing, run this SQL in the SQL Editor:

```sql
ALTER TABLE instance_n8n_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read workflows"
ON instance_n8n_workflows
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create workflows"
ON instance_n8n_workflows
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update workflows"
ON instance_n8n_workflows
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete workflows"
ON instance_n8n_workflows
FOR DELETE
TO authenticated
USING (true);
```

## Step 4: Start Using the Feature

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to instance settings:**
   - Open a WhatsApp instance
   - Click the settings/gear icon
   - Go to **Integrações** tab

3. **Add a workflow:**
   - Click the **"+ Workflows"** button
   - Click the **"Add New Workflow"** tab
   - Fill in the form:
     - **Workflow ID**: Unique identifier (e.g., `auto-reply-001`)
     - **Workflow Name**: Human-readable name (e.g., `Auto Reply Bot`)
     - **Trigger Type**: Select from dropdown (webhook, schedule, manual, trigger_node, other)
     - **Webhook URL**: The N8N webhook URL (required for webhook trigger type)
     - **Configuration** (optional): JSON config for workflow parameters
   - Click **"Add Workflow"**

4. **Manage workflows:**
   - **View Active Workflows**: Click **"Active Workflows"** tab
   - **Toggle Active/Inactive**: Click the toggle icon
   - **Test Trigger**: Click the play icon to manually trigger
   - **Delete Workflow**: Click the trash icon

## API Endpoints

Once set up, you can use these endpoints:

```bash
# List all workflows for an instance
GET /api/instances/:instanceNumber/workflows
Authorization: Bearer <token>

# List only active workflows
GET /api/instances/:instanceNumber/workflows/active
Authorization: Bearer <token>

# Create new workflow
POST /api/instances/:instanceNumber/workflows
Authorization: Bearer <token>
Content-Type: application/json

{
  "instance_id": "550e8400-e29b-41d4-a716-446655440000",
  "workflow_id": "workflow-001",
  "workflow_name": "Auto Reply Bot",
  "webhook_url": "https://n8n.example.com/webhook/abc123",
  "trigger_type": "webhook",
  "config": { "max_retries": 3 }
}

# Get specific workflow
GET /api/instances/:instanceNumber/workflows/:workflowId
Authorization: Bearer <token>

# Update workflow
PATCH /api/instances/:instanceNumber/workflows/:workflowId
Authorization: Bearer <token>
Content-Type: application/json

{
  "workflow_name": "Updated Name",
  "is_active": false
}

# Delete workflow
DELETE /api/instances/:instanceNumber/workflows/:workflowId
Authorization: Bearer <token>

# Manually trigger workflow
POST /api/instances/:instanceNumber/workflows/:workflowId/trigger
Authorization: Bearer <token>
Content-Type: application/json

{
  "payload": { "test": true }
}

# Toggle workflow active/inactive
POST /api/instances/:instanceNumber/workflows/:workflowId/toggle
Authorization: Bearer <token>
```

## Troubleshooting

### Table doesn't exist after migration

**Solution:** Create it manually via Supabase Dashboard (Option B above)

### RLS Policy errors

**Solution:** Check that RLS policies are properly set (Step 3 above)

### Can't add workflows

**Problem:** Form validation errors
**Solution:**
- Ensure Workflow ID and Name are provided
- For webhook trigger type, Webhook URL is required
- Verify JSON config is valid if provided

### Workflows not appearing

**Problem:** List is empty
**Solution:**
- Check browser console for API errors
- Verify instance ID is correct
- Ensure you're authenticated (token in localStorage)

### Trigger fails

**Problem:** "Failed to trigger workflow"
**Solution:**
- Check webhook URL is correct
- Verify N8N workflow is running
- Check N8N webhook configuration
- Look at last_error_message in the workflow details

## Next Steps

- Configure N8N workflows to send webhook requests to your Evolution instance
- Set up monitoring/alerts for failed workflows
- Implement workflow retry logic in N8N
- Create custom configurations per workflow using the config JSON field

## Files Reference

| File | Purpose |
|------|---------|
| [`server/migrations/create-instance-n8n-workflows-table.sql`](./server/migrations/create-instance-n8n-workflows-table.sql) | SQL schema for the table |
| [`server/migrations/run-instance-workflows-migration.ts`](./server/migrations/run-instance-workflows-migration.ts) | Migration runner script |
| [`server/routes/instance-workflows.routes.ts`](./server/routes/instance-workflows.routes.ts) | API endpoints |
| [`server/services/instance-workflows.ts`](./server/services/instance-workflows.ts) | Database service |
| [`shared/instance-workflow.types.ts`](./shared/instance-workflow.types.ts) | TypeScript types |
| [`client/src/components/N8NWorkflowDialog.tsx`](./client/src/components/N8NWorkflowDialog.tsx) | Frontend UI component |
| [`INSTANCE_N8N_WORKFLOWS.md`](./INSTANCE_N8N_WORKFLOWS.md) | Complete feature documentation |

## Support

For more detailed information, see:
- [Complete N8N Workflows Documentation](./INSTANCE_N8N_WORKFLOWS.md)
- [API Endpoints Reference](./INSTANCE_N8N_WORKFLOWS.md#-api-endpoints)
- [FAQ](./INSTANCE_N8N_WORKFLOWS.md#-faq)
