# 🔌 Exemplos Práticos - API de IAs

## 1. Criar Nova IA

### cURL
```bash
curl -X POST http://localhost:3000/api/ias \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "IA Vendas",
    "aiName": "Maria Luzia",
    "description": "IA para atendimento de vendas",
    "category": "sales"
  }'
```

### JavaScript (Fetch)
```javascript
const response = await fetch('/api/ias', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'IA Vendas',
    aiName: 'Maria Luzia',
    description: 'IA para atendimento de vendas',
    category: 'sales'
  })
});

const ia = await response.json();
console.log(ia);
```

### Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "IA Vendas",
  "aiName": "Maria Luzia",
  "consultantName": "Maria luzia",
  "status": "active",
  "category": "sales",
  "description": "IA para atendimento de vendas",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

---

## 2. Obter Configuração da IA

### cURL
```bash
curl -X GET http://localhost:3000/api/ias/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript
```javascript
const response = await fetch('/api/ias/ia-id', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const ia = await response.json();
console.log('IA Name:', ia.aiName);
console.log('Workflow ID:', ia.n8nWorkflowId);
console.log('Status:', ia.status);
```

---

## 3. Atualizar Configuração Completa

### cURL
```bash
curl -X PATCH http://localhost:3000/api/ias/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "aiName": "Maria Luzia da Silva",
    "consultantName": "Maria luzia da silva",
    "description": "IA Senior para vendas complexas",
    "category": "sales",
    "avatarUrl": "https://example.com/maria.jpg",
    "n8nWorkflowId": "abc123def456",
    "n8nWorkflowName": "Atendimento de Vendas",
    "n8nWebhookUrl": "https://n8n.example.com/webhook/sales",
    "n8nTriggerType": "webhook",
    "n8nConfig": {
      "timeout": 30000,
      "retryAttempts": 3,
      "notifyOnCompletion": true
    },
    "messagePrefixTemplate": "*{name}:*\n",
    "useAiPrefix": true,
    "useConsultantPrefix": true,
    "modelVersion": "gpt-4",
    "performanceScore": 95.5
  }'
```

### JavaScript
```javascript
const response = await fetch('/api/ias/ia-id', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    aiName: 'Maria Luzia',
    n8nWorkflowId: 'abc123',
    n8nWebhookUrl: 'https://n8n.example.com/webhook/sales',
    n8nTriggerType: 'webhook',
    messagePrefixTemplate: '*{name}:*\n',
    useAiPrefix: true,
    modelVersion: 'gpt-4'
  })
});

const updated = await response.json();
console.log('Updated:', updated);
```

---

## 4. Pausar IA com Agendamento

### Pausar por 2 horas
```javascript
const response = await fetch('/api/ias/ia-id/pause', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pauseUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas
    reason: 'Manutenção de banco de dados'
  })
});

const result = await response.json();
console.log(result.message); // "IA pausada até 15/01/2024 12:30"
```

### Pausar até data específica
```javascript
const resumeDate = new Date('2024-01-20T10:00:00');

const response = await fetch('/api/ias/ia-id/pause', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pauseUntil: resumeDate.toISOString(),
    reason: 'Teste de novo modelo'
  })
});
```

### cURL
```bash
curl -X POST http://localhost:3000/api/ias/ia-id/pause \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pauseUntil": "2024-01-20T10:00:00Z",
    "reason": "Manutenção programada"
  }'
```

### Response
```json
{
  "success": true,
  "message": "IA pausada até 20/01/2024 10:00",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "paused",
    "pauseUntil": "2024-01-20T10:00:00Z",
    "pauseReason": "Manutenção programada"
  }
}
```

---

## 5. Retomar IA Pausada

### cURL
```bash
curl -X POST http://localhost:3000/api/ias/ia-id/resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript
```javascript
const response = await fetch('/api/ias/ia-id/resume', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
console.log(result.message); // "IA retomada com sucesso"
```

