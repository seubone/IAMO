import { useEffect } from "react";

// Load Supabase config from server on app initialization
export function useLoadSupabaseConfig() {
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/config/public");
        if (response.ok) {
          const config = await response.json();
          // Inject into window so supabase.ts can access
          (window as any).__SUPABASE_URL = config.supabaseUrl;
          (window as any).__SUPABASE_ANON_KEY = config.supabaseAnonKey;
        }
      } catch (error) {
        console.error("Failed to load Supabase config:", error);
      }
    };

    loadConfig();
  }, []);
}
