# Sistema de Pausa Automática da IA

## 📋 Overview

Implementado um sistema completo de pausa/inativação com **auto-retomada automática** baseada em tempo. A IA pausa por um tempo determinado e depois retoma automaticamente sem intervenção manual.

## ⏰ Como Funciona

### Fluxo de Pausa com Auto-Retomada

```
1. Usuário pausa IA por 1 hora
   └─ status = 'paused'
   └─ paused_until = agora + 3600000ms

2. Maintenance job roda a cada 60 segundos
   └─ Verifica se paused_until <= agora
   └─ Se expirou, executa auto-resume

3. Pausa expira após 1 hora
   └─ Job detecta expiração
   └─ Auto-resume automático
   └─ status = 'active'
   └─ IA volta a responder
```

### Durações Disponíveis

```
300000ms     = 5 minutos
900000ms     = 15 minutos
1800000ms    = 30 minutos
3600000ms    = 1 hora       ← Mais comum
7200000ms    = 2 horas
86400000ms   = 1 dia
604800000ms  = 1 semana
null         = Indefinido (sem auto-retomada)
```

## 🔧 Métodos do Serviço

### Em `server/services/instance-bot-status.ts`

#### Pausa e Retomada

```typescript
// Pausar por 1 hora
await InstanceBotStatusService.pauseBot(
  instanceNumber,
  3600000,  // duração em ms
  "Motivo da pausa"
);

// Retomar manualmente
await InstanceBotStatusService.resumeBot(instanceNumber);

// Auto-resume de TODAS as pausas expiradas
await InstanceBotStatusService.autoResumeExpiredPauses();
```

#### Status Efetivo

```typescript
// Obter status considerando expirações
const status = await InstanceBotStatusService.getEffectiveStatus(
  instanceNumber
);
// Retorna "active" mesmo se estava "paused" mas expirou

// Obter tempo restante em ms
const remaining = await InstanceBotStatusService.getPauseRemainingTime(
  instanceNumber
);
// null = não pausado
// null = indefinido
// número = ms restantes

// Limpeza em lote (pauses + inactives)
const result = await InstanceBotStatusService.performMaintenanceCleanup();
// { resumed: 5, activated: 2 }
```

## 🌐 Endpoints de API

### Verificar Status Efetivo (com Expiração)

```bash
GET /api/instances/:instanceNumber/bot-status/effective
Authorization: Bearer TOKEN

Response:
{
  "data": { "status": "active" },
  "message": "Effective bot status retrieved"
}
```

### Obter Tempo Restante

```bash
GET /api/instances/:instanceNumber/bot-status/remaining-time
Authorization: Bearer TOKEN

Response:
{
  "data": {
    "pauseRemainingMs": 1800000,      # null se não pausado
    "pauseRemainingSeconds": 1800,
    "inactiveRemainingMs": null,
    "inactiveRemainingSeconds": null
  }
}
```

### Forçar Limpeza Manual

```bash
POST /api/instances/bot-status/maintenance
Authorization: Bearer TOKEN

Response:
{
  "message": "Maintenance cleanup completed",
  "data": {
    "resumedCount": 5,
    "activatedCount": 2,
    "totalCleaned": 7
  }
}
```

## 🔄 Job de Manutenção Automática

### Em `server/jobs/bot-status-maintenance.ts`

O job roda **automaticamente** a cada 60 segundos (padrão).

#### Funções Exportadas

```typescript
// Iniciar job (auto-chamado no server startup)
startMaintenanceJob(60); // intervalo em segundos

// Parar job
stopMaintenanceJob();

// Verificar se está rodando
isMaintenanceRunning(); // true/false

// Forçar execução imediata
await triggerMaintenance();
// Retorna: { resumed: 5, activated: 2 }
```

#### O Que o Job Faz

```
1. Verifica TODAS as instâncias pausadas
   └─ paused_until <= CURRENT_TIMESTAMP?

2. Se expirou:
   └─ UPDATE status = 'active'
   └─ CLEAR pause_reason, paused_at, paused_until
   └─ UPDATE updated_at

3. Repete para inactivations
   └─ inactive_until <= CURRENT_TIMESTAMP?
   └─ Auto-activate se expirou

4. Loga quantas foram retomadas/ativadas
```

## 🎛️ Configuração

### Variáveis de Ambiente

```env
# Intervalo do job de manutenção em segundos
MAINTENANCE_INTERVAL_SECONDS=60    # Padrão

# Exemplos:
# 30  = Verifica a cada 30 segundos (mais responsivo)
# 60  = Verifica a cada 1 minuto (balanceado)
# 300 = Verifica a cada 5 minutos (menos carga)
```

### Integração no Server

```typescript
// Arquivo: server/index.ts
import { startMaintenanceJob } from "./jobs/bot-status-maintenance";

// Automaticamente iniciado quando server sobe:
const maintenanceIntervalSeconds = parseInt(
  process.env.MAINTENANCE_INTERVAL_SECONDS || '60',
  10
);
startMaintenanceJob(maintenanceIntervalSeconds);
```

## 📊 Exemplos de Uso Completo

### Exemplo 1: Pausar por 5 Minutos e Auto-Retomar

