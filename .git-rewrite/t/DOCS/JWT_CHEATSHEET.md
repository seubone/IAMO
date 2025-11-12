# JWT Token - Cheatsheet

## 🔧 Quick Commands

### Browser Console (F12 → Console)
```javascript
// Check if token exists
localStorage.getItem('auth_token')

// Clear all storage
localStorage.clear()

// Copy token to clipboard
copy(localStorage.getItem('auth_token'))

// Decode token (client-side)
import { decodeJWT } from '/src/utils/jwt-debug.ts'
decodeJWT(localStorage.getItem('auth_token'))

// Run full diagnostics
import { runDiagnostics } from '/src/utils/jwt-debug.ts'
runDiagnostics()
```

### Terminal / Server
```bash
# Check JWT_SECRET
grep JWT_SECRET .env

# Generate new secure secret
openssl rand -base64 32

# Restart server
npm run dev
```

### cURL (Test API)
```bash
# Test token verification
curl -X POST http://localhost:5051/api/debug/jwt \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_HERE"}'

# Check if server is running
curl http://localhost:5051/api/config/public
```

---

## 🌐 Important URLs

| URL | Purpose | Access |
|-----|---------|--------|
| `http://localhost:5000/jwt-debug` | Token debugger | Authenticated only |
| `https://jwt.io` | JWT verification tool | External site |
| `http://localhost:5051/api/debug/jwt` | Server verify token | POST, unauthenticated |

---

## 📊 Token Structure

### Basic Format
```
header.payload.signature

Example:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJpZCI6IjEyMyIsImVtYWlsIjoiem9lQGV4YW1wbGUuY29tIiwiaWF0IjoxNjI0MzU5MDAwfQ.
x2z1r4s5q8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3
```

### Header (Part 1)
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload (Part 2)
```json
{
  "id": "123",
  "email": "zoe@example.com",
  "role": "viewer",
  "iat": 1624359000,
  "exp": 1625000000
}
```

### Signature (Part 3)
- HMAC-SHA256(header.payload, JWT_SECRET)
- Proves token wasn't modified
- Verifies server can decrypt it

---

## 🔐 Security Rules

### DO ✅
- ✅ Keep JWT_SECRET secret and secure
- ✅ Use HTTPS in production
- ✅ Logout before closing session
- ✅ Clear browser cache if token corrupted
- ✅ Change secret if compromised

### DON'T ❌
- ❌ Commit JWT_SECRET to git
- ❌ Share token in unsecured channels
- ❌ Use same secret across environments
- ❌ Store token in plain text
- ❌ Share unencrypted tokens in logs

---

## 🚨 Common Errors & Fixes

### Error: "Token inválido"
```
Possible Causes:
  1. Token is expired (> 7 days old)
  2. Server JWT_SECRET changed
  3. Token is corrupted in localStorage

Fix:
  1. Visit /jwt-debug
  2. Check expiration status
  3. If expired: Logout → Login again
  4. If not expired: Copy token → Test on jwt.io
```

### Error: "WebSocket connection rejected"
```
Cause: Same as "Token inválido"

Fix: Follow the above steps
```

### Error: "Signature Invalid" on jwt.io
```
Cause: JWT_SECRET doesn't match

Fix:
  1. Check .env file (grep JWT_SECRET .env)
  2. Copy exact value
  3. Paste in jwt.io "Secret" field
  4. If still invalid: Logout and Login again
```

### Error: "Token not found"
```
Cause: Never logged in or localStorage cleared

Fix:
  1. Go to /login
  2. Enter credentials
  3. New token will be generated
```

---

## ⏱️ Token Lifecycle

```
LOGIN
  ↓
Generate Token (HS256 signed with JWT_SECRET)
  ↓
Store in localStorage (key: 'auth_token')
  ↓
Send with every API request (Authorization: Bearer TOKEN)
  ↓
Server Verifies (JWT_SECRET must match)
  ↓
7 DAYS PASS
  ↓
Token Expires
  ↓
User Gets 401 Error
  ↓
LOGOUT & LOGIN
  ↓
New Token Generated (same JWT_SECRET)
  ↓
Cycle Repeats
```

