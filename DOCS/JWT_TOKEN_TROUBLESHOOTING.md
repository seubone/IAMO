# JWT Token Troubleshooting Guide

## Problem Overview

The application encountered authentication errors manifested as:

1. **HTTP 401 "Token inválido"** on endpoints like:
   - `/api/tickets`
   - `/api/ias`
   - `/api/actions`
   - `/api/whatsapp/instances`

2. **WebSocket Connection Rejections**: `"Invalid token format invalid signature"`

## Root Cause Analysis

These errors are **NOT related to UazAPI tokens** (stored in the database). Instead, they're related to the **JWT authentication token** used to authenticate API requests and WebSocket connections.

### Why This Happens

1. **Server Restart with Different JWT_SECRET**
   - If the server is restarted and the `JWT_SECRET` environment variable is different, all existing JWT tokens become invalid
   - Clients holding old tokens will get 401 errors

2. **Token Expiration**
   - JWT tokens expire after 7 days (see [server/middleware/auth.ts:26](../server/middleware/auth.ts#L26))
   - Expired tokens must be renewed by logging in again

3. **Invalid Token Format**
   - If localStorage is corrupted or the token contains invalid data
   - Basic validation should catch tokens without the "." separator (JWT format: `header.payload.signature`)

### How to Identify the Issue

**Check the browser console** for messages like:
```
❌ Unauthorized (401) - Token may be expired or invalid. Clearing authentication...
⏰ WebSocket connection rejected: Token expired
❌ WebSocket connection rejected: Invalid token signature
```

**Check the server logs** for messages like:
```
❌ WebSocket connection rejected: Invalid token signature (secret not matched)
⏰ WebSocket connection rejected: Token expired
```

## Solution Implemented

The application now handles invalid tokens gracefully:

### Client-Side Improvements

1. **Automatic Token Validation** ([client/src/hooks/use-websocket.ts](../client/src/hooks/use-websocket.ts))
   - Checks token format before attempting WebSocket connection
   - Detects tokens without "." separator (invalid JWT format)
   - Automatically removes invalid tokens from localStorage

2. **401 Response Interceptor** ([client/src/lib/queryClient.ts](../client/src/lib/queryClient.ts))
   - Detects all 401 responses from the server
   - Automatically clears invalid tokens
   - Triggers global logout handler

3. **WebSocket Error Handling** ([client/src/hooks/use-websocket.ts](../client/src/hooks/use-websocket.ts))
   - Detects WebSocket close code 1008 (Policy Violation - auth error)
   - Automatically clears token on authentication rejection

4. **Global Logout Handler** ([client/src/App.tsx](../client/src/App.tsx))
   - Registered to handle all unauthorized (401) responses
   - Ensures consistent logout behavior across the app

### Server-Side Improvements

1. **Better Error Logging** ([server/routes.ts:113-128](../server/routes.ts#L113-L128))
   - Distinguishes between different JWT error types:
     - `TokenExpiredError` - Token has expired
     - `JsonWebTokenError` - Invalid signature or format
     - Generic error - Other authentication issues

## Recovery Steps

### If You Get Logged Out Due to Token Issues

1. **Refresh the page or reload the application**
2. **Login again** with your credentials
3. A new, valid JWT token will be created
4. All API requests and WebSocket connections will work normally

### If You Keep Getting 401 Errors

1. **Clear browser storage**:
   ```javascript
   localStorage.removeItem("auth_token");
   localStorage.clear();
   ```

2. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)

3. **Login again**

### If WebSocket Connection Keeps Failing

Check the browser console for error messages. If you see "Invalid token signature":

1. The server's `JWT_SECRET` may have changed
2. **Solution**: Login again to get a new token with the current secret

## Environment Configuration

Make sure your `.env` file has a valid `JWT_SECRET`:

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345678
```

⚠️ **Important for Production**:
- Change this value in production to something unique
- Do NOT use the default value
- Keep it secure and backed up
- If you need to change it, all users will need to log in again

## Understanding the Difference

### JWT Token (User Authentication)
- **Purpose**: Authenticates API requests and WebSocket connections
- **Stored in**: Browser localStorage (key: `auth_token`)
- **Expiration**: 7 days
- **Generated**: On login via `/api/auth/login`
- **Related Files**:
  - [server/middleware/auth.ts](../server/middleware/auth.ts)
  - [client/src/hooks/use-auth.ts](../client/src/hooks/use-auth.ts)

### UazAPI Token (WhatsApp Integration)
- **Purpose**: Authenticates requests to the UazAPI service
- **Stored in**: PostgreSQL database (`uazapi_instances` table)
- **No expiration**: Manually managed per WhatsApp instance
- **Never exposed**: Only `hasToken: boolean` flag returned to client
- **Related Files**:
  - [server/db-storage.ts](../server/db-storage.ts)
  - [server/routes.ts](../server/routes.ts) (lines 950-1648)
  - [client/src/components/InstanceSettingsDialog.tsx](../client/src/components/InstanceSettingsDialog.tsx)

## Logging and Debugging

The application now includes enhanced console logging:

**Successful login**:
```
✅ Setting authentication for user: user@example.com
🔐 Unauthorized callback handler registered
```

**WebSocket connection**:
```
🔌 Connecting to WebSocket...
✅ WebSocket client connected: user@example.com
```

**Token errors**:
```
❌ Unauthorized (401) - Token may be expired or invalid. Clearing authentication...
⏰ WebSocket connection rejected: Token expired
❌ WebSocket connection rejected: Invalid token signature
🚪 Logging out user
```

Check the browser console (F12) and server terminal for these messages to understand what's happening.

## Related Documentation

- [UAZAPI_TOKEN_FIX.md](./UAZAPI_TOKEN_FIX.md) - About UazAPI token handling
- [UAZAPI_DATABASE_SETUP.md](./UAZAPI_DATABASE_SETUP.md) - Database schema for UazAPI
- [server/middleware/auth.ts](../server/middleware/auth.ts) - JWT validation logic
