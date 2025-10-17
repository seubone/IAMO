import { useState, useEffect } from "react";

interface InstancePreferences {
  favorites: string[]; // IDs de instâncias favoritas
  recentInstances: { id: string; timestamp: number }[]; // Instâncias recentes com timestamp
}

const STORAGE_KEY = "whatsapp_instance_preferences";
const MAX_RECENT = 5;

export function useInstancePreferences() {
  const [preferences, setPreferences] = useState<InstancePreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error loading instance preferences:", error);
    }
    return { favorites: [], recentInstances: [] };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error("Error saving instance preferences:", error);
    }
  }, [preferences]);

  const toggleFavorite = (instanceId: string) => {
    setPreferences(prev => ({
      ...prev,
      favorites: prev.favorites.includes(instanceId)
        ? prev.favorites.filter(id => id !== instanceId)
        : [...prev.favorites, instanceId]
    }));
  };

  const addToRecent = (instanceId: string) => {
    setPreferences(prev => {
      // Remove existing entry
      const filtered = prev.recentInstances.filter(r => r.id !== instanceId);
      
      // Add to front
      const updated = [
        { id: instanceId, timestamp: Date.now() },
        ...filtered
      ].slice(0, MAX_RECENT);
      
      return {
        ...prev,
        recentInstances: updated
      };
    });
  };

  const isFavorite = (instanceId: string) => preferences.favorites.includes(instanceId);

  return {
    favorites: preferences.favorites,
    recentInstances: preferences.recentInstances.map(r => r.id),
    toggleFavorite,
    addToRecent,
    isFavorite
  };
}
