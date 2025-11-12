import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, User, Clock, AlertCircle } from "lucide-react";
import type { Action, IA } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Audit() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: actions = [], isLoading: isLoadingActions } = useQuery<Action[]>({
    queryKey: ["/api/actions"],
  });

  const { data: ias = [] } = useQuery<IA[]>({
    queryKey: ["/api/ias"],
  });

  // Filter actions based on search
  const filteredActions = actions.filter((action) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const ia = ias.find((ia) => ia.id === action.iaId);
    return (
      action.action.toLowerCase().includes(searchLower) ||
      action.reason.toLowerCase().includes(searchLower) ||
      ia?.name.toLowerCase().includes(searchLower)
    );
  });

  const actionColors: Record<string, string> = {
    "paused": "bg-chart-1/10 text-chart-1",
    "active": "bg-chart-3/10 text-chart-3",
    "inactive": "bg-destructive/10 text-destructive",
  };

  const actionLabels: Record<string, string> = {
    "paused": "IA Pausada",
    "active": "IA Ativada",
    "inactive": "IA Inativada",
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-audit"
          />
        </div>

        {isLoadingActions ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-20 w-full" />
              </Card>
            ))}
          </div>
        ) : filteredActions.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "Nenhum resultado encontrado" : "Nenhuma ação registrada"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {searchQuery
                  ? "Tente ajustar os termos da busca"
                  : "Ações realizadas nas IAs aparecerão aqui"}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredActions.map((action) => {
              const ia = ias.find((ia) => ia.id === action.iaId);
              return (
                <Card key={action.id} className="p-4" data-testid={`audit-log-${action.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={actionColors[action.action] || "bg-muted"}>
                          {actionLabels[action.action] || action.action}
                        </Badge>
                        <Badge variant="outline">
                          {ia?.name || "IA Desconhecida"}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Motivo: </span>
                        {action.reason}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Usuário {action.userId.substring(0, 8)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(action.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
