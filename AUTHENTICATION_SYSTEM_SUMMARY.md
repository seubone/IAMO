# Authentication and User Account System Summary
## Overview
The application implements a comprehensive user authentication and authorization system using Supabase for authentication and PostgreSQL for local user management with role-based access control (RBAC).
---
## 1. User Model/Schema Definition
Location: shared/schema.ts
The users table includes:
- id: UUID primary key
- name: Users full name
- email: Unique email identifier
- password: Hashed password (bcryptjs)
- role: RBAC role (admin, operator, viewer) - defaults to viewer
- avatar: Optional profile picture
- preferences: JSON for UI preferences
- personalIntegrations: JSON for API keys/tokens
- createdAt/updatedAt: Audit timestamps

## 2. Authentication Routes and Logic

Location: server/routes.ts (Lines 578-837)

### 2.1 User Registration
- Endpoint: POST /api/auth/register
- Auth Required: No (public, rate-limited)
- Rate Limit: 5/15min (prod) or 100/min (dev)
- Validation: Min 6 char password, unique email
- Behavior:
  - Creates user in Supabase Auth with email verification
  - Creates corresponding user in PostgreSQL DB (role defaults to "viewer")
  - Returns success message requiring email confirmation

### 2.2 User Login
- Endpoint: POST /api/auth/login
- Auth Required: No (public, rate-limited)
- Methods:
  1. Supabase Token (OAuth/Email+Password) - primary
  2. Legacy Local DB - fallback for existing users
- Returns JWT token with 7-day expiry

### 2.3 Google OAuth Callback
- Endpoint: POST /api/auth/google-callback
- Syncs or creates user in local DB from Google OAuth
- Default role: "viewer"

### 2.4 Get Current User
- Endpoint: GET /api/auth/me
- Auth Required: Yes (Bearer token)
- Returns: User profile including preferences

### 2.5 Update User Profile
- Endpoint: PATCH /api/auth/profile
- Auth Required: Yes
- Updatable: name, avatar, preferences, personalIntegrations

### 2.6 Change Password
- Endpoint: PATCH /api/auth/password
- Auth Required: Yes
- Validation: Min 12 chars, uppercase, lowercase, number required
- Note: For legacy local DB users only

## 3. Role-Based Access Control (RBAC)

Location: server/middleware/rbac.ts

### Three Roles Defined:

ADMIN
- Full access to all resources
- Permissions: ["*"] (wildcard)
- Can manage system configuration

OPERATOR
- Can read and update IAs
- Can manage tickets and conversations
- Can create actions and messages
- Permissions: ias:read, ias:update, tickets:read, tickets:create, 
  tickets:update, actions:read, actions:create, conversations:read, 
  conversations:update, messages:read, messages:create, metrics:read

VIEWER
- Read-only access (default for new users)
- Permissions: ias:read, tickets:read, actions:read, conversations:read, 
  messages:read, metrics:read

### RBAC Middleware:

requireRole(roles): Middleware
- Checks if user's role matches allowed roles
- Returns 403 if not authorized

requirePermission(permission): Middleware
- Checks specific permission (e.g., "ias:update")
- Admin role automatically has all permissions
- Returns 403 if denied

## 4. Protected Routes by Permission

IAs:
- GET /api/ias - ias:read
- POST /api/ias - ias:create
- PATCH /api/ias/:id - ias:update

Tickets:
- GET /api/tickets - tickets:read
- GET /api/tickets/ia/:iaId - tickets:read
- POST /api/tickets - tickets:create
- PATCH /api/tickets/:id - tickets:update

Actions (Audit Log):
- GET /api/actions - actions:read
- GET /api/actions/ia/:iaId - actions:read

Conversations:
- GET /api/conversations - conversations:read
- GET /api/conversations/attendance/:attendanceId - conversations:read
- POST /api/conversations - conversations:update
- PATCH /api/conversations/:id - conversations:update

Messages:
- GET /api/messages/conversation/:conversationId - messages:read
- POST /api/messages - messages:create

Metrics:
- GET /api/metrics/ia/:iaId - metrics:read

System Configuration:
- GET /api/config/evolution-db - admin only
- POST /api/config/evolution-db - admin only

## 5. User Types/Roles Currently Implemented

