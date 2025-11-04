import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { BotInstanceConfig } from "@/types/bot-instance";

interface BotConfigDialogProps {
  instanceNumber: string;
  instanceId: string;
  instanceName: string;
}

export function BotConfigDialog({ instanceNumber, instanceId, instanceName }: BotConfigDialogProps) {
  // State for form fields
  const [hasBotEnabled, setHasBotEnabled] = useState(false);
  const [botName, setBotName] = useState("");
  const [botActivity, setBotActivity] = useState("");
  const [messagePrefixTemplate, setMessagePrefixTemplate] = useState("*{name}:*\n");
  const [usePrefixForBot, setUsePrefixForBot] = useState(true);
  const [usePrefixForConsultant, setUsePrefixForConsultant] = useState(true);
  const [consultantName, setConsultantName] = useState("");
  const [consultantNameDirty, setConsultantNameDirty] = useState(false);

  const { toast } = useToast();

  // Fetch current bot configuration
  const { data: botConfig } = useQuery({
    queryKey: ["/api/bot-config", instanceNumber],
    queryFn: () => apiRequest(`/api/bot-config/${instanceNumber}`),
    enabled: !!instanceNumber,
  });

  const generateConsultantNameFromBot = (name: string): string => {
    if (!name) return "";
    const trimmed = name.trim();
    if (!trimmed) return "";

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      return trimmed;
    }

    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const lastNameLower = lastName.charAt(0).toLowerCase() + lastName.slice(1);

    if (parts.length === 2) {
      return `${firstName} ${lastNameLower}`;
    }

    const middleNames = parts.slice(1, -1).join(" ");
    return `${firstName} ${middleNames} ${lastNameLower}`.trim();
  };

  // Update form when config is loaded
  useEffect(() => {
    if (botConfig) {
      setHasBotEnabled(botConfig.has_bot_enabled ?? false);
      setBotName(botConfig.bot_name || "");
      setBotActivity(botConfig.bot_activity || "");
      setMessagePrefixTemplate(botConfig.message_prefix_template || "*{name}:*\n");
      setUsePrefixForBot(botConfig.use_prefix_for_bot ?? true);
      setUsePrefixForConsultant(botConfig.use_prefix_for_consultant ?? true);

      const existingConsultant = botConfig.consultant_name || "";
      if (existingConsultant) {
        setConsultantName(existingConsultant);
        setConsultantNameDirty(true);
      } else {
        const generated = generateConsultantNameFromBot(botConfig.bot_name || "");
        setConsultantName(generated);
        setConsultantNameDirty(Boolean(generated));
      }
    }
  }, [botConfig]);

  useEffect(() => {
    if (!consultantNameDirty) {
      const generated = generateConsultantNameFromBot(botName);
      setConsultantName(generated);
    }
  }, [botName, consultantNameDirty]);

  // Format message preview
  const formatPreview = (name: string, message: string): string => {
    if (!name) return message;
    const prefix = messagePrefixTemplate.replace("{name}", name);
    return prefix + message;
  };

  // Bot message preview
  const botMessagePreview = useMemo(() => {
    if (!hasBotEnabled || !usePrefixForBot) {
      return "Olá! Como posso ajudar?";
    }
    return formatPreview(botName, "Olá! Como posso ajudar?");
  }, [hasBotEnabled, botName, usePrefixForBot, messagePrefixTemplate]);

  // Consultant message preview
  const consultantMessagePreview = useMemo(() => {
    if (!hasBotEnabled || !usePrefixForConsultant) {
      return "Vou verificar isso para você.";
    }
    return formatPreview(consultantName, "Vou verificar isso para você.");
  }, [hasBotEnabled, consultantName, usePrefixForConsultant, messagePrefixTemplate]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: BotInstanceConfig) => {
      return await apiRequest("/api/bot-config", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuração salva",
        description: "Configuração do bot salva com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bot-config", instanceNumber] });
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
    // Validate bot name format if bot is enabled
    if (hasBotEnabled && botName) {
      const parts = botName.trim().split(/\s+/);
      if (parts.length < 2) {
        toast({
          variant: "destructive",
          title: "Formato inválido",
          description: "Nome do bot deve ser: Nome Sobrenome (ex: Maria Luzia)",
        });
        return;
      }

      // Check if first letter of each part is uppercase
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

    const trimmedConsultant = consultantName.trim();

    saveMutation.mutate({
      instance_id: instanceId,
      instance_number: instanceNumber,
      has_bot_enabled: hasBotEnabled,
      bot_name: botName || null,
      consultant_name: trimmedConsultant ? trimmedConsultant : null,
      bot_activity: botActivity || null,
      message_prefix_template: messagePrefixTemplate || "*{name}:*\n",
      use_prefix_for_bot: usePrefixForBot,
      use_prefix_for_consultant: usePrefixForConsultant,
    });
  };

  return (
    <div className="space-y-6 py-4">
      {/* Enable Bot Toggle */}
      <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
        <Checkbox
          id="enable-bot"
          checked={hasBotEnabled}
          onCheckedChange={(checked) => setHasBotEnabled(checked as boolean)}
          className="w-5 h-5"
        />
        <Label htmlFor="enable-bot" className="flex-1 cursor-pointer font-medium">
          Habilitar Bot/IA nesta instância
        </Label>
      </div>

      {hasBotEnabled && (
        <>
          {/* Bot Name Input */}
          <div className="space-y-2">
            <Label htmlFor="bot-name">Nome do Bot/IA *</Label>
            <Input
              id="bot-name"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="Ex: Maria Luzia"
              disabled={saveMutation.isPending}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Formato: Nome Sobrenome (com iniciais maiúsculas)
              <br />
              Exemplo: Maria Luzia, João Silva, Ana Costa
            </p>
          </div>

          {/* Consultant Name */}
          <div className="space-y-2">
            <Label htmlFor="consultant-name">Nome do Consultor</Label>
            <div className="flex gap-2">
              <Input
                id="consultant-name"
                value={consultantName}
                onChange={(e) => {
                  setConsultantName(e.target.value);
                  setConsultantNameDirty(true);
                }}
                placeholder="Ex: Consultor Maria"
                disabled={saveMutation.isPending}
                className="text-base"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const generated = generateConsultantNameFromBot(botName);
                  setConsultantName(generated);
                  setConsultantNameDirty(false);
                }}
                disabled={saveMutation.isPending || !botName}
              >
                Gerar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Esse nome aparece no prefixo e no cabeçalho das mensagens enviadas. Clique em &quot;Gerar&quot; para
              usar uma sugestão baseada no nome do bot.
            </p>
          </div>

          {/* Bot Activity */}
          <div className="space-y-2">
            <Label htmlFor="bot-activity">Atividade/Função do Bot (opcional)</Label>
            <Textarea
              id="bot-activity"
              value={botActivity}
              onChange={(e) => setBotActivity(e.target.value)}
              placeholder="Ex: Atendimento de vendas, Suporte técnico, Agendamento de consultas..."
              disabled={saveMutation.isPending}
              className="min-h-20 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Descreva a função ou atividade principal do bot
            </p>
          </div>

          {/* Separator */}
          <Separator className="my-4" />

          {/* Message Prefix Configuration */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Configuração de Prefixo de Mensagens</Label>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Checkbox
                id="prefix-bot"
                checked={usePrefixForBot}
                onCheckedChange={(checked) => setUsePrefixForBot(checked as boolean)}
                className="w-4 h-4"
                disabled={saveMutation.isPending}
              />
              <Label htmlFor="prefix-bot" className="flex-1 cursor-pointer text-sm">
                Usar prefixo nas mensagens do Bot
              </Label>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Checkbox
                id="prefix-consultant"
                checked={usePrefixForConsultant}
                onCheckedChange={(checked) => setUsePrefixForConsultant(checked as boolean)}
                className="w-4 h-4"
                disabled={saveMutation.isPending}
              />
              <Label htmlFor="prefix-consultant" className="flex-1 cursor-pointer text-sm">
                Usar prefixo nas mensagens do Consultor
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prefix-template">Template do Prefixo</Label>
              <Input
                id="prefix-template"
                value={messagePrefixTemplate}
                onChange={(e) => setMessagePrefixTemplate(e.target.value)}
                placeholder="Ex: *{name}:*\n"
                disabled={saveMutation.isPending}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{"{name}"}</code> para inserir o nome
                <br />
                Exemplos: <code className="bg-muted px-1 rounded">*{"{name}"}:*\n</code> ou{" "}
                <code className="bg-muted px-1 rounded">[{"{name}"}]</code> ou{" "}
                <code className="bg-muted px-1 rounded">{"{name}"}: </code>
              </p>
            </div>
          </div>

          {/* Message Preview */}
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
            <Label className="text-sm font-semibold">Preview das Mensagens</Label>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Mensagem do Bot ({botName || "Bot"}):</p>
                <div className="bg-background border border-border rounded p-3 whitespace-pre-wrap text-sm font-mono break-words">
                  {botMessagePreview}
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Mensagem do Consultor ({consultantName || "Consultor"}):
                </p>
                <div className="bg-background border border-border rounded p-3 whitespace-pre-wrap text-sm font-mono break-words">
                  {consultantMessagePreview}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State Message */}
      {!hasBotEnabled && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Ative o bot para configurar seus dados e prefixos de mensagem</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => {
            // Reset form to original values
            if (botConfig) {
              setHasBotEnabled(botConfig.has_bot_enabled ?? false);
              setBotName(botConfig.bot_name || "");
              setBotActivity(botConfig.bot_activity || "");
              setMessagePrefixTemplate(botConfig.message_prefix_template || "*{name}:*\n");
              setUsePrefixForBot(botConfig.use_prefix_for_bot ?? true);
              setUsePrefixForConsultant(botConfig.use_prefix_for_consultant ?? true);
              const existingConsultant = botConfig.consultant_name || "";
              if (existingConsultant) {
                setConsultantName(existingConsultant);
                setConsultantNameDirty(true);
              } else {
                const generated = generateConsultantNameFromBot(botConfig.bot_name || "");
                setConsultantName(generated);
                setConsultantNameDirty(Boolean(generated));
              }
            }
          }}
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
