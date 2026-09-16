import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  Globe,
  MessageSquare,
  Wallet,
  Settings,
  Shield,
  Plus,
  User,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

const SIDEBAR_WIDTH_KEY = "madar-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  adminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "نظرة عامة", path: "/dashboard" },
  { icon: Globe, label: "مواقعي", path: "/dashboard?tab=sites" },
  { icon: MessageSquare, label: "الرسائل", path: "/dashboard?tab=inbox" },
  { icon: Wallet, label: "المحفظة", path: "/dashboard?tab=wallet" },
  { icon: Settings, label: "إعدادات الحساب", path: "/account" },
  { icon: Shield, label: "لوحة الإدارة", path: "/admin", adminOnly: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });
  const { loading, user } = useAuth();
  const { data: unreadNotifications } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: Boolean(user) });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
    } catch {
      /* ignore */
    }
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B1220]">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/15 flex items-center justify-center">
            <Globe className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white mb-2">تسجيل الدخول مطلوب</h1>
            <p className="text-sm text-slate-400">للوصول إلى لوحة التحكم، يرجى تسجيل الدخول أولاً.</p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full bg-[#D4AF37] hover:bg-[#C9A227] text-[#0B1220] font-semibold"
          >
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth} user={user}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  user,
}: DashboardLayoutContentProps) {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const visibleItems = menuItems.filter(
    (item) => !item.adminOnly || user.role === "admin"
  );

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      // RTL: width grows to the left
      const newWidth = sidebarLeft + (sidebarRef.current?.offsetWidth ?? 0) - e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const isActive = (path: string) => {
    if (path === "/dashboard") return location === "/dashboard" || location.startsWith("/dashboard?");
    return location === path || location.startsWith(path + "/");
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0B1220] text-white" dir="rtl">
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-l border-white/[0.06] bg-[#0F172A] !border-r-0"
          side="right"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-white/[0.06]">
            <div className="flex items-center gap-3 px-3 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-white/5 rounded-lg transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-[#0B1220] font-display font-black text-sm">
                  م
                </div>
              </button>
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="font-display font-bold text-white tracking-tight">مدار</span>
                  <span className="block text-[10px] text-slate-500 leading-tight">لوحة التحكم</span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2 py-3">
            <div className="px-2 mb-3">
              <button
                onClick={() => setLocation("/builder")}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
                  "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25 hover:bg-[#D4AF37]/25",
                  isCollapsed && "px-0"
                )}
              >
                <Plus size={16} />
                {!isCollapsed && <span>موقع جديد</span>}
              </button>
            </div>

            <SidebarMenu>
              {visibleItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={cn(
                        "h-10 transition-all font-normal rounded-xl",
                        active
                          ? "bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37]/20"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", active && "text-[#D4AF37]")} />
                      <span className="flex-1">{item.label}</span>{item.path.includes("dashboard") && item.path.includes("inbox") && unreadNotifications ? <span className="min-w-5 h-5 px-1 rounded-full bg-[#00D4FF]/15 text-[#00D4FF] text-[10px] flex items-center justify-center">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span> : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-white/[0.06]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 transition-colors w-full text-right group-data-[collapsible=icon]:justify-center focus:outline-none">
                  <Avatar className="h-9 w-9 border border-white/10 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-[#D4AF37]/20 text-[#D4AF37]">
                      {(user.name || user.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden text-right">
                    <p className="text-sm font-medium truncate leading-none text-white">
                      {user.name || "المستخدم"}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-1.5" dir="ltr">
                      {user.email || ""}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 bg-[#0F172A] border-white/10 text-white" dir="rtl">
                <DropdownMenuItem
                  onClick={() => setLocation("/account")}
                  className="cursor-pointer focus:bg-white/5 focus:text-white"
                >
                  <User className="ml-2 h-4 w-4" />
                  <span>إعدادات الحساب</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle (RTL: left edge of sidebar) */}
        <div
          className={cn(
            "absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-[#D4AF37]/30 transition-colors",
            isCollapsed && "hidden"
          )}
          onMouseDown={() => {
            if (!isCollapsed) setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-[#0B1220] flex-1 min-w-0">
        {isMobile && (
          <div className="flex border-b border-white/[0.06] h-14 items-center justify-between bg-[#0F172A]/95 px-3 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-white/5 text-slate-300" />
              <span className="font-display font-bold text-white">مدار</span>
            </div>
            <button
              onClick={() => setLocation("/builder")}
              className="h-8 px-3 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-semibold border border-[#D4AF37]/25"
            >
              + موقع
            </button>
          </div>
        )}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">{children}</div>
      </SidebarInset>
    </div>
  );
}