Current Roles:
1. admin - Full system access
2. operator - Manage content and operations
3. viewer - Read-only access

Role Assignment:
- New users: Default role is "viewer"
- Admin override: Admins can manually update roles in database
- OAuth users: Default to "viewer" role

IMPORTANT: No User Management Interface
Currently there is NO admin interface for creating users or assigning roles.
Users are created via registration endpoint or manually updated via SQL.

## 6. Authentication Middleware

Location: server/middleware/auth.ts

authMiddleware:
- Extracts JWT from Authorization header (Bearer {token})
- Attempts Supabase token verification first
- Falls back to JWT verification for backward compatibility
- Attaches user object to req.user
- Returns 401 if invalid/missing

optionalAuth:
- Does not require token
- Attaches user if valid token provided
- Continues if no token

Token Generation:
- Contains: id, email, role
- Expiry: 7 days
- Uses JWT_SECRET from environment

## 7. Database Schema

Location: shared/schema.ts and server/migrations/

User Table:
- users: id, name, email, password, role, avatar, preferences, personalIntegrations, createdAt, updatedAt

Related Tables:
- actions: Audit log of user actions on IAs (userId references users.id)
- ias: AI agent configurations (no direct user foreign key)
- tickets: Issues/tickets (iaId references ias.id)
- conversations: Chat conversations (iaId references ias.id)
- messages: Messages in conversations (conversationId references conversations.id)
- metrics: IA performance metrics (iaId references ias.id)

## 8. Existing Hierarchy and Permission System

Permission Model:

Admin (superuser)
  - All permissions
  - System configuration access

Operator (contributor)
  - Read: IAs, Tickets, Messages, Conversations, Actions, Metrics
  - Write: IAs, Conversations, Tickets, Actions, Messages

Viewer (consumer)
  - Read-only: IAs, Tickets, Messages, Conversations, Actions, Metrics

Permission Format:
- Resource-based: {resource}:{action}
- Resources: ias, tickets, actions, conversations, messages, metrics
- Actions: read, create, update, delete
- Example: ias:update, tickets:create

Audit Trail:
- actions table tracks user modifications on IAs
- Records userId, action, reason, timestamp
- Auto-created on status changes

## 9. Key Files Reference

| Component | File Path | Description |
|-----------|-----------|-------------|
| User Schema | shared/schema.ts | PostgreSQL users table |
| RBAC Logic | server/middleware/rbac.ts | Role/permission definitions |
| Auth Middleware | server/middleware/auth.ts | Token validation |
| Auth Routes | server/routes.ts (578-837) | Register, login, profile endpoints |
| Database Storage | server/config/db-storage.ts | User CRUD operations |
| Supabase Config | server/config/supabase.ts | Supabase client initialization |
| IA Config Routes | server/routes/ia-config.routes.ts | AI management with RBAC |

## 10. Current Limitations

1. No Admin Dashboard for User Management
   - Cannot create/delete users from UI
   - Cannot assign roles from UI
   - Must use SQL directly or registration endpoint

2. Default Viewer Role for All New Users
   - No invite system with role pre-assignment
   - Admins must manually upgrade user roles

3. Manual Role Assignment
   - Requires direct SQL access
   - No API endpoint to update user roles

4. No User Deactivation
   - No soft delete mechanism
   - No way to disable user account
   - Must delete from database

5. Hardcoded Role/Permission Structure
   - Cannot create custom roles
   - Cannot fine-tune permissions per role
   - Cannot grant/deny permissions per user

6. Single-Tenant Only
   - No organization/team hierarchy
   - No workspace separation
   - All users have access to all IAs

## 11. Security Considerations

Implemented:
- JWT tokens with 7-day expiry
- Rate limiting: 5 auth attempts/15 min (prod)
- Password strength: Min 12 chars, uppercase, lowercase, number
- Bcrypt password hashing
- Supabase email verification on registration
- Role-based access control on all endpoints
- Bearer token validation on protected routes

Recommended Improvements:
- Implement HTTPS enforcement in production
- Add refresh token rotation mechanism
- Implement session timeout (inactivity-based)
- Add password reset functionality
- Implement login attempt tracking and account lockout
- Add 2FA/MFA for admin accounts
- Regular security audits of permissions
- Log all authentication failures
- Add CORS configuration for production
- Implement certificate pinning for API calls
