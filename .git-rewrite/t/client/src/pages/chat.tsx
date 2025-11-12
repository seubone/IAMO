import { useState, useRef } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
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
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  X,
  Loader2,
  Smartphone,
  Pin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { conversationAPI, messageAPI, iaAPI, whatsappAPI } from "@/lib/api";
import type { Conversation, Message, IA } from "@shared/schema";
import type { EvolutionInstance } from "@/types/whatsapp";
import { useToast } from "@/hooks/use-toast";
import { InstanceSelectorModal } from "@/components/InstanceSelectorModal";
import { useSelectedInstance } from "@/hooks/use-selected-instance";
import { usePinnedChats } from "@/hooks/use-pinned-chats";
import { AudioRecorderDialog } from "@/components/AudioRecorderDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

const newConversationSchema = z.object({
  leadName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  channel: z.enum(["whatsapp", "email", "phone"], {
    required_error: "Selecione um canal",
  }),
  iaId: z.string().min(1, "Selecione uma IA"),
  attendanceId: z.string().optional(),
});

type NewConversationForm = z.infer<typeof newConversationSchema>;

// Helper function to format conversation timestamp (like WhatsApp)
const formatConversationTime = (createdAt: string): string => {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins} min`;
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "ontem";
  if (diffMs < 7 * 24 * 60 * 60 * 1000) return format(date, "EEEE", { locale: ptBR });
  return format(date, "dd/MM/yyyy");
};

export default function Chat() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [isMediaPopoverOpen, setIsMediaPopoverOpen] = useState(false);
  const [isInstanceSelectorOpen, setIsInstanceSelectorOpen] = useState(false);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedInstance, setSelectedInstance } = useSelectedInstance();
  const { togglePin, isPinned, getPinnedChats } = usePinnedChats();

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

  const sendMediaMutation = useMutation({
    mutationFn: async ({ file, caption, type }: { file: string; caption?: string; type: string }) => {
      // Obter metadados da conversa
      const metadata = selectedConversation?.metadata as { 
        phoneNumber?: string;
        instanceNumber?: string;
      } | undefined;
      
      const instanceNumber = metadata?.instanceNumber;
      const recipientNumber = metadata?.phoneNumber;
      
      // Validar se temos os números necessários
      if (!instanceNumber || !recipientNumber) {
        throw new Error(
          "Configuração incompleta: É necessário configurar o número da instância e do destinatário nos metadados da conversa para enviar mídias."
        );
      }
      
      // Enviar mídia via UazAPI
      const uazapiResponse = await whatsappAPI.sendMedia({
        instanceNumber,
        recipientNumber,
        type,
        file,
        text: caption,
        docName: selectedMediaFile?.name,
      });

      // Criar mensagem local no banco de dados com os dados da API
      const mediaMessage = await messageAPI.create({
        conversationId: selectedConversation!.id,
        sender: "operator",
        content: caption || `[${type}]`,
        attachments: { 
          type, 
          file, 
          caption,
          docName: selectedMediaFile?.name,
          uazapiMessageId: uazapiResponse?.data?.id 
        },
      });
      
      return mediaMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/messages/conversation", selectedConversation?.id] 
      });
      setIsMediaDialogOpen(false);
      setSelectedMediaFile(null);
      setMediaPreview(null);
      setMediaCaption("");
      setMediaType("");
      toast({
        title: "Mídia enviada",
        description: "A mídia foi enviada com sucesso",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao enviar mídia:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Não foi possível enviar a mídia",
      });
    },
  });

  const handleSend = () => {
    if (!message.trim() || !selectedConversation) return;
    sendMessageMutation.mutate(message);
  };

  const handleSendAudio = (blob: Blob, waveformData: number[], duration: number) => {
    if (!selectedConversation) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;

      sendMediaMutation.mutate({
        file: base64,
        caption: "🎤 Áudio",
        type: "audio",
      });

      setIsRecorderOpen(false);
      toast({
        title: "Áudio enviado",
        description: "Seu áudio foi enviado com sucesso",
      });
    };

    reader.readAsDataURL(blob);
  };

  const onCreateConversation = (data: NewConversationForm) => {
    createConversationMutation.mutate(data);
  };

  const handleFileSelect = (type: string) => {
    setMediaType(type);
    setIsMediaPopoverOpen(false);
    
    if (fileInputRef.current) {
      const input = fileInputRef.current;
      
      switch (type) {
        case "image":
          input.accept = "image/*";
          break;
        case "video":
          input.accept = "video/mp4,video/*";
          break;
        case "document":
          input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.txt";
          break;
        case "audio":
          input.accept = "audio/mp3,audio/ogg,audio/*";
          break;
        default:
          input.accept = "*";
      }
      
      input.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedMediaFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setMediaPreview(result);
      setIsMediaDialogOpen(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMedia = () => {
    if (!selectedMediaFile || !mediaPreview) return;
    
    sendMediaMutation.mutate({
      file: mediaPreview,
      caption: mediaCaption,
      type: mediaType,
    });
  };

  const handleCancelMedia = () => {
    setIsMediaDialogOpen(false);
    setSelectedMediaFile(null);
    setMediaPreview(null);
    setMediaCaption("");
    setMediaType("");
  };

  const filteredConversations = conversations
    .filter((conv) =>
      conv.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.attendanceId.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Pinned conversations first
      const aPinned = isPinned(a.id);
      const bPinned = isPinned(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

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
                <div
                  key={conv.id}
                  className={cn(
                    "p-3 cursor-pointer transition-colors hover:bg-muted/50 group relative",
                    selectedConversation?.id === conv.id && "bg-accent"
                  )}
                  onClick={() => setSelectedConversation(conv)}
                  data-testid={`conversation-${conv.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getChannelIcon(conv.channel)}
                        {isPinned(conv.id) && (
                          <Pin className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        )}
                        <span className="font-medium truncate text-sm">
                          {conv.leadName || "Sem nome"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.attendanceId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground">
                        {formatConversationTime(conv.createdAt)}
                      </span>
                      {/* Espaço reservado para o pin - garante que timestamp não se mova no hover */}
                      <div className="w-4 h-4 flex-shrink-0" />
                    </div>
                  </div>

                  {/* Pin toggle button - absolute positioning, com espaço reservado acima */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(conv.id);
                    }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                    data-testid={`button-pin-${conv.id}`}
                  >
                    <Pin
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isPinned(conv.id) ? "text-blue-500 fill-blue-500" : "text-muted-foreground"
                      )}
                    />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Botão Selecionar Instância - Superior */}
            <div className="p-3 border-b bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInstanceSelectorOpen(true)}
                className="gap-2"
              >
                <Smartphone className="h-4 w-4" />
                {selectedInstance
                  ? `Instância: ${selectedInstance.name || selectedInstance.number}`
                  : "Selecionar Instância"}
              </Button>
            </div>

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
            <ScrollArea className="flex-1 p-4 overflow-x-hidden">
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
                  {messages.map((msg) => {
                    const attachment = msg.attachments as any;
                    const hasMedia = attachment && attachment.type && attachment.file;
                    
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.sender === "user" ? "justify-start" : "justify-end"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg overflow-hidden break-words",
                            msg.sender === "user"
                              ? "bg-muted"
                              : "bg-primary text-primary-foreground"
                          )}
                          data-testid={`message-${msg.id}`}
                        >
                          {hasMedia && (
                            <div className="mb-2">
                              {attachment.type === "image" && (
                                <img
                                  src={attachment.file}
                                  alt="Imagem"
                                  className="w-full max-w-full rounded object-contain"
                                  data-testid={`img-attachment-${msg.id}`}
                                />
                              )}
                              {attachment.type === "video" && (
                                <video
                                  src={attachment.file}
                                  controls
                                  className="w-full max-w-full rounded"
                                  data-testid={`video-attachment-${msg.id}`}
                                />
                              )}
                              {attachment.type === "document" && (
                                <div className="p-3 flex items-center gap-3 bg-background/10 rounded">
                                  <FileText className="h-8 w-8" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {attachment.docName || "Documento"}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {attachment.type === "audio" && (
                                <div className="p-2">
                                  <audio 
                                    src={attachment.file} 
                                    controls 
                                    className="w-full"
                                    data-testid={`audio-attachment-${msg.id}`}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {msg.content && !msg.content.startsWith("[") && (
                            <div className="p-3">
                              <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.content}</p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 px-3 pb-2">
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
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Input de Mensagem */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-file-hidden"
                />
                
                <Button
                  variant="outline"
                  size="icon"
                  data-testid="button-record-audio"
                  className="flex-shrink-0"
                  onClick={() => setIsRecorderOpen(true)}
                  disabled={sendMessageMutation.isPending || !selectedConversation}
                  title="Gravar áudio"
                >
                  <Mic className="h-4 w-4" />
                </Button>

                <Popover open={isMediaPopoverOpen} onOpenChange={setIsMediaPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      data-testid="button-attach-file"
                      className="flex-shrink-0"
                      disabled={sendMessageMutation.isPending}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" side="top" align="start">
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => handleFileSelect("document")}
                        data-testid="button-select-document"
                      >
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span>Documento</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => handleFileSelect("image")}
                        data-testid="button-select-image"
                      >
                        <ImageIcon className="h-5 w-5 text-purple-500" />
                        <span>Fotos e vídeos</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => handleFileSelect("audio")}
                        data-testid="button-select-audio"
                      >
                        <FileText className="h-5 w-5 text-orange-500" />
                        <span>Arquivo de áudio</span>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                
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

      {/* Media Preview Dialog */}
      <Dialog open={isMediaDialogOpen} onOpenChange={setIsMediaDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-media-preview">
          <DialogHeader>
            <DialogTitle>Enviar Mídia</DialogTitle>
            <DialogDescription>
              Adicione uma legenda opcional e envie o arquivo
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Preview Area */}
            <div className="bg-muted rounded-lg p-4 flex items-center justify-center min-h-[200px] max-h-[400px] overflow-hidden">
              {mediaPreview && (
                <>
                  {mediaType === "image" && (
                    <img 
                      src={mediaPreview} 
                      alt="Preview" 
                      className="max-w-full max-h-[350px] object-contain rounded"
                      data-testid="img-media-preview"
                    />
                  )}
                  {mediaType === "video" && (
                    <video 
                      src={mediaPreview} 
                      controls 
                      className="max-w-full max-h-[350px] rounded"
                      data-testid="video-media-preview"
                    />
                  )}
                  {mediaType === "document" && (
                    <div className="text-center">
                      <FileText className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm font-medium" data-testid="text-document-name">
                        {selectedMediaFile?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedMediaFile?.size || 0 / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}
                  {mediaType === "audio" && (
                    <div className="text-center w-full">
                      <Mic className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm font-medium mb-4" data-testid="text-audio-name">
                        {selectedMediaFile?.name}
                      </p>
                      <audio 
                        src={mediaPreview} 
                        controls 
                        className="w-full"
                        data-testid="audio-media-preview"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Caption Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Legenda (opcional)</label>
              <Textarea
                placeholder="Adicione uma legenda..."
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="textarea-media-caption"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelMedia}
                disabled={sendMediaMutation.isPending}
                data-testid="button-cancel-media"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendMedia}
                disabled={sendMediaMutation.isPending}
                data-testid="button-send-media"
              >
                {sendMediaMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instance Selector Modal */}
      <InstanceSelectorModal
        open={isInstanceSelectorOpen}
        onOpenChange={setIsInstanceSelectorOpen}
        onSelectInstance={(instance) => setSelectedInstance(instance)}
        selectedInstanceId={selectedInstance?.id}
      />

      {/* Audio Recorder Dialog */}
      <AudioRecorderDialog
        open={isRecorderOpen}
        onOpenChange={setIsRecorderOpen}
        onSendAudio={handleSendAudio}
      />
    </div>
  );
}
