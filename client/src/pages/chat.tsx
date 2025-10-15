import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Paperclip,
  Search,
  MessageSquare,
  Phone,
  Mail,
  MessageCircle,
  Play,
  Pause,
  Ban,
  Clock,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { conversationAPI, messageAPI, iaAPI } from "@/lib/api";
import type { Conversation, Message, IA } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const newConversationSchema = z.object({
  leadName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  channel: z.enum(["whatsapp", "email", "phone"], {
    required_error: "Selecione um canal",
  }),
  iaId: z.string().min(1, "Selecione uma IA"),
  attendanceId: z.string().optional(),
});

type NewConversationForm = z.infer<typeof newConversationSchema>;

export default function Chat() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<NewConversationForm>({
    resolver: zodResolver(newConversationSchema),
    defaultValues: {
      leadName: "",
      channel: undefined,
      iaId: "",
      attendanceId: "",
    },
  });

  const updateIAStatusMutation = useMutation({
    mutationFn: (enabled: number) =>
      conversationAPI.update(selectedConversation!.id, { iaEnabled: enabled }),
    onSuccess: (data) => {
      setSelectedConversation(data);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Estado da IA atualizado",
        description: "O estado foi alterado com sucesso",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o estado da IA",
      });
    },
  });

  // Fetch all IAs
  const { data: ias = [] } = useQuery<IA[]>({
    queryKey: ["/api/ias"],
  });

  // Fetch all conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages/conversation", selectedConversation?.id],
    queryFn: selectedConversation
      ? () => messageAPI.getByConversation(selectedConversation.id)
      : undefined,
    enabled: !!selectedConversation,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      messageAPI.create({
        conversationId: selectedConversation!.id,
        sender: "operator",
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/messages/conversation", selectedConversation?.id] 
      });
      setMessage("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
      });
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: (data: NewConversationForm) => {
      const attendanceId = data.attendanceId || `ATD-${Date.now()}`;
      return conversationAPI.create({
        iaId: data.iaId,
        leadName: data.leadName,
        channel: data.channel,
        attendanceId,
        iaEnabled: 1,
      });
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(newConversation);
      setIsNewConversationOpen(false);
      form.reset();
      toast({
        title: "Atendimento criado",
        description: `Novo atendimento para ${newConversation.leadName} foi criado`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o atendimento",
      });
    },
  });

  const handleSend = () => {
    if (!message.trim() || !selectedConversation) return;
    sendMessageMutation.mutate(message);
  };

  const onCreateConversation = (data: NewConversationForm) => {
    createConversationMutation.mutate(data);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.attendanceId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getChannelIcon = (channel?: string | null) => {
    switch (channel) {
      case "whatsapp":
        return <MessageCircle className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getIAStatusConfig = (enabled: number) => {
    if (enabled === 1) {
      return {
        label: "Ativa",
        icon: <Play className="h-3 w-3" />,
        variant: "default" as const,
      };
    }
    return {
      label: "Inativa",
      icon: <Ban className="h-3 w-3" />,
      variant: "destructive" as const,
    };
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar de Conversas */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold font-heading">Conversas</h2>
            <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-new-conversation">
                  <Plus className="h-4 w-4 mr-1" />
                  Novo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Atendimento</DialogTitle>
                  <DialogDescription>
                    Crie um novo atendimento para gerenciar a conversa com um lead
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onCreateConversation)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="leadName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Lead</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: João Silva" {...field} data-testid="input-lead-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="channel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Canal</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-channel">
                                <SelectValue placeholder="Selecione o canal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Telefone</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="iaId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IA Responsável</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-ia">
                                <SelectValue placeholder="Selecione a IA" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ias.filter(ia => ia.status === 'active').map((ia) => (
                                <SelectItem key={ia.id} value={ia.id}>
                                  {ia.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="attendanceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID de Atendimento (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: ATD-12345" {...field} data-testid="input-attendance-id" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsNewConversationOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createConversationMutation.isPending}
                        data-testid="button-create-conversation"
                      >
                        {createConversationMutation.isPending ? "Criando..." : "Criar Atendimento"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-conversations"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingConversations ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Carregando conversas...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ativa"}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <Card
                  key={conv.id}
                  className={cn(
                    "p-3 cursor-pointer hover-elevate transition-colors",
                    selectedConversation?.id === conv.id && "bg-accent"
                  )}
                  onClick={() => setSelectedConversation(conv)}
                  data-testid={`conversation-${conv.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getChannelIcon(conv.channel)}
                        <span className="font-medium text-sm truncate">
                          {conv.leadName || "Sem nome"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.attendanceId}
                      </p>
                    </div>
                    <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header do Contato */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {getChannelIcon(selectedConversation.channel)}
                </div>
                <div>
                  <h2 className="font-semibold font-heading">
                    {selectedConversation.leadName || "Sem nome"}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="capitalize">{selectedConversation.channel || "Chat"}</span>
                    <span>•</span>
                    <span>{selectedConversation.attendanceId}</span>
                  </div>
                </div>
              </div>

              {/* Controle do Estado da IA */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={getIAStatusConfig(selectedConversation.iaEnabled).variant}
                    size="sm"
                    data-testid="button-ia-status"
                    className="gap-2"
                  >
                    {getIAStatusConfig(selectedConversation.iaEnabled).icon}
                    IA {getIAStatusConfig(selectedConversation.iaEnabled).label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Estado da IA</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    data-testid="menu-ia-activate"
                    onClick={() => updateIAStatusMutation.mutate(1)}
                    disabled={updateIAStatusMutation.isPending}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Ativar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-testid="menu-ia-pause"
                    onClick={() => updateIAStatusMutation.mutate(0)}
                    disabled={updateIAStatusMutation.isPending}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-testid="menu-ia-deactivate"
                    onClick={() => updateIAStatusMutation.mutate(0)}
                    disabled={updateIAStatusMutation.isPending}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Desativar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mensagens */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Carregando mensagens...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma mensagem ainda. Inicie a conversa!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender === "user" ? "justify-start" : "justify-end"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg p-3",
                          msg.sender === "user"
                            ? "bg-muted"
                            : "bg-primary text-primary-foreground"
                        )}
                        data-testid={`message-${msg.id}`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs opacity-70">
                            {format(new Date(msg.createdAt), "HH:mm")}
                          </span>
                          {msg.tags && msg.tags.length > 0 && (
                            <>
                              <Separator orientation="vertical" className="h-3" />
                              {msg.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Input de Mensagem */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  data-testid="button-attach-file"
                  className="flex-shrink-0"
                  disabled={sendMessageMutation.isPending}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  data-testid="input-message"
                  className="flex-1"
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  data-testid="button-send"
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Pressione Enter para enviar, Shift+Enter para quebrar linha
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold font-heading mb-2">
                Selecione uma conversa
              </h2>
              <p className="text-muted-foreground">
                Escolha uma conversa na barra lateral para começar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
