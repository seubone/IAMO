# Contact Status Management System

## Overview
Implemented a comprehensive contact status management system that allows users to control the status of individual WhatsApp contacts per instance. By default, all contacts are **active** and can be **paused** or **deactivated** by the user.

## 📊 Database Schema

### Table: `instance_contact_status`
Manages the status (active/paused/inactive) for each contact within an instance.

#### Columns:
```sql
- id (BIGSERIAL PRIMARY KEY)
- instance_id (UUID, FOREIGN KEY → Instances.id)
- instance_number (VARCHAR 255)
- contact_jid (VARCHAR 255) - WhatsApp contact identifier
- contact_name (VARCHAR 255) - Optional contact name
- status (VARCHAR 50) - 'active' | 'paused' | 'inactive' [DEFAULT: 'active']
- pause_reason (TEXT) - Reason for pausing
- inactive_reason (TEXT) - Reason for deactivating
- paused_at (TIMESTAMP WITH TIME ZONE) - When pause started
- paused_until (TIMESTAMP WITH TIME ZONE) - Auto-resume at this time (null = indefinite)
- inactive_at (TIMESTAMP WITH TIME ZONE) - When inactivation started
- inactive_until (TIMESTAMP WITH TIME ZONE) - Auto-activate at this time (null = indefinite)
- created_at (TIMESTAMP WITH TIME ZONE) [DEFAULT: CURRENT_TIMESTAMP]
- updated_at (TIMESTAMP WITH TIME ZONE) [DEFAULT: CURRENT_TIMESTAMP]
```

#### Constraints:
- UNIQUE(instance_id, contact_jid)
- UNIQUE(instance_number, contact_jid)
- CHECK (status IN ('active', 'paused', 'inactive'))

#### Indexes:
- `idx_instance_contact_status_instance_number` - Quick lookup by instance
- `idx_instance_contact_status_instance_id` - Lookup by instance ID
- `idx_instance_contact_status_contact_jid` - Find contacts across instances
- `idx_instance_contact_status_status` - Filter by status
- `idx_instance_contact_status_paused_until` - Auto-resume tracking
- `idx_instance_contact_status_inactive_until` - Auto-activate tracking

#### Row Level Security:
- Enabled for authenticated users only
- Full read/write/insert/delete access for authenticated users

#### Auto-Update Triggers:
- `trigger_instance_contact_status_updated_at` - Automatically updates `updated_at` on any change
- `auto_resume_paused_contacts` - Can be called to auto-resume expired pauses
- `auto_activate_inactive_contacts` - Can be called to auto-activate expired inactivations

## 🔧 Backend Service

### Service: `InstanceContactStatusService`
Located: `server/services/instance-contact-status.ts`

#### Methods:

**Status Retrieval:**
- `getContactStatus(instanceNumber, contactJid)` - Get contact status
- `getOrCreateContactStatus(instanceId, instanceNumber, contactJid, contactName)` - Get or create with default 'active'
- `getInstanceContacts(instanceNumber)` - List all contacts for instance
- `getActiveContacts(instanceNumber)` - List active contacts only
- `getPausedContacts(instanceNumber)` - List paused contacts
- `getInactiveContacts(instanceNumber)` - List inactive contacts
- `getContactStats(instanceNumber)` - Get count statistics (total, active, paused, inactive)

**Status Management:**
- `pauseContact(instanceNumber, contactJid, duration, reason)` - Pause with optional time limit
- `resumeContact(instanceNumber, contactJid)` - Resume paused contact
- `deactivateContact(instanceNumber, contactJid, duration, reason)` - Deactivate with optional time limit
- `activateContact(instanceNumber, contactJid)` - Activate inactive contact

**Utilities:**
- `isContactActive(instanceNumber, contactJid)` - Check if contact is active (for message routing)
- `updateContactName(instanceNumber, contactJid, contactName)` - Update contact display name
- `bulkCreateContacts(instanceNumber, contacts)` - Initialize multiple contacts at once

## 🌐 API Endpoints

All endpoints require authentication (Bearer token).

### Contact Retrieval

#### GET `/api/instances/:instanceNumber/contacts`
Get all contacts for an instance with their status.

**Response:**
```json
{
  "success": true,
  "message": "Contatos carregados com sucesso",
  "count": 25,
  "data": [
    {
      "id": 1,
      "instance_id": "uuid-1234",
      "instance_number": "5511999999999",
      "contact_jid": "5511988888888@s.whatsapp.net",
      "contact_name": "João Silva",
      "status": "active",
      "created_at": "2024-11-25T10:00:00Z",
      "updated_at": "2024-11-25T10:00:00Z"
    }
  ]
}
```

#### GET `/api/instances/:instanceNumber/contacts/:contactJid`
Get status for a specific contact.

**Response:**
```json
{
  "success": true,
  "message": "Status do contato obtido com sucesso",
  "data": { /* contact data */ }
}
```

#### GET `/api/instances/:instanceNumber/contacts/active`
Get all active contacts.

#### GET `/api/instances/:instanceNumber/contacts/paused`
Get all paused contacts.

#### GET `/api/instances/:instanceNumber/contacts/inactive`
Get all inactive contacts.

#### GET `/api/instances/:instanceNumber/contacts/stats`
Get statistics about contact status distribution.

**Response:**
```json
{
  "success": true,
  "message": "Estatísticas obtidas com sucesso",
  "data": {
    "total": 100,
    "active": 95,
    "paused": 3,
    "inactive": 2
  }
}
```

### Contact Status Management

#### POST `/api/instances/:instanceNumber/contacts/:contactJid/pause`
Pause a contact (stops receiving responses but still monitors).

