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
        console.log(`📱 Instância selecionada: ${instance.name} (${instance.id})`);
        set({ selectedInstance: instance });
      },
      clearSelectedInstance: () => {
        console.log(`📱 Instância limpa`);
        set({ selectedInstance: null });
      },
    }),
    {
      name: "selected-instance-storage",
    }
  )
);
