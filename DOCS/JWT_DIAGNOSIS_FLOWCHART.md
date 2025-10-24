# JWT Problem Diagnosis Flowchart

## 🔍 Decision Tree

```
┌─────────────────────────────────────┐
│  Recebendo erro 401 ou             │
│  "WebSocket rejected"?              │
└──────────────┬──────────────────────┘
               │
               ▼
      ┌────────────────┐
      │ Faça Login     │
      │ Novamente      │
      └────────┬───────┘
               │
               ▼
      ┌────────────────────────┐
      │ Problema Resolvido?    │
      └───┬──────────────┬─────┘
          │              │
        SIM            NÃO
          │              │
          ▼              ▼
      ✅ FIM      ┌──────────────────┐
                   │ Vá para:         │
                   │ /jwt-debug       │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌────────────────────┐
                   │ "Signature        │
                   │  Verified" no     │
                   │  jwt.io?           │
                   └──┬────────────┬────┘
                     SIM          NÃO
                      │            │
                      ▼            ▼
                  ✅ FIM    ┌─────────────────┐
                            │ JWT_SECRET não  │
                            │ bate            │
                            │                 │
                            │ 1. Verificar    │
                            │    .env         │
                            │ 2. Reiniciar    │
                            │    servidor     │
                            │ 3. Logout/Login │
                            └────────┬────────┘
                                     │
                                     ▼
                                 ✅ FIM
```

---

## 📊 Detailed Diagnosis Matrix

```
┌──────────────────────────────────────────────────────────────────────┐
│                    JWT DIAGNOSTIC MATRIX                            │
├──────────────────┬────────────────┬─────────────────────┬───────────┤
│ Symptom          │ Likely Cause   │ Quick Test          │ Fix       │
├──────────────────┼────────────────┼─────────────────────┼───────────┤
│ Erro 401         │ Token invalid  │ Visit /jwt-debug    │ Login     │
│ immediate        │ or expired     │                     │ again     │
├──────────────────┼────────────────┼─────────────────────┼───────────┤
│ WebSocket        │ Same as above  │ Check browser       │ Same as   │
│ rejected         │                │ console (F12)       │ above     │
├──────────────────┼────────────────┼─────────────────────┼───────────┤
│ Multiple 401s    │ Cascading      │ Should be fixed     │ Now       │
│ in logs          │ errors (fixed) │ automatically       │ fixed!    │
├──────────────────┼────────────────┼─────────────────────┼───────────┤
│ jwt.io shows     │ Secret changed │ Verify .env file    │ Restart   │
│ "Invalid"        │ on server      │ or token generated  │ server    │
│                  │ with old       │ with old secret     │           │
├──────────────────┼────────────────┼─────────────────────┼───────────┤
│ Token expired    │ Token > 7 days │ Check /jwt-debug    │ Login     │
│                  │                │ "Expiration" field  │ again     │
├──────────────────┼────────────────┼─────────────────────┼───────────┤
│ No token in      │ Never logged   │ localStorage.      │ Login     │
│ localStorage     │ in or cleared  │ getItem('auth_token')
│                  │                │ should show null    │           │
└──────────────────┴────────────────┴─────────────────────┴───────────┘
```

---

## 🔐 Secret Matching Verification Flow

```
Client Has Token                Browser
    │                            │
    ├─→ Store in localStorage    │
    │                            │
    └─→ Send with requests       │
         │                       │
         ▼                       ▼
    Server Receives Token    Check /jwt-debug Page
         │                       │
         ├─→ Extract header      ├─→ Show header/payload
         │   & payload           │
         │                       ├─→ Display expiration
         ├─→ Verify signature    │
         │   with JWT_SECRET     ├─→ "Copy Token" button
         │                       │
         ├─→ ✅ Valid?           ├─→ Go to jwt.io
         │   │                   │   Paste token
         │   ├─ YES              │   Enter JWT_SECRET
         │   │   Response 200    │
         │   │                   │   ├─→ ✅ Signature OK?
         │   │                   │   │   YES → Token valid
         │   │                   │   │
         │   │                   │   └─→ ❌ Signature Invalid?
         │   │                   │       NO → Secret mismatch
         │   │
         │   └─ NO               └─→ Must logout & login
         │       Response 401        to generate new token
         │       (now auto-logs
         │        out user!)
         │
         ▼
    Browser detects 401
    Auto-logs out user
    Redirects to /login
```

---

## 🔄 The Fix Loop

```
BEFORE FIX:
    Erro 401 → Error → Error → Error → Error (Loop)

AFTER FIX:
    Erro 401 → Auto-logout → Redirect /login → Login → ✅
```

---

## 📱 Where Each Component Validates

```
┌─────────────────────────────────────────────────────────────────┐
│                      VALIDATION LAYERS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLIENT SIDE                                                   │
│  ───────────────────────────────────────────────────────────  │
│  1. /jwt-debug page                                           │
│     └─→ Decode and display token info                         │
│                                                                 │
│  2. use-websocket.ts                                          │
│     └─→ Validate format before connecting                     │
│     └─→ Detect rejected connections (code 1008)               │
│                                                                 │
│  3. queryClient interceptor (lib/queryClient.ts)              │
│     └─→ Catch 401 responses                                   │
│     └─→ Clear token automatically                             │
│                                                                 │
│  4. use-auth.ts                                               │
│     └─→ Trigger logout on unauthorized                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SERVER SIDE                                                   │
│  ───────────────────────────────────────────────────────────  │
│  1. WebSocket connection (routes.ts:50-128)                   │
│     └─→ Verify JWT_SECRET                                     │
│     └─→ Reject with code 1008 if invalid                      │
│                                                                 │
│  2. HTTP middleware (middleware/auth.ts)                      │
│     └─→ Verify JWT_SECRET on each request                     │
│     └─→ Return 401 if invalid                                 │
│                                                                 │
│  3. /api/debug/jwt endpoint (routes.ts:236-266)               │
│     └─→ Test token against current secret                     │
│     └─→ Return detailed verification info                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                   QUICK REFERENCE CARD                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Token Location:   localStorage.getItem('auth_token')         │
│                                                                 │
│  Debug Page:       http://localhost:5000/jwt-debug             │
│                                                                 │
│  JWT Verification: https://jwt.io (paste token + secret)      │
│                                                                 │
│  Server Test:      curl -X POST http://localhost:5051/api/debug/jwt \
│                     -H 'Content-Type: application/json' \     │
│                     -d '{"token":"..."}' │
│                                                                 │
│  Clear Everything:  localStorage.clear()                       │
│                                                                 │
│  Server Logs:       npm run dev (watch for 🔐 messages)       │
│                                                                 │
│  Browser Logs:      F12 → Console (watch for ❌ errors)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏆 Success Indicators

```
✅ Can login
✅ Can access protected pages
✅ WebSocket shows "✅ WebSocket client connected"
✅ No 401 errors in console
✅ jwt.io shows "Signature Verified" ✅
```

---

## 🔗 Related Documents

- Quick Fix: [JWT_QUICK_FIX.md](./JWT_QUICK_FIX.md)
- Full Guide: [JWT_DEBUG_GUIDE.md](./JWT_DEBUG_GUIDE.md)
- Troubleshooting: [JWT_TOKEN_TROUBLESHOOTING.md](./JWT_TOKEN_TROUBLESHOOTING.md)