**Request Body:**
```json
{
  "duration": 3600000,  // milliseconds (optional, null = indefinite)
  "reason": "Motivo da pausa"  // optional
}
```

**Duration Options:**
- `300000` = 5 minutes
- `900000` = 15 minutes
- `1800000` = 30 minutes
- `3600000` = 1 hour
- `7200000` = 2 hours
- `86400000` = 1 day
- `604800000` = 1 week
- `null` = Indefinite

**Response:**
```json
{
  "success": true,
  "message": "Contato pausado com sucesso por 3600s",
  "data": { /* updated contact data */ }
}
```

#### POST `/api/instances/:instanceNumber/contacts/:contactJid/resume`
Resume a paused contact.

#### POST `/api/instances/:instanceNumber/contacts/:contactJid/deactivate`
Deactivate a contact (completely disabled, no monitoring).

**Request Body:**
```json
{
  "duration": null,  // optional, null = indefinite
  "reason": "Motivo da desativação"  // optional
}
```

#### POST `/api/instances/:instanceNumber/contacts/:contactJid/activate`
Activate an inactive contact.

#### POST `/api/instances/:instanceNumber/contacts/bulk-create`
Initialize multiple contacts at once (for new instances).

**Request Body:**
```json
{
  "contacts": [
    { "jid": "5511988888888@s.whatsapp.net", "name": "João" },
    { "jid": "5511977777777@s.whatsapp.net", "name": "Maria" }
  ]
}
```

## 📝 TypeScript Types

File: `shared/instance-contact-status.types.ts`

```typescript
type ContactStatus = "active" | "paused" | "inactive";

interface ContactStatusData {
  id?: number;
  instance_id: string;
  instance_number: string;
  contact_jid: string;
  contact_name?: string | null;
  status: ContactStatus;
  pause_reason?: string | null;
  inactive_reason?: string | null;
  paused_at?: Date | null;
  paused_until?: Date | null;
  inactive_at?: Date | null;
  inactive_until?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

interface PauseContactRequest {
  duration?: number | null;
  reason?: string;
}

interface DeactivateContactRequest {
  duration?: number | null;
  reason?: string;
}
```

## 🚀 Usage Examples

### Get all contacts for an instance
```bash
curl -X GET "http://localhost:5049/api/instances/5511999999999/contacts" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Pause a specific contact for 1 hour
```bash
curl -X POST "http://localhost:5049/api/instances/5511999999999/contacts/5511988888888%40s.whatsapp.net/pause" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 3600000,
    "reason": "Usuário pediu pausa"
  }'
```

### Resume a paused contact
```bash
curl -X POST "http://localhost:5049/api/instances/5511999999999/contacts/5511988888888%40s.whatsapp.net/resume" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get contact statistics
```bash
curl -X GET "http://localhost:5049/api/instances/5511999999999/contacts/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔄 Status Flow

```
┌─────────────┐
│   ACTIVE    │  (Default state for all new contacts)
└──────┬──────┘
       │ pause()
       ↓
┌─────────────┐
│   PAUSED    │  (Temporarily stops responses)
└──────┬──────┘
       │ resume() OR duration expires
       ↓
┌─────────────┐
│   ACTIVE    │
└─────────────┘

┌─────────────┐
│   ACTIVE    │
└──────┬──────┘
       │ deactivate()
       ↓
┌─────────────┐
│  INACTIVE   │  (Completely disabled)
└──────┬──────┘
       │ activate() OR duration expires
       ↓
┌─────────────┐
│   ACTIVE    │
└─────────────┘
```

## 📂 Files Created/Modified

### New Files:
1. `server/migrations/create-instance-contact-status-table.sql` - Database migration
2. `server/services/instance-contact-status.ts` - Service layer
3. `server/routes/instance-contact-status.routes.ts` - API routes
4. `shared/instance-contact-status.types.ts` - TypeScript types

### Modified Files:
1. `server/routes.ts` - Added route registration

## ✅ Implementation Checklist

- ✅ Database table created with proper schema
- ✅ RLS policies enabled
- ✅ Auto-update triggers for timestamps
- ✅ Indexes for performance optimization
- ✅ Service layer with all CRUD operations
- ✅ API routes with proper authentication
- ✅ TypeScript types for type safety
- ✅ Build passes without errors
- ✅ All endpoints tested and working

## 🔐 Security Features

- ✅ Row Level Security (RLS) enabled
- ✅ All endpoints require authentication
- ✅ Input validation in routes
- ✅ Foreign key constraints
- ✅ Unique constraints prevent duplicates
- ✅ Check constraint for status values

## 📈 Performance Optimizations

- ✅ 6 strategic indexes on common queries
- ✅ Unique constraints prevent duplicate lookups
- ✅ Foreign key constraint maintains referential integrity
- ✅ Pagination-ready architecture
- ✅ Efficient contact count statistics query

## 🔄 Integration with Existing Systems

The contact status system integrates seamlessly with:
1. **Instance Bot Status** - Works alongside bot-level pause/inactive controls
2. **N8N Workflows** - Can be used to trigger workflows based on contact status
3. **Message Routing** - Can check `isContactActive()` before processing incoming messages
4. **Instance Settings** - Can be configured alongside instance workflow settings

## 🎯 Next Steps (Optional Enhancements)

1. Frontend UI component to display and manage contact status
2. Webhook integration to notify on status changes
3. Bulk status changes (pause/deactivate multiple contacts at once)
4. Contact status history/audit log
5. Scheduled status changes (change status at a specific time)
6. Contact groups with shared status rules
