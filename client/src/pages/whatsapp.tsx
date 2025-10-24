import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { WhatsAppHeader } from "@/components/WhatsAppHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Check, CheckCheck, Filter, MoreHorizontal, Send, Settings, Star, Pin, Search, X, Tag, Plus, SmilePlus, Mic, Image as ImageIcon, FileText, Video, Smile } from "lucide-react";
import { InstanceSettingsDialog } from "@/components/InstanceSettingsDialog";
import { ChatListSkeleton, MessageListSkeleton } from "@/components/WhatsAppSkeletons";
import { formatDistanceToNow, format, isToday, isYesterday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EvolutionInstance, EvolutionChat, EvolutionMessage } from "@/types/whatsapp";
import profileEmptyImage from "@assets/profile empty_1760640302262.png";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { MessageStatus } from "@/components/MessageStatus";
import { MessageActions } from "@/components/MessageActions";
import { useInstancePreferences } from "@/hooks/use-instance-preferences";
import { usePinnedChats } from "@/hooks/use-pinned-chats";
import { useClearCache } from "@/hooks/use-clear-cache";
import { ContactMetadataDialog } from "@/components/ContactMetadataDialog";
import { StickerMessage } from "@/components/StickerMessage";
import { ImageMessage } from "@/components/ImageMessage";
import { VideoMessage } from "@/components/VideoMessage";
import { AudioMessage } from "@/components/AudioMessage";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { useDebounce } from "@/lib/utils";
import { InstanceSelectorModal } from "@/components/InstanceSelectorModal";
import { useSelectedInstance } from "@/hooks/use-selected-instance";
import { Smartphone } from "lucide-react";

interface ParticipantProfile {
  displayName: string;
  profilePicUrl?: string | null;
}

const formatJidDisplay = (jid?: string | null): string => {
  if (!jid) return "Contato";
  const withoutDomain = jid.split("@")[0] || jid;
  if (/^\d+$/.test(withoutDomain)) {
    return withoutDomain.startsWith("+") ? withoutDomain : `+${withoutDomain}`;
  }
  const cleaned = withoutDomain.replace(/[_]+/g, " ").trim();
  return cleaned || "Contato";
};

const getNameInitials = (value: string): string => {
  if (!value) return "?";
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) {
    const letters = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    return letters.slice(0, 2) || "?";
  }
  const initials = tokens.slice(0, 2).map((token) => token[0]?.toUpperCase() || "").join("");
  if (initials.length > 0) return initials;
  const letters = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return letters.slice(0, 2) || "?";
};

