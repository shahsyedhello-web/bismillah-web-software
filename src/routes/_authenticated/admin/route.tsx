import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Tags,
  Image as ImageIcon,
  Megaphone,
  Quote,
  Home,
  Settings,
  Users,
  Activity,
  Bell,
  Inbox,
  MessageSquare,
  LogOut,
  Search,
  Menu,
  X,
  ShieldAlert,
  ShoppingCart,
  Ticket,
  Calculator,
  Boxes,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { getMockAdminUser, clearMockAdminUser } from "@/lib/mock-auth";
import { SITE } from "@/lib/site-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: `Admin — ${SITE.name}` }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  superOnly?: boolean;
};
const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/pos", label: "POS Terminal", icon: Calculator },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/purchases", label: "Purchases", icon: ShoppingBag },
  { to: "/admin/suppliers", label: "Suppliers", icon: Truck },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/quotations", label: "Quotations", icon: Inbox },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { to: "/admin/banners", label: "Banners", icon: Megaphone },
  { to: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { to: "/admin/homepage", label: "Homepage", icon: Home },
  { to: "/admin/settings", label: "Site Settings", icon: Settings },
  { to: "/admin/admins", label: "Admin Users", icon: Users, superOnly: true },
  { to: "/admin/activity", label: "Activity", icon: Activity },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
];

function AdminLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [forbidden, setForbidden] = useState(false);
  const [checking, setChecking] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    (async () => {
      let u: { id: string; email?: string } | null = null;
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase.auth.getUser();
          if (data?.user) u = data.user;
        } catch (e) {
          console.error("getUser error:", e);
        }
      }
      if (!u && typeof window !== "undefined") {
        const mock = getMockAdminUser();
        if (mock) u = { id: mock.id, email: mock.email };
      }

      if (!u) {
        setForbidden(true);
        setChecking(false);
        return;
      }
      setEmail(u.email ?? "admin@example.com");

      if (isSupabaseConfigured() && u.id !== "mock-admin-id-123") {
        try {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", u.id);
          const r = roles?.[0]?.role ?? "";
          setRole(r);
          if (!["admin", "super_admin", "staff"].includes(r)) {
            setForbidden(true);
          }
          setChecking(false);
          return;
        } catch (e) {
          console.error("Fetch roles error:", e);
        }
      }
      setRole("super_admin");
      setForbidden(false);
      setChecking(false);
    })();
  }, []);

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => {
      if (!isSupabaseConfigured()) return 0;
      try {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false);
        return count ?? 0;
      } catch {
        return 0;
      }
    },
    refetchInterval: 30_000,
    enabled: !forbidden && isSupabaseConfigured(),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    clearMockAdminUser();
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("SignOut error:", e);
      }
    }
    navigate({ to: "/auth", replace: true });
  }

  if (checking) return <div className="p-8 text-muted-foreground">Loading admin…</div>;

  if (forbidden) {
    return (
      <div className="container-page py-16">
        <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-5 text-destructive">
          <ShieldAlert className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-semibold">Admin access required</p>
            <p className="text-sm mt-1">
              Your account is signed in as {email || "guest"} but doesn't have an admin role.
            </p>
            <Button className="mt-4" variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isSuper = role === "super_admin" || role === "admin";

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-card transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link to="/admin" className="font-display text-lg font-semibold">
            BMC Admin
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.filter((n) => !n.superOnly || isSuper).map((item) => {
            const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as never}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.to === "/admin/notifications" && unread > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {unread}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-muted-foreground">{email}</div>
          <div className="mb-2 px-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            {role}
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products, orders, customers..."
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const q = (e.target as HTMLInputElement).value.trim();
                  if (q) navigate({ to: "/admin/products", search: { q } as never });
                }
              }}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/admin/notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {unread}
                </span>
              )}
            </Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              View site →
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
