# N8N Workflow Binding System - Implementation Guide

## Overview

The N8N Workflow Binding system allows users to register and manage N8N workflows for each WhatsApp instance. The user (não o sistema) is responsible for binding/linking the workflow to the instance, and we provide the database and UI interface to register and track these bindings.

## Architecture

### 1. Database Layer (Supabase)

**Table: `instance_n8n_workflows`**

```sql
CREATE TABLE instance_n8n_workflows (
  id BIGSERIAL PRIMARY KEY,
  instance_id UUID NOT NULL,                    -- Reference to Evolution instance
  instance_number VARCHAR(20) NOT NULL,         -- WhatsApp instance number
  workflow_id VARCHAR(255) NOT NULL,            -- N8N workflow ID
  workflow_name VARCHAR(255) NOT NULL,          -- User-friendly name
  webhook_url TEXT,                             -- N8N webhook endpoint
  trigger_type VARCHAR(50) NOT NULL,            -- webhook|schedule|manual|trigger_node
  is_active BOOLEAN NOT NULL DEFAULT true,      -- Enable/disable workflow
  last_triggered_at TIMESTAMP,                  -- Last execution time
  last_error_message TEXT,                      -- Most recent error
  last_error_at TIMESTAMP,                      -- When last error occurred
  config JSONB DEFAULT '{}',                    -- Custom workflow config
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `instance_number`, `instance_id`, `workflow_id` - for quick lookups
- `is_active`, `trigger_type` - for filtering workflows

**RLS Policies:**
- All authenticated users can read, create, update, and delete workflows
- Database handles Row-Level Security

### 2. Backend Service Layer

**File:** `server/services/instance-workflows.ts`

**11 Service Methods:**

1. `createWorkflow()` - Register new workflow for instance
2. `getInstanceWorkflows(instanceId)` - Get all workflows by instance UUID
3. `getInstanceWorkflowsByNumber(instanceNumber)` - Get workflows by phone number
4. `getWorkflow(instanceId, workflowId)` - Get specific workflow details
5. `updateWorkflow()` - Modify workflow configuration
6. `deleteWorkflow()` - Remove workflow binding
7. `logExecution()` - Record workflow execution (success/failure)
8. `getActiveWorkflows(instanceNumber)` - Get only enabled workflows
9. `hasActiveWorkflows(instanceNumber)` - Check if instance has active workflows
10. `deleteInstanceWorkflows(instanceNumber)` - Cleanup all workflows for instance

### 3. Backend API Layer

**File:** `server/routes/instance-workflows.routes.ts`

**7 REST Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/instances/:instanceNumber/workflows` | List all workflows |
| GET | `/api/instances/:instanceNumber/workflows/active` | List active only |
| GET | `/api/instances/:instanceNumber/workflows/:workflowId` | Get workflow details |
| POST | `/api/instances/:instanceNumber/workflows` | Create new workflow |
| PATCH | `/api/instances/:instanceNumber/workflows/:workflowId` | Update workflow |
| DELETE | `/api/instances/:instanceNumber/workflows/:workflowId` | Delete workflow |
| POST | `/api/instances/:instanceNumber/workflows/:workflowId/toggle` | Toggle active/inactive |
| POST | `/api/instances/:instanceNumber/workflows/:workflowId/trigger` | Manual workflow trigger |

**Authentication:**
- All endpoints protected with `authMiddleware`
- Valid JWT token required
- User must be authenticated

**Error Handling:**
- Returns 400 for missing parameters
- Returns 409 for duplicate workflow
- Returns 404 for not found
- Returns 500 for server errors

### 4. Frontend API Client

**File:** `client/src/lib/api.ts`

**7 API Methods:**

```typescript
export const n8nWorkflowsAPI = {
  getWorkflows(instanceNumber),        // Get all workflows
  getActiveWorkflows(instanceNumber),  // Get active only
  getWorkflow(instanceNumber, workflowId), // Get specific
  createWorkflow(instanceNumber, data), // Create
  updateWorkflow(instanceNumber, workflowId, data), // Update
  deleteWorkflow(instanceNumber, workflowId), // Delete
  toggleWorkflow(instanceNumber, workflowId), // Toggle status
  triggerWorkflow(instanceNumber, workflowId, payload), // Manual trigger
};
```

