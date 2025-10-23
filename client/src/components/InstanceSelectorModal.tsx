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
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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
              <button
                key={instance.id}
                onClick={() => handleSelectInstance(instance)}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedInstanceId === instance.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted"
                }`}
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
                      className={`text-xs px-2 py-1 rounded-full ${
                        instance.connectionStatus === "open"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100"
                      }`}
                    >
                      {instance.connectionStatus === "open" ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                </div>

                {/* Botão de seleção */}
                <Button
                  className="w-full mt-3"
                  size="sm"
                  variant={selectedInstanceId === instance.id ? "default" : "outline"}
                >
                  {selectedInstanceId === instance.id ? "Selecionada" : "Selecionar"}
                </Button>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
