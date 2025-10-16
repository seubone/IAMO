import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WhatsAppHeader } from "@/components/WhatsAppHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EvolutionInstance, EvolutionChat, EvolutionMessage } from "@/types/whatsapp";

export default function WhatsApp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedChatJid, setSelectedChatJid] = useState<string | null>(null);

  // Fetch instances
  const { data: instances, isLoading: isLoadingInstances } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/whatsapp/instances"],
  });

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
    <div className="h-screen flex flex-col">
      {/* Header Superior */}
      <WhatsAppHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Pills de Instâncias */}
      <div className="border-b bg-card px-4 py-3">
        {isLoadingInstances ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando instâncias...</span>
          </div>
        ) : instances && instances.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto">
            {instances.map((instance) => (
              <button
                key={instance.id}
                onClick={() => {
                  setSelectedInstanceId(instance.id);
                  setSelectedChatJid(null);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedInstanceId === instance.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover-elevate'
                }`}
                data-testid={`instance-pill-${instance.id}`}
              >
                {instance.number || instance.name || instance.id}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma instância encontrada</p>
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
                          <AvatarImage src={chat.profilePicUrl} />
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
                              {chat.last_message || 'Sem mensagens'}
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
                      <AvatarImage src={selectedChat?.profilePicUrl} />
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
                  <div className="h-16 border-t px-4 flex items-center gap-2 bg-card">
                    <p className="text-sm text-muted-foreground">Modo somente leitura - Evolution Database</p>
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
