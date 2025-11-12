import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bot, Trash2, Database } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const iaFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  status: z.enum(["active", "paused", "inactive"]),
  tags: z.string().optional(),
});

const evolutionDbSchema = z.object({
  host: z.string().min(1, "Host é obrigatório"),
  port: z.string().regex(/^\d+$/, "Porta deve ser um número válido"),
  name: z.string().min(1, "Nome do banco é obrigatório"),
  user: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type IAFormData = z.infer<typeof iaFormSchema>;
type EvolutionDbFormData = z.infer<typeof evolutionDbSchema>;

export default function Settings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [evolutionDbDialogOpen, setEvolutionDbDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: ias = [], isLoading: isLoadingIAs } = useQuery({
    queryKey: ["/api/ias"],
  });

  const { data: evolutionDbConfig, isLoading: isLoadingEvolutionDb } = useQuery({
    queryKey: ["/api/config/evolution-db"],
  });

  const form = useForm<IAFormData>({
    resolver: zodResolver(iaFormSchema),
    defaultValues: {
      name: "",
      status: "active",
      tags: "",
    },
  });

  const evolutionDbForm = useForm<EvolutionDbFormData>({
    resolver: zodResolver(evolutionDbSchema),
    defaultValues: {
      host: "",
      port: "5432",
      name: "",
      user: "postgres",
      password: "",
    },
    values: evolutionDbConfig ? {
      host: evolutionDbConfig.host || "",
      port: String(evolutionDbConfig.port || "5432"),
      name: evolutionDbConfig.name || "",
      user: evolutionDbConfig.user || "postgres",
      password: evolutionDbConfig.password || "",
    } : undefined,
  });

  const createIAMutation = useMutation({
    mutationFn: async (data: IAFormData) => {
      const tags = data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      return apiRequest("/api/ias", {
        method: "POST",
        body: JSON.stringify({ ...data, tags }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ias"] });
      toast({
        title: "IA criada",
        description: "A IA foi criada com sucesso",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar IA",
        description: error.message || "Não foi possível criar a IA",
        variant: "destructive",
      });
    },
  });

  const deleteIAMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/ias/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ias"] });
      toast({
        title: "IA removida",
        description: "A IA foi removida com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover IA",
        description: error.message || "Não foi possível remover a IA",
        variant: "destructive",
      });
    },
  });

  const updateEvolutionDbMutation = useMutation({
    mutationFn: async (data: EvolutionDbFormData) => {
      return apiRequest("/api/config/evolution-db", {
        method: "POST",
        body: JSON.stringify({
          host: data.host,
          port: parseInt(data.port),
          name: data.name,
          user: data.user,
          password: data.password,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/evolution-db"] });
      toast({
        title: "Configurações atualizadas",
        description: "As configurações do banco Evolution foram atualizadas com sucesso",
      });
      setEvolutionDbDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar configurações",
        description: error.message || "Não foi possível atualizar as configurações do Evolution",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IAFormData) => {
    createIAMutation.mutate(data);
  };

  const onEvolutionDbSubmit = (data: EvolutionDbFormData) => {
    updateEvolutionDbMutation.mutate(data);
  };
  return (
    <div className="flex flex-col h-screen overflow-y-auto">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold font-heading">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências do sistema</p>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gerenciar IAs</CardTitle>
                <CardDescription>
                  Adicione e gerencie as inteligências artificiais do sistema
                </CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-ia">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar IA
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-add-ia">
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova IA</DialogTitle>
                    <DialogDescription>
                      Preencha as informações da nova inteligência artificial
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da IA</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: IA Vendas WhatsApp"
                                {...field}
                                data-testid="input-ia-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status Inicial</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-ia-status">
                                  <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Ativo</SelectItem>
                                <SelectItem value="paused">Pausado</SelectItem>
                                <SelectItem value="inactive">Inativo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags (separadas por vírgula)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: vendas, whatsapp, comercial"
                                {...field}
                                data-testid="input-ia-tags"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setDialogOpen(false)}
                          data-testid="button-cancel-ia"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createIAMutation.isPending}
                          data-testid="button-confirm-add-ia"
                        >
                          {createIAMutation.isPending ? "Criando..." : "Criar IA"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingIAs ? (
              <p className="text-sm text-muted-foreground">Carregando IAs...</p>
            ) : ias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma IA cadastrada ainda</p>
            ) : (
              <div className="space-y-2">
                {ias.map((ia: any) => (
                  <div
                    key={ia.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                    data-testid={`ia-item-${ia.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Bot className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium" data-testid={`ia-name-${ia.id}`}>
                          {ia.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              ia.status === "active"
                                ? "default"
                                : ia.status === "paused"
                                ? "secondary"
                                : "outline"
                            }
                            data-testid={`ia-status-${ia.id}`}
                          >
                            {ia.status === "active" ? "Ativo" : ia.status === "paused" ? "Pausado" : "Inativo"}
                          </Badge>
                          {ia.tags?.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteIAMutation.mutate(ia.id)}
                      disabled={deleteIAMutation.isPending}
                      data-testid={`button-delete-ia-${ia.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>
              Personalize a aparência do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tema</Label>
                <p className="text-sm text-muted-foreground">
                  Altere entre tema claro e escuro
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>
              Configure como você deseja ser notificado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas importantes por email
                </p>
              </div>
              <Switch id="email-notifications" data-testid="switch-email-notifications" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="slack-notifications">Notificações no Slack</Label>
                <p className="text-sm text-muted-foreground">
                  Integre com seu workspace do Slack
                </p>
              </div>
              <Switch id="slack-notifications" data-testid="switch-slack-notifications" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Densidade da Interface</CardTitle>
            <CardDescription>
              Ajuste o espaçamento dos elementos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" data-testid="button-density-compact">
                Compacto
              </Button>
              <Button variant="default" size="sm" data-testid="button-density-comfortable">
                Confortável
              </Button>
              <Button variant="outline" size="sm" data-testid="button-density-spacious">
                Espaçoso
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integração N8N</CardTitle>
            <CardDescription>
              Configure a integração com workflows N8N
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Webhook URL</Label>
                <p className="text-sm text-muted-foreground font-mono">
                  /webhooks/n8n/log
                </p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-copy-webhook">
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Banco de Dados Evolution
                </CardTitle>
                <CardDescription>
                  Configure as credenciais do banco de dados Evolution (WhatsApp)
                </CardDescription>
              </div>
              <Dialog open={evolutionDbDialogOpen} onOpenChange={setEvolutionDbDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-edit-evolution-db">
                    Editar Configurações
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-edit-evolution-db">
                  <DialogHeader>
                    <DialogTitle>Configurar Banco de Dados Evolution</DialogTitle>
                    <DialogDescription>
                      Atualize as credenciais de conexão ao banco de dados Evolution
                    </DialogDescription>
                  </DialogHeader>
                  {isLoadingEvolutionDb ? (
                    <p className="text-sm text-muted-foreground py-4">Carregando configurações...</p>
                  ) : (
                    <Form {...evolutionDbForm}>
                      <form onSubmit={evolutionDbForm.handleSubmit(onEvolutionDbSubmit)} className="space-y-4">
                        <FormField
                          control={evolutionDbForm.control}
                          name="host"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Host</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex: localhost ou 31.97.255.54"
                                  {...field}
                                  data-testid="input-evolution-host"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={evolutionDbForm.control}
                          name="port"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Porta</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="5432"
                                  type="number"
                                  {...field}
                                  data-testid="input-evolution-port"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={evolutionDbForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Banco de Dados</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="evolution"
                                  {...field}
                                  data-testid="input-evolution-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={evolutionDbForm.control}
                          name="user"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Usuário</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="postgres"
                                  {...field}
                                  data-testid="input-evolution-user"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={evolutionDbForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Insira a senha do banco de dados"
                                  type="password"
                                  {...field}
                                  data-testid="input-evolution-password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEvolutionDbDialogOpen(false)}
                            data-testid="button-cancel-evolution-db"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            disabled={updateEvolutionDbMutation.isPending}
                            data-testid="button-save-evolution-db"
                          >
                            {updateEvolutionDbMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingEvolutionDb ? (
              <p className="text-sm text-muted-foreground">Carregando configurações...</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Host</Label>
                  <p className="font-mono text-sm">{evolutionDbConfig?.host || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Porta</Label>
                  <p className="font-mono text-sm">{evolutionDbConfig?.port || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Banco de Dados</Label>
                  <p className="font-mono text-sm">{evolutionDbConfig?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Usuário</Label>
                  <p className="font-mono text-sm">{evolutionDbConfig?.user || "-"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
