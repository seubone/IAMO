import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Loader2, Check, Plus, HelpCircle, Key } from "lucide-react";
import type { EvolutionInstance } from "@/types/whatsapp";

export function InstanceSettingsPage() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Estados do formulário
  const [aiName, setAiName] = useState("");
  const [consultantName, setConsultantName] = useState("");
  const [description, setDescription] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [uazapiToken, setUazapiToken] = useState("");
  const [instanceInfo, setInstanceInfo] = useState<EvolutionInstance | null>(null);
  const [recordExists, setRecordExists] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Buscar dados da instância Evolution (foto, nome)
  const { data: evolutionInstance } = useQuery<EvolutionInstance>({
    queryKey: [`/api/whatsapp/instances/${instanceId}`],
    enabled: !!instanceId,
  });

  // Buscar dados da instância
  const { data: instanceData } = useQuery({
    queryKey: [`/api/ai-data/instance/${instanceId}`],
    enabled: !!instanceId,
  });

  // Armazenar dados da instância Evolution
  useEffect(() => {
    if (evolutionInstance) {
      setInstanceInfo(evolutionInstance);
    }
  }, [evolutionInstance]);

  // Carregar dados quando buscar
  useEffect(() => {
    if (instanceData) {
      setRecordExists(true);
      setAiName(instanceData.bot_name || "");
      setConsultantName(instanceData.consultant_name || "");
      setDescription(instanceData.bot_activity || "");
      setN8nWebhookUrl(instanceData.n8n_webhook_url || "");
      setUazapiToken(instanceData.api_token || "");
      setHasUnsavedChanges(false);
    } else {
      setRecordExists(false);
    }
  }, [instanceData]);

  // Rastrear mudanças no formulário
  useEffect(() => {
    if (!instanceData) return;

    const hasChanges =
      aiName !== (instanceData.bot_name || "") ||
      description !== (instanceData.bot_activity || "");

    setHasUnsavedChanges(hasChanges);
  }, [aiName, description, instanceData]);

  // Avisar ao tentar sair com mudanças não salvas
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Auto-gerar nome do consultor
  useEffect(() => {
    if (aiName) {
      const parts = aiName.split(" ");
      if (parts.length > 1) {
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
        n8n_webhook_url: n8nWebhookUrl || null,
        api_token: uazapiToken || null,
      };

      if (instanceData?.id) {
        // Atualizar
        return await apiRequest(`/api/ai-data/${instanceData.id}`, {
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
            instance_id: instanceId,
            instance_number: instanceInfo?.number || instanceId,
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
      queryClient.invalidateQueries({ queryKey: [`/api/ai-data/instance/${instanceId}`] });
      // Voltar para o chat após salvar
      setTimeout(() => {
        setLocation(`/chat`);
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar",
      });
    },
  });

  // Criar registro se não existir
  const createRecordMutation = useMutation({
    mutationFn: async () => {
      const instanceNumber = instanceInfo?.number || instanceId;
      return await apiRequest("/api/ai-data", {
        method: "POST",
        body: JSON.stringify({
          instance_id: instanceId,
          instance_number: instanceNumber,
          ai_name: "",
          consultant_name: "",
          description: "",
        }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Registro criado",
        description: "Registro da instância foi criado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/ai-data/instance/${instanceId}`] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar registro",
        description: error.message || "Não foi possível criar registro",
      });
    },
  });

  const handleCreateRecord = () => {
    createRecordMutation.mutate();
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!aiName.trim()) {
      errors.aiName = "Nome da IA é obrigatório";
    } else if (aiName.trim().length < 2) {
      errors.aiName = "Nome deve ter pelo menos 2 caracteres";
    } else if (aiName.trim().length > 100) {
      errors.aiName = "Nome não pode exceder 100 caracteres";
    }

    if (description.trim().length > 500) {
      errors.description = "Descrição não pode exceder 500 caracteres";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Formulário inválido",
        description: "Por favor, corrija os erros antes de salvar",
      });
      return;
    }

    saveMutation.mutate();
  };

  const getNameInitials = (value: string): string => {
    if (!value) return "?";

    const trimmed = value.trim();
    if (trimmed.length === 0) return "?";

    const digitsOnly = trimmed.replace(/\D/g, "");
    const hasLetters = /[A-Za-z]/.test(trimmed);
    if (digitsOnly && !hasLetters) {
      return digitsOnly.length >= 2 ? digitsOnly.slice(-2) : digitsOnly;
    }

    const tokens = trimmed
      .split(/\s+/)
      .map((token) => token.replace(/[^A-Za-z0-9]/g, ""))
      .filter(Boolean);

    if (tokens.length === 0) {
      const letters = trimmed.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      return letters.slice(0, 2) || "?";
    }

    const initials = tokens
      .slice(0, 2)
      .map((token) => token[0]?.toUpperCase() || "")
      .join("");

    if (initials.length > 0) return initials;

    const letters = trimmed.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    return letters.slice(0, 2) || "?";
  };

  return (
    <TooltipProvider>
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm("Você tem mudanças não salvas. Deseja realmente sair?")) {
                    setLocation("/chat");
                  }
                } else {
                  setLocation("/chat");
                }
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            {/* Avatar e Info da Instância */}
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={instanceInfo?.profilePicUrl || undefined}
                alt={instanceInfo?.name || instanceInfo?.number}
              />
              <AvatarFallback>
                {getNameInitials(instanceInfo?.name || instanceInfo?.number || "?")}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-2xl font-bold">Configurações da Instância</h1>
              <p className="text-sm text-muted-foreground">
                {instanceInfo?.name || instanceInfo?.number || instanceId}
              </p>
            </div>
          </div>

          {/* Botão Criar IA */}
          {!recordExists ? (
            <Button
              variant="secondary"
              onClick={handleCreateRecord}
              disabled={createRecordMutation.isPending}
              size="sm"
            >
              {createRecordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar IA
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              disabled={true}
              size="sm"
            >
              <Check className="h-4 w-4 mr-2 text-green-600" />
              IA Criada
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Abas */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 border-b-0">
              <TabsTrigger value="general">Ajustes da IA</TabsTrigger>
              <TabsTrigger value="integrations">Integrações</TabsTrigger>
              <TabsTrigger value="credentials">Credenciais Uazapi</TabsTrigger>
            </TabsList>

            {/* Aba: Ajustes da IA */}
            <TabsContent value="general" className="space-y-4">
              {!recordExists ? (
                // Estado vazio: Sem IA criada
                <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Nenhuma IA Criada</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Crie uma IA para esta instância para começar a usar as configurações
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateRecord}
                    disabled={createRecordMutation.isPending}
                    size="lg"
                  >
                    {createRecordMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar IA
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                // Estado com formulário: Bot já registrado
                <>
                  <div>
                    <h2 className="text-xl font-semibold">Informações Básicas</h2>
                    <p className="text-sm text-muted-foreground">Configure os dados principais da IA</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="ai-name">Nome da IA *</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Insira o nome completo da IA com maiúsculas (ex: Maria Luzia)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="ai-name"
                        value={aiName}
                        onChange={(e) => {
                          setAiName(e.target.value);
                          if (validationErrors.aiName) {
                            setValidationErrors({ ...validationErrors, aiName: "" });
                          }
                        }}
                        placeholder="Ex: Maria Luzia"
                        disabled={saveMutation.isPending}
                        className={`text-base border-0 bg-muted/50 dark:bg-muted/30 ${
                          validationErrors.aiName ? "border-red-500 border" : ""
                        }`}
                      />
                      {validationErrors.aiName ? (
                        <p className="text-xs text-red-600 dark:text-red-400">{validationErrors.aiName}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Formato: Nome Sobrenome (com iniciais maiúsculas)
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{aiName.length}/100</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="consultant-name">Nome do Consultor</Label>
                      <Input
                        id="consultant-name"
                        value={consultantName}
                        onChange={(e) => setConsultantName(e.target.value)}
                        placeholder="Gerado automaticamente"
                        disabled={true}
                        className="border-0 bg-muted/50 dark:bg-muted/30"
                      />
                      <p className="text-xs text-muted-foreground">
                        Gerado automaticamente: {aiName ? consultantName : "-"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          if (validationErrors.description) {
                            setValidationErrors({ ...validationErrors, description: "" });
                          }
                        }}
                        placeholder="Descreva a função desta IA..."
                        disabled={saveMutation.isPending}
                        className={`min-h-20 resize-none border-0 bg-muted/50 dark:bg-muted/30 ${
                          validationErrors.description ? "border-red-500 border" : ""
                        }`}
                      />
                      {validationErrors.description ? (
                        <p className="text-xs text-red-600 dark:text-red-400">{validationErrors.description}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Opcional</p>
                      )}
                      <p className="text-xs text-muted-foreground">{description.length}/500</p>
                    </div>

                    {/* Preview de Mensagem */}
                    {aiName && (
                      <div className="mt-6 pt-6 border-t">
                        <h3 className="text-sm font-semibold mb-3">Preview de Mensagem</h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                          <div className="text-xs text-muted-foreground">Como aparecerá no chat:</div>
                          <div className="bg-background rounded p-3 border border-muted">
                            <p className="text-sm">
                              <strong className="font-semibold">{aiName}:</strong>
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">Esta é uma mensagem de exemplo da IA</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Aba: Integrações */}
            <TabsContent value="integrations" className="space-y-4">
              {!recordExists ? (
                <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">IA Não Criada</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Crie uma IA na aba "Ajustes da IA" para configurar integrações
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-semibold">Integrações Externas</h2>
                    <p className="text-sm text-muted-foreground">Configure APIs e serviços externos</p>
                  </div>

                  <div className="space-y-4">
                    {/* N8N Workflow URL */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="n8n-workflow">N8N Workflow URL</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">URL do workflow N8N para integração automática</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="n8n-workflow"
                        type="url"
                        value={n8nWebhookUrl}
                        onChange={(e) => setN8nWebhookUrl(e.target.value)}
                        placeholder="https://n8n.exemplo.com/workflow/..."
                        disabled={saveMutation.isPending}
                        className="border-0 bg-muted/50 dark:bg-muted/30"
                      />
                      <p className="text-xs text-muted-foreground">Opcional - Pode ser adicionado/atualizado depois</p>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Aba: Credenciais (Token Uazapi) */}
            <TabsContent value="credentials" className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Credenciais e Tokens</h2>
                <p className="text-sm text-muted-foreground">Gerencie chaves de autenticação de APIs</p>
              </div>

              <div className="space-y-4">
                {/* Uazapi Token */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="uazapi-token">Token Uazapi</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Chave de autenticação para API Uazapi (mantida criptografada)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="uazapi-token"
                    type="password"
                    value={uazapiToken}
                    onChange={(e) => setUazapiToken(e.target.value)}
                    placeholder="Sua chave de autenticação Uazapi"
                    disabled={saveMutation.isPending}
                    className="border-0 bg-muted/50 dark:bg-muted/30"
                  />
                  <p className="text-xs text-muted-foreground">Opcional - Mantido de forma segura no banco de dados</p>
                </div>

                {/* Avisos de Segurança */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    🔒 Informações de Segurança
                  </h3>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 space-y-2 text-xs">
                    <p>• Seus tokens e chaves são criptografados no banco de dados</p>
                    <p>• Nunca compartilhe suas credenciais com outras pessoas</p>
                    <p>• Se suspeitar de comprometimento, regenere o token imediatamente</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-between gap-4 mt-12 border-t pt-8 px-4 max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => {
              if (hasUnsavedChanges) {
                if (confirm("Você tem mudanças não salvas. Deseja realmente sair?")) {
                  setLocation("/chat");
                }
              } else {
                setLocation("/chat");
              }
            }}
            disabled={saveMutation.isPending}
          >
            Cancelar
          </Button>

          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !recordExists}
            size="lg"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : !recordExists ? (
              "Verificar Registro Primeiro"
            ) : (
              "Salvar Configurações"
            )}
          </Button>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
