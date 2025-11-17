import React, { useState, useEffect, useRef, useCallback, useMemo, type JSX } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { WhatsAppHeader } from "@/components/WhatsAppHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateAvatarDataUri, resolveAvatarIdentifier } from "@/lib/avatar-generator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Loader2, Check, CheckCheck, MoreHorizontal, Settings, Star, Pin, Search, X, Tag, Plus, SmilePlus, Mic, Image as ImageIcon, FileText, Video, Smile, AlertCircle } from "lucide-react";
import { SendIcon } from "@/components/SendIcon";
import { ChatListSkeleton, MessageListSkeleton } from "@/components/WhatsAppSkeletons";
import { formatDistanceToNow, format, isToday, isYesterday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EvolutionInstance, EvolutionChat, EvolutionMessage } from "@/types/whatsapp";
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
import { AudioRecorderInline } from "@/components/AudioRecorderInline";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { useDebounce } from "@/lib/utils";
import { InstanceSelectorModal } from "@/components/InstanceSelectorModal";
import { InstanceSettingsDialog } from "@/components/InstanceSettingsDialog";
import { CreateInstanceDialog } from "@/components/CreateInstanceDialog";
import { useSelectedInstance } from "@/hooks/use-selected-instance";
import { useSidebarWidth } from "@/hooks/use-sidebar-width";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ThemeProvider";
import { ChatListSidebar } from "@/components/ChatListSidebar";
import {
  setSelectedInstanceId,
  deleteSelectedInstanceId,
  setMessageDraft,
  getMessageDraft,
  deleteMessageDraft,
} from "@/lib/storage";

import { IAConversationStatusBadge } from "@/components/IAConversationStatusBadge";
import { IAConversationActions } from "@/components/IAConversationActions";

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

