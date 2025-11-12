# ⚡ Quick Start - Fazer Funcionar em 3 Passos

## Passo 1️⃣: Sincronizar Instâncias (1 minuto)

Abra Postman ou use curl:

```bash
POST http://localhost:5051/api/sync/uazapi-instances
Header: Authorization: Bearer [SEU_JWT_TOKEN]
Body: (vazio)
```

**Onde pegar seu token:**
1. Abra http://localhost:5173 no navegador
2. F12 → Application → Storage → LocalStorage
3. Procure por `auth` ou `token`
4. Copie o valor completo

**Resposta esperada:**
```json
{
  "message": "Sincronização concluída",
  "synced": 21,
  "errors": 0
}
```

---

## Passo 2️⃣: Reiniciar Servidor (30 segundos)

```bash
# Terminal onde está rodando npm run dev
# Pressione Ctrl+C para parar

# Depois execute novamente
npm run dev
```

Aguarde aparecer:
```
✅ Conectado ao banco Evolution
📱 WhatsApp message polling started
```

---

## Passo 3️⃣: Testar (1 minuto)

1. Abra http://localhost:5173
2. Clique em **"Selecionar Instância"**
3. Escolha uma instância
4. Escolha uma conversa
5. Digite uma mensagem
6. Envie

**Pronto! Mensagem enviada! ✅**

---

## ✅ Checklist Rápido

- [ ] Sincronizou instâncias?
- [ ] Reiniciou o servidor?
- [ ] Testou envio?
- [ ] Funcionou?

Se sim → **Pronto!**

Se não → Veja "Troubleshooting" abaixo

---

## 🆘 Troubleshooting

### Erro: "Authorization required"
**Solução:** Seu JWT token expirou ou é inválido
- Faça logout e login novamente
- Copie o novo token

### Erro: "relation uazapi_instances does not exist"
**Solução:** Tabela não foi criada no Supabase
- Siga o guia em `SETUP_SUPABASE.md`

### Erro: "Mensagem não enviada"
**Solução:** Problema na instância Evolution
- Verifique se a instância está ativa
- Veja logs do servidor

### Mensagem aparece como "evolution" mesmo salvando token Uazapi
**Solução:** Normal! Evolution é o padrão
- Configure em "API de Envio" no modal de configurações
- Escolha "UazAPI" e clique "Salvar Configuração"

---

## 📋 Documentação Completa

Para detalhes, veja:
- `FIX_SUMMARY.md` - Explicação técnica
- `SYNC_INSTANCES_GUIDE.md` - Guia detalhado de sincronização
- `SETUP_SUPABASE.md` - Setup da tabela

---

**Pronto! Agora suas mensagens podem ser enviadas! 🎉**

