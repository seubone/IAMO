import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { IAConfigPanel } from "@/components/IAConfigPanel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface IA {
  id: string;
  name: string;
  aiName?: string;
  status: "active" | "paused" | "inactive";
  category?: string;
  n8nWorkflowId?: string;
  createdAt: string;
  updatedAt: string;
}

export function IAAdminPage() {
  const [editingIaId, setEditingIaId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newIaName, setNewIaName] = useState("");
  const { toast } = useToast();

  // Fetch all IAs
  const { data: ias = [], isLoading } = useQuery({
    queryKey: ["/api/ias"],
  });

  // Create new IA
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("/api/ias", {
        method: "POST",
        body: JSON.stringify({ name }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "IA criada",
        description: "Nova IA foi criada com sucesso!",
      });
      setNewIaName("");
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/ias"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: error.message || "Não foi possível criar a IA",
      });
    },
  });

  // Delete IA
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/ias/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "IA deletada",
        description: "A IA foi deletada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ias"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao deletar",
        description: error.message || "Não foi possível deletar a IA",
      });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "paused":
        return "secondary";
      case "inactive":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativa";
      case "paused":
        return "Pausada";
      case "inactive":
        return "Inativa";
      default:
        return status;
    }
  };

  if (editingIaId) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Editar IA</h1>
            <Button
              variant="outline"
              onClick={() => setEditingIaId(null)}
            >
              Voltar
            </Button>
          </div>
          <IAConfigPanel
            iaId={editingIaId}
            onClose={() => setEditingIaId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Administração de IAs</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie configurações de inteligências artificiais
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova IA
          </Button>
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova IA</DialogTitle>
              <DialogDescription>
                Insira o nome da nova inteligência artificial
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ia-name">Nome da IA</Label>
                <Input
                  id="ia-name"
                  value={newIaName}
                  onChange={(e) => setNewIaName(e.target.value)}
                  placeholder="Ex: IA Vendas"
                  disabled={createMutation.isPending}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => createMutation.mutate(newIaName)}
                  disabled={!newIaName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar IA"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Table */}
        <div className="border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : ias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                Nenhuma IA foi criada ainda
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira IA
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nome da IA</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Workflow N8N</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ias.map((ia: IA) => (
                  <TableRow key={ia.id}>
                    <TableCell className="font-medium">{ia.name}</TableCell>
                    <TableCell>{ia.aiName || "-"}</TableCell>
                    <TableCell>{ia.category || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(ia.status)}>
                        {getStatusLabel(ia.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ia.n8nWorkflowId ? (
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {ia.n8nWorkflowId.substring(0, 10)}...
                        </code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ia.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingIaId(ia.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              `Tem certeza que deseja deletar "${ia.name}"?`
                            )
                          ) {
                            deleteMutation.mutate(ia.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold">💡 Dica</p>
          <p className="text-sm text-muted-foreground">
            Clique em "Editar" para configurar todos os detalhes da IA, incluindo:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
            <li>Nome customizado da IA e Consultor</li>
            <li>Configuração de workflow N8N</li>
            <li>Agendamento de pausas</li>
            <li>Template de prefixo de mensagens</li>
            <li>Avatar e categoria</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
