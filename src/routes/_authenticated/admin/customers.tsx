import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteSettings } from "@/context/site-settings-context";
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  MessageSquare,
  UserCheck,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: CustomersAdminPage,
});

type CustomerRecord = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string;
  isRegistered: boolean;
};

function CustomersAdminPage() {
  const [search, setSearch] = useState("");
  const { getWhatsAppUrl } = useSiteSettings();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async (): Promise<CustomerRecord[]> => {
      const customerMap = new Map<string, CustomerRecord>();

      // 1. Fetch orders to build customer stats from order history
      if (isSupabaseConfigured()) {
        try {
          const { data: ordersData } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });

          if (ordersData && ordersData.length > 0) {
            ordersData.forEach((oRecord) => {
              const o = oRecord as Record<string, unknown>;
              const addr = (o.delivery_address as Record<string, string>) || {};
              const name = addr.customer_name || o.customer_name || "Valued Customer";
              const phone = addr.customer_phone || o.customer_phone || "N/A";
              const email = o.customer_email || addr.customer_email || "N/A";
              const addressStr =
                typeof o.delivery_address === "string"
                  ? o.delivery_address
                  : [addr.house, addr.street, addr.area, addr.city || "Karachi"]
                      .filter(Boolean)
                      .join(", ");

              const key = phone !== "N/A" ? phone : name;

              if (customerMap.has(key)) {
                const existing = customerMap.get(key)!;
                existing.ordersCount += 1;
                existing.totalSpent += Number(o.total || 0);
              } else {
                customerMap.set(key, {
                  id: o.id,
                  name,
                  phone,
                  email,
                  address: addressStr || "Karachi",
                  ordersCount: 1,
                  totalSpent: Number(o.total || 0),
                  lastOrderDate: o.created_at,
                  isRegistered: false,
                });
              }
            });
          }
        } catch (err) {
          console.warn("Failed fetching orders for customer directory:", err);
        }

        // 2. Fetch profiles table
        try {
          const { data: profiles } = await supabase.from("profiles").select("*");
          if (profiles && profiles.length > 0) {
            profiles.forEach((pRecord) => {
              const p = pRecord as Record<string, unknown>;
              const key = p.phone || p.full_name || p.id;
              if (customerMap.has(key)) {
                const existing = customerMap.get(key)!;
                existing.isRegistered = true;
                if (p.full_name) existing.name = p.full_name;
                if (p.email) existing.email = p.email;
              } else {
                customerMap.set(key, {
                  id: p.id,
                  name: p.full_name || "Registered Customer",
                  phone: p.phone || "N/A",
                  email: p.email || "N/A",
                  address: p.address || "Karachi",
                  ordersCount: 0,
                  totalSpent: 0,
                  lastOrderDate: p.created_at || new Date().toISOString(),
                  isRegistered: true,
                });
              }
            });
          }
        } catch (err) {
          console.warn("Profiles fetch exception:", err);
        }
      }

      // 3. Fallback to localStorage orders if map is empty
      if (customerMap.size === 0 && typeof window !== "undefined") {
        try {
          const localOrders = JSON.parse(localStorage.getItem("bmc_orders") || "[]");
          localOrders.forEach((o: Record<string, unknown>) => {
            const addr = (o.delivery_address as Record<string, string>) || {};
            const name = (addr.customer_name || o.customer_name || "Valued Customer") as string;
            const phone = (addr.customer_phone || o.customer_phone || "N/A") as string;
            const email = (o.customer_email || addr.customer_email || "N/A") as string;
            const key = phone !== "N/A" ? phone : name;

            if (customerMap.has(key)) {
              const existing = customerMap.get(key)!;
              existing.ordersCount += 1;
              existing.totalSpent += Number(o.total || 0);
            } else {
              customerMap.set(key, {
                id: (o.id as string) || String(Math.random()),
                name,
                phone,
                email,
                address: "Karachi",
                ordersCount: 1,
                totalSpent: Number(o.total || 0),
                lastOrderDate: (o.created_at as string) || new Date().toISOString(),
                isRegistered: false,
              });
            }
          });
        } catch (e) {
          console.warn("LocalStorage customer aggregation error:", e);
        }
      }

      return Array.from(customerMap.values());
    },
  });

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  const registeredCount = customers.filter((c) => c.isRegistered).length;
  const totalSpentAll = customers.reduce((acc, c) => acc + c.totalSpent, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Customers Directory</h1>
          <p className="text-sm text-muted-foreground">
            Manage registered clients and recurring buyers
          </p>
        </div>
        <Badge variant="secondary" className="w-fit text-xs px-3 py-1 font-semibold">
          <Users className="mr-1.5 h-3.5 w-3.5" />
          {customers.length} Total Customers
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Total Directory
              </p>
              <p className="mt-1 font-display text-2xl font-bold">{customers.length}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Registered</p>
              <p className="mt-1 font-display text-2xl font-bold text-emerald-600">
                {registeredCount}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Guest Buyers
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-amber-600">
                {customers.length - registeredCount}
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Total Revenue
              </p>
              <p className="mt-1 font-display text-xl font-bold text-primary">
                Rs. {totalSpentAll.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customer name, phone, email or area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Customer Directory List */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-base font-semibold">No customers found</p>
          <p className="text-xs mt-1">
            Customers who place orders or create accounts will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const waMsg = `Assalam-o-Alaikum ${c.name},\nGreeting from Bismillah Milk Corner! How can we assist you today with your fresh dairy & bakery orders?`;
            const waUrl = getWhatsAppUrl(waMsg);

            return (
              <Card
                key={c.id}
                className="relative overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-base line-clamp-1">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            Active:{" "}
                            {new Date(c.lastOrderDate).toLocaleDateString("en-PK", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={c.isRegistered ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {c.isRegistered ? "Member" : "Guest"}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                      {c.phone && c.phone !== "N/A" && (
                        <p className="flex items-center gap-2 text-foreground font-medium">
                          <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <a href={`tel:${c.phone}`} className="hover:underline">
                            {c.phone}
                          </a>
                        </p>
                      )}
                      {c.email && c.email !== "N/A" && (
                        <p className="flex items-center gap-2 truncate">
                          <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </p>
                      )}
                      <p className="flex items-start gap-2 line-clamp-2">
                        <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{c.address}</span>
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-3 flex items-center justify-between gap-2">
                    <div className="text-xs">
                      <span className="text-muted-foreground">Orders: </span>
                      <span className="font-bold text-foreground">{c.ordersCount}</span>
                      <span className="mx-1 text-muted-foreground">•</span>
                      <span className="font-bold text-primary">
                        Rs. {c.totalSpent.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {c.phone && c.phone !== "N/A" && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          title="Contact via WhatsApp"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      )}
                      <Link
                        to="/admin/orders"
                        search={{ q: c.phone !== "N/A" ? c.phone : c.name } as never}
                        className="inline-flex h-8 px-2.5 items-center justify-center rounded-lg border border-border text-xs font-semibold hover:bg-accent"
                      >
                        Orders
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
