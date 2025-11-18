import { Home, MessageSquare, SquareKanban, Settings, Shield, BarChart3, User, LogOut, ChevronDown, ChevronLeft, Moon, Sun, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/config/version";

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
    title: "Releases",
    url: "/releases",
    icon: BookOpen,
  },
];

const footerItems = [
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Sair",
    url: "/logout",
    icon: LogOut,
    isLogout: true,
  },
];

const userMenuItems = [
  {
    title: "Meu Perfil",
    url: "/profile",
    icon: User,
  },
  {
    title: "Configurações da Conta",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isCollapsed, toggleCollapsed } = useSidebarCollapse();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if dark mode is enabled on mount
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      setIsDark(false);
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      setIsDark(true);
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col overflow-hidden",
        isCollapsed ? "w-20 px-2" : "w-72 px-4"
      )}
    >
      {/* Content Frame */}
      <div className="flex h-full w-full flex-col gap-3 py-8">
        {/* Logo */}
        <div className="w-full mb-6 flex justify-center">
          {!isCollapsed && (
            <svg width="90" height="28" viewBox="0 0 154 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M41.8496 0.00196248C44.8849 0.111441 47.548 1.84847 48.7692 4.46653L48.8757 4.69359C49.6107 6.42695 49.7605 10.7224 49.7044 10.749C49.7639 12.5409 49.6565 14.8489 49.4163 17.4175C48.5746 17.5052 47.7843 17.7222 47.045 18.066C46.0752 18.5278 45.2772 19.1623 44.6538 19.9705V17.6502H39.806V31.9905C39.806 34.6678 41.9764 36.8382 44.6538 36.8382V26.2402C44.6538 24.7394 45.0358 23.5966 45.7976 22.8116C46.5734 22.0129 47.6197 21.6091 48.9367 21.5996C48.0036 28.5644 46.3275 36.3376 44.404 40.8614C44.3936 40.8894 43.6617 42.8512 43.0856 43.8274C42.2857 45.312 40.9792 46.4728 39.4612 47.1808C37.7669 47.9708 35.9502 48.1959 34.2133 47.8279C33.8754 47.7099 32.4825 47.3191 31.2941 46.904C23.9783 44.6333 9.88844 36.3795 4.34919 31.2043C3.485 30.4285 1.47117 28.3895 0.805634 27.1087C0.22156 25.8561 -0.0468059 24.5274 0.00666678 23.1152C0.161474 21.3137 0.916831 19.5743 2.14387 18.242C3.01045 17.3485 5.87118 15.2539 5.92726 15.2278C9.08516 12.9951 14.5291 10.0391 20.7216 7.15151C26.6221 4.40006 32.1583 2.23591 35.8978 1.11456C35.9854 1.14562 40.1898 -0.0549616 41.8496 0.00196248ZM85.1215 17.338C86.9688 17.338 88.6429 17.7541 90.1438 18.5854C91.6447 19.3936 92.8231 20.5486 93.6774 22.0495C94.5546 23.5502 94.9929 25.2825 94.9929 27.2449C94.9929 29.2074 94.5424 30.9396 93.6419 32.4403C92.7645 33.941 91.564 35.1073 90.0402 35.9385C88.5393 36.7466 86.8528 37.1504 84.9824 37.1504C83.1356 37.1503 81.4732 36.7464 79.9956 35.9385C78.518 35.1073 77.3518 33.9409 76.4975 32.4403C75.6663 30.9396 75.2502 29.2074 75.2501 27.2449C75.2501 25.2824 75.6774 23.5503 76.5316 22.0495C77.409 20.5486 78.5984 19.3936 80.0992 18.5854C81.6001 17.7541 83.2743 17.338 85.1215 17.338ZM16.2982 12.3157C14.6358 12.3158 13.1579 12.6041 11.8649 13.1814C10.5718 13.7356 9.56789 14.5445 8.85207 15.6067C8.13625 16.6688 7.77779 17.9158 7.77779 19.3475C7.77783 20.8712 8.12401 22.0952 8.81659 23.0187C9.5324 23.9193 10.3757 24.6005 11.3455 25.0623C12.3383 25.501 13.6198 25.9515 15.1899 26.4133C16.3443 26.7365 17.2454 27.036 17.8919 27.313C18.5615 27.567 19.1164 27.9255 19.5551 28.3873C19.9936 28.8491 20.2122 29.4385 20.2122 30.1541C20.2121 31.0314 19.8893 31.7471 19.2429 32.3012C18.5965 32.8322 17.7075 33.0973 16.5764 33.0974C15.4681 33.0974 14.5904 32.8089 13.9439 32.2317C13.3206 31.6546 12.9731 30.87 12.9037 29.8774H7.70826C7.73146 31.3549 8.13664 32.6367 8.92161 33.7218C9.70666 34.8068 10.7685 35.638 12.1075 36.2152C13.4699 36.7925 14.9943 37.0809 16.68 37.0809C18.4578 37.0808 19.9934 36.7581 21.2864 36.1116C22.5795 35.442 23.5601 34.552 24.2297 33.4436C24.8993 32.3353 25.2344 31.1349 25.2344 29.8419C25.2344 28.3411 24.8774 27.1283 24.1616 26.2047C23.4459 25.2813 22.5913 24.5889 21.5987 24.1271C20.6057 23.6653 19.323 23.2038 17.7528 22.742C16.5987 22.3958 15.6987 22.0948 15.0522 21.8409C14.4288 21.5638 13.8973 21.2177 13.4586 20.8021C13.043 20.3634 12.8356 19.8208 12.8356 19.1743C12.8356 18.2509 13.1118 17.5462 13.6657 17.0613C14.243 16.5764 15.0054 16.3333 15.952 16.3333C17.0372 16.3333 17.9038 16.6107 18.5504 17.1649C19.2198 17.6959 19.577 18.3773 19.6232 19.2084H24.9577C24.796 17.038 23.9294 15.3527 22.3593 14.1521C20.8122 12.9284 18.7919 12.3157 16.2982 12.3157ZM29.8026 17.6502V31.989C29.8026 34.6671 31.9736 36.8382 34.6518 36.8382V17.6502H29.8026ZM63.6346 17.3735C65.9897 17.3735 67.8837 18.1002 69.3153 19.5547C70.77 20.9863 71.4979 22.9955 71.4979 25.5817V36.8382C68.8198 36.8382 66.6488 34.6671 66.6488 31.989V26.2402C66.6488 24.7393 66.2669 23.5966 65.505 22.8116C64.743 22.0034 63.7046 21.5983 62.3886 21.5982C61.0724 21.5982 60.0218 22.0034 59.2367 22.8116C58.4748 23.5966 58.0929 24.7394 58.0929 26.2402V36.8382C55.4148 36.8382 53.2437 34.6671 53.2437 31.989V26.2402C53.2437 24.7395 52.8631 23.5966 52.1013 22.8116C51.3393 22.0034 50.2997 21.5982 48.9835 21.5982C48.9679 21.5982 48.9523 21.5995 48.9367 21.5996C49.1297 20.159 49.2915 18.7531 49.4163 17.4175C49.7049 17.3874 49.9998 17.3735 50.3005 17.3735C51.8012 17.3735 53.1404 17.6962 54.318 18.3427C55.4956 18.9662 56.4075 19.8671 57.0541 21.0447C57.6775 19.9364 58.5784 19.0464 59.7561 18.3768C60.9565 17.7074 62.2495 17.3736 63.6346 17.3735ZM109.546 17.3735C111.832 17.3735 113.679 18.1003 115.088 19.5547C116.496 20.9863 117.201 22.9955 117.201 25.5817V36.8382C114.523 36.8382 112.352 34.6671 112.352 31.989V26.2402C112.352 24.7164 111.971 23.5502 111.209 22.742C110.447 21.9107 109.408 21.4946 108.091 21.4946C106.752 21.4947 105.691 21.9108 104.906 22.742C104.144 23.5502 103.762 24.7162 103.762 26.2402V36.8382C101.084 36.8382 98.9126 34.6671 98.9126 31.989V17.6502H103.762V20.04C104.408 19.2088 105.228 18.5619 106.221 18.1001C107.237 17.6152 108.346 17.3735 109.546 17.3735ZM127.025 36.8382C124.347 36.8382 122.176 34.6671 122.176 31.989V12.662H127.025V36.8382ZM153.723 36.8382H148.596L147.004 32.2317H137.375L135.781 36.8382H130.69L139.383 12.6279H145.028L153.723 36.8382ZM85.052 21.5641C83.6667 21.5642 82.5005 22.0601 81.5538 23.0528C80.6302 24.0226 80.1688 25.4207 80.1688 27.2449C80.1689 29.0688 80.6193 30.4768 81.5198 31.4696C82.4433 32.4393 83.5973 32.9241 84.9824 32.9242C85.8598 32.9242 86.6799 32.7168 87.4418 32.3012C88.2269 31.8625 88.8504 31.2157 89.3122 30.3613C89.7739 29.5071 90.0047 28.4684 90.0047 27.2449C90.0047 25.4207 89.5199 24.0226 88.5501 23.0528C87.6035 22.0602 86.4372 21.5641 85.052 21.5641ZM138.691 28.3532H145.687L142.189 18.2391L138.691 28.3532ZM32.2605 9.68323C31.4065 9.68339 30.6905 9.96081 30.1134 10.5148C29.5593 11.0459 29.2832 11.7162 29.2832 12.5243C29.2833 13.3323 29.5593 14.0138 30.1134 14.5679C30.6905 15.0988 31.4065 15.3638 32.2605 15.364C33.1147 15.364 33.8195 15.0987 34.3736 14.5679C34.9508 14.0138 35.2392 13.3323 35.2393 12.5243C35.2393 11.7161 34.9509 11.0459 34.3736 10.5148C33.8195 9.96085 33.1148 9.68323 32.2605 9.68323Z" fill="url(#paint0_linear_2101_126)"/>
              <defs>
                <linearGradient id="paint0_linear_2101_126" x1="47.5418" y1="11.504" x2="127.87" y2="62.7905" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3441AD"/>
                  <stop offset="1" stopColor="#A9B2F4"/>
                </linearGradient>
              </defs>
            </svg>
          )}
          {isCollapsed && (
            <svg width="40" height="30" viewBox="0 0 66 45" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M38.6315 0.00181157C41.4334 0.102872 43.8918 1.70633 45.019 4.12307L45.1173 4.33267C45.7958 5.93275 45.9341 9.8979 45.8823 9.92244C45.9372 11.5766 45.8381 13.7071 45.6164 16.0781C44.8394 16.1592 44.1099 16.3594 43.4274 16.6768C42.5322 17.1031 41.7956 17.6888 41.22 18.4348V16.293H36.7451V29.5305C36.7451 32.002 38.7486 34.0055 41.22 34.0055V24.2224C41.22 22.8371 41.5727 21.7821 42.2759 21.0574C42.9921 20.3202 43.9579 19.9474 45.1736 19.9387C44.3123 26.3679 42.7651 33.5433 40.9895 37.7193C40.9799 37.7452 40.3043 39.5561 39.7725 40.4572C39.0341 41.8277 37.8281 42.8992 36.4268 43.5527C34.8628 44.282 33.1858 44.4898 31.5824 44.1501C31.2705 44.0412 29.9847 43.6804 28.8877 43.2973C22.1345 41.2012 9.12806 33.582 4.01475 28.8048C3.21701 28.0887 1.35804 26.2065 0.743684 25.0241C0.204523 23.8678 -0.0432067 22.6413 0.00615412 21.3378C0.149057 19.6748 0.84633 18.0691 1.97901 16.8392C2.77896 16.0145 5.41971 14.0809 5.47147 14.0568C8.38655 11.9959 13.4119 9.26717 19.1282 6.60159C24.575 4.06171 29.6855 2.06398 33.1374 1.02885C33.2183 1.05753 37.0993 -0.0507353 38.6315 0.00181157ZM15.0449 11.3687C13.5104 11.3687 12.1461 11.6349 10.9525 12.1678C9.75887 12.6793 8.83215 13.4261 8.17138 14.4066C7.51061 15.3871 7.17971 16.5382 7.17971 17.8597C7.17975 19.2663 7.49931 20.3962 8.13863 21.2487C8.79939 22.08 9.57784 22.7088 10.4731 23.1351C11.3896 23.5401 12.5725 23.9559 14.0218 24.3822C15.0875 24.6806 15.9193 24.957 16.5161 25.2128C17.1342 25.4472 17.6464 25.7781 18.0514 26.2044C18.4562 26.6307 18.6579 27.1748 18.6579 27.8354C18.6579 28.6452 18.3599 29.3059 17.7632 29.8174C17.1665 30.3076 16.3459 30.5522 15.3017 30.5523C14.2787 30.5523 13.4685 30.286 12.8717 29.7532C12.2963 29.2204 11.9755 28.4962 11.9114 27.5799H7.11552C7.13694 28.9438 7.51096 30.127 8.23557 31.1287C8.96025 32.1303 9.94046 32.8976 11.1765 33.4304C12.4341 33.9633 13.8413 34.2295 15.3973 34.2295C17.0385 34.2294 18.456 33.9315 19.6496 33.3347C20.8432 32.7166 21.7484 31.8951 22.3665 30.872C22.9846 29.8489 23.294 28.7408 23.294 27.5472C23.294 26.1617 22.9644 25.0422 22.3037 24.1896C21.643 23.3372 20.8541 22.6981 19.9378 22.2718C19.0212 21.8455 17.8371 21.4196 16.3877 20.9932C15.3223 20.6736 14.4915 20.3958 13.8948 20.1614C13.3193 19.9056 12.8286 19.5861 12.4236 19.2025C12.04 18.7975 11.8486 18.2966 11.8486 17.6999C11.8486 16.8474 12.1035 16.1969 12.6149 15.7493C13.1477 15.3017 13.8515 15.0773 14.7253 15.0773C15.7271 15.0773 16.5271 15.3334 17.1239 15.8449C17.7419 16.3351 18.0716 16.9642 18.1143 17.7313H23.0386C22.8893 15.7278 22.0893 14.1722 20.64 13.0638C19.2119 11.9342 17.3469 11.3687 15.0449 11.3687ZM27.5109 16.293V29.5292C27.5109 32.0014 29.515 34.0055 31.9872 34.0055V16.293H27.5109ZM58.7413 16.0375C60.9153 16.0375 62.6637 16.7083 63.9852 18.051C65.3281 19.3725 66 21.2273 66 23.6146V34.0055C63.5278 34.0055 61.5237 32.0014 61.5237 29.5292V24.2224C61.5237 22.8369 61.1712 21.7822 60.4679 21.0574C59.7645 20.3114 58.806 19.9374 57.5911 19.9374C56.3761 19.9374 55.4063 20.3114 54.6816 21.0574C53.9783 21.7821 53.6257 22.837 53.6257 24.2224V34.0055C51.1536 34.0055 49.1495 32.0014 49.1495 29.5292V24.2224C49.1495 22.8371 48.7981 21.7821 48.0949 21.0574C47.3915 20.3114 46.4318 19.9374 45.2169 19.9374C45.2024 19.9374 45.188 19.9386 45.1736 19.9387C45.3518 18.6088 45.5011 17.311 45.6164 16.0781C45.8828 16.0503 46.155 16.0375 46.4325 16.0375C47.8179 16.0376 49.0541 16.3355 50.1411 16.9322C51.2282 17.5078 52.07 18.3394 52.6668 19.4265C53.2423 18.4033 54.074 17.5818 55.1611 16.9637C56.2692 16.3458 57.4627 16.0376 58.7413 16.0375ZM29.7798 8.93863C28.9914 8.93877 28.3305 9.19486 27.7978 9.70629C27.2863 10.1965 27.0314 10.8153 27.0314 11.5612C27.0315 12.3071 27.2863 12.9362 27.7978 13.4476C28.3305 13.9378 28.9915 14.1824 29.7798 14.1826C30.5683 14.1826 31.2189 13.9376 31.7304 13.4476C32.2632 12.9362 32.5294 12.3071 32.5295 11.5612C32.5295 10.8152 32.2633 10.1965 31.7304 9.70629C31.2189 9.19489 30.5684 8.93863 29.7798 8.93863Z" fill="url(#paint0_linear_2101_197)"/>
              <defs>
                <linearGradient id="paint0_linear_2101_197" x1="20.4117" y1="10.6194" x2="65.0247" y2="23.8673" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3441AD"/>
                  <stop offset="1" stopColor="#A9B2F4"/>
                </linearGradient>
              </defs>
            </svg>
          )}
        </div>

        {/* User Profile Card - Expandable */}
        {!isCollapsed && (
          <div className="mb-5">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-3 text-left transition-all hover:bg-sidebar-accent",
                showUserMenu && "rounded-b-none shadow-lg shadow-sidebar-primary/20"
              )}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold text-xs shadow-[0_12px_24px_rgba(92,108,246,0.35)]">
                CM
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-sidebar-foreground/70">Bem vindo</p>
                <h3 className="truncate text-sm font-semibold text-sidebar-foreground">Cainan Maia</h3>
                <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50">Administrador</p>
              </div>
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-sidebar-border/60 bg-sidebar-accent">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-sidebar-foreground transition-transform",
                    showUserMenu && "rotate-180"
                  )}
                />
              </span>
            </button>
            {showUserMenu && (
              <div className="space-y-1 rounded-b-2xl border border-t-0 border-sidebar-border bg-sidebar-accent/80 px-3 py-2">
                {userMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.title}
                      href={item.url}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      style={{ textDecoration: "none" }}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.title}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Collapsed User Avatar */}
        {isCollapsed && (
          <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold text-xs shadow-[0_12px_24px_rgba(92,108,246,0.35)]">
            CM
          </div>
        )}

        {/* Menu Items */}
        <nav className={cn("flex-1", isCollapsed ? "flex flex-col items-center gap-3" : "space-y-1")}>
          {menuItems.map((item) => {
            const isActive = location === item.url;
            const Icon = item.icon;

            return (
              <a
                key={item.title}
                href={item.url}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200",
                  isCollapsed ? "justify-center" : "w-full",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                )}
                style={{ textDecoration: "none" }}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors",
                    isActive
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                  )}
                  strokeWidth={2}
                />
                {!isCollapsed && (
                  <span
                    className={cn(
                      "truncate text-sm font-medium transition-colors",
                      isActive
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 group-hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {item.title}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Footer Items */}
        <div
          className={cn(
            "mt-auto border-t border-sidebar-border/60 pt-4",
            isCollapsed ? "flex flex-col items-center gap-3" : "space-y-2"
          )}
        >
          <button
            onClick={toggleTheme}
            className={cn(
              "items-center gap-2 rounded-xl border border-transparent bg-sidebar-accent/70 px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:border-sidebar-border hover:bg-sidebar-accent",
              isCollapsed ? "flex justify-center" : "flex w-full"
            )}
            title={isDark ? "Modo claro" : "Modo escuro"}
          >
            {isDark ? (
              <Sun className="h-5 w-5 flex-shrink-0 text-sidebar-accent-foreground" />
            ) : (
              <Moon className="h-5 w-5 flex-shrink-0 text-sidebar-accent-foreground" />
            )}
            {!isCollapsed && <span className="truncate">{isDark ? "Claro" : "Escuro"}</span>}
          </button>

          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <a
                href={footerItems[0].url}
                className={cn(
                  "group flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  location === footerItems[0].url
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                )}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Settings
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    location === footerItems[0].url
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                  )}
                  strokeWidth={2}
                />
                <span className="truncate">{footerItems[0].title}</span>
              </a>

              <button
                onClick={toggleCollapsed}
                className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                title="Retrair barra lateral"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          {isCollapsed && (
            <button
              onClick={toggleCollapsed}
              className="flex w-full justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              title="Expandir barra lateral"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          )}

          <a
            href={footerItems[1].url}
            className={cn(
              "group items-center gap-2 rounded-xl border border-transparent bg-sidebar-accent/70 px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isCollapsed ? "flex justify-center" : "flex w-full"
            )}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">{footerItems[1].title}</span>}
          </a>

          {!isCollapsed && (
            <div className="text-center pt-2">
              <span className="text-xs text-sidebar-foreground/50 font-medium">{APP_VERSION}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}






