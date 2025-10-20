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
    <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 gap-2 md:gap-4 bg-card/30 backdrop-blur-md">
      {/* Logo/Title */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="text-xs md:text-sm font-medium text-muted-foreground hidden sm:block">WhatsApp Business</div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-2xl relative">
        <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Buscar..."
          className="pl-8 md:pl-10 bg-muted/50 text-sm"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          data-testid="input-global-search"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 md:gap-2">
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
