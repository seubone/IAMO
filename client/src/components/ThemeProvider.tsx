import { createContext, useContext, useEffect, useState } from "react";
import { setTheme as saveTheme, getTheme as loadTheme } from "@/lib/storage";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Tentar recuperar do storage primeiro
    const savedTheme = loadTheme();
    if (savedTheme) return savedTheme;

    // Fallback para localStorage (storageKey antigo)
    const localTheme = localStorage.getItem(storageKey) as Theme;
    if (localTheme) return localTheme;

    return defaultTheme;
  });

  // Atualizar classe no HTML quando tema mudar
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  // Sincronizar tema entre abas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Detectar mudanças da chave "app_theme" (do storage.ts)
      if (e.key === "app_theme" && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (newTheme === "light" || newTheme === "dark") {
          console.log(`🌓 Tema sincronizado de outra aba: ${newTheme}`);
          setTheme(newTheme);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      // Salvar em ambos os storages (compatibilidade)
      localStorage.setItem(storageKey, theme);
      saveTheme(theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