const renderTextWithLinks = (text: string): Array<string | JSX.Element> | string => {
  if (!text) return text;

  const regex = /((https?:\/\/|www\.)[^\s]+)/gi;
  const nodes: Array<string | JSX.Element> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const url = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    const href = url.startsWith("http") ? url : `https://${url}`;
    nodes.push(
      <a
        key={`url-${index}-${url}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline break-all"
      >
        {url}
      </a>
    );

    lastIndex = index + url.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
};

/**
 * Extract sender name prefix from message text
 * Handles formats like:
 * - "*Name:*\nmessage"
 * - "*Name:\nmessage"
 * - "Name: message"
 * Returns { name, cleanMessage } or { name: null, cleanMessage: original }
 */
const extractMessagePrefix = (
  messageText: string,
  botConfig?: { bot_name?: string | null; consultant_name?: string | null } | null
): { name: string | null; cleanMessage: string; isValid: boolean } => {
  // Try format: "*Name:*\n" or "*Name:\n"
  let match = messageText.match(/^\*([A-Za-z\s]+):\*?\n(.*)$/s);
  if (match) {
    const extractedName = match[1].trim();
    // Check if it matches bot_name or consultant_name from config
    const isValid = botConfig
      ? (extractedName === botConfig.bot_name || extractedName === botConfig.consultant_name)
      : true; // If no config, accept any name

    return {
      name: extractedName,
      cleanMessage: match[2],
      isValid
    };
  }

  // Try format: "Name: message"
  match = messageText.match(/^([A-Za-z\s]+):\s(.*)$/s);
  if (match) {
    const extractedName = match[1].trim();
    // Check if it matches bot_name or consultant_name from config
    const isValid = botConfig
      ? (extractedName === botConfig.bot_name || extractedName === botConfig.consultant_name)
      : true; // If no config, accept any name

    return {
      name: extractedName,
      cleanMessage: match[2],
      isValid
    };
  }

  return { name: null, cleanMessage: messageText, isValid: false };
};

/**
 * Determine message sender type with proper priority:
 * 1. senderType from Evolution API (most reliable - comes from server)
 * 2. fromMe flag (indicates bot-sent messages)
 * 3. Message prefix detection (validated against bot config)
 * 4. Default to "client" for client messages or undetectable sources
 *
 * Security note: Only senderType and fromMe are tamper-proof from client
 * Prefix detection is validated against bot_name and consultant_name from config
 */
const detectMessageSender = (
  messageText: string,
  senderType?: string | null,
  fromMe?: boolean,
  botConfig?: { bot_name?: string | null; consultant_name?: string | null } | null
): "ai" | "consultant" | "client" => {
  // Priority 1: Check senderType from Evolution API (most reliable)
  if (senderType === "bot") return "ai";
  if (senderType === "consultant") return "consultant";

  // Priority 2: Check if message is from the bot account (fromMe=true)
  if (fromMe === true) return "ai";

  // Priority 3: If it's from someone else and we don't have senderType, try prefix detection
  // But only as a fallback - and validate against bot config
  if (fromMe === false) {
    const { name, isValid } = extractMessagePrefix(messageText, botConfig);
    if (name && isValid) {
      // Name is valid (matches config if available)
      if (botConfig) {
        if (name === botConfig.bot_name) return "ai";
        if (name === botConfig.consultant_name) return "consultant";
      } else {
        // Fallback: if no config, use case detection
        const firstChar = name.charAt(0);
        // If first letter is uppercase, assume it's AI; if lowercase, assume it's Consultant
        const isAI = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
        if (isAI) return "ai";
        return "consultant";
      }
    }
  }

  // Priority 4: Default to "client" for messages we can't determine source
  return "client";
};

export default function WhatsApp() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [chatTypeFilter, setChatTypeFilter] = useState<"contacts" | "groups" | "all">("all");
  const [selectedChatJid, setSelectedChatJid] = useState<string | null>(null);
  const [isInstanceDialogOpen, setIsInstanceDialogOpen] = useState(false);
  const [isInstanceSelectorOpen, setIsInstanceSelectorOpen] = useState(false);
  const [isInstanceSettingsDialogOpen, setIsInstanceSettingsDialogOpen] = useState(false);
  const [isCreateInstanceDialogOpen, setIsCreateInstanceDialogOpen] = useState(false);
  const [instanceSettingsContext, setInstanceSettingsContext] = useState<{ number?: string; name?: string } | null>(null);
  const [iaStatusForChat, setIaStatusForChat] = useState<'active' | 'paused' | 'inactive'>('active'); // Placeholder para o status da IA na conversa
  const { selectedInstance, setSelectedInstance } = useSelectedInstance();
  const { user } = useAuth();
  const { theme } = useTheme();
  const openInstanceSettings = useCallback((instance?: EvolutionInstance | null) => {
    const target = instance ?? selectedInstance ?? null;

    if (target) {
      const normalizedNumber = target.number || undefined;
      const displayName = target.name || target.number || target.profileName || undefined;

      setInstanceSettingsContext({
        number: normalizedNumber,
        name: displayName,
      });
    } else {
      setInstanceSettingsContext(null);
    }

    setIsInstanceSettingsDialogOpen(true);
  }, [selectedInstance]);

  const handleConfigureIA = useCallback(() => {
    if (selectedInstance?.id) {
      setLocation(`/chat/instance-settings/${selectedInstance.id}`);
    }
  }, [selectedInstance?.id, setLocation]);


  // ID da instância selecionada (extraído do Zustand) - deve estar aqui antes de usar em hooks
  const selectedInstanceId = selectedInstance?.id || null;

  // Fetch bot configuration for the selected instance
  const { data: botConfig } = useQuery({
    queryKey: ['botConfig', selectedInstance?.number],
    queryFn: async () => {
      if (!selectedInstance?.number) return null;
      try {
        const response = await apiRequest(`/api/bot-config/${selectedInstance.number}`);
        console.log('[DEBUG] Bot config fetched:', response);
        return response;
      } catch (error) {
        console.error('Failed to fetch bot config:', error);
        return null;
      }
    },
    enabled: !!selectedInstance?.number,
  });

  // Debug log for prefix validation
  useEffect(() => {
    console.log('[DEBUG] Bot config available:', {
      bot_name: botConfig?.bot_name,
      consultant_name: botConfig?.consultant_name,
      hasConfig: !!botConfig
    });
  }, [botConfig]);

  const [isContactMetadataDialogOpen, setIsContactMetadataDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isAttachmentPopoverOpen, setIsAttachmentPopoverOpen] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);
  const [fileCaption, setFileCaption] = useState("");
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, ParticipantProfile>>({});
  const [mutedChats, setMutedChats] = useState<Set<string>>(new Set());
  const [archivedChats, setArchivedChats] = useState<Set<string>>(new Set());
  const [messageLimit, setMessageLimit] = useState(500); // Máximo padrão do backend: 500
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { favorites, recentInstances, toggleFavorite, addToRecent, isFavorite } = useInstancePreferences();
  const { togglePin, isPinned, getPinnedChats } = usePinnedChats(selectedInstanceId);
  const { sidebarWidth, isResizing, handleResizeStart } = useSidebarWidth();

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedMessageSearchQuery = useDebounce(messageSearchQuery, 500);

  // Detectar se a aba está ativa (Page Visibility API)
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);

  // Callbacks para ações de contexto no chat
  const handleMuteChat = useCallback((jid: string) => {
    setMutedChats((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jid)) {
        newSet.delete(jid);
        toast({
          title: "Chat desmutado",
          description: "Você receberá notificações deste chat",
          duration: 2000,
        });
      } else {
        newSet.add(jid);
        toast({
          title: "Chat silenciado",
          description: "Você não receberá notificações deste chat",
          duration: 2000,
        });
      }
      return newSet;
    });
  }, [toast]);

  const handleMarkAsRead = useCallback((jid: string) => {
    toast({
      title: "Marcado como lido",
      description: "As mensagens não lidas foram marcadas como lidas",
      duration: 2000,
    });
  }, [toast]);

  const handleArchiveChat = useCallback((jid: string) => {
    setArchivedChats((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jid)) {
        newSet.delete(jid);
        toast({
          title: "Chat restaurado",
          description: "O chat foi restaurado",
          duration: 2000,
        });
      } else {
        newSet.add(jid);
        toast({
          title: "Chat arquivado",
          description: "O chat foi movido para arquivo",
          duration: 2000,
        });
        // Se estava selecionado, desseleciona
        if (selectedChatJid === jid) {
          setSelectedChatJid(null);
        }
      }
      return newSet;
    });
  }, [selectedChatJid, toast]);

  const isMutedChat = useCallback((jid: string) => mutedChats.has(jid), [mutedChats]);

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

  // Carregar rascunho salvo quando mudar de chat
  useEffect(() => {
    if (!selectedInstanceId || !selectedChatJid) {
      setMessageText("");
      return;
    }

    const savedDraft = getMessageDraft(selectedInstanceId, selectedChatJid);
    if (savedDraft) {
      setMessageText(savedDraft);
    } else {
      setMessageText("");
    }
  }, [selectedInstanceId, selectedChatJid]);

  // Salvar rascunho quando a mensagem mudar
  useEffect(() => {
    if (!selectedInstanceId || !selectedChatJid) {
      return;
    }

    setMessageDraft(selectedInstanceId, selectedChatJid, messageText);
  }, [messageText, selectedInstanceId, selectedChatJid]);

  // Fetch instances
  const { data: allInstances } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/whatsapp/instances"],
  });

  // Fetch AI data for the selected instance
  const { data: aiData } = useQuery({
    queryKey: [`/api/ai-data/instance/${selectedInstanceId}`],
    enabled: !!selectedInstanceId,
  });

  // Sort instances by favorites + recents
  const instances = allInstances?.sort((a, b) => {
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

  // Get the current Evolution instance that's selected in the chat (not from Zustand)
  const currentInstance = allInstances?.find(inst => inst.id === selectedInstanceId);

  // Sincronizar selectedInstance com storage.ts quando mudar
  useEffect(() => {
    if (selectedInstance) {
      setSelectedInstanceId(selectedInstance.id);
      console.log(`💾 Sincronizando instância no storage: ${selectedInstance.name}`);
    } else {
      deleteSelectedInstanceId();
    }
  }, [selectedInstance]);

  // Auto-select first instance if none is selected and instances are loaded
  useEffect(() => {
    if (!selectedInstance && instances && instances.length > 0) {
      const firstInstance = instances[0];
      console.log(`📱 Selecionando instância padrão: ${firstInstance.name}`);
      setSelectedInstance(firstInstance);
    }
  }, [instances, selectedInstance, setSelectedInstance]);

  // Prevent text selection while resizing
  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

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

  // Fetch chats for selected instance com polling otimizado
  // CRITICAL FIX: Reduced polling intervals for real-time updates
  const { data: chats, isLoading: isLoadingChats } = useQuery<EvolutionChat[]>({
    queryKey: [`/api/whatsapp/instances/${selectedInstanceId}/chats`],
    enabled: !!selectedInstanceId,
    // FIXED: Reduzido para 3s para garantir atualização rápida
    // Server-side polling (2s) + WebSocket ensure real-time updates
    // Client-side polling (3s) é backup rápido
    refetchInterval: selectedInstanceId && isPageVisible ? 3000 : false,
    // FIXED: staleTime = 0 para respeitar invalidations do WebSocket imediatamente
    staleTime: 0,
    // FIXED: Refetch quando aba ganha foco para sincronizar
    refetchOnWindowFocus: true,
    // FIXED: Refetch quando instância muda
    refetchOnMount: true,
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

  // Fetch messages for selected chat com polling otimizado
  // CRITICAL FIX: Near-instant message updates with server polling + WebSocket
  const { data: allMessages, isLoading: isLoadingMessages, error: messagesError } = useQuery<EvolutionMessage[]>({
    queryKey: [`/api/whatsapp/instances/${selectedInstanceId}/chats/${selectedChatJid}/messages`, { limit: messageLimit }],
    queryFn: async () => {
      const response = await apiRequest(
        `/api/whatsapp/instances/${selectedInstanceId}/chats/${selectedChatJid}/messages?limit=${messageLimit}`
      );
      return response;
    },
    enabled: !!selectedInstanceId && !!selectedChatJid,
    // FIXED: Reduzido de 3s para 2s para ser levemente mais rápido que server polling (2s)
    // Server polling (2s) + WebSocket ensure messages appear almost instantly
    // Client polling (2s) é backup rápido se WebSocket falhar
    refetchInterval: selectedChatJid && isPageVisible ? 2000 : false,
    // FIXED: staleTime=5000 (5s) para evitar refetch imediato após setQueryData
    // Isso permite que optimistic updates apareçam sem delay
    // WebSocket ainda invalida quando necessário para atualizar status
    staleTime: 5000,
    // FIXED: Auto-refresh ao usuário voltar à aba
    // Garante que mensagens novas são carregadas ao trocar de aba
    refetchOnWindowFocus: true,
    // FIXED: Refetch quando chat muda
    refetchOnMount: true,
  });

  // Reset mensagens quando troca de chat
  useEffect(() => {
    if (selectedChatJid) {
      // Invalida cache para forçar nova requisição
      queryClient.invalidateQueries({
        queryKey: [`/api/whatsapp/instances/${selectedInstanceId}/chats/${selectedChatJid}/messages`],
      });
    }
  }, [selectedChatJid, selectedInstanceId]);

  // Debug: Log messages data
  useEffect(() => {
    if (allMessages && allMessages.length > 0) {
      const lastMsg = allMessages[allMessages.length - 1];
      console.log('📨 Messages Updated:', {
        count: allMessages.length,
        lastMessage: lastMsg?.message?.conversation?.substring(0, 30) || 'not-text',
        lastMessageId: lastMsg?.id,
        lastIsOptimistic: lastMsg?.id?.includes('msg-') || lastMsg?.id?.includes('-') ? 'YES' : 'NO',
        isLoading: isLoadingMessages,
      });
    }
  }, [allMessages, isLoadingMessages]);

  // Helper function to clean markdown formatting from text
  const cleanMarkdownFormatting = (text?: string | null): string => {
    if (!text) return "";
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
  const normalizedChatSearch = debouncedSearchQuery.trim().toLowerCase();

  const groupNameByJid = useMemo(() => {
    const map = new Map<string, string>();
    chats?.forEach((chat) => {
      if (chat.remoteJid?.endsWith("@g.us") && chat.name) {
        map.set(chat.remoteJid, chat.name);
      }
    });
    return map;
  }, [chats]);

  const filteredChats = (chats?.filter(chat => {
    const isGroupItem = chat.remoteJid?.endsWith("@g.us");
    const matchesType =
      chatTypeFilter === "all" ||
      (chatTypeFilter === "groups" && isGroupItem) ||
      (chatTypeFilter === "contacts" && !isGroupItem);

    if (!matchesType) return false;

    if (!normalizedChatSearch) return true;

    const remoteLower = chat.remoteJid?.toLowerCase() ?? "";

    return (
      chat.name?.toLowerCase().includes(normalizedChatSearch) ||
      chat.pushName?.toLowerCase().includes(normalizedChatSearch) ||
      chat.last_message?.toLowerCase().includes(normalizedChatSearch) ||
      remoteLower.includes(normalizedChatSearch)
    );
  }) || []).sort((a, b) => {
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
  const selectedChatDisplayName = selectedChat
    ? selectedChat.remoteJid?.endsWith("@g.us")
      ? groupNameByJid.get(selectedChat.remoteJid) ||
        selectedChat.name ||
        selectedChat.pushName ||
        `Grupo ${selectedChat.remoteJid.split("@")[0]}`
      : selectedChat.name || selectedChat.pushName || formatJidDisplay(selectedChat.remoteJid)
    : "Contato";
  const selectedChatAvatarInitials = getNameInitials(selectedChatDisplayName);
  const selectedChatAvatarIdentifier = resolveAvatarIdentifier(
    selectedChat?.remoteJid,
    selectedChat?.id,
    selectedChatDisplayName
  );
  const selectedChatAvatarSrc = selectedChat?.profilePicUrl
    ? selectedChat.profilePicUrl
    : generateAvatarDataUri(selectedChatAvatarIdentifier, selectedChatAvatarInitials);

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

  // Note: Uazapi token is no longer required for sending messages
  // The backend now supports fallback to Evolution API if Uazapi is not available

  // Auto-scroll to bottom when messages load or change
  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Removido: lógica automática de marcar como lida
  // Agora apenas mostramos o status real do Evolution DB

  // Send message mutation with optimistic updates
  // 🚀 OTIMIZAÇÃO #3: Adicionar mensagem ao cache imediatamente (sem esperar servidor)
  // A mensagem aparece na tela <50ms após o clique do usuário
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { instanceNumber: string; recipientNumber: string; text: string }) => {
      // Enviar sem await - disparar em background e retornar imediatamente
      // Assim onMutate executa ANTES do servidor responder
      apiRequest("/api/whatsapp/send-message", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).catch(error => console.error('Background send error:', error));

      // Retornar sucesso imediatamente (não esperamos resposta do servidor)
      return { success: true };
    },
    onMutate: (variables) => {
      const messagesKey = [`/api/whatsapp/instances/${selectedInstanceId}/chats/${selectedChatJid}/messages`];

      // NÃO usar await - executa imediatamente (sem bloquear)
      queryClient.cancelQueries({ queryKey: messagesKey });

      // Pausar polling instantaneamente
      queryClient.setQueryDefaults(messagesKey, { refetchInterval: false });

      // Pegar dados do cache (síncrono)
      const previousMessages = queryClient.getQueryData<EvolutionMessage[]>(messagesKey) || [];

      // Gerar ID único (mais rápido, sem substr)
      const optimisticId = `${Date.now()}-${Math.random()}`;

      // Criar mensagem otimista
      const optimisticMessage: EvolutionMessage = {
        id: optimisticId,
        key: {
          id: optimisticId,
          fromMe: true,
          remoteJid: selectedChatJid || '',
        },
        messageType: 'extendedTextMessage',
        message: {
          conversation: variables.text,
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        status: 'pending',
        senderType: 'consultant',
      };

      // Atualizar cache INSTANTANEAMENTE
      queryClient.setQueryData(messagesKey, [...previousMessages, optimisticMessage]);

      return { previousMessages, optimisticId, messagesKey };
    },
    onSuccess: (response, variables, context) => {
      // Não mostrar toast para não bloquear a renderização
      setMessageText("");
      deleteMessageDraft();

      // Reabilitar polling
      if (context?.messagesKey) {
        queryClient.setQueryDefaults(context.messagesKey, { refetchInterval: 2000 });
      }
    },
    onError: (error: any, variables, context: any) => {
      // Rollback: restaurar dados anteriores
      if (context?.previousMessages && context?.messagesKey) {
        queryClient.setQueryData(context.messagesKey, context.previousMessages);
      }

      // Reabilitar polling
      if (context?.messagesKey) {
        queryClient.setQueryDefaults(context.messagesKey, { refetchInterval: 2000 });
      }

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
        queryKey: [`/api/whatsapp/instances/${selectedInstanceId}/chats/${selectedChatJid}/messages`]
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
        queryKey: [`/api/whatsapp/instances/${selectedInstanceId}/chats/${selectedChatJid}/messages`]
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
    if (!messageText.trim() || !selectedInstanceId || !selectedChatJid) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    if (!currentInstance) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Instância não encontrada. Recarregue a página.",
      });
      return;
    }

    // Get instance number from either 'number' field or extract from 'ownerJid'
    let instanceNumber = currentInstance.number;
    if (!instanceNumber && currentInstance.ownerJid) {
      // Extract number from ownerJid: "558487168184@s.whatsapp.net" -> "558487168184"
      instanceNumber = currentInstance.ownerJid.split('@')[0];
    }

    if (!instanceNumber) {
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
    // Usar nome da IA se registrada, senão usar apenas a mensagem
    let textWithName = messageText.trim();

    if (aiData?.bot_name) {
      // Formatar nome da IA: primeira palavra com maiúscula, resto com minúscula
      const parts = aiData.bot_name.trim().split(/\s+/);
      if (parts.length > 0) {
        // Primeira palavra com iniciais maiúsculas, resto em minúsculas
        const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        const restName = parts.slice(1).map(part => part.toLowerCase()).join(' ');
        const formattedName = restName ? `${firstName} ${restName}` : firstName;

        textWithName = `*${formattedName}:*\n${messageText.trim()}`;
      }
    }

    sendMessageMutation.mutate({
      instanceNumber: instanceNumber,
      recipientNumber: recipientNumber,
      text: textWithName,
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
      const date = new Date(timestamp * 1000);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
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

  // Formata data + hora completa para AudioMessage
  const formatFullTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp * 1000);
      if (isToday(date)) {
        return format(date, "HH:mm");
      } else if (isYesterday(date)) {
        return `Ontem ${format(date, "HH:mm")}`;
      } else {
        return format(date, "dd/MM/yyyy HH:mm");
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
  // Otimizado com useMemo para evitar re-agrupamento a cada render
  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const groups: { date: string; messages: EvolutionMessage[] }[] = [];

    // Reverse uma única vez
    const reversedMessages = [...messages].reverse();

    reversedMessages.forEach((message) => {
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
  }, [messages]);

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
      {/* Main Content - WhatsApp Layout */}
      <div className="flex-1 flex w-full overflow-hidden">
        {selectedInstanceId ? (
          <>
            {/* Chat List Sidebar with Resizable Handle */}
            <div
              className={`${selectedChatJid ? 'hidden md:flex' : 'flex'} relative`}
              style={{
                width: `${sidebarWidth}px`,
              }}
            >
              <ChatListSidebar
                selectedInstance={selectedInstance}
                onInstanceClick={() => setIsInstanceSelectorOpen(true)}
                onInstanceSettingsClick={() => openInstanceSettings()}
                onConfigureIAClick={handleConfigureIA}
                onCreateInstanceClick={() => setIsCreateInstanceDialogOpen(true)}
                isLoadingChats={isLoadingChats}
                chats={chats || []}
                filteredChats={filteredChats}
                selectedChatJid={selectedChatJid}
                onSelectChat={setSelectedChatJid}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                chatTypeFilter={chatTypeFilter}
                onChatTypeFilterChange={setChatTypeFilter}
                isPinned={isPinned}
                onTogglePin={togglePin}
                groupNameByJid={groupNameByJid}
                onArchiveChat={handleArchiveChat}
                onMarkAsRead={handleMarkAsRead}
                onMuteChat={handleMuteChat}
                isMuted={isMutedChat}
              />

              {/* Resize Handle */}
              <div
                onMouseDown={handleResizeStart}
                className={`w-1 bg-border/20 hover:bg-primary/40 cursor-col-resize transition-colors flex-shrink-0 select-none ${
                  isResizing ? 'bg-primary/60' : ''
                }`}
                style={{ userSelect: 'none' }}
                data-testid="sidebar-resize-handle"
              />
            </div>

            {/* Área de Mensagens (Direita) */}
            <div className={`${selectedChatJid ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-h-0 w-full overflow-x-hidden`}>
              {selectedChatJid ? (
                <>
                  {/* Alerta de Instância Offline */}
                  {selectedInstance?.connectionStatus && selectedInstance.connectionStatus !== 'open' && (
                    <div className="bg-destructive/10 border-b border-destructive/30 px-3 md:px-4 py-2 flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-destructive font-medium">
                          A instância está desconectada. Status: <strong>{selectedInstance?.connectionStatus}</strong>
                        </p>
                      </div>
                    </div>
                  )}
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
                        <AvatarImage src={selectedChatAvatarSrc} alt={selectedChatDisplayName} />
                        <AvatarFallback>{selectedChatAvatarInitials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-medium" data-testid="text-chat-name">
                          {selectedChatDisplayName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {selectedChat?.remoteJid}
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <IAConversationStatusBadge status={iaStatusForChat} />
                        <IAConversationActions 
                          status={iaStatusForChat}
                          onActivate={() => {
                            setIaStatusForChat('active');
                            toast({ title: "IA Ativada para esta conversa." });
                          }}
                          onPause={() => {
                            setIaStatusForChat('paused');
                            toast({ title: "IA Pausada para esta conversa." });
                          }}
                          onDeactivate={() => {
                            setIaStatusForChat('inactive');
                            toast({ title: "IA Desativada para esta conversa.", variant: "destructive" });
                          }}
                        />
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
                      </div>
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
                          autoComplete="off"
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
                        {/* CORRIGIDO: Backend retorna DESC (mais recentes primeiro), já revertido em useMemo */}
                        {groupedMessages.map((group, groupIndex) => (
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
                              const senderDisplayName = message.pushName
                                || senderProfile?.displayName
                                || formatJidDisplay(participantJid);

                              // Debug logging for sender name resolution
                              if (fromMe) {
                                console.log(`[DEBUG] Message from me - pushName: "${message.pushName}", displayName: "${senderProfile?.displayName}", final: "${senderDisplayName}"`);
                              }
                              const avatarInitials = getNameInitials(senderDisplayName);
                              const avatarIdentifier = resolveAvatarIdentifier(
                                participantJid,
                                message.key.remoteJid,
                                selectedChat?.remoteJid,
                                senderDisplayName
                              );
                              const shouldReserveAvatarSpace = Boolean(isGroupChat && !fromMe);
                              const shouldShowAvatar = shouldReserveAvatarSpace && !isSameSenderAsPrevious;
                              const showSenderLabel = shouldReserveAvatarSpace && !isSameSenderAsPrevious;

                              // Detect message sender type with proper priority:
                              // 1. senderType from API (most reliable)
                              // 2. fromMe flag (bot messages)
                              // 3. Prefix detection (validated against bot config)
                              const messageText = message.message?.conversation || "";
                              const messageSenderType = detectMessageSender(messageText, message.senderType, fromMe, botConfig);

                              // Extract prefix (sender name) if exists - validated against bot config
                              const { name: prefixName, cleanMessage, isValid: isPrefixValid } = extractMessagePrefix(messageText, botConfig);

                              // Determine if we should show the prefix label
                              // Show prefix only for AI and Consultant, and only if different from previous sender, and only if valid
                              const shouldShowPrefix =
                                (messageSenderType === "ai" || messageSenderType === "consultant") &&
                                !isSameSenderAsPrevious &&
                                prefixName &&
                                isPrefixValid;

                              // Debug logging for prefix detection
                              if (prefixName || messageText.includes(':')) {
                                console.log(`[DEBUG] Message ${message.id}:`, {
                                  text: messageText.substring(0, 50),
                                  extractedName: prefixName,
                                  senderType: messageSenderType,
                                  shouldShow: shouldShowPrefix,
                                  isSameSenderAsPrevious,
                                  botConfigNames: {
                                    bot_name: botConfig?.bot_name,
                                    consultant_name: botConfig?.consultant_name
                                  }
                                });
                              }

                              // Determine message styling based on sender type
                              let fromMeSurfaceClass: string;
                              let messageAlignment: string;

                              if (messageSenderType === "ai") {
                                // AI messages: Purple background, right-aligned
                                fromMeSurfaceClass = "text-white bg-violet-500 dark:bg-violet-600 shadow-lg shadow-violet-500/25";
                                messageAlignment = "justify-end";
                              } else if (messageSenderType === "consultant") {
                                // Consultant messages: Purple background, right-aligned (identified by name prefix without circles)
                                // If has prefix label, use solid purple; if standalone message (avulsa), use lighter purple with border
                                if (shouldShowPrefix) {
                                  fromMeSurfaceClass = "text-white bg-violet-500 dark:bg-violet-600 shadow-lg shadow-violet-500/25";
                                } else {
                                  // Standalone consultant message: lighter purple background with darker purple border
                                  fromMeSurfaceClass = "text-violet-900 dark:text-violet-100 bg-violet-200/50 dark:bg-violet-950/40 border border-violet-500";
                                }
                                messageAlignment = "justify-end";
                              } else {
                                // Client messages: Default styling (card background), left-aligned
                                fromMeSurfaceClass = "bg-card border";
                                messageAlignment = "justify-start";
                              }

                              const attachmentWrapperClasses = (messageSenderType === "ai" || messageSenderType === "consultant")
                                ? "flex flex-col gap-2 items-end max-w-[65%]"
                                : "flex flex-col gap-2 items-start";
                              const renderSenderBadge = () => {
                                // Badge is no longer shown - color differentiation is enough
                                return null;
                              };

                              return (
                                <div
                                  key={message.id}
                                  className={`flex flex-col gap-1 group w-full`}
                                  data-testid={`message-${message.id}`}
                                >
                                  {/* Prefix label - shown above message bubble for grouped messages */}
                                  {shouldShowPrefix && (
                                    <div className={`flex ${messageSenderType === "ai" || messageSenderType === "consultant" ? "justify-end" : "justify-start"} px-4`}>
                                      <div className={`font-bold text-sm flex items-center gap-1.5 px-3 py-1 rounded ${
                                        messageSenderType === "ai"
                                          ? "bg-violet-500/30 text-violet-100"
                                          : "bg-violet-500/30 text-violet-100"
                                      }`}>
                                        <span>{prefixName}</span>
                                        {messageSenderType === "ai" && <span>🟢🟢</span>}
                                      </div>
                                    </div>
                                  )}

                                  {/* Main message container with alignment */}
                                  <div
                                    className={`flex gap-2 w-full ${messageAlignment} ${
                                      isSameSenderAsPrevious ? 'mt-0.5' : 'mt-0'
                                    }`}
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
                                            src={senderProfile?.profilePicUrl || generateAvatarDataUri(avatarIdentifier, avatarInitials)}
                                            alt={senderDisplayName}
                                          />
                                          <AvatarFallback>{avatarInitials}</AvatarFallback>
                                        </Avatar>
                                      ) : (
                                        <div className="h-8 w-8" />
                                      )}
                                    </div>
                                  )}

                                  {/* Audio Message sem caixa extra */}
                                  {message.message?.audioMessage && (
                                    <div className={attachmentWrapperClasses}>
                                      {renderSenderBadge()}
                                      <AudioMessage
                                        messageId={message.id}
                                        senderName={senderDisplayName}
                                        senderAvatar={senderProfile?.profilePicUrl ?? undefined}
                                        senderIdentifier={avatarIdentifier}
                                        timestamp={formatFullTimestamp(message.messageTimestamp)}
                                        fromMe={fromMe}
                                      />
                                    </div>
                                  )}

                                  {/* Sticker Message - Sem container */}
                                  {message.message?.stickerMessage && (
                                    <div className={`${attachmentWrapperClasses} relative`}>
                                      {renderSenderBadge()}
                                      <StickerMessage messageId={message.id} />
                                      <div className="flex items-center gap-1">
                                        <p className="text-[10px] opacity-60">
                                          {formatTimestamp(message.messageTimestamp)}
                                        </p>
                                        <MessageStatus status={message.status} fromMe={fromMe} />
                                      </div>
                                    </div>
                                  )}

                                  {/* Image Message - Sem container */}
                                  {message.message?.imageMessage && (
                                    <div className={`${attachmentWrapperClasses} relative`}>
                                      {renderSenderBadge()}
                                      <ImageMessage
                                        messageId={message.id}
                                        caption={message.message.imageMessage.caption}
                                      />
                                      <div className="flex items-center gap-1 absolute bottom-2 left-2">
                                        <p className="text-[10px] opacity-60 text-foreground drop-shadow">
                                          {formatTimestamp(message.messageTimestamp)}
                                        </p>
                                        <MessageStatus status={message.status} fromMe={fromMe} />
                                      </div>
                                    </div>
                                  )}

                                  {/* Video Message - Sem container */}
                                  {message.message?.videoMessage && (
                                    <div className={`${attachmentWrapperClasses} relative`}>
                                      {renderSenderBadge()}
                                      <VideoMessage
                                        messageId={message.id}
                                        caption={message.message.videoMessage.caption}
                                      />
                                      <div className="flex items-center gap-1 absolute bottom-2 left-2">
                                        <p className="text-[10px] opacity-60 text-foreground drop-shadow">
                                          {formatTimestamp(message.messageTimestamp)}
                                        </p>
                                        <MessageStatus status={message.status} fromMe={fromMe} />
                                      </div>
                                    </div>
                                  )}

                                  {/* PTV Message (video redondo) - Sem container */}
                                  {message.message?.ptvMessage && (
                                    <div className={`${attachmentWrapperClasses} relative`}>
                                      {renderSenderBadge()}
                                      <VideoMessage messageId={message.id} />
                                      <div className="flex items-center gap-1 absolute bottom-2 left-2">
                                        <p className="text-[10px] opacity-60 text-foreground drop-shadow">
                                          {formatTimestamp(message.messageTimestamp)}
                                        </p>
                                        <MessageStatus status={message.status} fromMe={fromMe} />
                                      </div>
                                    </div>
                                  )}

                                  {/* Document/PDF Message - Sem container */}
                                  {message.message?.documentMessage && (
                                    <div className={attachmentWrapperClasses}>
                                      {renderSenderBadge()}
                                      <div
                                        className={`w-80 rounded-xl p-4 relative group ${messageSenderType !== "client" ? `${fromMeSurfaceClass} text-white` : 'bg-card border text-card-foreground'}`}
                                      >
                                      {/* Header com ícone e info */}
                                      <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-start gap-3 flex-1">
                                          <svg className="h-8 w-8 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                            <path d="m22.75 7.63a2.752 2.752 0 0 0 -2.75-2.75h-9.085a2.752 2.752 0 0 0 -2.4-1.427h-4.515a2.753 2.753 0 0 0 -2.752 2.747v11.6a2.753 2.753 0 0 0 2.752 2.747h16a2.753 2.753 0 0 0 2.75-2.75v-8.953-.01zm-2.75-1.25a1.251 1.251 0 0 1 1.25 1.25v.464h-8.044a1.253 1.253 0 0 1 -1.137-.73l-.451-.984zm1.252 11.42a1.252 1.252 0 0 1 -1.252 1.247h-16a1.252 1.252 0 0 1 -1.25-1.25v-11.597a1.252 1.252 0 0 1 1.25-1.247h4.513a1.252 1.252 0 0 1 1.136.73l1.057 2.305a2.755 2.755 0 0 0 2.5 1.606h8.046z" />
                                          </svg>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate">
                                              {message.message.documentMessage.fileName || 'Documento'}
                                            </p>
                                            <p className="text-xs opacity-80">
                                              {message.message.documentMessage.mimetype?.split('/')[1]?.toUpperCase() || 'ARQUIVO'}
                                            </p>
                                          </div>
                                        </div>
                                        {/* Timestamp no canto superior direito */}
                                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                          <p className="text-[10px] opacity-80">
                                            {formatTimestamp(message.messageTimestamp)}
                                          </p>
                                          <MessageStatus status={message.status} fromMe={fromMe} />
                                        </div>
                                      </div>

                                      {/* Botões de ação */}
                                      <div className="flex gap-3 justify-between">
                                        <button
                                          onClick={() => {
                                            const downloadUrl = `/api/whatsapp/media/decrypt/${message.id}`;
                                            const link = document.createElement('a');
                                            link.href = downloadUrl;
                                            link.download = message.message.documentMessage!.fileName || 'documento';
                                            link.click();
                                          }}
                                          className="flex-1 text-white text-sm font-medium py-2 rounded-lg transition-colors hover:opacity-80"
                                          style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                          }}
                                          data-testid={`document-open-${message.id}`}
                                        >
                                          Abrir
                                        </button>
                                        <button
                                          onClick={() => {
                                            const downloadUrl = `/api/whatsapp/media/decrypt/${message.id}`;
                                            const link = document.createElement('a');
                                            link.href = downloadUrl;
                                            link.download = message.message.documentMessage!.fileName || 'documento';
                                            link.click();
                                          }}
                                          className="flex-1 text-white text-sm font-medium py-2 rounded-lg transition-colors hover:opacity-80"
                                          style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                          }}
                                          data-testid={`document-save-${message.id}`}
                                        >
                                          Salvar como...
                                        </button>
                                      </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Todas as outras mensagens com caixa */}
                                  {!message.message?.audioMessage &&
                                   !message.message?.stickerMessage &&
                                   !message.message?.imageMessage &&
                                   !message.message?.videoMessage &&
                                   !message.message?.ptvMessage &&
                                   !message.message?.documentMessage && (
                                  <div
                                    className={`max-w-[65%] min-w-0 rounded-xl px-4 py-4 break-words overflow-hidden flex flex-col gap-2 ${
                                      messageSenderType !== "client" ? fromMeSurfaceClass : 'bg-card border'
                                    }`}
                                    style={{
                                      wordBreak: 'break-word',
                                      overflowWrap: 'anywhere',
                                    }}
                                  >
                                    {renderSenderBadge()}
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
                                            {renderTextWithLinks(cleanMarkdownFormatting(message.message.editedMessage.message.conversation))}
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
                                        {renderTextWithLinks(cleanMarkdownFormatting(cleanMessage))}
                                      </p>
                                    )}

                                    {/* Timestamp - mostrar em todas as mensagens */}
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                      <p className="text-[10px] opacity-60">
                                        {formatTimestamp(message.messageTimestamp)}
                                      </p>
                                      <MessageStatus status={message.status} fromMe={fromMe} />
                                    </div>
                                  </div>
                                  )}

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
                                  {/* End of main message container */}
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

                  {/* Input de Mensagem - Design Simples */}
                  {selectedInstance?.number ? (
                    <div className="flex-shrink-0 px-4 py-3 relative bg-muted/5 text-foreground">
                      {/* Input file oculto */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {/* Caixa de Input sem borda */}
                      <div className="flex items-center gap-2 rounded-3xl px-4 py-1 bg-muted/30 transition-colors">
                        {isRecordingAudio ? (
                          // Gravador inline quando estiver gravando
                          <AudioRecorderInline
                            isRecording={isRecordingAudio}
                            onStartRecording={() => setIsRecordingAudio(true)}
                            onStopRecording={() => setIsRecordingAudio(false)}
                            onCancelRecording={() => setIsRecordingAudio(false)}
                            onSendAudio={async (audioBlob, waveformData, duration) => {
                              if (!selectedInstance?.number || !selectedChatJid) {
                                toast({ title: "Erro", description: "Selecione uma instância e chat" });
                                return;
                              }

                              setIsSendingAudio(true);

                              // Converter Blob para base64
                              const reader = new FileReader();
                              reader.onload = async () => {
                                const base64Audio = (reader.result as string).split(',')[1];

                                try {
                                  await apiRequest("/api/whatsapp/send-audio", {
                                    method: "POST",
                                    body: JSON.stringify({
                                      instanceNumber: selectedInstance.number,
                                      recipientNumber: selectedChatJid,
                                      audio: base64Audio,
                                      waveformData,
                                      duration,
                                    }),
                                    headers: { "Content-Type": "application/json" },
                                  });

                                  toast({ title: "Áudio enviado com sucesso!" });
                                  setIsRecordingAudio(false);
                                  setIsSendingAudio(false);

                                  // Invalidar cache para atualizar mensagens
                                  queryClient.invalidateQueries({
                                    queryKey: [`/api/whatsapp/instances/${selectedInstanceId}/chats/${selectedChatJid}/messages`],
                                  });
                                } catch (error) {
                                  setIsSendingAudio(false);
                                  toast({
                                    title: "Erro ao enviar áudio",
                                    description: error instanceof Error ? error.message : "Tente novamente",
                                  });
                                }
                              };
                              reader.readAsDataURL(audioBlob);
                            }}
                            isSending={isSendingAudio}
                          />
                        ) : (
                          <>
                            {/* Botão Anexar */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => fileInputRef.current?.click()}
                              className="shrink-0 h-8 w-8 rounded-full hover:bg-accent"
                              data-testid="button-attach"
                              title="Anexar arquivo (ou Ctrl+V)"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>

                            {/* Input de Texto */}
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
                              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:outline-0 outline-none resize-none text-sm py-2"
                              style={{
                                height: '32px',
                                minHeight: '32px',
                                maxHeight: '96px',
                                overflowY: messageText.split('\n').length > 3 ? 'auto' : 'hidden'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = '32px';
                                target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
                              }}
                              data-testid="input-message"
                            />

                            {/* Botão Microfone ou Enviar */}
                            {messageText.trim() ? (
                              <Button
                                onClick={handleSendMessage}
                                disabled={sendMessageMutation.isPending}
                                size="icon"
                                className="shrink-0 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                data-testid="button-send-message"
                              >
                                {sendMessageMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <SendIcon className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-8 w-8 rounded-full hover:bg-accent"
                                data-testid="button-voice"
                                title="Mensagem de voz"
                                onClick={() => setIsRecordingAudio(true)}
                              >
                                <Mic className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Emoji Picker */}
                      {isEmojiPickerOpen && (
                        <div className="absolute bottom-full left-4 mb-2 z-50">
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
                              theme={theme}
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
                                <SendIcon className="h-4 w-4 mr-2" />
                                Enviar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  {selectedInstance?.connectionStatus && selectedInstance.connectionStatus !== 'open' && (
                    <div className="w-full bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-3">
                      <div className="text-xl flex-shrink-0">⚠️</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-destructive">Instância Desconectada</h4>
                        <p className="text-sm text-destructive/80">
                          A instância <strong>{selectedInstance?.name || selectedInstance?.number}</strong> está {selectedInstance?.connectionStatus === 'close' ? 'desconectada' : 'indisponível'}.
                          Status: <strong>{selectedInstance?.connectionStatus}</strong>
                        </p>
                      </div>
                    </div>
                  )}
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

      {/* Contact Metadata Dialog */}
      {selectedInstanceId && selectedChatJid && (
        <ContactMetadataDialog
          isOpen={isContactMetadataDialogOpen}
          onClose={() => setIsContactMetadataDialogOpen(false)}
          instanceId={selectedInstanceId}
          remoteJid={selectedChatJid}
          contactName={selectedChatDisplayName}
        />
      )}

      {/* Instance Selector Modal */}
      <InstanceSelectorModal
        open={isInstanceSelectorOpen}
        onOpenChange={setIsInstanceSelectorOpen}
        onSelectInstance={(instance) => {
          setSelectedInstance(instance);
          setSelectedChatJid(null);
          addToRecent(instance.id);
        }}
        onCreateNewInstance={() => {
          setIsInstanceSelectorOpen(false);
          setIsCreateInstanceDialogOpen(true);
        }}
        selectedInstanceId={selectedInstance?.id}
      />

      <InstanceSettingsDialog
        open={isInstanceSettingsDialogOpen}
        onOpenChange={(open) => {
          setIsInstanceSettingsDialogOpen(open);
          if (!open) {
            setInstanceSettingsContext(null);
          }
        }}
        instanceNumber={instanceSettingsContext?.number ?? undefined}
        instanceName={instanceSettingsContext?.name ?? undefined}
      />

      <CreateInstanceDialog
        open={isCreateInstanceDialogOpen}
        onOpenChange={setIsCreateInstanceDialogOpen}
      />

    </div>
  );
}
