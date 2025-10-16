import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useEffect } from "react";
import Monitoring from "@/pages/monitoring";
import Chat from "@/pages/chat";
import WhatsApp from "@/pages/whatsapp";
import Tickets from "@/pages/tickets";
import Dashboard from "@/pages/dashboard";
import Audit from "@/pages/audit";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function ProtectedRoutes() {
  const { isAuthenticated, hasHydrated } = useAuth();
  const [, setLocation] = useLocation();
  
  useWebSocket();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, hasHydrated, setLocation]);

  if (!hasHydrated) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between h-12 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-sm font-semibold font-heading">Monitor IA</h1>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/" component={Monitoring} />
              <Route path="/chat" component={Chat} />
              <Route path="/whatsapp" component={WhatsApp} />
              <Route path="/tickets" component={Tickets} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/audit" component={Audit} />
              <Route path="/profile" component={Profile} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light">
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="*" component={ProtectedRoutes} />
          </Switch>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
