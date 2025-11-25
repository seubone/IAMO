import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Power, Zap, AlertCircle, CheckCircle } from "lucide-react";
import { n8nWorkflowsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Workflow {
  id: bigint;
  instance_id: string;
  instance_number: string;
  workflow_id: string;
  workflow_name: string;
  webhook_url?: string;
  trigger_type: string;
  is_active: boolean;
  last_triggered_at?: string;
  last_error_message?: string;
  created_at: string;
}

interface N8NWorkflowFormProps {
  instanceNumber: string;
  instanceId: string;
}

export function N8NWorkflowForm({ instanceNumber, instanceId }: N8NWorkflowFormProps) {
  const [open, setOpen] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [workflowId, setWorkflowId] = useState("");
  const [workflowName, setWorkflowName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [triggerType, setTriggerType] = useState("webhook");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load workflows when modal opens
  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setIsLoading(true);
      try {
        const response = await n8nWorkflowsAPI.getWorkflows(instanceNumber);
        setWorkflows(response || []);
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao carregar workflows",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Create workflow mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workflowId || !workflowName) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      return n8nWorkflowsAPI.createWorkflow(instanceNumber, {
        instance_id: instanceId,
        workflow_id: workflowId,
        workflow_name: workflowName,
        webhook_url: webhookUrl || null,
        trigger_type: triggerType,
      });
    },
    onSuccess: async (data) => {
      toast({
        title: "Sucesso",
        description: `Workflow "${workflowName}" registrado com sucesso!`,
      });

      // Reload workflows
      try {
        const response = await n8nWorkflowsAPI.getWorkflows(instanceNumber);
        setWorkflows(response || []);
      } catch (error) {
        console.error(error);
      }

      // Reset form
      setWorkflowId("");
      setWorkflowName("");
      setWebhookUrl("");
      setTriggerType("webhook");

      // Invalidate query
      queryClient.invalidateQueries({ queryKey: ["n8n-workflows", instanceNumber] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao registrar workflow",
        variant: "destructive",
      });
    },
  });

  // Delete workflow mutation
  const deleteMutation = useMutation({
    mutationFn: async (workflowToDelete: Workflow) => {
      return n8nWorkflowsAPI.deleteWorkflow(instanceNumber, workflowToDelete.workflow_id);
    },
    onSuccess: async (_, workflowToDelete) => {
      toast({
        title: "Removido",
        description: `Workflow "${workflowToDelete.workflow_name}" removido`,
      });

      // Reload workflows
      try {
        const response = await n8nWorkflowsAPI.getWorkflows(instanceNumber);
        setWorkflows(response || []);
      } catch (error) {
        console.error(error);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao remover workflow",
        variant: "destructive",
      });
    },
  });

  // Toggle workflow mutation
  const toggleMutation = useMutation({
    mutationFn: async (workflowToToggle: Workflow) => {
      return n8nWorkflowsAPI.toggleWorkflow(instanceNumber, workflowToToggle.workflow_id);
    },
    onSuccess: async () => {
      try {
        const response = await n8nWorkflowsAPI.getWorkflows(instanceNumber);
        setWorkflows(response || []);
      } catch (error) {
        console.error(error);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao alternar status do workflow",
        variant: "destructive",
      });
    },
  });

  // Trigger workflow mutation
  const triggerMutation = useMutation({
    mutationFn: async (workflowToTrigger: Workflow) => {
      return n8nWorkflowsAPI.triggerWorkflow(instanceNumber, workflowToTrigger.workflow_id);
    },
    onSuccess: (_, workflowToTrigger) => {
      toast({
        title: "Sucesso",
        description: `Workflow "${workflowToTrigger.workflow_name}" acionado com sucesso`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao acionar workflow",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Zap className="h-4 w-4 mr-2" />
          Registrar Workflow N8N
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Workflows N8N</DialogTitle>
          <DialogDescription>
            Registre workflows do N8N para a instância {instanceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form to add new workflow */}
          <Card className="p-4 bg-muted/50">
            <h3 className="font-semibold mb-4">Novo Workflow</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">ID do Workflow*</label>
                  <Input
                    placeholder="workflow_id"
                    value={workflowId}
                    onChange={(e) => setWorkflowId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Nome*</label>
                  <Input
                    placeholder="Ex: Processar Mensagens"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">URL do Webhook</label>
                <Input
                  placeholder="https://n8n.example.com/webhook/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Tipo de Acionamento</label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="schedule">Agendado</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="trigger_node">Nó de Acionamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !workflowId || !workflowName}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createMutation.isPending ? "Registrando..." : "Registrar"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Separator />

          {/* Workflows list */}
          <div>
            <h3 className="font-semibold mb-3">Workflows Registrados</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Carregando workflows...</p>
              </div>
            ) : workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum workflow registrado</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {workflows.map((workflow) => (
                    <Card key={workflow.id} className="p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{workflow.workflow_name}</h4>
                            {workflow.is_active ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                <CheckCircle className="h-3 w-3" />
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                                Inativo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">ID: {workflow.workflow_id}</p>
                          <p className="text-xs text-muted-foreground">
                            Tipo: {workflow.trigger_type}
                          </p>
                          {workflow.last_error_message && (
                            <p className="text-xs text-red-600 mt-1">
                              Erro: {workflow.last_error_message}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => triggerMutation.mutate(workflow)}
                            disabled={triggerMutation.isPending || !workflow.webhook_url}
                            title={workflow.webhook_url ? "Acionar workflow" : "Webhook URL não configurada"}
                          >
                            <Zap className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleMutation.mutate(workflow)}
                            disabled={toggleMutation.isPending}
                          >
                            <Power
                              className={`h-4 w-4 ${workflow.is_active ? "text-green-600" : "text-gray-400"}`}
                            />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(workflow)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
