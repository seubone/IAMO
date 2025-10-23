import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EvolutionInstance } from "@/types/whatsapp";

interface SelectedInstanceState {
  selectedInstance: EvolutionInstance | null;
  setSelectedInstance: (instance: EvolutionInstance) => void;
  clearSelectedInstance: () => void;
}

export const useSelectedInstance = create<SelectedInstanceState>()(
  persist(
    (set) => ({
      selectedInstance: null,
      setSelectedInstance: (instance) => {
        set({ selectedInstance: instance });
      },
      clearSelectedInstance: () => {
        set({ selectedInstance: null });
      },
    }),
    {
      name: "selected-instance-storage",
    }
  )
);