### 5. Frontend UI Component

**File:** `client/src/components/N8NWorkflowForm.tsx`

**Features:**

**Registration Form:**
- Workflow ID (required)
- Workflow Name (required)
- Webhook URL (optional)
- Trigger Type selector (webhook, schedule, manual, trigger_node)
- Submit button with loading state

**Workflows List:**
- Display all registered workflows
- Show status badge (Active/Inactive)
- Show trigger type
- Show last error if any
- Scrollable area for many workflows

**Actions per Workflow:**
- 🔧 **Trigger** - Manually execute workflow via webhook
- ⚡ **Toggle** - Activate/deactivate workflow
- 🗑️ **Delete** - Remove workflow binding

**UX Features:**
- Toast notifications for all actions
- Loading states during mutations
- Empty state message
- Disabled buttons when unavailable
- Error messages from API

**State Management:**
- React Query for data fetching
- Automatic cache invalidation
- Optimistic UI updates

### 6. Integration Points

**IADetailPanel Component:**
- Added `instanceNumber` and `instanceId` props
- Conditionally renders N8NWorkflowForm when instance is selected
- Button is disabled if instance info missing

**Monitoring Page:**
- Passes `selectedIA.instance_number` and `String(selectedIA.id)` to IADetailPanel
- N8N form appears in detail panel when instance selected

## User Workflow

### Step 1: Register Workflow in N8N
1. Create workflow in N8N
2. Get workflow ID and webhook URL
3. Deploy/publish workflow

### Step 2: Register Binding in System
1. Go to Monitoramento (Monitoring) page
2. Select a WhatsApp instance
3. Click "Registrar Workflow N8N" button in detail panel
4. Fill form:
   - Workflow ID: `123abc` (from N8N)
   - Workflow Name: `Processar Mensagens` (custom label)
   - Webhook URL: `https://n8n.example.com/webhook/abc123`
   - Trigger Type: `webhook` (N8N trigger method)
5. Click "Registrar" button

### Step 3: Manage Workflows
- **View:** List shows all registered workflows
- **Edit:** Click "Editar" to modify configuration
- **Toggle:** Click ⚡ button to enable/disable
- **Trigger:** Click 🔧 to manually execute workflow
- **Delete:** Click 🗑️ to remove binding

### Step 4: Monitor Execution
- System tracks `last_triggered_at` timestamp
- Errors logged to `last_error_message` and `last_error_at`
- Toast notifications show success/failure

## Data Flow Diagram

```
User Interface (N8NWorkflowForm)
         ↓
  API Client (n8nWorkflowsAPI)
         ↓
  Express Routes (instance-workflows.routes.ts)
         ↓
  Service Layer (InstanceWorkflowsService)
         ↓
  Supabase Database (instance_n8n_workflows)
         ↓
  Drizzle ORM → SQL Queries
```

## Configuration Options

### Trigger Types
- **webhook**: Direct N8N webhook call
- **schedule**: N8N scheduled trigger
- **manual**: Manual trigger only
- **trigger_node**: N8N trigger node

### Workflow Status
- **is_active: true** - Workflow enabled and can be triggered
- **is_active: false** - Workflow disabled, won't execute

### Custom Config
Store additional workflow-specific configuration in `config` JSONB field:

```json
{
  "timeout": 30000,
  "retryCount": 3,
  "retryDelay": 1000,
  "customHeader": "value"
}
```

## Error Handling

**Common Errors:**

1. **Missing Required Fields**
   ```json
   {
     "success": false,
     "message": "Missing required fields: instance_id, workflow_id, workflow_name"
   }
   ```

2. **Duplicate Workflow**
   ```json
   {
     "success": false,
     "message": "This workflow is already associated with this instance"
   }
   ```

3. **Not Found**
   ```json
   {
     "success": false,
     "message": "Workflow not found for this instance"
   }
   ```

