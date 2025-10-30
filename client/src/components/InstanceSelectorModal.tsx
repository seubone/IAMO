import { useState } from "react";
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
import { Loader2, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { EvolutionInstance } from "@/types/whatsapp";

interface InstanceSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectInstance: (instance: EvolutionInstance) => void;
  onConfigureInstance?: (instance: EvolutionInstance) => void;
  selectedInstanceId?: string | null;
}

export function InstanceSelectorModal({
  open,
  onOpenChange,
  onSelectInstance,
  onConfigureInstance,
  selectedInstanceId,
}: InstanceSelectorModalProps) {
  const [showInactive, setShowInactive] = useState(false);

  // Fetch active instances by default
  const { data: instances = [], isLoading } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/whatsapp/instances", { inactive: showInactive }],
    queryFn: () =>
      apiRequest(`/api/whatsapp/instances${showInactive ? "?inactive=true" : ""}`),
    enabled: open,
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

        {/* Grid de instâncias - 4 colunas */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : instances.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              {showInactive
                ? "Nenhuma instância encontrada"
                : "Nenhuma instância ativa disponível"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4 py-4">
            {instances.map((instance) => (
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
                className="p-4 rounded-lg border-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center font-semibold text-lg">
                      {instance.name?.charAt(0)?.toUpperCase()}
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
                  <div className="mt-2 flex items-center justify-center">
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                    >
                      {instance.connectionStatus === "open" ? "Ativa" : "Inativa"}
                    </span>
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
                  {onConfigureInstance && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        onConfigureInstance(instance);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Configurar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
