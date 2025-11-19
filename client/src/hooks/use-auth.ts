import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  profile: { name?: string; avatar_url?: string } | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  setProfile: (profile: { name?: string; avatar_url?: string }) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasHydrated: boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (user, token) => {
        console.log("✅ Setting authentication for user:", user.email);
        localStorage.setItem("auth_token", token);
        set({ user, token, isAuthenticated: true, profile: { name: user.name } });
      },
      setProfile: (profile) => {
        set({ profile });
      },
      logout: () => {
        console.log("🚪 Logging out user");
        localStorage.removeItem("auth_token");
        set({ user: null, token: null, isAuthenticated: false, profile: null });
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);

/**
 * Get the logout function directly (useful for imperative logout calls)
 */
export function performLogout() {
  useAuth.getState().logout();
}