### Response
```json
{
  "success": true,
  "message": "IA retomada com sucesso",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "pauseUntil": null,
    "pauseReason": null
  }
}
```

---

## 6. Obter Preview de Formatação

### Antes de salvar, visualize como as mensagens ficarão

```javascript
const response = await fetch('/api/ias/ia-id/preview', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const preview = await response.json();
console.log('AI Message:', preview.aiMessage);
console.log('Consultant Message:', preview.consultantMessage);
```

### Response
```json
{
  "aiMessage": "*Maria Luzia:*\nOlá! Como posso ajudar?",
  "consultantMessage": "*Maria luzia:*\nVou verificar isso para você.",
  "template": "*{name}:*\n",
  "aiName": "Maria Luzia",
  "consultantName": "Maria luzia"
}
```

### Testar diferentes templates
```javascript
async function previewTemplate(iaId, template) {
  // Primeiro, atualiza temporariamente
  await fetch(`/api/ias/${iaId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messagePrefixTemplate: template
    })
  });

  // Depois, visualiza o resultado
  const preview = await fetch(`/api/ias/${iaId}/preview`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return preview.json();
}

// Testar diferentes templates
const templates = [
  '*{name}:*\n',  // Padrão: *Maria Luzia:*
  '[{name}]\n',   // Colchetes: [Maria Luzia]
  '{name}: ',     // Simples: Maria Luzia:
  '→ {name}: '    // Com seta: → Maria Luzia:
];

