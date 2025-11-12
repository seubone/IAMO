import { createContext, useContext, useEffect, useState } from "react";

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

// Chave ÚNICA e simples
const THEME_STORAGE_KEY = "theme";

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "ui-theme", // mantém por compatibilidade
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Tentar recuperar do localStorage com chave simples
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        console.log(`🎨 Tema carregado: ${saved}`);
        return saved;
      }
    } catch (error) {
      console.warn("Erro ao carregar tema:", error);
    }

    // Se não encontrou, usar padrão
    console.log(`🎨 Tema padrão: ${defaultTheme}`);
    return defaultTheme;
  });

  // Aplicar tema no HTML IMEDIATAMENTE quando mudar
  useEffect(() => {
    const html = document.documentElement;
    // Remover ambas as classes
    html.classList.remove("light", "dark");
    // Adicionar a classe correta
    html.classList.add(theme);
    html.style.colorScheme = theme;
    console.log(`🎨 Classe adicionada ao HTML: ${theme}`);
  }, [theme]);

  // Listener para sincronizar entre abas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (newTheme === "light" || newTheme === "dark") {
          console.log(`🌓 Tema sincronizado de outra aba: ${newTheme}`);
          setTheme(newTheme);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      console.log(`💾 Salvando tema: ${newTheme}`);
      // Salvar no localStorage com chave simples
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      // Atualizar estado
      setTheme(newTheme);
      // Aplicar imediatamente no HTML
      const html = document.documentElement;
      html.classList.remove("light", "dark");
      html.classList.add(newTheme);
      html.style.colorScheme = newTheme;
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
