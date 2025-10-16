import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WhatsAppHeader } from "@/components/WhatsAppHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { WhatsAppChat, WhatsAppMessage } from "@/types/whatsapp";

export default function WhatsApp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Fetch chats
  const { data: chats, isLoading: isLoadingChats } = useQuery<WhatsAppChat[]>({
    queryKey: ["/api/whatsapp/chats"],
  });

  // Fetch messages for selected chat
  const { data: messages, isLoading: isLoadingMessages } = useQuery<WhatsAppMessage[]>({
    queryKey: ["/api/whatsapp/chats", selectedChatId, "messages"],
    enabled: !!selectedChatId,
  });

  // Filter chats based on search
  const filteredChats = chats?.filter(chat => 
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.push_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Get selected chat details
  const selectedChat = chats?.find(chat => chat.remote_jid === selectedChatId);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header Superior */}
      <WhatsAppHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Main Content - WhatsApp Layout */}
      <div className="flex-1 flex overflow-hidden">
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
                    key={chat.remote_jid}
                    onClick={() => setSelectedChatId(chat.remote_jid)}
                    className={`w-full p-3 flex items-start gap-3 hover-elevate text-left ${
                      selectedChatId === chat.remote_jid ? 'bg-accent/50' : ''
                    }`}
                    data-testid={`chat-item-${chat.remote_jid}`}
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={chat.profile_pic_url} />
                      <AvatarFallback>
                        {(chat.name || chat.push_name || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium truncate">
                          {chat.name || chat.push_name || chat.remote_jid}
                        </h3>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTimestamp(chat.last_message_timestamp)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {chat.last_message || 'Sem mensagens'}
                        </p>
                        {chat.unread_count > 0 && (
                          <Badge 
                            variant="default" 
                            className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs"
                            data-testid={`badge-unread-${chat.remote_jid}`}
                          >
                            {chat.unread_count}
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
          {selectedChatId ? (
            <>
              {/* Header do Chat */}
              <div className="h-16 border-b px-4 flex items-center gap-3 bg-card">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedChat?.profile_pic_url} />
                  <AvatarFallback>
                    {(selectedChat?.name || selectedChat?.push_name || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium" data-testid="text-chat-name">
                    {selectedChat?.name || selectedChat?.push_name || selectedChat?.remote_jid}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat?.remote_jid}
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
                    {messages.map((message) => (
                      <div
                        key={message.key_id}
                        className={`flex ${message.key_from_me ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${message.key_id}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 ${
                            message.key_from_me
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card border'
                          }`}
                        >
                          {!message.key_from_me && message.push_name && (
                            <p className="text-xs font-medium mb-1 text-primary">
                              {message.push_name}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.message_text || message.message_caption || '(mídia)'}
                          </p>
                          <p className="text-xs opacity-70 mt-1 text-right">
                            {formatTimestamp(message.message_timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
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
                <h3 className="text-xl font-medium">Monitor IA - WhatsApp</h3>
                <p className="text-muted-foreground">
                  Selecione uma conversa para visualizar as mensagens
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
