# 🔄 Guia: Sincronizar Instâncias do Evolution com Supabase

## 📊 Problema

A tabela `uazapi_instances` no Supabase tem:
- ✅ `instance_id` (UUID) - preenchido corretamente
- ✅ `api_token` - preenchido com o token do Uazapi
- ❌ `instance_number` - **VAZIO!**

Isso causa erro porque o código busca por `instance_number`, mas está vazio.

---

## ✅ Solução: Usar Endpoint de Sincronização

### Passo 1: Iniciar Sincronização

Faça um **POST request** para sincronizar todas as instâncias:

```bash
curl -X POST http://localhost:5051/api/sync/uazapi-instances \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Ou via Postman:
- **Método:** POST
- **URL:** `http://localhost:5051/api/sync/uazapi-instances`
- **Headers:**
  - `Authorization: Bearer YOUR_JWT_TOKEN`
  - `Content-Type: application/json`

### Passo 2: Verificar Resultado

A resposta será algo como:

```json
{
  "message": "Sincronização concluída",
  "total": 21,
  "synced": 21,
  "errors": 0,
  "instances": [
    {
      "id": "f5dc9a99-921d-4899-ad30-1337a1da6c7c",
      "number": "5511999999999",
      "name": "Minha Instância",
      "status": "open"
    },
    // ... mais instâncias
  ]
}
```

---

## 🔧 O Que o Endpoint Faz

O endpoint `/api/sync/uazapi-instances`:

1. ✅ Busca todas as instâncias do **Evolution DB**
2. ✅ Para cada instância, atualiza (ou cria) um registro no **Supabase**
3. ✅ Preenche `instance_number` com o número da instância
4. ✅ Define `send_api` como "evolution" por padrão
5. ✅ Retorna estatísticas de sincronização

---

## 📝 Verificar Dados no Supabase

Após sincronizar, verifique no Supabase SQL Editor:

```sql
SELECT
  instance_id,
  instance_number,
  api_token,
  send_api,
  created_at,
  updated_at
FROM public.uazapi_instances
ORDER BY instance_number;
```

Você deve ver algo como:

| instance_id | instance_number | api_token | send_api | created_at | updated_at |
|---|---|---|---|---|---|
| f5dc9a99-921d-4899-ad30-1337a1da6c7c | 5511999999999 | 0c693b12-4fdb-4643... | evolution | 2025-10-24 17:41:06 | 2025-10-28 13:54:57 |

---

## ⚙️ Como Conseguir seu JWT Token

1. Faça login na aplicação
2. Abra o DevTools (F12)
3. Vá em **Application** → **Storage** → **Cookies** ou **LocalStorage**
4. Procure por `token` ou `jwt`
5. Copie o valor completo

Ou, faça login via API:

```bash
curl -X POST http://localhost:5051/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@exemplo.com",
    "password": "sua-senha"
  }'
```

Copie o `token` da resposta.

---

## 🔄 Fluxo Completo Após Sincronização

1. **Usuário seleciona instância** → Modal abre
2. **Usuário digita mensagem** → Input aparece (sempre, sem bloqueio)
3. **Usuário envia mensagem**:
   - Backend busca `instance_number` no Supabase ✅ (agora tem)
   - Tenta Evolution API primeiro ✅ (sempre funciona)
   - Se falhar, tenta Uazapi ✅ (se token configurado)
   - **Mensagem enviada com sucesso!**

---

## 🛠️ Checklist de Setup

- [ ] Tabela `uazapi_instances` criada no Supabase
- [ ] Executar endpoint `/api/sync/uazapi-instances`
- [ ] Verificar que todos os `instance_number` estão preenchidos
- [ ] Reiniciar servidor (`npm run dev`)
- [ ] Testar envio de mensagem
- [ ] Verificar logs do servidor

---

## ❌ Se Ainda Tiver Erros

### Erro: "relation uazapi_instances does not exist"
- A tabela **não foi criada** no Supabase
- Siga o guia em `SETUP_SUPABASE.md`

### Erro: "instance_number does not exist"
- Ainda tem registros **sem `instance_number` preenchido**
- Execute o endpoint `/api/sync/uazapi-instances` novamente

### Erro: "Token UazAPI não configurado"
- Isso é **esperado** se você não salvou um token
- A mensagem será enviada via **Evolution** (padrão)
- Opcionalmente, configure um token Uazapi nas configurações

---

## 📞 Suporte

Se precisar de ajuda:

1. Verifique os **logs do servidor** (`npm run dev`)
2. Procure por mensagens de erro específicas
3. Verifique se a tabela existe no Supabase
4. Confirme que o JWT token é válido