```bash
# 1. Pausar
curl -X POST "http://localhost:5049/api/instances/5511999999999/bot-status/pause" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "duration": 300000,
    "reason": "Usuário solicitou"
  }'

# Resposta:
{
  "data": {
    "status": "paused",
    "paused_until": "2024-11-25T14:35:00Z",
    "pause_reason": "Usuário solicitou"
  }
}

# 2. Verificar tempo restante (após 2 min)
curl -X GET "http://localhost:5049/api/instances/5511999999999/bot-status/remaining-time" \
  -H "Authorization: Bearer TOKEN"

# Resposta:
{
  "data": {
    "pauseRemainingMs": 180000,    # 3 minutos restantes
    "pauseRemainingSeconds": 180
  }
}

# 3. Após 5 minutos - Job detecta automaticamente
# Status volta para "active" sem ação manual!
```

### Exemplo 2: Pausa Indefinida e Retomada Manual

```bash
# Pausar indefinidamente (sem duration)
curl -X POST "http://localhost:5049/api/instances/5511999999999/bot-status/pause" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "reason": "Manutenção do sistema"
  }'

# Resposta:
{
  "data": {
    "status": "paused",
    "paused_until": null,  # Sem expiração!
    "pause_reason": "Manutenção do sistema"
  }
}

# Tempo restante = null (indefinido)
curl -X GET "http://localhost:5049/api/instances/5511999999999/bot-status/remaining-time"
# { "pauseRemainingMs": null, "pauseRemainingSeconds": null }

# Retomar manualmente quando pronto
curl -X POST "http://localhost:5049/api/instances/5511999999999/bot-status/resume" \
  -H "Authorization: Bearer TOKEN"
```

### Exemplo 3: Monitorar Múltiplas Instâncias

```bash
# Verificar status efetivo (considera expiração)
for instance in 5511999999999 5511888888888 5511777777777; do
  echo "Instância: $instance"
  curl -X GET "http://localhost:5049/api/instances/$instance/bot-status/effective" \
    -H "Authorization: Bearer TOKEN"
  echo ""
done

# Resultado mostra status REAL (já considerando expiração)
```

## 📈 Performance e Configuração

### Opções de Intervalo

```
MAINTENANCE_INTERVAL_SECONDS=30     # Muito responsivo, mais carga
MAINTENANCE_INTERVAL_SECONDS=60     # Recomendado (padrão)
MAINTENANCE_INTERVAL_SECONDS=300    # Menos responsivo, menos carga
MAINTENANCE_INTERVAL_SECONDS=3600   # 1 hora (muito lento)
```

### Impacto no Banco de Dados

```sql
-- O job roda:
UPDATE instance_bot_status
  SET status = 'active', paused_until = NULL
  WHERE status = 'paused'
    AND paused_until <= CURRENT_TIMESTAMP;

-- Usa índice:
idx_instance_bot_status_paused_until
```

## 🔒 Segurança e Confiabilidade

✅ **Auto-Resume Confiável**
- Job verifica a cada 60 segundos
- Máximo de atraso: 60 segundos
- Nunca perde expiração

✅ **Sem Duplicação**
- Verifica `maintenanceRunning` flag
- Evita execuções concorrentes

✅ **Tratamento de Erros**
- Continua rodando mesmo com erros
- Logs descritivos
- Não derruba o servidor

✅ **Verificação Manual Disponível**
- Endpoint `/bot-status/maintenance`
- Pode forçar limpeza quando necessário
- Útil para testes

## 🎯 Casos de Uso

| Caso | Configuração | Motivo |
|------|-------------|--------|
| Pausa teste | 5 minutos | Testar rapidamente |
| Pausa de manutenção | 30 minutos | Atualizar settings |
| Pausa de erro | 1 hora | Aguardar estabilidade |
| Pausa temporária | 2 horas | Esperar integrações |
| Pausa longa | 1 dia | Manutenção maior |
| Pausa indefinida | null | Apenas manual |

## 📝 Logs do Sistema

```
[bot-status-maintenance] Starting maintenance cleanup...
[bot-status] Auto-resumed 5 expired pauses
[bot-status] Auto-activated 2 expired inactivations
[bot-status-maintenance] Maintenance completed in 245ms

[bot-status-maintenance] Starting maintenance job (every 60s)
✅ Bot status maintenance job started (every 60s)
```

## 🚀 Próximas Melhorias (Opcional)

- [ ] Webhook notification ao auto-resumir
- [ ] Histórico de pauses
- [ ] Alertas se pausa expirada não detectada
- [ ] UI mostrando countdown da pausa
- [ ] Pausa automática baseada em erros
- [ ] Notificação de pausa expirando

## 📞 Suporte e Troubleshooting

### Job não está rodando?

```bash
# Verificar logs do servidor
npm run dev:server

# Deve aparecer:
# ✅ Bot status maintenance job started (every 60s)

# Se não aparecer, revisar se import está OK
```

### Pausa não foi retomada automaticamente?

```bash
# 1. Verificar status:
curl -X GET "http://localhost:5049/api/instances/xxx/bot-status" \
  -H "Authorization: Bearer TOKEN"

# 2. Verificar tempo restante:
curl -X GET "http://localhost:5049/api/instances/xxx/bot-status/remaining-time" \
  -H "Authorization: Bearer TOKEN"

# 3. Forçar limpeza:
curl -X POST "http://localhost:5049/api/instances/bot-status/maintenance" \
  -H "Authorization: Bearer TOKEN"
```

### Configurar intervalo customizado?

```env
# .env
MAINTENANCE_INTERVAL_SECONDS=30
```

Então reiniciar o servidor. Job começará com novo intervalo.
