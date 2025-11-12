import { useState, useEffect } from "react";

interface PinnedChats {
  [instanceId: string]: string[]; // Map de instanceId -> array de remoteJids fixados
}

const STORAGE_KEY = "whatsapp_pinned_chats";

export function usePinnedChats(instanceId: string | null) {
  const [pinnedChats, setPinnedChats] = useState<PinnedChats>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error loading pinned chats:", error);
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedChats));
    } catch (error) {
      console.error("Error saving pinned chats:", error);
    }
  }, [pinnedChats]);

  const togglePin = (remoteJid: string) => {
    if (!instanceId) return;
    
    setPinnedChats(prev => {
      const instancePins = prev[instanceId] || [];
      const newInstancePins = instancePins.includes(remoteJid)
        ? instancePins.filter(jid => jid !== remoteJid)
        : [...instancePins, remoteJid];
      
      return {
        ...prev,
        [instanceId]: newInstancePins
      };
    });
  };

  const isPinned = (remoteJid: string) => {
    if (!instanceId) return false;
    return (pinnedChats[instanceId] || []).includes(remoteJid);
  };

  const getPinnedChats = () => {
    if (!instanceId) return [];
    return pinnedChats[instanceId] || [];
  };

  return {
    togglePin,
    isPinned,
    getPinnedChats
  };
}
