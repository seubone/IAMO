import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import {
  generateConsultantNameFromAI,
  formatMessageWithAIPrefix,
  CATEGORY_OPTIONS,
  N8N_TRIGGER_OPTIONS,
  PREFIX_TEMPLATE_SUGGESTIONS,
  type IAConfigFormData,
} from "@/types/ia-config";

interface IAConfigPanelProps {
  iaId: string;
  onClose?: () => void;
}

export function IAConfigPanel({ iaId, onClose }: IAConfigPanelProps) {
  // Form state
  const [aiName, setAiName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [avatarUrl, setAvatarUrl] = useState("");

  // N8N Configuration
  const [n8nWorkflowId, setN8nWorkflowId] = useState("");
  const [n8nWorkflowName, setN8nWorkflowName] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [n8nTriggerType, setN8nTriggerType] = useState("webhook");

  // Pause Schedule
  const [pauseUntil, setPauseUntil] = useState("");
  const [pauseReason, setPauseReason] = useState("");

  // Message Formatting
  const [messagePrefixTemplate, setMessagePrefixTemplate] = useState("*{name}:*\n");
  const [useAiPrefix, setUseAiPrefix] = useState(true);
  const [useConsultantPrefix, setUseConsultantPrefix] = useState(true);

  const { toast } = useToast();

  // Fetch IA configuration
  const { data: iaData } = useQuery({
    queryKey: [`/api/ias/${iaId}`],
    enabled: !!iaId,
  });

  // Load data when fetched
  useEffect(() => {
    if (iaData) {
      setAiName(iaData.aiName || "");
      setDescription(iaData.description || "");
      setCategory(iaData.category || "other");
      setAvatarUrl(iaData.avatarUrl || "");
      setN8nWorkflowId(iaData.n8nWorkflowId || "");
      setN8nWorkflowName(iaData.n8nWorkflowName || "");
      setN8nWebhookUrl(iaData.n8nWebhookUrl || "");
      setN8nTriggerType(iaData.n8nTriggerType || "webhook");
      setPauseUntil(iaData.pauseUntil ? new Date(iaData.pauseUntil).toISOString().slice(0, 16) : "");
      setPauseReason(iaData.pauseReason || "");
      setMessagePrefixTemplate(iaData.messagePrefixTemplate || "*{name}:*\n");
      setUseAiPrefix(iaData.useAiPrefix ?? true);
      setUseConsultantPrefix(iaData.useConsultantPrefix ?? true);
    }
  }, [iaData]);

  // Generate consultant name automatically
  const consultantName = useMemo(() => {
    return aiName ? generateConsultantNameFromAI(aiName) : "";
  }, [aiName]);

  // Preview messages
  const aiMessagePreview = useMemo(() => {
    if (!aiName) return "Olá! Como posso ajudar?";
    if (!useAiPrefix) return "Olá! Como posso ajudar?";
    return formatMessageWithAIPrefix("Olá! Como posso ajudar?", aiName, messagePrefixTemplate);
  }, [aiName, useAiPrefix, messagePrefixTemplate]);

  const consultantMessagePreview = useMemo(() => {
    if (!consultantName) return "Vou verificar isso para você.";
    if (!useConsultantPrefix) return "Vou verificar isso para você.";
    return formatMessageWithAIPrefix("Vou verificar isso para você.", consultantName, messagePrefixTemplate);
  }, [consultantName, useConsultantPrefix, messagePrefixTemplate]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<IAConfigFormData>) => {
      return await apiRequest(`/api/ias/${iaId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuração salva",
        description: "Configuração da IA salva com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/ias/${iaId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/ias"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a configuração",
      });
    },
  });

  const handleSave = () => {
    // Validate AI name format if provided
    if (aiName) {
      const parts = aiName.trim().split(/\s+/);
      if (parts.length < 2) {
        toast({
          variant: "destructive",
          title: "Formato inválido",
          description: "Nome da IA deve ser: Nome Sobrenome (ex: Maria Luzia)",
        });
        return;
      }

      const validFormat = parts.every((part) => /^[A-Z]/.test(part));
      if (!validFormat) {
        toast({
          variant: "destructive",
          title: "Formato inválido",
          description: "Cada palavra deve começar com letra maiúscula (ex: Maria Luzia)",
        });
        return;
      }
    }

    const configData: Partial<IAConfigFormData> = {
      aiName: aiName || undefined,
      consultantName: consultantName || undefined,
      description: description || undefined,
      category: category as any,
      avatarUrl: avatarUrl || undefined,
      n8nWorkflowId: n8nWorkflowId || undefined,
      n8nWorkflowName: n8nWorkflowName || undefined,
      n8nWebhookUrl: n8nWebhookUrl || undefined,
      n8nTriggerType: n8nTriggerType,
      pauseUntil: pauseUntil ? new Date(pauseUntil).toISOString() : undefined,
      pauseReason: pauseReason || undefined,
      messagePrefixTemplate: messagePrefixTemplate || "*{name}:*\n",
      useAiPrefix,
      useConsultantPrefix,
    };

    saveMutation.mutate(configData);
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto p-4">
      {/* AI Name Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Informações da IA</h3>

        <div className="space-y-2">
          <Label htmlFor="ai-name">Nome da IA *</Label>
          <Input
            id="ai-name"
            value={aiName}
            onChange={(e) => setAiName(e.target.value)}
            placeholder="Ex: Maria Luzia"
            disabled={saveMutation.isPending}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            Formato: Nome Sobrenome (com iniciais maiúsculas)
          </p>
        </div>

        {/* Consultant Name Preview */}
        {aiName && (
          <div className="p-3 rounded-lg border border-border bg-muted/50 space-y-2">
            <Label className="text-sm">Nome do Consultor (gerado automaticamente)</Label>
            <div className="space-y-1">
              <p className="text-sm">
                <strong>IA:</strong> <code className="bg-background px-2 py-1 rounded">{aiName}</code>
              </p>
              <p className="text-sm">
                <strong>Consultor:</strong> <code className="bg-background px-2 py-1 rounded text-blue-600">{consultantName}</code>
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva a função e responsabilidades desta IA..."
            disabled={saveMutation.isPending}
            className="min-h-20 resize-none"
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
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
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

      <Separator />

      {/* N8N Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configuração N8N</h3>

        <div className="space-y-2">
          <Label htmlFor="n8n-workflow-id">ID do Workflow</Label>
          <Input
            id="n8n-workflow-id"
            value={n8nWorkflowId}
            onChange={(e) => setN8nWorkflowId(e.target.value)}
            placeholder="Ex: abc123def456"
            disabled={saveMutation.isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="n8n-workflow-name">Nome do Workflow</Label>
          <Input
            id="n8n-workflow-name"
            value={n8nWorkflowName}
            onChange={(e) => setN8nWorkflowName(e.target.value)}
            placeholder="Ex: Atendimento de Vendas"
            disabled={saveMutation.isPending}
          />
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
              {N8N_TRIGGER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Pause Schedule */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Agendamento de Pausa</h3>

        <div className="space-y-2">
          <Label htmlFor="pause-until">Pausar até (quando retomar)</Label>
          <Input
            id="pause-until"
            type="datetime-local"
            value={pauseUntil}
            onChange={(e) => setPauseUntil(e.target.value)}
            disabled={saveMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Deixe em branco para não pausar
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pause-reason">Motivo da Pausa</Label>
          <Input
            id="pause-reason"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Ex: Manutenção programada, Teste de modelo, etc"
            disabled={saveMutation.isPending}
          />
        </div>
      </div>

      <Separator />

      {/* Message Formatting */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Formatação de Mensagens</h3>

        <div className="space-y-2">
          <Label htmlFor="prefix-template">Template de Prefixo</Label>
          <div className="space-y-2">
            {PREFIX_TEMPLATE_SUGGESTIONS.map((template) => (
              <button
                key={template.value}
                onClick={() => setMessagePrefixTemplate(template.value)}
                disabled={saveMutation.isPending}
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                  messagePrefixTemplate === template.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="text-sm font-medium">{template.label}</p>
                <p className="text-xs text-muted-foreground font-mono">{template.example}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Use <code className="bg-muted px-1 rounded">{"{name}"}</code> para inserir o nome
          </p>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <Checkbox
            id="use-ai-prefix"
            checked={useAiPrefix}
            onCheckedChange={(checked) => setUseAiPrefix(checked as boolean)}
            disabled={saveMutation.isPending}
            className="w-4 h-4"
          />
          <Label htmlFor="use-ai-prefix" className="flex-1 cursor-pointer text-sm">
            Usar prefixo nas mensagens da IA
          </Label>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <Checkbox
            id="use-consultant-prefix"
            checked={useConsultantPrefix}
            onCheckedChange={(checked) => setUseConsultantPrefix(checked as boolean)}
            disabled={saveMutation.isPending}
            className="w-4 h-4"
          />
          <Label htmlFor="use-consultant-prefix" className="flex-1 cursor-pointer text-sm">
            Usar prefixo nas mensagens do Consultor
          </Label>
        </div>
      </div>

      {/* Message Preview */}
      {aiName && (
        <>
          <Separator />
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
            <Label className="text-sm font-semibold">Preview das Mensagens</Label>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Mensagem da IA ({aiName}):</p>
                <div className="bg-background border border-border rounded p-3 whitespace-pre-wrap text-sm font-mono break-words">
                  {aiMessagePreview}
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Mensagem do Consultor ({consultantName}):
                </p>
                <div className="bg-background border border-border rounded p-3 whitespace-pre-wrap text-sm font-mono break-words">
                  {consultantMessagePreview}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background">
        <Button
          variant="outline"
          onClick={onClose}
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
    </div>
  );
}
