# Configuração da Evolution API

Este guia descreve como configurar corretamente a Evolution API para integração com WhatsApp.

## 📋 Pré-requisitos

- Conta na Evolution API (https://evolution-api.com/)
- URL da instância Evolution API
- API Key/Token da Evolution API

## ⚙️ Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

```env
# Evolution API URL base (sem barra no final)
EVOLUTION_API_URL=https://seu-evolution-api.com

# Evolution API Key/Token
EVOLUTION_API_KEY=sua-chave-api-aqui
```

### Exemplo com Seubone

Se você está usando Seubone (Evolution API), configure assim:

```env
EVOLUTION_API_URL=https://eve.seubone.com
EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
```

## 🔌 Endpoints Utilizados

O sistema utiliza os seguintes endpoints da Evolution API:

### Criar Instância
```
POST /instance/create
Headers:
  - Content-Type: application/json
  - apikey: {EVOLUTION_API_KEY}
```

**Payload Mínimo:**
```json
{
  "instanceName": "minha-instancia",
  "qrcode": true,
  "integration": "WHATSAPP-BAILEYS"
}
```

**Payload Completo (Opcional):**
```json
{
  "instanceName": "minha-instancia",
  "token": "<string>",
  "qrcode": true,
  "number": "551199999999",
  "integration": "WHATSAPP-BAILEYS",
  "rejectCall": false,
  "msgCall": "Não posso atender",
  "groupsIgnore": false,
  "alwaysOnline": true,
  "readMessages": true,
  "readStatus": true,
  "syncFullHistory": false,
  "proxyHost": "<string>",
  "proxyPort": "<string>",
  "proxyProtocol": "http",
  "proxyUsername": "<string>",
  "proxyPassword": "<string>",
  "webhook": {
    "url": "<string>",
    "byEvents": false,
    "base64": false,
    "headers": {},
    "events": []
  },
  "rabbitmq": {
    "enabled": false,
    "events": []
  },
  "sqs": {
    "enabled": false,
    "events": []
  },
  "chatwootAccountId": 123,
  "chatwootToken": "<string>",
  "chatwootUrl": "<string>",
  "chatwootSignMsg": false,
  "chatwootReopenConversation": false,
  "chatwootConversationPending": false,
  "chatwootImportContacts": false,
  "chatwootNameInbox": "<string>",
  "chatwootMergeBrazilContacts": false,
  "chatwootImportMessages": false,
  "chatwootDaysLimitImportMessages": 0,
  "chatwootOrganization": "<string>",
  "chatwootLogo": "<string>"
}
```

### Listar Instâncias
```
GET /instance/fetchInstances
Headers:
  - apikey: {EVOLUTION_API_KEY}
```

### Conectar Instância (Gerar QR Code)
```
GET /instance/connect/{instanceName}
Headers:
  - apikey: {EVOLUTION_API_KEY}
```

### Obter Estado de Conexão
```
GET /instance/connectionState/{instanceName}
Headers:
  - apikey: {EVOLUTION_API_KEY}
```

### Fazer Logout
```
DELETE /instance/logout/{instanceName}
Headers:
  - apikey: {EVOLUTION_API_KEY}
```

### Deletar Instância
```
DELETE /instance/delete/{instanceName}
Headers:
  - apikey: {EVOLUTION_API_KEY}
```

### Reiniciar Instância
```
PUT /instance/restart/{instanceName}
Headers:
  - apikey: {EVOLUTION_API_KEY}
```

### Definir Presença
```
POST /instance/setPresence/{instanceName}
Headers:
  - Content-Type: application/json
  - apikey: {EVOLUTION_API_KEY}

Body:
{
  "presence": "available" | "composing" | "recording" | "paused"
}
```

## 🧪 Testando a Configuração

### Teste com cURL

```bash
# Verificar se API está acessível
curl -X GET \
  https://eve.seubone.com/instance/fetchInstances \
  -H 'apikey: 429683C4C977415CAAFCCE10F7D57E11'

# Criar instância
curl -X POST \
  https://eve.seubone.com/instance/create \
  -H 'Content-Type: application/json' \
  -H 'apikey: 429683C4C977415CAAFCCE10F7D57E11' \
  -d '{
    "instanceName": "teste-botao",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

### Teste via Interface

1. Acesse a página de Chat do aplicativo
2. Clique no botão "+" (Criar Nova Instância)
3. Preencha o formulário:
   - Nome da Instância: ex. "meu-bot"
   - Número (opcional)
   - Tipo de Integração: escolha o tipo desejado
4. Clique em "Criar Instância"
5. Um QR Code será exibido
6. Escaneie com seu celular

## 🐛 Troubleshooting

### "Evolution API não está configurada"
- Verifique se `EVOLUTION_API_URL` está configurada
- Verifique se `EVOLUTION_API_KEY` está configurada
- Reinicie o servidor após configurar

### "Erro ao criar instância: 401"
- Verifique se a `EVOLUTION_API_KEY` está correta
- Verifique se você tem permissão para criar instâncias
- Teste a chave com cURL

### "Erro ao criar instância: 400"
- Verifique se o `instanceName` é válido (apenas letras, números e hífens)
- Verifique se a instância não existe já
- Verifique o payload JSON

### "QR Code não aparece"
- Certifique-se de que `qrcode: true` foi enviado
- Verifique o estado da instância com GET `/instance/connectionState/{instanceName}`
- Tente reconectar com GET `/instance/connect/{instanceName}`

### API não responde
- Verifique se a URL da Evolution API está correta (sem barra no final)
- Verifique se há firewall bloqueando a conexão
- Verifique a disponibilidade do serviço Evolution API

## 📚 Referências

- [Evolution API Documentation](https://docs.evolution-api.com/)
- [GitHub - Evolution API](https://github.com/EvolutionAPI/evolution-api)

---

**Última atualização:** 2025-11-14
