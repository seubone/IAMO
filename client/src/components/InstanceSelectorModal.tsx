import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Settings, Search, X, MessageCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { EvolutionInstance } from "@/types/whatsapp";

interface InstanceSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectInstance: (instance: EvolutionInstance) => void;
  selectedInstanceId?: string | null;
}

export function InstanceSelectorModal({
  open,
  onOpenChange,
  onSelectInstance,
  selectedInstanceId,
}: InstanceSelectorModalProps) {
  const [, setLocation] = useLocation();
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch active instances by default
  const { data: instances = [], isLoading } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/whatsapp/instances", { inactive: showInactive }],
    queryFn: () =>
      apiRequest(`/api/whatsapp/instances${showInactive ? "?inactive=true" : ""}`),
    enabled: open,
  });

  // 🚀 Filtrar instâncias por nome ou número baseado na busca e status de conexão
  const filteredInstances = instances.filter((instance) => {
    // Se não está mostrando inativas, mostrar apenas instâncias conectadas
    if (!showInactive && instance.connectionStatus !== "open") {
      return false;
    }

    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return true;

    // Buscar em: nome, número, ownerJid
    const matchesName = (instance.name || "").toLowerCase().includes(searchLower);
    const matchesNumber = (instance.number || "").toLowerCase().includes(searchLower);
    const matchesOwnerJid = (instance.ownerJid || "").toLowerCase().includes(searchLower);

    return matchesName || matchesNumber || matchesOwnerJid;
  });

  const handleSelectInstance = (instance: EvolutionInstance) => {
    onSelectInstance(instance);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar Instância</DialogTitle>
          <DialogDescription>
            Escolha uma instância do WhatsApp para continuar
          </DialogDescription>
        </DialogHeader>

        {/* Campo de Busca */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou número..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtro para mostrar inativas */}
        <div className="flex items-center gap-2 py-3 border-b">
          <Checkbox
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={(checked) => setShowInactive(checked as boolean)}
          />
          <label
            htmlFor="show-inactive"
            className="text-sm font-medium cursor-pointer flex-1"
          >
            Mostrar instâncias inativas
          </label>
        </div>

        {/* Grid de instâncias - Responsivo */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? `Nenhuma instância encontrada para "${searchQuery}"`
                : showInactive
                  ? "Nenhuma instância encontrada"
                  : "Nenhuma instância ativa disponível"}
            </p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4">
              {filteredInstances.map((instance) => (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                key={instance.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectInstance(instance)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelectInstance(instance);
                  }
                }}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50",
                  selectedInstanceId === instance.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted"
                )}
              >
                {/* Avatar/Placeholder */}
                <div className="mb-3 flex justify-center">
                  {instance.profilePicUrl ? (
                    <img
                      src={instance.profilePicUrl}
                      alt={instance.name}
                      className="h-16 w-16 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-semibold text-lg border-2 border-border">
                      <MessageCircle className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>

                {/* Informações */}
                <div className="text-center">
                  <p className="font-semibold text-sm line-clamp-2">
                    {instance.name || instance.number}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {instance.number}
                  </p>
                  {/* 🚀 Status Badge Melhorado - 4 estados possíveis */}
                  <div className="mt-2 flex items-center justify-center">
                    {(() => {
                      const status = instance.connectionStatus;
                      let bgColor = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100";
                      let statusText = "Status desconhecido";

                      if (status === "open") {
                        bgColor = "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100";
                        statusText = "🟢 Conectada";
                      } else if (status === "close") {
                        bgColor = "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100";
                        statusText = "🔴 Desconectada";
                      } else if (status === "connecting") {
                        bgColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100";
                        statusText = "🟡 Conectando...";
                      }

                      return (
                        <span className={cn("text-xs px-2 py-1 rounded-full font-medium", bgColor)}>
                          {statusText}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    className="flex-1"
                    size="sm"
                    variant={selectedInstanceId === instance.id ? "default" : "outline"}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectInstance(instance);
                    }}
                  >
                    {selectedInstanceId === instance.id ? "Selecionada" : "Selecionar"}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9"
                    onClick={(event) => {
                      event.stopPropagation();
                      setLocation(`/chat/instance-settings/${instance.id}`);
                      onOpenChange(false);
                    }}
                    title="Configurar instância"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">{instance.name}</p>
                      <p className="text-muted-foreground">
                        {instance.number ? `+55 ${instance.number.substring(2)}` : "Sem número"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {instance.connectionStatus === "open" && "Conectada"}
                        {instance.connectionStatus === "close" && "Desconectada"}
                        {instance.connectionStatus === "connecting" && "Conectando..."}
                        {!["open", "close", "connecting"].includes(instance.connectionStatus) && "Status desconhecido"}
                      </p>
                      {instance.ownerJid && (
                        <p className="text-xs text-muted-foreground font-mono break-all">
                          {instance.ownerJid}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