for (const template of templates) {
  const preview = await previewTemplate('ia-id', template);
  console.log(`Template: ${template}`);
  console.log(`Result: ${preview.aiMessage}`);
}
```

---

## 7. Obter Configuração Estruturada

### Útil para salvar em aplicação local

```javascript
const response = await fetch('/api/ias/ia-id/config', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const config = await response.json();

// Estrutura organizada
const iaConfig = {
  id: config.id,
  name: config.name,
  status: config.status,
  names: {
    ai: config.aiName,
    consultant: config.consultantName
  },
  n8n: {
    workflowId: config.n8n.workflowId,
    webhookUrl: config.n8n.webhookUrl,
    triggerType: config.n8n.triggerType
  },
  pause: {
    until: config.pause.until,
    reason: config.pause.reason
  },
  messages: {
    prefixTemplate: config.messages.prefixTemplate,
    useAiPrefix: config.messages.useAiPrefix,
    useConsultantPrefix: config.messages.useConsultantPrefix
  }
};

console.log(iaConfig);
```

---

## 8. Exemplo Completo - Fluxo de Uso

```javascript
class IAManager {
  constructor(apiBaseUrl, token) {
    this.apiBaseUrl = apiBaseUrl;
    this.token = token;
  }

  async createIA(name, aiName) {
    const response = await fetch(`${this.apiBaseUrl}/api/ias`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, aiName })
    });
    return response.json();
  }

  async configureIA(iaId, config) {
    const response = await fetch(`${this.apiBaseUrl}/api/ias/${iaId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    return response.json();
  }

  async pauseIA(iaId, hours, reason) {
    const resumeTime = new Date(Date.now() + hours * 60 * 60 * 1000);

    const response = await fetch(`${this.apiBaseUrl}/api/ias/${iaId}/pause`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pauseUntil: resumeTime.toISOString(),
        reason
      })
    });
    return response.json();
  }

  async resumeIA(iaId) {
    const response = await fetch(`${this.apiBaseUrl}/api/ias/${iaId}/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }

  async getConfig(iaId) {
    const response = await fetch(`${this.apiBaseUrl}/api/ias/${iaId}/config`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }

  async getPreview(iaId) {
    const response = await fetch(`${this.apiBaseUrl}/api/ias/${iaId}/preview`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }
}

// Uso
const manager = new IAManager('http://localhost:3000', token);

// 1. Criar IA
const ia = await manager.createIA('IA Vendas', 'Maria Luzia');
console.log('IA criada:', ia.id);

// 2. Configurar
await manager.configureIA(ia.id, {
  description: 'IA para atendimento de vendas',
  category: 'sales',
  n8nWorkflowId: 'workflow123',
  n8nWebhookUrl: 'https://n8n.example.com/webhook/sales',
  n8nTriggerType: 'webhook'
});

// 3. Ver preview
const preview = await manager.getPreview(ia.id);
console.log('Preview:', preview.aiMessage);

// 4. Pausar por 2 horas
await manager.pauseIA(ia.id, 2, 'Manutenção de servidor');

// 5. Retomar
// await manager.resumeIA(ia.id);
```

---

## 9. Tratamento de Erros

```javascript
async function updateIAWithErrorHandling(iaId, config) {
  try {
    const response = await fetch(`/api/ias/${iaId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao atualizar IA');
    }

    const updated = await response.json();
    console.log('Sucesso:', updated);
    return updated;

  } catch (error) {
    if (error instanceof Error) {
      console.error('Erro:', error.message);
    } else {
      console.error('Erro desconhecido:', error);
    }
    throw error;
  }
}
```

---

## 10. Teste com Postman

### Setup
1. Abra Postman
2. Obtenha seu JWT token do `/api/auth/login`
3. Salve como ambiente: `{{token}}`

### Requests

**GET - Obter IA**
```
GET http://localhost:3000/api/ias/{{iaId}}
Headers:
  Authorization: Bearer {{token}}
```

**PATCH - Atualizar IA**
```
PATCH http://localhost:3000/api/ias/{{iaId}}
Headers:
  Authorization: Bearer {{token}}
  Content-Type: application/json

Body (JSON):
{
  "aiName": "Maria Luzia",
  "n8nWorkflowId": "abc123",
  "messagePrefixTemplate": "*{name}:*\n"
}
```

**POST - Pausar IA**
```
POST http://localhost:3000/api/ias/{{iaId}}/pause
Headers:
  Authorization: Bearer {{token}}
  Content-Type: application/json

Body (JSON):
{
  "pauseUntil": "2024-01-20T10:00:00Z",
  "reason": "Manutenção"
}
```

**POST - Retomar IA**
```
POST http://localhost:3000/api/ias/{{iaId}}/resume
Headers:
  Authorization: Bearer {{token}}
```

**GET - Preview**
```
GET http://localhost:3000/api/ias/{{iaId}}/preview
Headers:
  Authorization: Bearer {{token}}
```

---

## 11. JavaScript - TypeScript Typings

```typescript
// Types para usar no seu projeto
interface IAConfig {
  id: string;
  name: string;
  aiName: string;
  consultantName: string;
  status: 'active' | 'paused' | 'inactive';
  category?: string;
  description?: string;
  n8nWorkflowId?: string;
  n8nWebhookUrl?: string;
  n8nTriggerType?: string;
  pauseUntil?: Date;
  pauseReason?: string;
  messagePrefixTemplate?: string;
  useAiPrefix?: boolean;
  useConsultantPrefix?: boolean;
}

interface MessagePreview {
  aiMessage: string;
  consultantMessage: string;
  template: string;
  aiName: string;
  consultantName: string;
}

// Cliente tipado
class TypedIAManager {
  async getConfig(iaId: string): Promise<IAConfig> {
    // ...
  }

  async updateConfig(iaId: string, config: Partial<IAConfig>): Promise<IAConfig> {
    // ...
  }

  async getPreview(iaId: string): Promise<MessagePreview> {
    // ...
  }
}
```

---

## 💡 Dicas

1. **Sempre valide o token antes de chamar a API**
2. **Use preview antes de salvar mudanças grandes**
3. **Trate os erros adequadamente**
4. **Implemente retry logic para pausas/resumos**
5. **Faça cache local das configurações**
6. **Use TypeScript para evitar erros**

---

**Bora codificar! 🚀**
