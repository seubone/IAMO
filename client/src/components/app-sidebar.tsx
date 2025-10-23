import { Home, MessageSquare, SquareKanban, Settings, Shield, BarChart3, User, LogOut, ChevronDown } from "lucide-react";
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

export function AppSidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`fixed left-0 top-0 h-screen transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      } bg-[#1B1B1B] rounded-[32px] flex flex-col overflow-hidden`}
      style={{
        padding: isCollapsed ? "48px 16px" : "48px 32px",
      }}
    >
      {/* Content Frame */}
      <div className="w-full flex flex-col" style={{ gap: "10px" }}>
        {/* Logo */}
        <div className="w-full mb-6">
          {!isCollapsed && (
            <div
              className="text-2xl font-bold bg-gradient-to-r from-[#3441AD] to-[#A9B2F4] bg-clip-text text-transparent"
              style={{
                fontFamily: "Inter",
                fontWeight: 700,
              }}
            >
              stmoniA
            </div>
          )}
          {isCollapsed && (
            <div
              className="text-xl font-bold bg-gradient-to-r from-[#3441AD] to-[#A9B2F4] bg-clip-text text-transparent text-center"
              style={{
                fontFamily: "Inter",
                fontWeight: 700,
              }}
            >
              s
            </div>
          )}
        </div>

        {/* User Profile Card */}
        {!isCollapsed && (
          <div
            className="w-full rounded-[8px] bg-opacity-5 border border-[#3442AD] border-opacity-20 p-3 mb-6 flex items-center gap-3"
            style={{
              backgroundColor: "rgba(52, 66, 173, 0.05)",
            }}
          >
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-[8px] flex-shrink-0 bg-[#FFA78D] flex items-center justify-center text-white font-bold text-sm"
              style={{
                backgroundImage: "url(DSC05189.jpg)",
                backgroundSize: "cover",
              }}
            >
              CM
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p
                className="text-xs text-[#9A9A9A] font-medium"
                style={{
                  fontFamily: "Poppins",
                  fontWeight: 500,
                }}
              >
                Bem vindo de volta
              </p>
              <h3
                className="text-sm text-[#9A9A9A] font-medium truncate"
                style={{
                  fontFamily: "Poppins",
                  fontWeight: 500,
                }}
              >
                Cainan Maia
              </h3>
            </div>

            {/* Dropdown Arrow */}
            <ChevronDown className="w-4 h-4 text-[#9A9A9A] flex-shrink-0" />
          </div>
        )}

        {/* Collapsed User Avatar */}
        {isCollapsed && (
          <div
            className="w-10 h-10 rounded-[6px] bg-[#FFA78D] flex items-center justify-center text-white font-bold text-xs mx-auto mb-6"
            style={{
              backgroundImage: "url(DSC05189.jpg)",
              backgroundSize: "cover",
            }}
          >
            CM
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = location === item.url;
            const Icon = item.icon;

            return (
              <a
                key={item.title}
                href={item.url}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "bg-[#3442AD] bg-opacity-20"
                    : "hover:bg-[#3442AD] hover:bg-opacity-10"
                }`}
                style={{
                  textDecoration: "none",
                }}
              >
                {/* Icon */}
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive ? "text-[#3442AD]" : "text-[#9A9A9A] group-hover:text-[#3442AD]"
                  }`}
                  strokeWidth={2}
                />

                {/* Label */}
                {!isCollapsed && (
                  <span
                    className={`text-sm font-normal transition-colors truncate ${
                      isActive ? "text-[#3442AD]" : "text-[#9A9A9A] group-hover:text-[#3442AD]"
                    }`}
                    style={{
                      fontFamily: "Inter",
                      fontWeight: 400,
                    }}
                  >
                    {item.title}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-[#3442AD] border-opacity-20 pt-3 mt-auto">
          <a
            href="/logout"
            onClick={(e) => {
              e.preventDefault();
              console.log("Logout clicked");
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group hover:bg-red-500 hover:bg-opacity-10"
            style={{
              textDecoration: "none",
            }}
          >
            {/* Icon */}
            <LogOut className="w-5 h-5 flex-shrink-0 text-[#AD3436] group-hover:text-red-500 transition-colors" />

            {/* Label */}
            {!isCollapsed && (
              <span
                className="text-sm font-normal text-[#AD3436] group-hover:text-red-500 transition-colors truncate"
                style={{
                  fontFamily: "Inter",
                  fontWeight: 400,
                }}
              >
                Sair
              </span>
            )}
          </a>
        </div>
      </div>
    </div>
  );
}
