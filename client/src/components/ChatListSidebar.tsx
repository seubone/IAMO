import { useState } from "react";
import {
  Search,
  ChevronDown,
  Filter,
  Pin,
  Loader2,
  Archive,
  Bell,
  BellOff,
  Check,
  MoreVertical,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { EvolutionInstance, EvolutionChat } from "@/types/whatsapp";
import { generateAvatarDataUri, resolveAvatarIdentifier } from "@/lib/avatar-generator";

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

interface ChatListSidebarProps {
  selectedInstance: EvolutionInstance | null;
  onInstanceClick: () => void;
  isLoadingChats: boolean;
  chats: EvolutionChat[];
  filteredChats: EvolutionChat[];
  selectedChatJid: string | null;
  onSelectChat: (jid: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  chatTypeFilter: "contacts" | "groups" | "all";
  onChatTypeFilterChange: (type: "contacts" | "groups" | "all") => void;
  isPinned: (jid: string) => boolean;
  onTogglePin: (jid: string) => void;
  groupNameByJid: Map<string, string>;
  onArchiveChat?: (jid: string) => void;
  onMarkAsRead?: (jid: string) => void;
  onMuteChat?: (jid: string) => void;
  isMuted?: (jid: string) => boolean;
}

const formatChatTime = (timestamp?: number): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
};

const formatJidDisplay = (jid?: string | null): string => {
  if (!jid) return "Contato";
  const withoutDomain = jid.split("@")[0] || jid;
  if (/^\d+$/.test(withoutDomain)) {
    return withoutDomain.startsWith("+") ? withoutDomain : `+${withoutDomain}`;
  }
  const cleaned = withoutDomain.replace(/[_]+/g, " ").trim();
  return cleaned || "Contato";
};

export function ChatListSidebar({
  selectedInstance,
  onInstanceClick,
  isLoadingChats,
  chats,
  filteredChats,
  selectedChatJid,
  onSelectChat,
  searchQuery,
  onSearchChange,
  chatTypeFilter,
  onChatTypeFilterChange,
  isPinned,
  onTogglePin,
  groupNameByJid,
  onArchiveChat,
  onMarkAsRead,
  onMuteChat,
  isMuted,
}: ChatListSidebarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const pinnedChats = filteredChats.filter((chat) => isPinned(chat.remoteJid));
  const unpinnedChats = filteredChats.filter((chat) => !isPinned(chat.remoteJid));

  const formatChatName = (chat: EvolutionChat): string => {
    const isGroup = chat.remoteJid?.endsWith("@g.us");
    if (isGroup) {
      return (
        groupNameByJid.get(chat.remoteJid) ||
        chat.name ||
        chat.pushName ||
        `Grupo ${chat.remoteJid?.split("@")[0]}`
      );
    }
    return chat.name || chat.pushName || formatJidDisplay(chat.remoteJid);
  };

  const renderChatItem = (chat: EvolutionChat, isPinnedItem: boolean) => {
    const chatDisplayName = formatChatName(chat);
    const isGroup = chat.remoteJid?.endsWith("@g.us");
    const chatAvatarInitials = getNameInitials(chatDisplayName);
    const chatAvatarIdentifier = resolveAvatarIdentifier(
      chat.remoteJid,
      chat.id,
      chatDisplayName
    );
    const chatAvatarSrc =
      chat.profilePicUrl ||
      generateAvatarDataUri(chatAvatarIdentifier, chatAvatarInitials);
    const chatMuted = isMuted?.(chat.remoteJid) ?? false;

    return (
      <div
        key={chat.id}
        className="group w-full px-2 py-2 flex items-start gap-3 rounded-lg transition-colors text-left"
      >
        <button
          onClick={() => onSelectChat(chat.remoteJid)}
          className={`flex-1 flex items-start gap-3 rounded-lg transition-colors text-left ${
            selectedChatJid === chat.remoteJid ? "bg-accent/60" : ""
          }`}
          data-testid={`chat-item-${chat.remoteJid}`}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={chatAvatarSrc} alt={chatDisplayName} />
              <AvatarFallback>{chatAvatarInitials}</AvatarFallback>
            </Avatar>
            {isGroup && (
              <div className="absolute -bottom-1 -right-1 bg-accent/80 rounded-full p-1">
                <span className="text-xs font-bold text-accent-foreground">👥</span>
              </div>
            )}
          </div>

          {/* Chat Info */}
          <div className="flex-1 min-w-0">
            {/* Header: Name + Time */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {isPinnedItem && <Pin className="h-4 w-4 text-primary flex-shrink-0" />}
                <h3 className="font-medium truncate text-sm">{chatDisplayName}</h3>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                {formatChatTime(chat.last_message_timestamp)}
              </span>
            </div>

            {/* Last Message + Unread Badge */}
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground truncate flex-1">
                {chat.last_message || "Sem mensagens"}
              </p>
              {chat.unreadMessages > 0 && (
                <Badge
                  variant="default"
                  className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-xs bg-primary hover:bg-primary text-primary-foreground font-semibold flex-shrink-0"
                >
                  {chat.unreadMessages > 99 ? "99+" : chat.unreadMessages}
                </Badge>
              )}
            </div>
          </div>
        </button>

        {/* Dropdown Menu Button - visible on hover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              data-testid={`chat-menu-${chat.remoteJid}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          {/* Dropdown Menu Content */}
          <DropdownMenuContent align="end" className="w-48">
            {/* Pin/Unpin Option */}
            <DropdownMenuItem
              onClick={() => onTogglePin(chat.remoteJid)}
            >
              <Pin className="h-4 w-4 mr-2" />
              {isPinnedItem ? "Desafixar" : "Fixar"}
            </DropdownMenuItem>

            {/* Mark as Read Option */}
            {chat.unreadMessages > 0 && onMarkAsRead && (
              <DropdownMenuItem
                onClick={() => onMarkAsRead(chat.remoteJid)}
              >
                <Check className="h-4 w-4 mr-2" />
                Marcar como lido
              </DropdownMenuItem>
            )}

            {/* Mute/Unmute Option */}
            {onMuteChat && (
              <DropdownMenuItem
                onClick={() => onMuteChat(chat.remoteJid)}
              >
                {chatMuted ? (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Desativar silêncio
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Silenciar chat
                  </>
                )}
              </DropdownMenuItem>
            )}

            {/* Archive Option */}
            {onArchiveChat && (
              <DropdownMenuItem
                onClick={() => onArchiveChat(chat.remoteJid)}
              >
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-sm overflow-hidden border-r border-border/30">
      {/* Instance Selector Header */}
      <div className="px-4 py-3 flex-shrink-0 border-b border-border/20">
        <button
          onClick={onInstanceClick}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors"
        >
          {selectedInstance && (
            <>
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={selectedInstance.profilePicUrl || undefined}
                  alt={selectedInstance.name || selectedInstance.number}
                />
                <AvatarFallback>
                  {getNameInitials(selectedInstance.name || selectedInstance.number)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate">
                  {selectedInstance.name || selectedInstance.number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedInstance.number}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </>
          )}
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="px-4 py-3 flex-shrink-0">
        {/* Search Input with Filter Button */}
        <div className="relative flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            id="chat-search-input"
            type="text"
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-12 pr-12 h-11 text-sm rounded-full"
            data-testid="input-search-chats"
            autoComplete="off"
          />

          {/* Filter Button inside Input */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 h-8 w-8 p-0 rounded-full hover:bg-accent/30"
                data-testid="button-filter-chats"
              >
                <Filter className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium">Filtrar por tipo</p>
                <div className="space-y-2">
                  {[
                    { value: "all", label: "Todos" },
                    { value: "contacts", label: "Contatos" },
                    { value: "groups", label: "Grupos" },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`filter-${option.value}`}
                        checked={chatTypeFilter === option.value}
                        onCheckedChange={() =>
                          onChatTypeFilterChange(option.value as "contacts" | "groups" | "all")
                        }
                      />
                      <Label
                        htmlFor={`filter-${option.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingChats ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa"}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {/* Pinned Chats Section */}
            {pinnedChats.length > 0 && (
              <div>
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  📌 Fixados
                </p>
                <div className="space-y-1">
                  {pinnedChats.map((chat) => renderChatItem(chat, true))}
                </div>
              </div>
            )}

            {/* Unpinned Chats Section */}
            {unpinnedChats.length > 0 && (
              <div>
                {pinnedChats.length > 0 && (
                  <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Conversas
                  </p>
                )}
                <div className="space-y-1">
                  {unpinnedChats.map((chat) => renderChatItem(chat, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