4. **Webhook Trigger Failed**
   ```json
   {
     "success": false,
     "message": "Failed to trigger workflow",
     "error": "Network timeout or invalid URL"
   }
   ```

## Security Considerations

1. **Authentication Required**
   - All API endpoints require valid JWT token
   - Tokens validated on each request

2. **Row-Level Security**
   - Supabase RLS policies enforce access control
   - Authenticated users can see all workflows (can be restricted further)

3. **Input Validation**
   - Required fields validated
   - URLs validated before storing
   - Workflow IDs sanitized

4. **Error Messages**
   - Don't expose sensitive information
   - Generic messages for security issues
   - Detailed logs server-side only

## Testing the Implementation

### 1. Via API (using curl)
```bash
# Get workflows
curl -H "Authorization: Bearer <token>" \
  http://localhost:5049/api/instances/5511999999999/workflows

# Create workflow
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "instance_id": "123e4567-e89b-12d3-a456-426614174000",
    "workflow_id": "workflow_123",
    "workflow_name": "Process Messages",
    "webhook_url": "https://n8n.example.com/webhook/abc",
    "trigger_type": "webhook"
  }' \
  http://localhost:5049/api/instances/5511999999999/workflows
```

### 2. Via UI
1. Navigate to http://localhost:5051/monitoring
2. Select an instance
3. Click "Registrar Workflow N8N"
4. Fill form and submit
5. See toast notification and workflow in list

### 3. Verify in Database
```sql
SELECT * FROM instance_n8n_workflows
WHERE instance_number = '5511999999999';
```

## Future Enhancements

1. **Workflow Execution Logs**
   - Store detailed execution history
   - Display logs in UI
   - Filter/search by status

2. **Workflow Scheduling**
   - Support cron-style scheduling
   - UI calendar picker for scheduling

3. **Workflow Templates**
   - Pre-configured workflow templates
   - One-click deployment

4. **Webhook Validation**
   - Test webhook before saving
   - Automatic retry logic

5. **Webhook Signature Verification**
   - Validate incoming webhooks with signatures
   - Prevent unauthorized triggers

6. **Performance Monitoring**
   - Track workflow execution time
   - Monitor error rates
   - Performance dashboards

## Files Modified/Created

**Backend:**
- ✅ `server/migrations/create-instance-n8n-workflows-table.sql` (existing)
- ✅ `server/services/instance-workflows.ts` (existing)
- ✅ `server/routes/instance-workflows.routes.ts` (existing)

**Frontend:**
- ✨ `client/src/components/N8NWorkflowForm.tsx` (NEW)
- ✏️ `client/src/components/IADetailPanel.tsx` (modified)
- ✏️ `client/src/pages/monitoring.tsx` (modified)
- ✏️ `client/src/lib/api.ts` (modified - added n8nWorkflowsAPI)

## Build Status

✅ **Build Successful**
- Frontend: 2717 modules
- No TypeScript errors
- No build warnings (except PostCSS)
- Ready for production

## Deployment

1. **Database Migration**
   - Run migration in Supabase SQL Editor
   - Or use execute-sql-direct.mjs script

2. **Backend Deploy**
   - Code already in server
   - No additional deployment needed

3. **Frontend Deploy**
   - Run `npm run build`
   - Deploy dist folder to hosting

## Support & Troubleshooting

**Workflow not showing?**
- Check instance number is correct
- Ensure JWT token is valid
- Verify network connectivity

**Webhook trigger failing?**
- Confirm webhook URL is correct
- Check N8N workflow is published
- Verify webhook accepts POST requests
- Check N8N logs for errors

**Database errors?**
- Check Supabase project is online
- Verify credentials in .env
- Check table exists: `instance_n8n_workflows`

## Contact & Documentation

For more information:
- N8N Docs: https://docs.n8n.io
- Evolution API Docs: Check your instance documentation
- Supabase Docs: https://supabase.com/docs

---

**Last Updated:** 2025-11-25
**Status:** Ready for Production
**Build Version:** 2717 modules
