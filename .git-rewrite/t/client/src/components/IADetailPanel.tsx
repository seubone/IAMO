import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Play, Pause, XCircle, Clock, User } from "lucide-react";
import type { IAStatus } from "./IAStatusTicker";
import { getIAStatusConfig } from "@/lib/configs";

export interface IAAction {
  id: string;
  action: string;
  user: string;
  reason: string;
  timestamp: string;
}

interface IADetailPanelProps {
  iaName: string;
  status: IAStatus;
  onActivate?: () => void;
  onPause?: () => void;
  onDeactivate?: () => void;
  actions?: IAAction[];
}

export function IADetailPanel({ 
  iaName, 
  status, 
  onActivate, 
  onPause, 
  onDeactivate,
  actions = []
}: IADetailPanelProps) {
  const statusConfig = getIAStatusConfig(status);
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-heading" data-testid="ia-detail-name">
            {iaName}
          </h2>
          <Badge className={statusConfig.badgeColor} data-testid="ia-detail-status">
            {statusConfig.label}
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full justify-start"
            variant={status === "active" ? "secondary" : "default"}
            onClick={onActivate}
            disabled={status === "active"}
            data-testid="button-activate-ia"
          >
            <Play className="h-4 w-4 mr-2" />
            Ativar IA
          </Button>

          <Button
            className="w-full justify-start"
            variant={status === "paused" ? "secondary" : "outline"}
            onClick={onPause}
            disabled={status === "paused"}
            data-testid="button-pause-ia"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pausar IA
          </Button>

          <Button
            className="w-full justify-start"
            variant={status === "inactive" ? "secondary" : "outline"}
            onClick={onDeactivate}
            disabled={status === "inactive"}
            data-testid="button-deactivate-ia"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Inativar IA
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold mb-3">Histórico de Ações</h3>
        
        <div className="space-y-3" data-testid="ia-actions-list">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma ação registrada
            </p>
          ) : (
            actions.map((action) => (
              <Card key={action.id} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{action.action}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      <User className="h-3 w-3 mr-1" />
                      {action.user}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {action.reason}
                  </p>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(action.timestamp).toLocaleString('pt-BR')}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
