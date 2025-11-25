import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./use-auth";

// Global flag to prevent simultaneous token refresh from multiple instances
let isRefreshingToken = false;

/**
 * Hook to automatically refresh Supabase session token before expiration
 * This prevents "Token inválido" (401) errors when the token expires
 */
export function useTokenRefresh() {
  const { setAuth } = useAuth();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startTokenRefresh = async () => {
      try {
        // Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          console.log("No active session to refresh");
          return;
        }

        // Calculate time until expiration (with 5-minute buffer before actual expiry)
        const expiresIn = session.expires_at ? session.expires_at * 1000 - Date.now() : null;

        if (!expiresIn || expiresIn < 0) {
          console.warn("⚠️ Session has expired, redirecting to login...");
          return;
        }

        // Refresh token 5 minutes before it expires
        const refreshTime = Math.max(expiresIn - 5 * 60 * 1000, 1000);

        console.log(`🔄 Token refresh scheduled in ${(refreshTime / 1000 / 60).toFixed(1)} minutes`);

        refreshIntervalRef.current = setTimeout(async () => {
          // Prevent simultaneous refresh attempts from multiple instances
          if (isRefreshingToken) {
            console.log("⏳ Token refresh already in progress, skipping...");
            return;
          }

          try {
            isRefreshingToken = true;
            console.log("🔄 Attempting to refresh token...");

            const { data, error } = await supabase.auth.refreshSession();

            if (error || !data.session) {
              console.error("❌ Failed to refresh token:", error);
              return;
            }

            const user = data.session.user;
            if (user) {
              // Update auth state with new token
              setAuth(
                {
                  id: user.id,
                  email: user.email || "",
                  name: user.user_metadata?.name || user.email || "User",
                  role: "viewer", // Default role
                },
                data.session.access_token
              );

              console.log("✅ Token refreshed successfully!");

              // Schedule next refresh
              startTokenRefresh();
            }
          } catch (err) {
            console.error("❌ Error during token refresh:", err);
          } finally {
            isRefreshingToken = false;
          }
        }, refreshTime);
      } catch (error) {
        console.error("Failed to setup token refresh:", error);
      }
    };

    startTokenRefresh();

    // Cleanup
    return () => {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }
    };
  }, [setAuth]);
}
