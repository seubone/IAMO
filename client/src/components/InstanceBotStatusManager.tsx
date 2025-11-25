import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Clock, Pause, Play, Power } from "lucide-react";
import type { BotStatus } from "@shared/instance-bot-status.types";

interface InstanceBotStatusManagerProps {
  instanceNumber: string;
}

export function InstanceBotStatusManager({ instanceNumber }: InstanceBotStatusManagerProps) {
  const [pauseDuration, setPauseDuration] = useState("3600"); // 1 hour in seconds
  const [pauseReason, setPauseReason] = useState("Pausado pelo usuário");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch current bot status
  const { data: botStatus, isLoading, refetch } = useQuery({
    queryKey: [`/api/instances/${instanceNumber}/bot-status`],
    enabled: !!instanceNumber,
  });

  // Pause mutation
  const pauseMutation = useMutation({
    mutationFn: async (duration: number | null) => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/instances/${instanceNumber}/bot-status/pause`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            duration,
            reason: pauseReason,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to pause bot");
      }

      return response.json();
    },
    onSuccess: () => {
      setSuccess("Bot pausado com sucesso!");
      refetch();
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error) => {
      setError((error as Error).message);
    },
  });

  // Resume mutation
  const resumeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/instances/${instanceNumber}/bot-status/resume`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to resume bot");
      }

      return response.json();
    },
    onSuccess: () => {
      setSuccess("Bot retomado com sucesso!");
      refetch();
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error) => {
      setError((error as Error).message);
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: async (duration: number | null) => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/instances/${instanceNumber}/bot-status/deactivate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            duration,
            reason: pauseReason,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to deactivate bot");
      }

      return response.json();
    },
    onSuccess: () => {
      setSuccess("Bot desativado com sucesso!");
      refetch();
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error) => {
      setError((error as Error).message);
    },
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/instances/${instanceNumber}/bot-status/activate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to activate bot");
      }

      return response.json();
    },
    onSuccess: () => {
      setSuccess("Bot ativado com sucesso!");
      refetch();
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error) => {
      setError((error as Error).message);
    },
  });

  const status: BotStatus = botStatus?.data?.status || "active";
  const pausedUntil = botStatus?.data?.paused_until
    ? new Date(botStatus.data.paused_until)
    : null;
  const inactiveUntil = botStatus?.data?.inactive_until
    ? new Date(botStatus.data.inactive_until)
    : null;

  const getStatusColor = (status: BotStatus) => {
    switch (status) {
      case "active":
        return "bg-green-50 border-green-200";
      case "paused":
        return "bg-yellow-50 border-yellow-200";
      case "inactive":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getStatusBadgeColor = (status: BotStatus) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: BotStatus) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "paused":
        return "Pausado";
      case "inactive":
        return "Inativo";
      default:
        return "Desconhecido";
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card className={`border-2 ${getStatusColor(status)}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status do Bot</CardTitle>
              <CardDescription>Gerenciar status de operação do bot/IA</CardDescription>
            </div>
            <div
              className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadgeColor(
                status
              )}`}
            >
              {getStatusLabel(status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Carregando status...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Status Atual
                  </p>
                  <p className="text-lg font-bold">{getStatusLabel(status)}</p>
                </div>

                {status === "paused" && pausedUntil && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Retomará em
                    </p>
                    <p className="text-sm">
                      {pausedUntil.toLocaleString("pt-BR")}
                    </p>
                  </div>
                )}

                {status === "inactive" && inactiveUntil && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Ativará em
                    </p>
                    <p className="text-sm">
                      {inactiveUntil.toLocaleString("pt-BR")}
                    </p>
                  </div>
                )}

                {botStatus?.data?.pause_reason && status === "paused" && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Motivo da Pausa
                    </p>
                    <p className="text-sm">{botStatus.data.pause_reason}</p>
                  </div>
                )}

                {botStatus?.data?.inactive_reason && status === "inactive" && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Motivo da Inativação
                    </p>
                    <p className="text-sm">{botStatus.data.inactive_reason}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Controle de Operação</CardTitle>
          <CardDescription>Pausar ou desativar o bot temporariamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Duration Selector */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Duração da Pausa/Inativação</Label>
            <Select value={pauseDuration} onValueChange={setPauseDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">5 minutos</SelectItem>
                <SelectItem value="900">15 minutos</SelectItem>
                <SelectItem value="1800">30 minutos</SelectItem>
                <SelectItem value="3600">1 hora</SelectItem>
                <SelectItem value="7200">2 horas</SelectItem>
                <SelectItem value="86400">1 dia</SelectItem>
                <SelectItem value="604800">1 semana</SelectItem>
                <SelectItem value="indefinite">Indefinido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="pause-reason" className="text-sm font-medium mb-2 block">
              Motivo (opcional)
            </Label>
            <Input
              id="pause-reason"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Ex: Atualização de conteúdo"
              className="text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            {status === "active" && (
              <>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    pauseMutation.mutate(
                      pauseDuration === "indefinite" ? null : parseInt(pauseDuration) * 1000
                    )
                  }
                  disabled={pauseMutation.isPending}
                >
                  <Pause className="w-4 h-4" />
                  {pauseMutation.isPending ? "Pausando..." : "Pausar"}
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    deactivateMutation.mutate(
                      pauseDuration === "indefinite" ? null : parseInt(pauseDuration) * 1000
                    )
                  }
                  disabled={deactivateMutation.isPending}
                >
                  <Power className="w-4 h-4" />
                  {deactivateMutation.isPending ? "Desativando..." : "Desativar"}
                </Button>
              </>
            )}

            {status === "paused" && (
              <>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => resumeMutation.mutate()}
                  disabled={resumeMutation.isPending}
                >
                  <Play className="w-4 h-4" />
                  {resumeMutation.isPending ? "Retomando..." : "Retomar"}
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    deactivateMutation.mutate(
                      pauseDuration === "indefinite" ? null : parseInt(pauseDuration) * 1000
                    )
                  }
                  disabled={deactivateMutation.isPending}
                >
                  <Power className="w-4 h-4" />
                  {deactivateMutation.isPending ? "Desativando..." : "Desativar"}
                </Button>
              </>
            )}

            {status === "inactive" && (
              <>
                <Button
                  variant="default"
                  className="gap-2 col-span-2"
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                >
                  <Play className="w-4 h-4" />
                  {activateMutation.isPending ? "Ativando..." : "Ativar Bot"}
                </Button>
              </>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-800 space-y-2">
              <p className="font-semibold">💡 Diferença entre Pausado e Inativo:</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>
                  <strong>Pausado:</strong> Bot continua monitorando, mas não responde mensagens
                </li>
                <li>
                  <strong>Inativo:</strong> Bot desativado completamente, sem monitoramento
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
