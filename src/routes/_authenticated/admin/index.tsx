import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import {
  getCachedProducts,
  getCachedCategories,
  isProductDeleted,
  fetchMasterProductsList,
} from "@/lib/catalog-cache";
import { Product } from "@/lib/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Tags,
  Image as ImageIcon,
  Inbox,
  MessageSquare,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type QuotationRow = {
  id: string;
  company_name: string;
  contact_person: string;
  status: string;
  created_at: string;
};
type MessageRow = {
  id: string;
  name: string;
  subject: string | null;
  status: string;
  created_at: string;
};
type ActivityRow = { id: string; action: string; entity: string; created_at: string };

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      let localProducts: Product[] = [];
      let localOrders: unknown[] = [];
      let localQuotes: QuotationRow[] = [];
      let localMsgs: MessageRow[] = [];
      if (typeof window !== "undefined") {
        try {
          localProducts = getCachedProducts();
          localOrders = JSON.parse(localStorage.getItem("bmc_orders") || "[]");
          localQuotes = JSON.parse(localStorage.getItem("bmc_quotations") || "[]");
          localMsgs = JSON.parse(localStorage.getItem("bmc_messages") || "[]");
        } catch (e) {
          console.warn("Local storage parse warning:", e);
        }
      }

      if (!isSupabaseConfigured()) {
        return {
          products: localProducts,
          categoriesCount: 0,
          quotations: localQuotes,
          messages: localMsgs,
          galleryCount: 0,
          activity: [] as ActivityRow[],
          orders: localOrders,
          profilesCount: 0,
        };
      }

      try {
        const productsRes = await supabase
          .from("products")
          .select("id, name, is_visible, is_archived, is_featured, price, created_at")
          .order("created_at", { ascending: false })
          .then((res) => res.data ?? []);

        const categoriesRes = await supabase
          .from("categories")
          .select("id", { count: "exact", head: true })
          .then((res) => res.count ?? 0);

        const quotationsRes = await supabase
          .from("quotations")
          .select("id, company_name, contact_person, status, created_at")
          .order("created_at", { ascending: false })
          .then((res) => (res.data ?? []) as QuotationRow[]);

        const messagesRes = await supabase
          .from("contact_messages")
          .select("id, name, subject, status, created_at")
          .order("created_at", { ascending: false })
          .then((res) => (res.data ?? []) as MessageRow[]);

        const galleryRes = await supabase
          .from("gallery_items")
          .select("id", { count: "exact", head: true })
          .then((res) => res.count ?? 0);

        const activityRes = await supabase
          .from("activity_logs")
          .select("id, action, entity, created_at")
          .order("created_at", { ascending: false })
          .limit(10)
          .then((res) => (res.data ?? []) as ActivityRow[]);

        const ordersRes = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .then((res) => res.data ?? []);

        const profilesRes = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .then((res) => res.count ?? 0);

        // Merge orders from DB and local storage
        const dbOrderIds = new Set((ordersRes as { id: string }[]).map((o) => o.id));
        const missingLocalOrders = (localOrders as { id: string }[]).filter(
          (o) => !dbOrderIds.has(o.id),
        );
        const combinedOrders = [...ordersRes, ...missingLocalOrders];

        // Merge quotations
        const dbQuoteIds = new Set(quotationsRes.map((q) => q.id));
        const missingLocalQuotes = localQuotes.filter((q) => !dbQuoteIds.has(q.id));
        const combinedQuotes = [...quotationsRes, ...missingLocalQuotes];

        // Merge messages
        const dbMsgIds = new Set(messagesRes.map((m) => m.id));
        const missingLocalMsgs = localMsgs.filter((m) => !dbMsgIds.has(m.id));
        const combinedMessages = [...messagesRes, ...missingLocalMsgs];

        // Master products list from single source of truth
        const finalProducts = (await fetchMasterProductsList(true)) as unknown as Product[];
        const localCatsCount = getCachedCategories().length;

        return {
          products: finalProducts,
          categoriesCount: Math.max(categoriesRes || 0, localCatsCount),
          quotations: combinedQuotes,
          messages: combinedMessages,
          galleryCount: galleryRes || 0,
          activity: activityRes,
          orders: combinedOrders,
          profilesCount: profilesRes || 0,
        };
      } catch (e) {
        console.warn("Exception in admin dashboard queryFn:", e);
        return {
          products: getCachedProducts(true) as unknown as Product[],
          categoriesCount: getCachedCategories().length,
          quotations: localQuotes,
          messages: localMsgs,
          galleryCount: 0,
          activity: [] as ActivityRow[],
          orders: localOrders,
          profilesCount: 0,
        };
      }
    },
    refetchOnWindowFocus: true,
  });

  const p = data?.products ?? [];
  const q = data?.quotations ?? [];
  const m = data?.messages ?? [];
  const ordersList = data?.orders ?? [];
  const totalRevenue = ordersList.reduce((sum: number, ord: Record<string, unknown>) => {
    const o = ord as { total_amount?: number; total?: number };
    return sum + Number(o.total_amount || o.total || 0);
  }, 0);

  // 7-day submissions chart
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const day = d.toISOString().slice(0, 10);
    const quotes = q.filter((x) => x.created_at.slice(0, 10) === day).length;
    const msgs = m.filter((x) => x.created_at.slice(0, 10) === day).length;
    return { day: label, quotes, msgs };
  });

  const quoteStatus = ["new", "in_progress", "quoted", "closed"].map((s) => ({
    name: s.replace("_", " "),
    value: q.filter((x) => x.status === s).length,
  }));
  const pieColors = ["hsl(var(--primary))", "hsl(var(--secondary))", "#e0b96b", "#94a3b8"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your business at a glance</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Package className="h-3.5 w-3.5" />
          Manage Products
        </Link>
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Manage Orders
        </Link>
        <Link
          to="/admin/customers"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Users className="h-3.5 w-3.5" />
          Customers
        </Link>
        <Link
          to="/admin/categories"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-accent transition-colors"
        >
          <Tags className="h-3.5 w-3.5" />
          Categories
        </Link>
        <Link
          to="/admin/messages"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-accent transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Messages
        </Link>
        <Link
          to="/admin/quotations"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-accent transition-colors"
        >
          <Inbox className="h-3.5 w-3.5" />
          Quotations
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={Inbox}
          label="Quotations"
          value={q.length}
          accent
          hint={`${q.filter((x) => x.status === "new").length} new`}
          to="/admin/quotations"
        />
        <Kpi
          icon={MessageSquare}
          label="Messages"
          value={m.length}
          hint={`${m.filter((x) => x.status === "new").length} new`}
          to="/admin/messages"
        />
        <Kpi
          icon={Package}
          label="Products"
          value={p.filter((x) => !x.is_archived).length}
          hint={`${p.filter((x) => x.is_visible && !x.is_archived).length} live`}
          to="/admin/products"
        />
        <Kpi
          icon={Tags}
          label="Categories"
          value={data?.categoriesCount ?? 0}
          to="/admin/categories"
        />
        <Kpi
          icon={ImageIcon}
          label="Gallery items"
          value={data?.galleryCount ?? 0}
          to="/admin/gallery"
        />
        <Kpi
          icon={TrendingUp}
          label="Revenue"
          value={`PKR ${totalRevenue.toLocaleString()}`}
          hint={`${ordersList.length} total orders`}
          to="/admin/orders"
          accent
        />
        <Kpi
          icon={TrendingUp}
          label="Featured products"
          value={p.filter((x) => x.is_featured && !x.is_archived).length}
          to="/admin/products"
        />
        <Kpi
          icon={ShoppingCart}
          label="Orders"
          value={data?.orders?.length ?? 0}
          hint="View & manage orders"
          to="/admin/orders"
          accent
        />
        <Kpi
          icon={Users}
          label="Customers"
          value={
            data?.profilesCount
              ? Math.max(data.profilesCount, data?.orders?.length ?? 0)
              : (data?.orders?.length ?? 0)
          }
          hint="Customer directory"
          to="/admin/customers"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Submissions this week</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days}>
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="quotes"
                    fill="hsl(var(--primary))"
                    name="Quotations"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="msgs" fill="#e0b96b" name="Messages" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quotations by status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <Skeleton className="h-full" />
            ) : q.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No quotations yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={quoteStatus} dataKey="value" nameKey="name" outerRadius={80} label>
                    {quoteStatus.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent quotations</CardTitle>
            <Link to="/admin/quotations" className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {q.slice(0, 5).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No quotations yet</p>
            )}
            {q.slice(0, 5).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{row.company_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.contact_person} · {new Date(row.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={row.status === "new" ? "default" : "secondary"}>{row.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.activity ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity yet</p>
            )}
            {(data?.activity ?? []).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <span>
                  <span className="font-medium">{a.action}</span> on {a.entity}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  muted,
  to,
}: {
  icon: typeof Package;
  label: string;
  value: number | string;
  hint?: string;
  accent?: boolean;
  muted?: boolean;
  to?: string;
}) {
  const content = (
    <Card
      className={`transition-all ${muted ? "opacity-60" : ""} ${to ? "hover:border-primary/50 hover:shadow-sm cursor-pointer" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={`mt-1 font-display text-2xl ${accent ? "text-primary font-bold" : ""}`}>
              {value}
            </p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div
            className={`rounded-lg p-2 ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (to) {
    return <Link to={to as never}>{content}</Link>;
  }

  return content;
}
