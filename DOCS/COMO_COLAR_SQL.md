# 🚀 Como Colar o SQL no Supabase

## ✅ COPIE TUDO DO ARQUIVO E COLE AQUI

### Passo 1: Abra o Arquivo SQL

Abra o arquivo: **`DOCS/SQL_COMPLETO_PARA_COLAR.sql`**

### Passo 2: Copie TUDO

- Ctrl+A (Windows) ou Cmd+A (Mac)
- Ctrl+C (Windows) ou Cmd+C (Mac)

### Passo 3: Vá para o Supabase

1. Abra: https://app.supabase.com
2. Selecione seu projeto
3. Clique em **SQL Editor** (lado esquerdo)
4. Clique em **New Query** (canto superior direito)

### Passo 4: Cole o SQL

- Ctrl+V (Windows) ou Cmd+V (Mac) na caixa em branco

### Passo 5: Execute

- Clique no botão **Run** (verde no canto superior direito)
- Ou pressione Ctrl+Enter

### Passo 6: Espere

Você verá:
```
✓ Success
```

Se viu algum erro, veja a seção **Troubleshooting** abaixo.

---

## 📋 Checklist

- [ ] Copiei TUDO do arquivo SQL_COMPLETO_PARA_COLAR.sql
- [ ] Colei no Supabase SQL Editor
- [ ] Cliquei no botão "Run"
- [ ] Vi a mensagem "Success" ✓
- [ ] Fechei o SQL Editor

---

## ✅ Verificar que Funcionou

### Opção 1: No Supabase Dashboard (FÁCIL)

1. Clique em **Table Editor** (lado esquerdo)
2. Procure por `ias` na lista de tabelas
3. Clique em `ias`
4. Você deve ver os campos (colunas) como:
   - id
   - name
   - ai_name
   - consultant_name
   - n8n_workflow_id
   - pause_until
   - message_prefix_template
   - etc...

### Opção 2: Via SQL (se quiser confirmar)

No SQL Editor, rode:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('ias', 'bot_instances');
```

Você deve ver:
```
ias
bot_instances
```

---

## 🆘 Troubleshooting

### Erro: "Table already exists"
✅ PERFEITO! Significa que você já tinha criado a tabela antes. Ignore este erro.

### Erro: "Column ... already exists"
✅ PERFEITO! Significa que o campo já foi adicionado. Ignore este erro.

### Erro: "Syntax error"
❌ Algo deu errado ao colar o SQL.

**Solução:**
1. Copie novamente TUDO do arquivo SQL_COMPLETO_PARA_COLAR.sql
2. Feche o SQL Editor
3. Abra uma nova query
4. Cole novamente
5. Execute

### Erro: "Permission denied"
❌ Suas credenciais não têm permissão

**Solução:**
1. Verifique se você é administrador do projeto Supabase
2. Tente novamente

### Nada acontece
❌ O SQL pode estar vazio

**Solução:**
1. Verifique se copió TUDO do arquivo
2. Verifique se você está no SQL Editor correto
3. Tente novamente

---

## 🎯 Próximos Passos (DEPOIS que o SQL executar)

### 1. Compile o projeto
```bash
npm run build
```

### 2. Inicie o servidor
```bash
npm run dev
```

### 3. Teste no navegador
- Abra: http://localhost:3000
- Vá para as configurações da instância
- Teste a nova aba "Bot/IA"

---

## 💡 Dicas

- **Copie novamente se tiver dúvida** - é melhor copiar de novo do que deixar um SQL incompleto
- **Abra uma nova query** - às vezes ajuda fechar e abrir uma nova
- **Ignore os erros "already exists"** - são normais na primeira execução

---

## ✅ Feito!

Se viu o botão ✓ "Success", suas tabelas foram criadas!

**Agora você pode:**
- Editar as configurações das IAs
- Configurar N8N workflows
- Agendar pausas
- Customizar prefixos de mensagens
- Tudo via interface web!

🎉 Bora testar!
