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
import { Plus, Bot, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const iaFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  status: z.enum(["active", "paused", "inactive"]),
  tags: z.string().optional(),
});

type IAFormData = z.infer<typeof iaFormSchema>;

export default function Settings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: ias = [], isLoading: isLoadingIAs } = useQuery({
    queryKey: ["/api/ias"],
  });

  const form = useForm<IAFormData>({
    resolver: zodResolver(iaFormSchema),
    defaultValues: {
      name: "",
      status: "active",
      tags: "",
    },
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

  const onSubmit = (data: IAFormData) => {
    createIAMutation.mutate(data);
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
      </div>
    </div>
  );
}
