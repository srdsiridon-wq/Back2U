import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Home, Search, PlusCircle, Info, UserRound, Bell } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { unreadNotificationCount } from "../lib/back2u/notifications.functions";

import appCss from "../styles.css?url";
import { Toaster } from "../components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ItemsProvider } from "../lib/back2u/store";
import { supabase } from "../integrations/supabase/client";
import { useSession } from "../hooks/use-session";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">ไม่พบหน้านี้</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          หน้าที่คุณกำลังหาอาจไม่มีอยู่ หรือถูกย้ายไปแล้ว
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          โหลดหน้านี้ไม่สำเร็จ
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          เกิดข้อผิดพลาดบางอย่าง ลองรีเฟรชหรือกลับไปหน้าแรกได้เลย
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            ลองอีกครั้ง
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            กลับหน้าแรก
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Back2U — ของหายได้คืน ในโรงเรียน" },
      {
        name: "description",
        content: "แจ้งของหาย ค้นหา และรับของคืนที่โรงเรียน ด้วย Back2U",
      },
      { property: "og:title", content: "Back2U — ของหายได้คืน ในโรงเรียน" },
      {
        property: "og:description",
        content: "แจ้งของหาย ค้นหา และรับของคืนที่โรงเรียน ด้วย Back2U",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#ffffff" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const navItems = [
  { to: "/", label: "หน้าแรก", icon: Home, exact: true },
  { to: "/search", label: "ค้นหา", icon: Search, exact: false },
  { to: "/report", label: "แจ้งของ", icon: PlusCircle, exact: false },
  { to: "/info", label: "ข้อมูล", icon: Info, exact: false },
] as const;

function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg items-stretch">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              search={to === "/search" ? { q: undefined } : {}}
              activeOptions={{ exact }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NotificationBell() {
  const fetchCount = useServerFn(unreadNotificationCount);
  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => fetchCount({}),
    refetchInterval: 60_000,
  });
  const count = unread.data ?? 0;
  return (
    <Link
      to="/notifications"
      aria-label="การแจ้งเตือน"
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
      activeProps={{ className: "border-primary text-primary" }}
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

function AccountLink() {
  const { user, loading } = useSession();
  if (loading) return null;
  return user ? (
    <Link
      to="/me"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
      activeProps={{ className: "border-primary text-primary" }}
    >
      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
      รายการของฉัน
    </Link>
  ) : (
    <Link
      to="/auth"
      search={{ redirect: undefined }}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
    >
      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
      เข้าสู่ระบบ
    </Link>
  );
}

function SignedInExtras() {
  const { user, loading } = useSession();
  if (loading || !user) return null;
  return <NotificationBell />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ItemsProvider>
        <div className="mx-auto flex min-h-screen max-w-lg flex-col border-border bg-background sm:border-x">
          <div className="flex items-center justify-end gap-2 px-5 pt-3">
            <SignedInExtras />
            <AccountLink />
          </div>
          <main className="flex-1 pb-24">
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </main>
          <BottomNav />
        </div>
      </ItemsProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
