import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { WhatsAppHeader } from "@/components/WhatsAppHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Check, CheckCheck, Filter, MoreHorizontal, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EvolutionInstance, EvolutionChat, EvolutionMessage } from "@/types/whatsapp";
import profileEmptyImage from "@assets/profile empty_1760640302262.png";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function WhatsApp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedChatJid, setSelectedChatJid] = useState<string | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [isInstanceDialogOpen, setIsInstanceDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const { toast } = useToast();

  // Fetch instances
  const { data: allInstances, isLoading: isLoadingInstances } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/whatsapp/instances"],
  });

  // Filter instances based on status
  const instances = showOnlyActive 
    ? allInstances?.filter(i => i.connectionStatus === "open") 
    : allInstances;

  // Fetch chats for selected instance
  const { data: chats, isLoading: isLoadingChats } = useQuery<EvolutionChat[]>({
    queryKey: ["/api/whatsapp/instances", selectedInstanceId, "chats"],
    enabled: !!selectedInstanceId,
  });

  // Fetch messages for selected chat
  const { data: messages, isLoading: isLoadingMessages } = useQuery<EvolutionMessage[]>({
    queryKey: ["/api/whatsapp/instances", selectedInstanceId, "chats", selectedChatJid, "messages"],
    enabled: !!selectedInstanceId && !!selectedChatJid,
  });

  // Filter chats based on search
  const filteredChats = chats?.filter(chat => 
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.pushName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.last_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.remoteJid?.includes(searchQuery)
  ) || [];

  // Get selected chat details
  const selectedChat = chats?.find(chat => chat.remoteJid === selectedChatJid);

  // Get selected instance details to extract phone number
  const selectedInstance = allInstances?.find(i => i.id === selectedInstanceId);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { instanceNumber: string; recipientNumber: string; text: string }) => {
      return await apiRequest("/api/whatsapp/send-message", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada",
        description: "Mensagem enviada com sucesso!",
      });
      setMessageText("");
      // Invalidate messages to reload
      queryClient.invalidateQueries({ 
        queryKey: ["/api/whatsapp/instances", selectedInstanceId, "chats", selectedChatJid, "messages"] 
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar a mensagem",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedInstanceId || !selectedChatJid || !selectedInstance?.number) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Instância sem número registrado. Não é possível enviar mensagem.",
      });
      return;
    }
    
    // Extract recipient phone number from remoteJid (remove @s.whatsapp.net or @g.us)
    const recipientNumber = selectedChatJid.split('@')[0];
    
    // Use instance number in Brazilian format (55XXYYYYYYYY)
    sendMessageMutation.mutate({
      instanceNumber: selectedInstance.number,
      recipientNumber: recipientNumber,
      text: messageText.trim(),
    });
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    try {
      return formatDistanceToNow(new Date(timestamp * 1000), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return "";
    }
  };

  const getMessageText = (msg: EvolutionMessage): string => {
    if (msg.message?.conversation) return msg.message.conversation;
    if (msg.message?.imageMessage) return msg.message.imageMessage.caption || "📷 Imagem";
    if (msg.message?.audioMessage) return "🎵 Áudio";
    if (msg.message?.documentMessage) return `📄 ${msg.message.documentMessage.fileName || "Documento"}`;
    return "(mensagem não suportada)";
  };

  const MessageStatus = ({ status, fromMe }: { status?: string; fromMe: boolean }) => {
    if (!fromMe) return null;
    
    if (status === "READ") {
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    }
    if (status === "DELIVERED") {
      return <CheckCheck className="h-4 w-4" />;
    }
    return <Check className="h-4 w-4" />;
  };

  return (
    <div className="h-screen flex flex-col overflow-x-hidden">
      {/* Header Superior */}
      <WhatsAppHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Pills de Instâncias */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Instâncias WhatsApp</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOnlyActive(!showOnlyActive)}
            data-testid="button-filter-instances"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showOnlyActive ? 'Mostrar Todas' : 'Apenas Ativas'}
          </Button>
        </div>
        
        {isLoadingInstances ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando instâncias...</span>
          </div>
        ) : instances && instances.length > 0 ? (
          <div className="flex gap-2 items-center">
            {/* Mostrar apenas as primeiras 6 instâncias */}
            {instances.slice(0, 6).map((instance) => {
              const isActive = instance.connectionStatus === "open";
              return (
                <button
                  key={instance.id}
                  onClick={() => {
                    setSelectedInstanceId(instance.id);
                    setSelectedChatJid(null);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 flex-shrink-0 ${
                    selectedInstanceId === instance.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover-elevate'
                  }`}
                  data-testid={`instance-pill-${instance.id}`}
                >
                  <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  {instance.number || instance.name || instance.id}
                </button>
              );
            })}
            
            {/* Botão "..." se houver mais de 6 instâncias */}
            {instances.length > 6 && (
              <Dialog open={isInstanceDialogOpen} onOpenChange={setIsInstanceDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="flex-shrink-0"
                    data-testid="button-more-instances"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Selecionar Instância</DialogTitle>
                  </DialogHeader>
                  <div className="overflow-y-auto max-h-[60vh] space-y-2">
                    {instances.map((instance) => {
                      const isActive = instance.connectionStatus === "open";
                      return (
                        <button
                          key={instance.id}
                          onClick={() => {
                            setSelectedInstanceId(instance.id);
                            setSelectedChatJid(null);
                            setIsInstanceDialogOpen(false);
                          }}
                          className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors hover-elevate ${
                            selectedInstanceId === instance.id ? 'bg-accent' : ''
                          }`}
                          data-testid={`instance-dialog-item-${instance.id}`}
                        >
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarImage src={instance.profilePicUrl || profileEmptyImage} />
                            <AvatarFallback>
                              {(instance.name || instance.number || '?')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                              <h3 className="font-medium">
                                {instance.name || instance.number || instance.id}
                              </h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {instance.number || instance.id}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {showOnlyActive ? 'Nenhuma instância ativa encontrada' : 'Nenhuma instância encontrada'}
          </p>
        )}
      </div>

      {/* Main Content - WhatsApp Layout */}
      <div className="flex-1 flex overflow-hidden">
        {selectedInstanceId ? (
          <>
            {/* Lista de Conversas (Esquerda) */}
            <div className="w-[400px] border-r flex flex-col bg-card">
              <div className="p-3 border-b">
                <h2 className="font-semibold text-lg">Conversas</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {isLoadingChats ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p>Nenhuma conversa encontrada</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredChats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedChatJid(chat.remoteJid)}
                        className={`w-full p-3 flex items-start gap-3 hover-elevate text-left ${
                          selectedChatJid === chat.remoteJid ? 'bg-accent/50' : ''
                        }`}
                        data-testid={`chat-item-${chat.remoteJid}`}
                      >
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={chat.profilePicUrl || profileEmptyImage} />
                          <AvatarFallback>
                            {(chat.name || chat.pushName || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-medium truncate">
                              {chat.name || chat.pushName || chat.remoteJid}
                            </h3>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTimestamp(chat.last_message_timestamp)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground truncate flex-1">
                              {chat.name || chat.pushName || 'Conversa'}
                            </p>
                            {chat.unreadMessages > 0 && (
                              <Badge 
                                variant="default" 
                                className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs"
                                data-testid={`badge-unread-${chat.remoteJid}`}
                              >
                                {chat.unreadMessages}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Área de Mensagens (Direita) */}
            <div className="flex-1 flex flex-col">
              {selectedChatJid ? (
                <>
                  {/* Header do Chat */}
                  <div className="h-16 border-b px-4 flex items-center gap-3 bg-card">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedChat?.profilePicUrl || profileEmptyImage} />
                      <AvatarFallback>
                        {(selectedChat?.name || selectedChat?.pushName || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium" data-testid="text-chat-name">
                        {selectedChat?.name || selectedChat?.pushName || selectedChat?.remoteJid}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedChat?.remoteJid}
                      </p>
                    </div>
                  </div>

                  {/* Mensagens */}
                  <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages && messages.length > 0 ? (
                      <div className="space-y-2">
                        {messages.map((message) => {
                          const fromMe = message.key.fromMe;
                          const text = getMessageText(message);
                          
                          return (
                            <div
                              key={message.id}
                              className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}
                              data-testid={`message-${message.id}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg px-3 py-2 ${
                                  fromMe
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-card border'
                                }`}
                              >
                                {!fromMe && message.pushName && (
                                  <p className="text-xs font-medium mb-1 text-primary">
                                    {message.pushName}
                                  </p>
                                )}
                                
                                {message.contextInfo?.quotedMessage && (
                                  <div className="mb-2 pl-2 border-l-4 border-primary/50 text-xs opacity-70">
                                    <p>Respondendo...</p>
                                  </div>
                                )}
                                
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {text}
                                </p>
                                
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <p className="text-xs opacity-70">
                                    {formatTimestamp(message.messageTimestamp)}
                                  </p>
                                  <MessageStatus status={message.status} fromMe={fromMe} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Sem mensagens nesta conversa</p>
                      </div>
                    )}
                  </div>

                  {/* Input de Mensagem */}
                  <div className="border-t px-4 py-3 flex items-center gap-2 bg-card">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Digite uma mensagem..."
                      disabled={sendMessageMutation.isPending}
                      className="flex-1"
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      size="icon"
                      data-testid="button-send-message"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="text-6xl">💬</div>
                    <h3 className="text-xl font-medium">Selecione uma conversa</h3>
                    <p className="text-muted-foreground">
                      Escolha uma conversa da lista para visualizar as mensagens
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-6xl">📱</div>
              <h3 className="text-xl font-medium">Monitor IA - WhatsApp</h3>
              <p className="text-muted-foreground">
                Selecione uma instância (número) acima para começar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
