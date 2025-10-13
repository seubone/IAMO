import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, User, Clock } from "lucide-react";

export default function Audit() {
  // TODO: Remove mock data
  const mockAuditLogs = [
    {
      id: "1",
      action: "IA Pausada",
      user: "João Silva",
      ia: "IA Vendas WhatsApp",
      reason: "Taxa de conversão abaixo de 20% nas últimas 24h",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "2",
      action: "IA Ativada",
      user: "Maria Santos",
      ia: "IA Suporte Email",
      reason: "Prompt atualizado com novas objeções",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "3",
      action: "IA Inativada",
      user: "Pedro Costa",
      ia: "IA Marketing",
      reason: "Campanha finalizada, IA não será mais utilizada",
      timestamp: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: "4",
      action: "IA Ativada",
      user: "Ana Oliveira",
      ia: "IA Cobrança",
      reason: "Início do ciclo de cobrança mensal",
      timestamp: new Date(Date.now() - 14400000).toISOString(),
    },
  ];

  const actionColors: Record<string, string> = {
    "IA Pausada": "bg-chart-1/10 text-chart-1",
    "IA Ativada": "bg-chart-3/10 text-chart-3",
    "IA Inativada": "bg-destructive/10 text-destructive",
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold font-heading">Auditoria</h1>
        <p className="text-muted-foreground">Histórico completo de ações no sistema</p>
      </div>

      <div className="p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário, IA ou ação..."
            className="pl-10"
            data-testid="input-search-audit"
          />
        </div>

        <div className="space-y-3">
          {mockAuditLogs.map((log) => (
            <Card key={log.id} className="p-4" data-testid={`audit-log-${log.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={actionColors[log.action] || "bg-muted"}>
                      {log.action}
                    </Badge>
                    <Badge variant="outline">
                      {log.ia}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Motivo: </span>
                    {log.reason}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {log.user}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
