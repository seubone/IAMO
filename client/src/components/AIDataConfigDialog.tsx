import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface AIDataConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiDataId?: number; // id da tabela ai_data
  instanceNumber?: string; // número da instância WhatsApp
  instanceId?: string; // UUID da instância
}

export function AIDataConfigDialog({
  open,
  onOpenChange,
  aiDataId,
  instanceNumber,
  instanceId,
}: AIDataConfigDialogProps) {
  // Formulário
  const [aiName, setAiName] = useState("");
  const [consultantName, setConsultantName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [avatarUrl, setAvatarUrl] = useState("");

  // N8N
  const [n8nWorkflowId, setN8nWorkflowId] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [n8nTriggerType, setN8nTriggerType] = useState("webhook");

  // Message Prefix
  const [messagePrefixTemplate, setMessagePrefixTemplate] = useState("*{name}:*\n");
  const [useAiPrefix, setUseAiPrefix] = useState(true);
  const [useConsultantPrefix, setUseConsultantPrefix] = useState(true);

  const { toast } = useToast();

  // Buscar dados da IA se existir
  const { data: aiData } = useQuery({
    queryKey: [`/api/ai-data/${aiDataId}`],
    enabled: !!aiDataId && open,
  });

  // Carregar dados quando buscar
  useEffect(() => {
    if (aiData) {
      setAiName(aiData.ai_name || "");
      setConsultantName(aiData.consultant_name || "");
      setDescription(aiData.description || "");
      setCategory(aiData.category || "other");
      setAvatarUrl(aiData.avatar_url || "");
      setN8nWorkflowId(aiData.n8n_workflow_id || "");
      setN8nWebhookUrl(aiData.n8n_webhook_url || "");
      setN8nTriggerType(aiData.n8n_trigger_type || "webhook");
      setMessagePrefixTemplate(aiData.message_prefix_template || "*{name}:*\n");
      setUseAiPrefix(aiData.use_ai_prefix ?? true);
      setUseConsultantPrefix(aiData.use_consultant_prefix ?? true);
    }
  }, [aiData]);

  // Auto-gerar nome do consultor
  useEffect(() => {
    if (aiName) {
      const parts = aiName.split(" ");
      if (parts.length > 1) {
        // "Maria Luzia" -> "Maria luzia"
        const lastName = parts[parts.length - 1];
        const firstPart = parts.slice(0, -1).join(" ");
        setConsultantName(`${firstPart} ${lastName.toLowerCase()}`);
      }
    }
  }, [aiName]);

  // Salvar
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ai_name: aiName,
        consultant_name: consultantName,
        description,
        category,
        avatar_url: avatarUrl,
        n8n_workflow_id: n8nWorkflowId,
        n8n_webhook_url: n8nWebhookUrl,
        n8n_trigger_type: n8nTriggerType,
        message_prefix_template: messagePrefixTemplate,
        use_ai_prefix: useAiPrefix,
        use_consultant_prefix: useConsultantPrefix,
        last_modified_by: "user", // você pode passar o userId real aqui
        last_modified_at: new Date().toISOString(),
      };

      if (aiDataId) {
        // Atualizar
        return await apiRequest(`/api/ai-data/${aiDataId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // Criar nova entrada
        return await apiRequest("/api/ai-data", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            instance_number: instanceNumber,
            workflow_id: n8nWorkflowId, // campo que já existe
          }),
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Configuração salva",
        description: "Dados da IA foram salvos com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/ai-data/${aiDataId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-data"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar",
      });
    },
  });

  const handleSave = () => {
    if (!aiName.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Nome da IA é obrigatório",
      });
      return;
    }

    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar IA - {instanceNumber}</DialogTitle>
          <DialogDescription>
            Configure a inteligência artificial para esta instância
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold">Informações Básicas</h3>

            <div className="space-y-2">
              <Label htmlFor="ai-name">Nome da IA *</Label>
              <Input
                id="ai-name"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                placeholder="Ex: Maria Luzia"
                disabled={saveMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Formato: Nome Sobrenome (com iniciais maiúsculas)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consultant-name">Nome do Consultor</Label>
              <Input
                id="consultant-name"
                value={consultantName}
                onChange={(e) => setConsultantName(e.target.value)}
                placeholder="Gerado automaticamente"
                disabled={true}
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Gerado automaticamente a partir do nome da IA
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva a função desta IA..."
                disabled={saveMutation.isPending}
                className="min-h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={category} onValueChange={setCategory} disabled={saveMutation.isPending}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Vendas</SelectItem>
                    <SelectItem value="support">Suporte</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="billing">Faturamento</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">URL do Avatar</Label>
                <Input
                  id="avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  disabled={saveMutation.isPending}
                  type="url"
                />
              </div>
            </div>
          </div>

          {/* Configuração N8N */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Configuração N8N</h3>

            <div className="space-y-2">
              <Label htmlFor="n8n-workflow-id">ID do Workflow N8N</Label>
              <Input
                id="n8n-workflow-id"
                value={n8nWorkflowId}
                onChange={(e) => setN8nWorkflowId(e.target.value)}
                placeholder="Ex: abc123def456"
                disabled={saveMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Encontre em: N8N Dashboard → Seu Workflow → Copie o ID da URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="n8n-webhook">URL do Webhook</Label>
              <Input
                id="n8n-webhook"
                value={n8nWebhookUrl}
                onChange={(e) => setN8nWebhookUrl(e.target.value)}
                placeholder="https://n8n.example.com/webhook/..."
                disabled={saveMutation.isPending}
                type="url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="n8n-trigger">Tipo de Trigger</Label>
              <Select value={n8nTriggerType} onValueChange={setN8nTriggerType} disabled={saveMutation.isPending}>
                <SelectTrigger id="n8n-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="schedule">Agendado</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="trigger_node">Trigger Node</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Formatação de Mensagens */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Formatação de Mensagens</h3>

            <div className="space-y-2">
              <Label htmlFor="prefix-template">Template de Prefixo</Label>
              <Input
                id="prefix-template"
                value={messagePrefixTemplate}
                onChange={(e) => setMessagePrefixTemplate(e.target.value)}
                placeholder="*{name}:*\n"
                disabled={saveMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{name}"} para inserir o nome. Exemplos: "*{"{name}"}:*\n" ou "[{"{name}"}]"
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="use-ai-prefix"
                checked={useAiPrefix}
                onCheckedChange={(checked) => setUseAiPrefix(checked as boolean)}
                disabled={saveMutation.isPending}
              />
              <Label htmlFor="use-ai-prefix" className="text-sm">
                Usar prefixo em mensagens da IA
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="use-consultant-prefix"
                checked={useConsultantPrefix}
                onCheckedChange={(checked) => setUseConsultantPrefix(checked as boolean)}
                disabled={saveMutation.isPending}
              />
              <Label htmlFor="use-consultant-prefix" className="text-sm">
                Usar prefixo em mensagens do consultor
              </Label>
            </div>
          </div>

          {/* Preview */}
          {aiName && (
            <div className="border-t pt-4 space-y-2 bg-muted/50 p-3 rounded">
              <p className="text-sm font-semibold">Preview:</p>
              <div className="text-sm space-y-1">
                <p className="text-xs text-muted-foreground">Mensagem da IA:</p>
                <p className="font-mono text-xs bg-background p-2 rounded">
                  {useAiPrefix
                    ? messagePrefixTemplate.replace("{name}", aiName) + "Olá!"
                    : "Olá!"}
                </p>
              </div>
              <div className="text-sm space-y-1">
                <p className="text-xs text-muted-foreground">Mensagem do Consultor:</p>
                <p className="font-mono text-xs bg-background p-2 rounded">
                  {useConsultantPrefix
                    ? messagePrefixTemplate.replace("{name}", consultantName) + "Vou verificar..."
                    : "Vou verificar..."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Configuração"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
