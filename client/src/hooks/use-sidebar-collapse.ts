import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarStore {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

export const useSidebarCollapse = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      setIsCollapsed: (collapsed: boolean) => set({ isCollapsed: collapsed }),
      toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
    }),
    {
      name: "sidebar-collapse-storage",
    }
  )
);
