import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/keys.functions";
import { Bot, LayoutDashboard, Cpu, Key, Coins, Shield, LogOut, Loader2, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { session, loading, signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) nav({ to: "/auth" });
  }, [loading, session, nav]);

  const fetchProfile = useServerFn(getProfile);
  const { data } = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: () => fetchProfile(),
    enabled: !!session,
  });

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const nav_items = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/models", label: "Models", icon: Cpu },
    { to: "/api-keys", label: "API Keys", icon: Key },
    { to: "/activity", label: "Activity", icon: Activity },
    { to: "/credits", label: "Credits", icon: Coins },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 glass border-r border-border p-4 flex flex-col">
        <Link to="/" className="flex items-center gap-2 font-bold px-2 py-3 mb-4">
          <Bot className="text-primary" />
          <span className="text-gradient">Xevor AI</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {nav_items.map((n) => {
            const active = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <n.icon className="w-4 h-4" /> {n.label}
              </Link>
            );
          })}
          {data?.isAdmin && (
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                path.startsWith("/admin") ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Shield className="w-4 h-4" /> Admin
            </Link>
          )}
        </nav>
        <div className="border-t border-border pt-3 mt-3">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{session.user.email}</div>
          <div className="px-3 py-1 text-sm">
            <span className="text-gradient font-bold">{data?.profile?.credits ?? "…"}</span>
            <span className="text-muted-foreground text-xs ml-1">credits</span>
          </div>
          <button
            onClick={async () => { await signOut(); nav({ to: "/" }); }}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
