import { Home, MessageSquare, SquareKanban, Settings, Shield, BarChart3, User, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { useState } from "react";

const menuItems = [
  {
    title: "Monitoramento",
    url: "/",
    icon: Home,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Tickets",
    url: "/tickets",
    icon: SquareKanban,
  },
  {
    title: "Auditoria",
    url: "/audit",
    icon: Shield,
  },
  {
    title: "Perfil",
    url: "/profile",
    icon: User,
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
];

const logoutItem = {
  title: "Sair",
  url: "/logout",
  icon: LogOut,
};

export function AppSidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    // TODO: Implementar lógica de logout
    console.log("Logout clicked");
  };

  return (
    <Sidebar
      className={`transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      } bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800`}
    >
      <SidebarContent className="flex flex-col h-full p-0">
        {/* Header com logo e toggle */}
        <div className="flex items-center justify-between px-4 py-6 border-b border-gray-200 dark:border-gray-800">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            {!isCollapsed && (
              <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600 whitespace-nowrap">
                stmoniA
              </div>
            )}
            {isCollapsed && (
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600">
                s
              </div>
            )}
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
              />
            </svg>
          </button>
        </div>

        {/* User Info Card */}
        <div
          className={`px-4 py-4 mx-4 mt-6 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex-shrink-0 ${
            isCollapsed ? "flex justify-center" : ""
          }`}
        >
          {!isCollapsed && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-500">Bem vindo de volta</p>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Cainan Maia</h3>
            </div>
          )}
          {isCollapsed && (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              CM
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <SidebarGroup className="flex-1 px-4 py-6">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location === item.url;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`relative px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-blue-500 text-white dark:bg-blue-600 shadow-md"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                      }`}
                    >
                      <a
                        href={item.url}
                        data-testid={`link-${item.title.toLowerCase()}`}
                        className="flex items-center gap-3 w-full"
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && (
                          <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                            {item.title}
                          </span>
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className={`relative px-4 py-3 rounded-lg transition-all duration-200 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
              >
                <a
                  href={logoutItem.url}
                  onClick={handleLogout}
                  data-testid="link-sair"
                  className="flex items-center gap-3 w-full"
                >
                  <logoutItem.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {logoutItem.title}
                    </span>
                  )}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