---

## 🧠 Remember

| Concept | Definition |
|---------|-----------|
| **JWT** | JSON Web Token - secure way to transmit info |
| **Signature** | Proves token wasn't modified |
| **Expiration** | Token is valid for 7 days, then must re-login |
| **JWT_SECRET** | Server's private key for signing tokens |
| **localStorage** | Browser storage where token is kept |
| **Bearer Token** | Format: `Authorization: Bearer TOKEN` |
| **Payload** | The actual user data (id, email, role) |
| **Algorithm** | HS256 = HMAC-SHA256 |

---

## 🎯 Debug Workflow

```
Problem?
    ↓
1. Go to /jwt-debug
    ↓
2. Check "Token Status"
    ↓
3. If ✅ Valid → Problem elsewhere
    ↓
4. If ❌ Invalid → Copy token
    ↓
5. Go to jwt.io
    ↓
6. Paste token + JWT_SECRET
    ↓
7. Check "Signature Verified"
    ↓
8. If Green → Can logout/login to fix
    ↓
9. If Red → Ask for JWT_SECRET help
```

---

## 📱 File Locations

```
.env                                  ← JWT_SECRET
├── client/
│   ├── src/
│   │   ├── pages/jwt-debug.tsx       ← Debug UI
│   │   ├── utils/jwt-debug.ts        ← Debug functions
│   │   ├── hooks/use-auth.ts         ← Auth state
│   │   ├── hooks/use-websocket.ts    ← WS validation
│   │   ├── lib/queryClient.ts        ← 401 interceptor
│   │   └── App.tsx                   ← Global handler
│   └── ...
├── server/
│   ├── utils/jwt-debug.ts            ← Server verify
│   ├── routes.ts                     ← /api/debug/jwt
│   ├── middleware/auth.ts            ← JWT verify
│   └── ...
└── DOCS/
    ├── JWT_QUICK_FIX.md              ← 3-step fix
    ├── JWT_DEBUG_GUIDE.md            ← Full guide
    ├── JWT_TOKEN_TROUBLESHOOTING.md  ← Technical
    ├── JWT_DIAGNOSIS_FLOWCHART.md    ← Flowchart
    ├── IMPLEMENTATION_SUMMARY.md     ← What changed
    └── JWT_CHEATSHEET.md             ← This file
```

---

## 💡 Pro Tips

1. **Bookmark jwt.io** - You'll use it often
2. **Know your .env path** - Grep it quickly when needed
3. **Keep terminal open** - Watch logs while debugging
4. **F12 is your friend** - Console logs show JWT info
5. **Screenshot errors** - Share with team for help
6. **Test in DevTools** - Faster than full page reload
7. **Copy, don't type** - Tokens are long, use copy-paste
8. **Check HTTPS** - In production, always use HTTPS

---

## 🆘 When All Else Fails

1. **Hard Refresh**: Ctrl+Shift+R (Clear cache)
2. **Clear Storage**: F12 → Application → Clear All
3. **Close Browser**: Sometimes helps with state issues
4. **Restart Server**: npm run dev (might pick up .env changes)
5. **Check Permissions**: Make sure .env is readable
6. **Look at Logs**: Server terminal + Browser console (F12)
7. **Read Guide**: Refer back to JWT_DEBUG_GUIDE.md
8. **Ask for Help**: Share screenshot of error + logs

---

## 📞 Quick Reference URLs

```
# Debug Page
http://localhost:5000/jwt-debug

# JWT.io
https://jwt.io

# Docs Folder
./DOCS/

# Server API (debug)
POST http://localhost:5051/api/debug/jwt

# This file
DOCS/JWT_CHEATSHEET.md
```

---

## ✨ You Got This! 🎉

Token issues are now **automatically detected and fixed**. If you see any errors:
1. Go to `/jwt-debug`
2. Click "Run Diagnostics"
3. Check the browser console (F12)
4. Follow the suggestions

Happy debugging! 🚀