export default function WhatsApp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedChatJid, setSelectedChatJid] = useState<string | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [isInstanceDialogOpen, setIsInstanceDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isInstanceSelectorOpen, setIsInstanceSelectorOpen] = useState(false);
  const { selectedInstance, setSelectedInstance } = useSelectedInstance();
  const [isContactMetadataDialogOpen, setIsContactMetadataDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isAttachmentPopoverOpen, setIsAttachmentPopoverOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);
  const [fileCaption, setFileCaption] = useState("");
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, ParticipantProfile>>({});
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { favorites, recentInstances, toggleFavorite, addToRecent, isFavorite } = useInstancePreferences();
  const { togglePin, isPinned, getPinnedChats } = usePinnedChats(selectedInstanceId);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedMessageSearchQuery = useDebounce(messageSearchQuery, 500);

  // Detectar se a aba está ativa (Page Visibility API)
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);

  // Stable callback for WebSocket messages
  const handleWhatsAppMessage = useCallback((data: any) => {
    // Notificar sempre, EXCETO quando o chat está aberto E a aba está visível
    const isChatOpen = data.remoteJid && data.remoteJid === selectedChatJid;
    const shouldNotify = !isChatOpen || !isPageVisible;
    
    if (shouldNotify && !data.fromMe) {
      // Extrair texto da mensagem para preview
      let messagePreview = "Nova mensagem";
      if (data.message?.conversation) {
        messagePreview = data.message.conversation.substring(0, 50);
        if (data.message.conversation.length > 50) messagePreview += "...";
      } else if (data.message?.imageMessage) {
        messagePreview = "📷 Imagem";
      } else if (data.message?.audioMessage) {
        messagePreview = "🎵 Áudio";
      } else if (data.message?.documentMessage) {
        messagePreview = "📄 Documento";
      }
      
      // Nome do remetente (pushName ou parte do JID)
      const senderName = data.pushName || data.remoteJid?.split('@')[0] || "Contato";
      
      toast({
        title: `📱 ${senderName}`,
        description: messagePreview,
        duration: 5000,
      });
      
      // Tentar notificação do navegador se aba não estiver visível
      if (!isPageVisible && "Notification" in window && Notification.permission === "granted") {
        new Notification(`${senderName}`, {
          body: messagePreview,
          icon: "/favicon.ico",
          tag: data.remoteJid, // Agrupa notificações do mesmo remetente
        });
      }
    }
  }, [selectedChatJid, isPageVisible, toast]);

  // WebSocket with toast notification for messages in other chats
  const { registerInstance, unregisterInstance } = useWebSocket({
    onWhatsAppMessage: handleWhatsAppMessage
  });

  // Clear cache when component mounts to refresh instances
  useClearCache([["/api/whatsapp/instances"]]);

  // Register/unregister instance monitoring when selectedInstanceId changes
  useEffect(() => {
    if (selectedInstanceId) {
      console.log(`📱 Registering instance monitoring: ${selectedInstanceId}`);
      registerInstance(selectedInstanceId);

      return () => {
        console.log(`📱 Unregistering instance monitoring: ${selectedInstanceId}`);
        unregisterInstance(selectedInstanceId);
      };
    }
  }, [selectedInstanceId, registerInstance, unregisterInstance]);

  // Fetch instances
  const { data: allInstances, isLoading: isLoadingInstances } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/whatsapp/instances"],
  });

  // Filter instances based on status and sort by favorites + recents
  const instances = (showOnlyActive 
    ? allInstances?.filter(i => i.connectionStatus === "open") 
    : allInstances)?.sort((a, b) => {
      // Favoritos primeiro
      const aFav = isFavorite(a.id);
      const bFav = isFavorite(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      // Depois recentes
      const aRecent = recentInstances.indexOf(a.id);
      const bRecent = recentInstances.indexOf(b.id);
      if (aRecent !== -1 && bRecent === -1) return -1;
      if (aRecent === -1 && bRecent !== -1) return 1;
      if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
      
      // Por último, alfabético
      return (a.name || a.number).localeCompare(b.name || b.number);
    });

  // Monitor página visibilidade
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Solicitar permissão de notificações do navegador ao montar componente
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      // Aguardar 2 segundos antes de solicitar (melhor UX)
      const timer = setTimeout(() => {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            console.log("✅ Permissão de notificações concedida");
          }
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch chats for selected instance com polling ULTRA otimizado
  const { data: chats, isLoading: isLoadingChats } = useQuery<EvolutionChat[]>({
    queryKey: ["/api/whatsapp/instances", selectedInstanceId, "chats"],
    enabled: !!selectedInstanceId,
    // Polling RÁPIDO: 3s para lista de chats (precisa ser mais lento que mensagens)
    // WebSocket atualiza em tempo real, polling é backup
    refetchInterval: selectedInstanceId && isPageVisible ? 3000 : false,
    staleTime: 2000, // Cache de 2s
  });

  // Calcular total de mensagens não lidas e atualizar título da página
  useEffect(() => {
    if (chats) {
      const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadMessages || 0), 0);
      
      if (totalUnread > 0) {
        document.title = `(${totalUnread}) Monitor IA - Chat`;
      } else {
        document.title = "Monitor IA - Chat";
      }
    }
    
    return () => {
      document.title = "Monitor IA";
    };
  }, [chats]);

  // Fetch messages for selected chat com polling ULTRA otimizado
  const { data: allMessages, isLoading: isLoadingMessages, error: messagesError } = useQuery<EvolutionMessage[]>({
    queryKey: ["/api/whatsapp/instances", selectedInstanceId, "chats", selectedChatJid, "messages"],
    enabled: !!selectedInstanceId && !!selectedChatJid,
    // Polling RÁPIDO: 2s se página visível (para mensagens instantâneas), desligado se não
    // WebSocket cuida do tempo real, polling é backup
    refetchInterval: selectedChatJid && isPageVisible ? 2000 : false,
    // Cache mais agressivo para performance
    staleTime: 1000, // Dados ficam "fresh" por 1s
  });

  // Debug: Log messages data
  useEffect(() => {
    console.log('📨 Messages Debug:', {
      allMessages,
      count: allMessages?.length,
      isLoading: isLoadingMessages,
      error: messagesError,
      selectedInstanceId,
      selectedChatJid,
    });
  }, [allMessages, isLoadingMessages, messagesError, selectedInstanceId, selectedChatJid]);

  // Helper function to clean markdown formatting from text
  const cleanMarkdownFormatting = (text: string): string => {
    if (!text) return text;
    // Remove asterisks that are used for bold formatting (*text*)
    // Keep single asterisks that might be intentional (emoji-like)
    return text.replace(/\*([^\*]+)\*/g, '$1');
  };

  // Helper function to extract text from message
  const getMessageText = (msg: EvolutionMessage): string => {
    if (msg.message?.conversation) return cleanMarkdownFormatting(msg.message.conversation);
    if (msg.message?.imageMessage) return msg.message.imageMessage.caption || "📷 Imagem";
    if (msg.message?.stickerMessage) return "🎭 Figurinha";
    if (msg.message?.audioMessage) return "🎵 Áudio";
    if (msg.message?.videoMessage) return cleanMarkdownFormatting(msg.message.videoMessage.caption) || "🎥 Vídeo";
    if (msg.message?.ptvMessage) return "🎥 Vídeo redondo";
    if (msg.message?.documentMessage) return `📄 ${msg.message.documentMessage.fileName || "Documento"}`;
    if (msg.message?.locationMessage) return `📍 ${msg.message.locationMessage.name || "Localização"}`;
    if (msg.message?.contactMessage) return `👤 ${msg.message.contactMessage.displayName || "Contato"}`;
    if (msg.message?.reactionMessage) return `${msg.message.reactionMessage.text || "❤️"} Reação`;
    if (msg.message?.editedMessage) {
      // Extrair conteúdo real da mensagem editada
      const editedContent = msg.message.editedMessage.message?.conversation ||
                           msg.message.editedMessage.message?.imageMessage?.caption ||
                           msg.message.editedMessage.message?.videoMessage?.caption;
      return editedContent ? `✏️ ${cleanMarkdownFormatting(editedContent)}` : "✏️ Mensagem editada";
    }
    return "(mensagem não suportada)";
  };

  // Filter messages based on debounced search query
  const messages = allMessages?.filter(msg => {
    if (!debouncedMessageSearchQuery) return true;
    
    const searchLower = debouncedMessageSearchQuery.toLowerCase();
    const text = getMessageText(msg).toLowerCase();
    
    return text.includes(searchLower) ||
           msg.pushName?.toLowerCase()?.includes(searchLower) ||
           msg.message?.imageMessage?.caption?.toLowerCase()?.includes(searchLower);
  });

  // Filter and sort chats using debounced search: pinned first, then by timestamp
  const filteredChats = (chats?.filter(chat => 
    chat.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    chat.pushName?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    chat.last_message?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    chat.remoteJid?.includes(debouncedSearchQuery)
  ) || []).sort((a, b) => {
    const aPinned = isPinned(a.remoteJid);
    const bPinned = isPinned(b.remoteJid);
    
    // Fixadas primeiro
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    // Depois por timestamp
    return (b.last_message_timestamp || 0) - (a.last_message_timestamp || 0);
  });

  // Get selected chat details
  const selectedChat = chats?.find(chat => chat.remoteJid === selectedChatJid);
  const isGroupChat = selectedChat?.remoteJid?.endsWith("@g.us");

  const groupParticipants = useMemo(() => {
    if (!isGroupChat || !selectedInstanceId || !messages) {
      return [] as Array<{ key: string; jid: string }>;
    }
    const map = new Map<string, string>();
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const participantJid = msg.key.participant || msg.participant;
      if (!participantJid) continue;
      const key = `${selectedInstanceId}:${participantJid}`;
      if (!map.has(key)) {
        map.set(key, participantJid);
      }
    }
    return Array.from(map.entries()).map(([key, jid]) => ({ key, jid }));
  }, [isGroupChat, selectedInstanceId, messages]);

  useEffect(() => {
    if (!isGroupChat || !selectedInstanceId || groupParticipants.length === 0) return;
    const missing = groupParticipants.filter(({ key }) => !participantProfiles[key]);
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      const updates: Array<[string, ParticipantProfile]> = [];
      await Promise.all(
        missing.map(async ({ key, jid }) => {
          try {
            const data = await apiRequest<any>(`/api/whatsapp/instances/${selectedInstanceId}/contacts/${encodeURIComponent(jid)}`);
            updates.push([
              key,
              {
                displayName:
                  data?.name ||
                  data?.pushName ||
                  data?.profileName ||
                  formatJidDisplay(jid),
                profilePicUrl: data?.profilePicUrl || null,
              },
            ]);
          } catch (error) {
            console.debug("Falha ao buscar contato do participante", jid, error);
            updates.push([
              key,
              {
                displayName: formatJidDisplay(jid),
                profilePicUrl: null,
              },
            ]);
          }
        })
      );

      if (cancelled || updates.length === 0) return;

      setParticipantProfiles((prev) => {
        const next = { ...prev };
        for (const [key, profile] of updates) {
          if (!next[key]) {
            next[key] = profile;
          }
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [groupParticipants, isGroupChat, participantProfiles, selectedInstanceId]);

  // Check if instance has Uazapi token
  const { data: uazapiInstanceData } = useQuery<{ instanceNumber: string; hasToken: boolean }>({
    queryKey: [`/api/uazapi/instances/${selectedInstance?.number}`],
    enabled: !!selectedInstance?.number,
  });

  // Auto-scroll to bottom when messages load or change
  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Removido: lógica automática de marcar como lida
  // Agora apenas mostramos o status real do Evolution DB

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

  // React to message mutation
  const reactToMessageMutation = useMutation({
    mutationFn: async (data: { instanceNumber: string; number: string; text: string; id: string }) => {
      return await apiRequest("/api/whatsapp/react", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Reação adicionada",
        description: "Reação enviada com sucesso!",
      });
      // Invalidate messages to reload
      queryClient.invalidateQueries({ 
        queryKey: ["/api/whatsapp/instances", selectedInstanceId, "chats", selectedChatJid, "messages"] 
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao reagir",
        description: error.message || "Não foi possível adicionar reação",
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (data: { instanceNumber: string; id: string }) => {
      return await apiRequest("/api/whatsapp/delete", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Mensagem deletada",
        description: "Mensagem deletada para todos",
      });
      // Invalidate messages to reload
      queryClient.invalidateQueries({ 
        queryKey: ["/api/whatsapp/instances", selectedInstanceId, "chats", selectedChatJid, "messages"] 
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao deletar",
        description: error.message || "Não foi possível deletar a mensagem",
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

    // Extract recipient phone number from remoteJid
    // Format: 5511999999999@s.whatsapp.net or 5511999999999:16@s.whatsapp.net
    // We need to remove both the suffix after ':' and after '@'
    let recipientNumber = selectedChatJid.split('@')[0]; // Remove @s.whatsapp.net
    recipientNumber = recipientNumber.split(':')[0]; // Remove :16 or other suffixes

    // Use instance number in Brazilian format (55XXYYYYYYYY)
    sendMessageMutation.mutate({
      instanceNumber: selectedInstance.number,
      recipientNumber: recipientNumber,
      text: messageText.trim(),
    });
  };

  // Manipulação de arquivos
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);

    // Criar preview URL
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    setIsFilePreviewOpen(true);
    setFileCaption("");
  };

  // Ctrl+V para colar imagem
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          break;
        }
      }
    }
  }, []);

  // Adicionar listener de paste quando chat estiver selecionado
  useEffect(() => {
    if (selectedChatJid) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [selectedChatJid, handlePaste]);

  const handleSendFile = () => {
    if (!selectedFile || !selectedInstanceId || !selectedChatJid || !selectedInstance?.number) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um arquivo para enviar",
      });
      return;
    }

    // TODO: Implementar envio via API
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: `Arquivo ${selectedFile.name} será enviado em breve`,
    });

    // Limpar estado
    setIsFilePreviewOpen(false);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileCaption("");
  };

  const closeFilePreview = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setIsFilePreviewOpen(false);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileCaption("");
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

  const formatChatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp * 1000);
      if (isToday(date)) {
        return format(date, "HH:mm");
      } else if (isYesterday(date)) {
        return "Ontem";
      } else {
        return format(date, "dd/MM/yyyy");
      }
    } catch {
      return "";
    }
  };

  // Format date label for message grouping
  const getDateLabel = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  // Group messages by date
  const groupMessagesByDate = (messages: EvolutionMessage[]) => {
    const groups: { date: string; messages: EvolutionMessage[] }[] = [];
    
    messages.forEach((message) => {
      const messageDate = startOfDay(new Date(Number(message.messageTimestamp) * 1000)).getTime();
      const lastGroup = groups[groups.length - 1];
      
      if (!lastGroup || lastGroup.date !== messageDate.toString()) {
        groups.push({
          date: messageDate.toString(),
          messages: [message],
        });
      } else {
        lastGroup.messages.push(message);
      }
    });
    
    return groups;
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
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Pills de Instâncias */}
      <div className="border-b bg-card px-4 py-3 flex-shrink-0">
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
        ) : !instances || instances.length === 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Nenhuma instância cadastrada. Verifique suas configurações.</span>
          </div>
        ) : instances.length > 0 ? (
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInstanceSelectorOpen(true)}
              className="gap-2"
              data-testid="button-select-instance"
            >
              <Smartphone className="h-4 w-4" />
              {selectedInstance
                ? `Instância: ${selectedInstance.name || selectedInstance.number}`
                : "Selecionar Instância"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {showOnlyActive ? 'Nenhuma instância ativa encontrada' : 'Nenhuma instância encontrada'}
          </p>
        )}
      </div>

      {/* Main Content - WhatsApp Layout */}
      <div className="flex-1 flex w-full overflow-hidden">
        {selectedInstanceId ? (
          <>
            {/* Lista de Conversas (Esquerda) */}
            <div className={`${selectedChatJid ? 'hidden md:flex' : 'flex'} w-full md:w-[400px] flex-col bg-card/40 backdrop-blur-sm overflow-hidden md:border-r border-border/30`}>
              <div className="p-3 md:p-4 flex-shrink-0">
                <h2 className="font-semibold text-lg mb-3 md:mb-4">Conversas</h2>
                <Input
                  type="text"
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  data-testid="input-search-chats"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {isLoadingChats ? (
                  <ChatListSkeleton />
                ) : filteredChats.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p>Nenhuma conversa encontrada</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredChats.map((chat) => (
                      <div key={chat.id} className="relative group">
                        <button
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
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                {isPinned(chat.remoteJid) && (
                                  <Pin className="h-3 w-3 text-[#3442AD] flex-shrink-0" />
                                )}
                                <h3 className="font-medium truncate">
                                  {chat.name || chat.pushName || chat.remoteJid}
                                </h3>
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {formatChatTime(chat.last_message_timestamp)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground truncate flex-1">
                                {chat.last_message || 'Sem mensagens'}
                              </p>
                              {chat.unreadMessages > 0 && (
                                <Badge 
                                  variant="default" 
                                  className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-xs bg-[#3442AD] hover:bg-[#3442AD] text-white font-semibold"
                                  data-testid={`badge-unread-${chat.remoteJid}`}
                                >
                                  {chat.unreadMessages}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(chat.remoteJid);
                          }}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-pin-${chat.remoteJid}`}
                        >
                          <Pin
                            className={`h-4 w-4 ${isPinned(chat.remoteJid) ? 'text-[#3442AD] fill-[#3442AD]' : 'text-muted-foreground'}`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Área de Mensagens (Direita) */}
            <div className={`${selectedChatJid ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-h-0 w-full overflow-x-hidden`}>
              {selectedChatJid ? (
                <>
                  {/* Header do Chat */}
                  <div className="bg-card/30 backdrop-blur-md flex-shrink-0 border-b border-border/30">
                    <div className="h-14 md:h-16 px-3 md:px-4 flex items-center gap-2 md:gap-3">
                      {/* Botão Voltar Mobile */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setSelectedChatJid(null)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                      </Button>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (messageSearchQuery) {
                            setMessageSearchQuery("");
                          } else {
                            document.getElementById('message-search-input')?.focus();
                          }
                        }}
                        data-testid="button-search-messages"
                      >
                        {messageSearchQuery ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsContactMetadataDialogOpen(true)}
                        data-testid="button-contact-metadata"
                      >
                        <Tag className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSettingsDialogOpen(true)}
                        data-testid="button-settings"
                      >
                        <Settings className="h-5 w-5" />
                      </Button>
                    </div>
                    {messageSearchQuery !== null && (
                      <div className="px-4 pb-3">
                        <Input
                          id="message-search-input"
                          type="text"
                          placeholder="Buscar mensagens..."
                          value={messageSearchQuery}
                          onChange={(e) => setMessageSearchQuery(e.target.value)}
                          className="w-full"
                          data-testid="input-search-messages"
                        />
                      </div>
                    )}
                  </div>

                  {/* Mensagens */}
                  <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden p-4 bg-muted/5">
                    {isLoadingMessages ? (
                      <MessageListSkeleton />
                    ) : messages && messages.length > 0 ? (
                      <div className="space-y-4 w-full overflow-x-hidden">
                        {/* CORRIGIDO: Backend retorna DESC (mais recentes primeiro), invertemos para exibir corretamente */}
                        {groupMessagesByDate([...messages].reverse()).map((group, groupIndex) => (
                          <div key={group.date} className="space-y-2 w-full overflow-x-hidden">
                            {/* Date separator */}
                            <div className="flex items-center justify-center my-4">
                              <div className="bg-accent/20 px-3 py-1 rounded-full">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {getDateLabel(Number(group.messages[0].messageTimestamp))}
                                </span>
                              </div>
                            </div>
                            
                            {/* Messages for this date */}
                            {group.messages.map((message, messageIndex) => {
                              const fromMe = message.key.fromMe;
                              
                              // Helper para identificar remetente único (funciona em 1:1 e grupos)
                              const getSenderId = (msg: EvolutionMessage) => {
                                if (msg.key.fromMe) return 'me';
                                // Prioridade: participant (grupos) > pushName (fallback) > remoteJid (último recurso)
                                // Combinar múltiplos campos garante distinção mesmo sem participant
                                return msg.key.participant || `${msg.pushName || 'unknown'}_${msg.key.remoteJid}`;
                              };
                              
                              // Detectar se mensagem anterior é do mesmo remetente (para agrupar)
                              const prevMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
                              const isSameSenderAsPrevious = prevMessage && 
                                getSenderId(prevMessage) === getSenderId(message);
                              
                              // Próxima mensagem para decidir quando mostrar timestamp
                              const nextMessage = messageIndex < group.messages.length - 1 ? group.messages[messageIndex + 1] : null;
                              const isSameSenderAsNext = nextMessage && 
                                getSenderId(nextMessage) === getSenderId(message);

                              const participantJid = !fromMe ? (message.key.participant || message.participant || null) : null;
                              const participantKey = participantJid && selectedInstanceId
                                ? `${selectedInstanceId}:${participantJid}`
                                : null;
                              const senderProfile = participantKey ? participantProfiles[participantKey] : undefined;
                              const senderDisplayName = senderProfile?.displayName
                                || message.pushName
                                || formatJidDisplay(participantJid);
                              const avatarInitials = getNameInitials(senderDisplayName);
                              const shouldReserveAvatarSpace = Boolean(isGroupChat && !fromMe);
                              const shouldShowAvatar = shouldReserveAvatarSpace && !isSameSenderAsPrevious;
                              const showSenderLabel = shouldReserveAvatarSpace && !isSameSenderAsPrevious;
                              
                              return (
                                <div
                                  key={message.id}
                                  className={`flex gap-2 group w-full ${fromMe ? 'justify-end' : 'justify-start'} ${
                                    isSameSenderAsPrevious ? 'mt-0.5' : 'mt-3'
                                  }`}
                                  data-testid={`message-${message.id}`}
                                >
                                  {/* Message Actions (shows on hover) - antes da mensagem se for minha */}
                                  {fromMe && selectedInstance?.number && (
                                    <MessageActions
                                      messageId={message.id}
                                      fromMe={fromMe}
                                      onReact={(emoji) => {
                                        reactToMessageMutation.mutate({
                                          instanceNumber: selectedInstance.number,
                                          number: selectedChatJid!,
                                          text: emoji,
                                          id: message.key.id,
                                        });
                                      }}
                                      onDelete={() => {
                                        deleteMessageMutation.mutate({
                                          instanceNumber: selectedInstance.number,
                                          id: message.key.id,
                                        });
                                      }}
                                    />
                                  )}

                                  {shouldReserveAvatarSpace && (
                                    <div className="flex-shrink-0 mt-1">
                                      {shouldShowAvatar ? (
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage
                                            src={senderProfile?.profilePicUrl || undefined}
                                            alt={senderDisplayName}
                                          />
                                          <AvatarFallback>{avatarInitials}</AvatarFallback>
                                        </Avatar>
                                      ) : (
                                        <div className="h-8 w-8" />
                                      )}
                                    </div>
                                  )}

                                  <div
                                    className={`max-w-[65%] min-w-0 rounded-lg px-4 py-2 break-words overflow-hidden ${
                                      fromMe
                                        ? 'text-white'
                                        : 'bg-card border'
                                    }`}
                                    style={{
                                      ...(fromMe && {
                                        backgroundColor: 'var(--color-message-sent, #7885E3)',
                                      }),
                                      wordBreak: 'break-word',
                                      overflowWrap: 'anywhere',
                                    }}
                                  >
                                    {showSenderLabel && (
                                      <p className="text-xs font-medium mb-1 text-primary">
                                        {senderDisplayName}
                                      </p>
                                    )}
                                    
                                    {message.contextInfo?.quotedMessage && (
                                      <div className="mb-2 pl-2 border-l-4 border-primary/50 text-xs opacity-70">
                                        <p>Respondendo...</p>
                                      </div>
                                    )}
                                    
                                    {/* Sticker Message */}
                                    {message.message?.stickerMessage && (
                                      <StickerMessage messageId={message.id} />
                                    )}
                                    
                                    {/* Image Message */}
                                    {message.message?.imageMessage && (
                                      <ImageMessage 
                                        messageId={message.id} 
                                        caption={message.message.imageMessage.caption}
                                      />
                                    )}
                                    
                                    {/* Video Message */}
                                    {message.message?.videoMessage && (
                                      <VideoMessage 
                                        messageId={message.id} 
                                        caption={message.message.videoMessage.caption}
                                      />
                                    )}
                                    
                                    {/* PTV Message (video redondo) */}
                                    {message.message?.ptvMessage && (
                                      <VideoMessage messageId={message.id} />
                                    )}

                                    {/* Audio Message */}
                                    {message.message?.audioMessage && (
                                      <AudioMessage messageId={message.id} />
                                    )}

                                    {/* Document/PDF Message */}
                                    {message.message?.documentMessage && (
                                      <button 
                                        onClick={() => {
                                          // Download via endpoint de descriptografia
                                          const downloadUrl = `/api/whatsapp/media/decrypt/${message.id}`;
                                          const link = document.createElement('a');
                                          link.href = downloadUrl;
                                          link.download = message.message.documentMessage!.fileName || 'documento';
                                          link.click();
                                        }}
                                        className="flex items-center gap-2 p-2 rounded bg-muted/20 hover:bg-muted/40 transition-colors mb-2"
                                        data-testid={`document-${message.id}`}
                                      >
                                        <div className="text-2xl">📄</div>
                                        <div className="flex-1 min-w-0 text-left">
                                          <p className="text-sm font-medium truncate">
                                            {message.message.documentMessage.fileName || 'Documento'}
                                          </p>
                                          <p className="text-xs opacity-70">
                                            Clique para baixar
                                          </p>
                                        </div>
                                      </button>
                                    )}
                                    
                                    {/* Location Message */}
                                    {message.message?.locationMessage && (
                                      <div className="flex flex-col gap-1">
                                        <div className="text-2xl">📍</div>
                                        <p className="text-sm font-medium">
                                          {message.message.locationMessage.name || "Localização"}
                                        </p>
                                        {message.message.locationMessage.address && (
                                          <p className="text-xs opacity-70">{message.message.locationMessage.address}</p>
                                        )}
                                        {message.message.locationMessage.degreesLatitude && message.message.locationMessage.degreesLongitude && (
                                          <a
                                            href={`https://www.google.com/maps?q=${message.message.locationMessage.degreesLatitude},${message.message.locationMessage.degreesLongitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline"
                                          >
                                            Ver no mapa
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Contact Message */}
                                    {message.message?.contactMessage && (
                                      <div className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                                        <div className="text-2xl">👤</div>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium">
                                            {message.message.contactMessage.displayName || "Contato"}
                                          </p>
                                          <p className="text-xs opacity-70">Contato compartilhado</p>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Reaction Message */}
                                    {message.message?.reactionMessage && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-2xl">{message.message.reactionMessage.text || "❤️"}</span>
                                        <p className="text-xs opacity-70">Reagiu a uma mensagem</p>
                                      </div>
                                    )}
                                    
                                    {/* Edited Message */}
                                    {message.message?.editedMessage && (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                                          <span>✏️</span>
                                          <span>editada</span>
                                        </div>
                                        {message.message.editedMessage.message?.conversation && (
                                          <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>
                                            {cleanMarkdownFormatting(message.message.editedMessage.message.conversation)}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Text Message (only if not image/sticker/document/video/audio/location/contact/reaction/edited) */}
                                    {!message.message?.imageMessage &&
                                     !message.message?.stickerMessage &&
                                     !message.message?.documentMessage &&
                                     !message.message?.videoMessage &&
                                     !message.message?.ptvMessage &&
                                     !message.message?.audioMessage &&
                                     !message.message?.locationMessage &&
                                     !message.message?.contactMessage &&
                                     !message.message?.reactionMessage &&
                                     !message.message?.editedMessage && (
                                      <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>
                                        {cleanMarkdownFormatting(message.message?.conversation || "")}
                                      </p>
                                    )}
                                    
                                    {/* Timestamp - mostrar apenas se for última do grupo ou on hover */}
                                    {!isSameSenderAsNext && (
                                      <div className="flex items-center justify-end gap-1 mt-1">
                                        <p className="text-[10px] opacity-60">
                                          {formatTimestamp(message.messageTimestamp)}
                                        </p>
                                        <MessageStatus status={message.status} fromMe={fromMe} />
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Message Actions (shows on hover) - depois da mensagem se não for minha */}
                                  {!fromMe && selectedInstance?.number && (
                                    <MessageActions
                                      messageId={message.id}
                                      fromMe={fromMe}
                                      onReact={(emoji) => {
                                        reactToMessageMutation.mutate({
                                          instanceNumber: selectedInstance.number,
                                          number: selectedChatJid!,
                                          text: emoji,
                                          id: message.key.id,
                                        });
                                      }}
                                      onDelete={() => {
                                        deleteMessageMutation.mutate({
                                          instanceNumber: selectedInstance.number,
                                          id: message.key.id,
                                        });
                                      }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                        {/* Ref para auto-scroll */}
                        <div ref={messagesEndRef} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Sem mensagens nesta conversa</p>
                      </div>
                    )}
                  </div>

                  {/* Input de Mensagem - Estilo WhatsApp Web CORRIGIDO */}
                  {uazapiInstanceData?.hasToken ? (
                    <div className="flex-shrink-0 border-t px-3 py-2 relative bg-[#11111300] text-[#f5f5f5e8]">
                      {/* Input file oculto */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      <div className="flex items-center gap-2">
                        {/* Botão Anexar */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          data-testid="button-attach"
                          title="Anexar arquivo (ou Ctrl+V)"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>

                        {/* Botão Emoji */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          data-testid="button-emoji"
                          title="Emoji"
                        >
                          <Smile className="h-5 w-5" />
                        </Button>

                        {/* Input de Texto LIMPO (sem botão emoji dentro) */}
                        <div className="flex-1 relative">
                          <Textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder="Digite uma mensagem"
                            disabled={sendMessageMutation.isPending}
                            rows={1}
                            className="min-h-[40px] max-h-32 rounded-lg bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary resize-none"
                            style={{
                              height: 'auto',
                              overflowY: messageText.split('\n').length > 4 ? 'auto' : 'hidden'
                            }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                            }}
                            data-testid="input-message"
                          />
                        </div>

                        {/* Botão Microfone ou Enviar */}
                        {messageText.trim() ? (
                          <Button
                            onClick={handleSendMessage}
                            disabled={sendMessageMutation.isPending}
                            size="icon"
                            className="shrink-0 rounded-full"
                            data-testid="button-send-message"
                          >
                            {sendMessageMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            data-testid="button-voice"
                            title="Mensagem de voz (em breve)"
                            onClick={() => toast({ title: "Gravação de áudio em desenvolvimento" })}
                          >
                            <Mic className="h-5 w-5" />
                          </Button>
                        )}
                      </div>

                      {/* Emoji Picker */}
                      {isEmojiPickerOpen && (
                        <div className="absolute bottom-full left-3 mb-2 z-50">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background shadow-md z-10"
                              onClick={() => setIsEmojiPickerOpen(false)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <EmojiPicker
                              onEmojiClick={(emojiData: EmojiClickData) => {
                                setMessageText(prev => prev + emojiData.emoji);
                              }}
                              width={350}
                              height={450}
                            />
                          </div>
                        </div>
                      )}

                      {/* Dialog de Preview de Arquivo */}
                      <Dialog open={isFilePreviewOpen} onOpenChange={(open) => !open && closeFilePreview()}>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Enviar Arquivo</DialogTitle>
                          </DialogHeader>

                          <div className="space-y-4">
                            {/* Preview do arquivo */}
                            <div className="relative bg-muted rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center">
                              {selectedFile && (
                                <>
                                  {selectedFile.type.startsWith('image/') && filePreviewUrl && (
                                    <img
                                      src={filePreviewUrl}
                                      alt="Preview"
                                      className="max-w-full max-h-[500px] object-contain"
                                    />
                                  )}
                                  {selectedFile.type.startsWith('video/') && filePreviewUrl && (
                                    <video
                                      src={filePreviewUrl}
                                      controls
                                      className="max-w-full max-h-[500px]"
                                    />
                                  )}
                                  {!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/') && (
                                    <div className="text-center p-8">
                                      <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                      <p className="font-medium">{selectedFile.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Legenda opcional */}
                            <div>
                              <Textarea
                                placeholder="Adicione uma legenda (opcional)"
                                value={fileCaption}
                                onChange={(e) => setFileCaption(e.target.value)}
                                className="resize-none"
                                rows={3}
                              />
                            </div>

                            {/* Botões */}
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={closeFilePreview}>
                                Cancelar
                              </Button>
                              <Button onClick={handleSendFile}>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 border-t px-4 py-3 bg-card">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">
                          ⚠️ Instância não cadastrada no Uazapi
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsSettingsDialogOpen(true)}
                          data-testid="button-configure-uazapi"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar
                        </Button>
                      </div>
                    </div>
                  )}
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

      {/* Instance Settings Dialog */}
      <InstanceSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        instanceNumber={selectedInstance?.number || ""}
        instanceName={selectedInstance?.name || selectedInstance?.number || ""}
      />

      {/* Contact Metadata Dialog */}
      {selectedInstanceId && selectedChatJid && (
        <ContactMetadataDialog
          isOpen={isContactMetadataDialogOpen}
          onClose={() => setIsContactMetadataDialogOpen(false)}
          instanceId={selectedInstanceId}
          remoteJid={selectedChatJid}
          contactName={selectedChat?.name || selectedChat?.pushName}
        />
      )}

      {/* Instance Selector Modal */}
      <InstanceSelectorModal
        open={isInstanceSelectorOpen}
        onOpenChange={setIsInstanceSelectorOpen}
        onSelectInstance={(instance) => {
          setSelectedInstance(instance);
          setSelectedInstanceId(instance.id);
          setSelectedChatJid(null);
          addToRecent(instance.id);
        }}
        selectedInstanceId={selectedInstance?.id}
      />
    </div>
  );
}
