import { Home, MessageSquare, SquareKanban, Settings, Shield, BarChart3, User, LogOut, ChevronDown, ChevronLeft } from "lucide-react";
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div
      className={`fixed left-0 top-0 h-screen transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      } dark:bg-[#1B1B1B] bg-[#EEEEEE] dark:text-white text-[#373737] rounded-[0x] flex flex-col overflow-hidden`}
      style={{
        padding: isCollapsed ? "32px 8px" : "32px 12px",
      }}
    >
      {/* Content Frame */}
      <div className="w-full flex flex-col h-full" style={{ gap: "10px" }}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg dark:hover:bg-[#3442AD] dark:hover:bg-opacity-20 hover:bg-[#3442AD] hover:bg-opacity-12 transition-all"
          title={isCollapsed ? "Expandir" : "Retrair"}
        >
          <ChevronLeft
            className={`w-5 h-5 dark:text-gray-300 text-[#373737] transition-transform ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>

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
            <div
              className="w-6 h-6 rounded-sm flex items-center justify-center bg-gradient-to-br from-[#3441AD] to-[#A9B2F4]"
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "white",
              }}
            >
              s
            </div>
          )}
        </div>

        {/* User Profile Card - Expandable */}
        {!isCollapsed && (
          <div className="mb-4">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-full rounded-[8px] dark:bg-opacity-20 dark:border-opacity-30 bg-opacity-12 border border-[#3442AD] border-opacity-15 p-2 flex items-center gap-2 transition-all hover:dark:bg-opacity-30 hover:bg-opacity-20 ${
                showUserMenu
                  ? "dark:bg-opacity-30 bg-opacity-20 rounded-b-none"
                  : ""
              }`}
              style={{
                backgroundColor: "rgba(52, 66, 173, 0.12)",
                textDecoration: "none",
              }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-[8px] flex-shrink-0 bg-[#FFA78D] flex items-center justify-center text-white font-bold text-xs"
                style={{
                  backgroundImage: "url(DSC05189.jpg)",
                  backgroundSize: "cover",
                }}
              >
                CM
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0 text-left">
                <p
                  className="text-xs dark:text-gray-300 text-[#373737] font-medium leading-none"
                  style={{
                    fontFamily: "Poppins",
                    fontWeight: 500,
                  }}
                >
                  Bem vindo
                </p>
                <h3
                  className="text-xs dark:text-white text-[#373737] font-medium truncate"
                  style={{
                    fontFamily: "Poppins",
                    fontWeight: 500,
                  }}
                >
                  Cainan Maia
                </h3>
              </div>

              {/* Dropdown Arrow */}
              <ChevronDown
                className={`w-4 h-4 dark:text-gray-400 text-[#373737] flex-shrink-0 transition-transform ${
                  showUserMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Expandable Menu Options */}
            {showUserMenu && (
              <div className="dark:bg-opacity-20 dark:border-opacity-30 bg-opacity-12 border border-[#3442AD] border-opacity-15 border-t-0 rounded-b-[8px]"
                style={{
                  backgroundColor: "rgba(52, 66, 173, 0.12)",
                }}
              >
                {userMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.title}
                      href={item.url}
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm dark:text-gray-200 text-[#373737] hover:dark:bg-[#3442AD] hover:dark:bg-opacity-30 hover:bg-[#3442AD] hover:bg-opacity-20 transition-colors dark:hover:text-white hover:text-white"
                      style={{
                        textDecoration: "none",
                      }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
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
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const isActive = location === item.url;
            const Icon = item.icon;

            return (
              <a
                key={item.title}
                href={item.url}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "dark:bg-[#3442AD] dark:bg-opacity-30 bg-[#3442AD] bg-opacity-15"
                    : "dark:hover:bg-[#3442AD] dark:hover:bg-opacity-20 hover:bg-[#3442AD] hover:bg-opacity-12"
                }`}
                style={{
                  textDecoration: "none",
                }}
              >
                {/* Icon */}
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive
                      ? "text-[#3442AD]"
                      : "dark:text-gray-300 text-[#373737] dark:group-hover:text-white group-hover:text-white"
                  }`}
                  strokeWidth={2}
                />

                {/* Label */}
                {!isCollapsed && (
                  <span
                    className={`text-sm font-normal transition-colors truncate ${
                      isActive
                        ? "text-[#3442AD] dark:text-[#A9B2F4]"
                        : "dark:text-gray-300 text-[#373737] dark:group-hover:text-white group-hover:text-white"
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

        {/* Footer Items (Configurações, Sair) */}
        <div className="space-y-1 mt-auto pt-2 border-t dark:border-gray-700 border-gray-200">
          {footerItems.map((item) => {
            const isActive = location === item.url;
            const Icon = item.icon;
            const isLogout = item.isLogout;

            return (
              <a
                key={item.title}
                href={item.url}
                onClick={(e) => {
                  if (isLogout) {
                    e.preventDefault();
                    console.log("Logout clicked");
                  }
                }}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200 group ${
                  isLogout
                    ? "dark:hover:bg-red-500 dark:hover:bg-opacity-20 hover:bg-red-500 hover:bg-opacity-12"
                    : isActive
                    ? "dark:bg-[#3442AD] dark:bg-opacity-30 bg-[#3442AD] bg-opacity-15"
                    : "dark:hover:bg-[#3442AD] dark:hover:bg-opacity-20 hover:bg-[#3442AD] hover:bg-opacity-12"
                }`}
                style={{
                  textDecoration: "none",
                }}
              >
                {/* Icon */}
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isLogout
                      ? "text-[#AD3436] dark:group-hover:text-red-400 group-hover:text-white"
                      : isActive
                      ? "text-[#3442AD]"
                      : "dark:text-gray-300 text-[#373737] dark:group-hover:text-white group-hover:text-white"
                  }`}
                  strokeWidth={2}
                />

                {/* Label */}
                {!isCollapsed && (
                  <span
                    className={`text-sm font-normal transition-colors truncate ${
                      isLogout
                        ? "text-[#AD3436] dark:group-hover:text-red-300 group-hover:text-white"
                        : isActive
                        ? "text-[#3442AD] dark:text-[#A9B2F4]"
                        : "dark:text-gray-300 text-[#373737] dark:group-hover:text-white group-hover:text-white"
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
        </div>
      </div>
    </div>
  );
}
