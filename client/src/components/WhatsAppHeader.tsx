import { Search, User, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface WhatsAppHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function WhatsAppHeader({ searchQuery, onSearchChange }: WhatsAppHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="h-16 border-b flex items-center justify-between px-6 gap-4 bg-card">
      {/* Logo/Title */}
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold text-primary">Monitor IA</div>
        <div className="text-sm text-muted-foreground hidden md:block">WhatsApp Business</div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-2xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Buscar conversas ou mensagens..."
          className="pl-10 bg-muted/50"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          data-testid="input-global-search"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Profile */}
        <Link href="/perfil">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            data-testid="button-profile"
          >
            {user?.avatar ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>
                  {user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-5 w-5" />
            )}
          </Button>
        </Link>
      </div>
    </header>
  );
}
