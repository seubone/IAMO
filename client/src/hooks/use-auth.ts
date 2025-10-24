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
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasHydrated: boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (user, token) => {
        console.log("✅ Setting authentication for user:", user.email);
        localStorage.setItem("auth_token", token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        console.log("🚪 Logging out user");
        localStorage.removeItem("auth_token");
        set({ user: null, token: null, isAuthenticated: false });
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
