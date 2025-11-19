import React, { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLoadSupabaseConfig } from "@/hooks/use-supabase-config";
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse";
import Monitoring from "@/pages/monitoring";
import WhatsApp from "@/pages/whatsapp";
import Tickets from "@/pages/tickets";
import Dashboard from "@/pages/dashboard";
import Audit from "@/pages/audit";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import UazapiTest from "@/pages/uazapi-test";
import JWTDebug from "@/pages/jwt-debug";
import Login from "@/pages/login";
import Logout from "@/pages/logout";
import AuthCallback from "@/pages/auth-callback";
import NotFound from "@/pages/not-found";
import { InstanceSettingsPage } from "@/pages/instance-settings";
import Releases from "@/pages/releases";

function ProtectedRoutes() {
  const { isAuthenticated, hasHydrated } = useAuth();
  const [, setLocation] = useLocation();
  const { isCollapsed } = useSidebarCollapse();

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
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className={`flex flex-col flex-1 transition-all duration-300 ${isCollapsed ? "ml-20" : "ml-[18rem]"}`}>
          <main className="flex-1 overflow-hidden bg-gradient-to-br from-background via-background to-muted/5">
            <Switch>
              <Route path="/" component={Monitoring} />
              <Route path="/chat" component={WhatsApp} />
              <Route path="/chat/instance-settings/:instanceId" component={InstanceSettingsPage} />
              <Route path="/tickets" component={Tickets} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/audit" component={Audit} />
              <Route path="/profile" component={Profile} />
              <Route path="/settings" component={Settings} />
              <Route path="/uazapi-test" component={UazapiTest} />
              <Route path="/jwt-debug" component={JWTDebug} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  // Load Supabase configuration from server
  useLoadSupabaseConfig();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider defaultTheme="light">
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/logout" component={Logout} />
              <Route path="/auth/callback" component={AuthCallback} />
              <Route path="/releases" component={Releases} />
              <Route path="*" component={ProtectedRoutes} />
            </Switch>
            <Toaster />
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
