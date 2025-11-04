# 🔗 Integrar AIDataConfigDialog nas Instâncias

## O Que Foi Criado

1. **Componente Frontend**: `AIDataConfigDialog.tsx`
   - Formulário para configurar IA e N8N
   - Vincula instância à tabela `ai_data`
   - Configura workflow ID do N8N

2. **Rotas API**: `ai-data.routes.ts`
   - GET/PATCH/POST/DELETE para ai_data
   - Teste de webhook N8N
   - Listagem de IAs configuradas

---

## Como Integrar

### 1. Adicionar o Diálogo na Página de Instâncias

Se você tem uma página que exibe as instâncias (como `whatsapp.tsx` ou similar), adicione:

```tsx
import { AIDataConfigDialog } from "@/components/AIDataConfigDialog";
import { useState } from "react";

export function InstanciaPage() {
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<{
    instanceNumber: string;
    instanceId: string;
    aiDataId?: number;
  } | null>(null);

  const handleConfigureAI = (instanceNumber: string, instanceId: string, aiDataId?: number) => {
    setSelectedInstance({ instanceNumber, instanceId, aiDataId });
    setConfigOpen(true);
  };

  return (
    <>
      {/* Seu código de instâncias aqui */}

      {/* Botão para configurar IA */}
      <Button onClick={() => handleConfigureAI(instance.number, instance.id, instance.aiDataId)}>
        Configurar IA
      </Button>

      {/* Dialog */}
      <AIDataConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        aiDataId={selectedInstance?.aiDataId}
        instanceNumber={selectedInstance?.instanceNumber}
        instanceId={selectedInstance?.instanceId}
      />
    </>
  );
}
```

### 2. Adicionar Botão na Tabela de Instâncias

```tsx
import { Settings } from "lucide-react";

// Na tabela de instâncias, adicione uma coluna de ações:
<TableCell>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => handleConfigureAI(instance.number, instance.id, instance.aiDataId)}
  >
    <Settings className="h-4 w-4" />
  </Button>
</TableCell>
```

---

## API Endpoints Disponíveis

### GET `/api/ai-data/:id`
Obter configuração de IA pelo ID

```bash
curl -X GET http://localhost:3000/api/ai-data/1 \
  -H "Authorization: Bearer TOKEN"
```

### GET `/api/ai-data/instance/:instanceNumber`
Obter IA pela instância

```bash
curl -X GET http://localhost:3000/api/ai-data/instance/5511999999999 \
  -H "Authorization: Bearer TOKEN"
```

### PATCH `/api/ai-data/:id`
Atualizar configuração

```bash
curl -X PATCH http://localhost:3000/api/ai-data/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ai_name": "Maria Luzia",
    "n8n_workflow_id": "abc123",
    "n8n_webhook_url": "https://n8n.example.com/webhook/...",
    "n8n_trigger_type": "webhook"
  }'
```

### POST `/api/ai-data`
Criar nova IA para instância

```bash
curl -X POST http://localhost:3000/api/ai-data \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instance_number": "5511999999999",
    "ai_name": "Maria Luzia",
    "n8n_workflow_id": "abc123"
  }'
```

### DELETE `/api/ai-data/:id`
Deletar configuração

```bash
curl -X DELETE http://localhost:3000/api/ai-data/1 \
  -H "Authorization: Bearer TOKEN"
```

### POST `/api/ai-data/:id/test-webhook`
Testar conexão com webhook N8N

```bash
curl -X POST http://localhost:3000/api/ai-data/1/test-webhook \
  -H "Authorization: Bearer TOKEN"
```

---

## Exemplo Completo de Uso

```tsx
// Em sua página de instâncias (ex: whatsapp.tsx)

import { AIDataConfigDialog } from "@/components/AIDataConfigDialog";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useState } from "react";

interface Instance {
  id: string;
  number: string;
  name: string;
  aiDataId?: number; // ID da tabela ai_data, se existir
}

export function WhatsAppInstances() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<{
    instanceNumber: string;
    instanceId: string;
    aiDataId?: number;
  } | null>(null);

  const handleOpenConfig = (instance: Instance) => {
    setSelectedInstance({
      instanceNumber: instance.number,
      instanceId: instance.id,
      aiDataId: instance.aiDataId,
    });
    setConfigOpen(true);
  };

  return (
    <div>
      {/* Lista de instâncias */}
      {instances.map((instance) => (
        <div key={instance.id} className="flex items-center justify-between p-4 border rounded">
          <div>
            <h3>{instance.name}</h3>
            <p className="text-sm text-muted-foreground">{instance.number}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenConfig(instance)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar IA
          </Button>
        </div>
      ))}

      {/* Dialog de configuração */}
      <AIDataConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        aiDataId={selectedInstance?.aiDataId}
        instanceNumber={selectedInstance?.instanceNumber}
        instanceId={selectedInstance?.instanceId}
      />
    </div>
  );
}
```

---

## Fluxo de Funcionamento

```
Usuário clica "Configurar IA" em uma instância
        ↓
AIDataConfigDialog abre
        ↓
Se existe aiDataId:
  ├─ GET /api/ai-data/:id (carrega dados)
  ↓
Usuário preenche formulário:
  ├─ ai_name: "Maria Luzia"
  ├─ n8n_workflow_id: "abc123"
  ├─ n8n_webhook_url: "https://..."
  └─ Clica "Salvar"
        ↓
Se criar novo:
  └─ POST /api/ai-data
Se editar:
  └─ PATCH /api/ai-data/:id
        ↓
Sucesso! Toast de confirmação
        ↓
Dialog fecha
```

---

## O Que Acontece nos Bastidores

1. **Vinculação**: A instância fica vinculada ao registro de `ai_data`
2. **N8N Webhook**: Quando mensagens chegam, você pode usar o `n8n_webhook_url` para enviar eventos
3. **Prefixos**: As mensagens são formatadas com o padrão "Maria Luzia:" (IA) vs "Maria luzia:" (Consultor)
4. **Atualização**: O `updated_at` e `last_modified_by` são rastreados automaticamente

---

## Checklist de Implementação

- [ ] Importar `AIDataConfigDialog` no componente de instâncias
- [ ] Adicionar estado para controlar o diálogo
- [ ] Adicionar botão "Configurar IA" na tabela/lista de instâncias
- [ ] Passar `instanceNumber` e `aiDataId` para o diálogo
- [ ] Compilar (`npm run build`)
- [ ] Testar no navegador
- [ ] Criar uma IA de teste
- [ ] Configurar N8N workflow ID
- [ ] Testar webhook

---

## Próximas Etapas

1. **Implementar no seu código**: Adicione o componente onde você mostra as instâncias
2. **Testar**: Configure uma IA de teste com um workflow N8N
3. **Usar os dados**: Quando mensagens chegarem, use `ai_name`, `consultant_name`, `n8n_webhook_url` para processar
4. **Integração com N8N**: Configure webhooks para receber eventos do N8N

---

## Dúvidas Comuns

**P: Como eu sei qual é o ID do workflow no N8N?**
R: Abra seu workflow no N8N → Copie o ID da URL do navegador

**P: O webhook é obrigatório?**
R: Não, é opcional. Você pode deixar em branco se não quiser enviar eventos para N8N

**P: Como eu testo o webhook?**
R: Use o endpoint: `POST /api/ai-data/:id/test-webhook`

---

**Tudo pronto! Agora você consegue vincular instâncias com IAs e N8N! 🎉**
