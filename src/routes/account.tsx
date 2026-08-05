import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { AccountOverview } from "@/components/account/account-overview";
import { OrderHistoryTab } from "@/components/account/order-history-tab";
import { SavedAddressesTab } from "@/components/account/saved-addresses-tab";
import { AccountSettingsTab } from "@/components/account/account-settings-tab";
import { CustomerNotificationsTab } from "@/components/account/notifications-tab";
import { OrderDetailsModal } from "@/components/account/order-details-modal";
import { TrackOrderModal } from "@/components/account/track-order-modal";
import { useShop } from "@/context/shop-context";
import type { DbOrder, DbOrderItem } from "@/types/checkout";
import {
  User,
  ShoppingBag,
  MapPin,
  Settings,
  LogOut,
  Lock,
  Mail,
  Phone,
  KeyRound,
  ShieldCheck,
  Loader2,
  Package,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { SITE } from "@/lib/site-data";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: `My Account — ${SITE.name}` },
      {
        name: "description",
        content:
          "Manage your Bismillah Milk Corner account, view order history, track deliveries, and manage saved addresses.",
      },
    ],
  }),
  component: CustomerAccountPage,
});

function CustomerAccountPage() {
  const { user, profile, loading: authLoading, signOut, signInWithPassword, signUp } = useAuth();
  const { addToCart, setIsCartOpen } = useShop();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<DbOrder | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<DbOrder | null>(null);

  // Auth Form State (when guest)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // Fetch orders when user is authenticated
  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setOrders(data as unknown as DbOrder[]);
          setLoadingOrders(false);
          return;
        }
      }

      // Local storage fallback for customer orders
      const localKey = `bmc_user_orders_${user.id}`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        setOrders(JSON.parse(saved));
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn("Fetch user orders failed:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }

    setSubmittingAuth(true);
    try {
      if (authMode === "signin") {
        const res = await signInWithPassword(email, password);
        if (res.error) {
          toast.error(res.error.message || "Sign in failed");
        } else {
          toast.success("Welcome back!");
        }
      } else {
        const names = fullName.trim().split(" ");
        const firstName = names[0] || "";
        const lastName = names.slice(1).join(" ") || "";
        const res = await signUp(email, password, {
          firstName,
          lastName,
          phone,
        });
        if (res.error) {
          toast.error(res.error.message || "Sign up failed");
        } else {
          toast.success("Account created successfully!");
        }
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Authentication error");
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleReorder = (order: DbOrder) => {
    const items = ((order as Record<string, unknown>).items || []) as Array<
      Record<string, unknown>
    >;
    if (items.length === 0) {
      toast.info("No items found to reorder.");
      return;
    }

    items.forEach((item) => {
      addToCart(
        {
          id: item.product_id || `prod-${Date.now()}`,
          name: item.product_name || "Product",
          slug: item.product_slug || "product",
          price: item.unit_price || item.price || 0,
          originalPrice: null,
          unit: "kg",
          category: "Reordered Item",
          image: item.thumbnail_url || SITE.logo,
          images: [item.thumbnail_url || SITE.logo],
          description: "",
          brand: "BMC",
          tags: [],
          stockStatus: "in_stock",
          stockCount: 100,
          sku: `SKU-${Date.now()}`,
          rating: 5,
          reviewCount: 1,
          specifications: {},
          frequentlyBoughtTogether: [],
          featured: false,
          sortOrder: 1,
        },
        item.quantity || 1,
      );
    });

    toast.success(
      `Added ${items.length} item(s) from Order #${order.order_number || order.id.slice(0, 8)} to your cart!`,
    );
    setIsCartOpen(true);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // GUEST STATE (Show Login / Register Card)
  if (!user) {
    return (
      <div className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-md">
          <Card className="border-border shadow-[var(--shadow-elegant)] rounded-3xl overflow-hidden">
            <div className="bg-primary/5 p-6 text-center border-b border-border">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <User className="h-7 w-7" />
              </div>
              <h1 className="font-display text-2xl font-bold text-primary">Customer Account</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Sign in or register to track orders, manage addresses, and enjoy faster checkout.
              </p>
            </div>

            <CardContent className="p-6">
              {/* Mode Switcher */}
              <div className="mb-6 flex rounded-xl bg-muted p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className={`flex-1 rounded-lg py-2 transition-all ${
                    authMode === "signin"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className={`flex-1 rounded-lg py-2 transition-all ${
                    authMode === "signup"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  New Account
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === "signup" && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="fullName" className="text-xs">
                        Full Name
                      </Label>
                      <Input
                        id="fullName"
                        placeholder="Muhammad Ali"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-xs">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        placeholder="012345678910"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-xs">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full font-semibold rounded-xl mt-2"
                  disabled={submittingAuth}
                >
                  {submittingAuth ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : authMode === "signin" ? (
                    "Sign In to Account"
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted-foreground">
                Looking for store management?{" "}
                <button
                  type="button"
                  onClick={() => navigate({ to: "/auth" })}
                  className="font-medium text-primary hover:underline"
                >
                  Admin Portal Sign In
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // AUTHENTICATED CUSTOMER DASHBOARD
  return (
    <div className="container-page py-8 md:py-12">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Navigation Sidebar */}
        <aside className="space-y-6">
          <Card className="border-border rounded-3xl overflow-hidden shadow-[var(--shadow-soft)]">
            <div className="p-6 bg-gradient-to-b from-primary/10 to-transparent border-b border-border text-center">
              <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-primary/20 p-1 ring-2 ring-primary/20">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xl">
                    {(profile?.full_name || user.email || "C")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <p className="font-display font-bold text-foreground text-base truncate">
                {profile?.full_name || user.email?.split("@")[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>

            <CardContent className="p-3 space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "overview"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <User className="h-4 w-4" />
                Dashboard Overview
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "orders"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <span className="flex items-center gap-3">
                  <ShoppingBag className="h-4 w-4" />
                  Order History
                </span>
                {orders.length > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      activeTab === "orders"
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {orders.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("addresses")}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "addresses"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <MapPin className="h-4 w-4" />
                Saved Delivery Addresses
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("notifications")}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "notifications"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <Bell className="h-4 w-4" />
                Notifications & Alerts
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "settings"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <Settings className="h-4 w-4" />
                Account Settings
              </button>

              <div className="pt-3 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    toast.success("Signed out successfully.");
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Workspace Tab Views */}
        <main className="space-y-6">
          {activeTab === "overview" && (
            <AccountOverview
              orders={orders}
              onSelectTab={(tab) => setActiveTab(tab)}
              onViewOrderDetails={(ord) => setSelectedOrder(ord)}
              onTrackOrder={(ord) => setTrackingOrder(ord)}
              onReorder={handleReorder}
            />
          )}

          {activeTab === "orders" && (
            <OrderHistoryTab
              orders={orders}
              onViewDetails={(ord) => setSelectedOrder(ord)}
              onTrackOrder={(ord) => setTrackingOrder(ord)}
              onReorder={handleReorder}
              onRefreshOrders={fetchOrders}
            />
          )}

          {activeTab === "addresses" && <SavedAddressesTab />}

          {activeTab === "notifications" && <CustomerNotificationsTab />}

          {activeTab === "settings" && <AccountSettingsTab />}
        </main>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onTrackOrder={(ord) => {
            setSelectedOrder(null);
            setTrackingOrder(ord);
          }}
          onReorder={handleReorder}
        />
      )}

      {/* Track Order Modal */}
      {trackingOrder && (
        <TrackOrderModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />
      )}
    </div>
  );
}
