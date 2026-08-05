import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  Heart,
  MapPin,
  Bell,
  ArrowRight,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  PlusCircle,
  Settings,
  HelpCircle,
  FileText,
} from "lucide-react";
import type { DbOrder } from "@/types/checkout";
import { useAuth } from "@/context/auth-context";
import { useShop } from "@/context/shop-context";

interface AccountOverviewProps {
  orders: DbOrder[];
  onSelectTab: (tab: string) => void;
  onViewOrderDetails: (order: DbOrder) => void;
  onTrackOrder: (order: DbOrder) => void;
  onReorder: (order: DbOrder) => void;
}

export function AccountOverview({
  orders,
  onSelectTab,
  onViewOrderDetails,
  onTrackOrder,
  onReorder,
}: AccountOverviewProps) {
  const { profile, user, unreadNotificationsCount } = useAuth();
  const { wishlistCount } = useShop();

  const recentOrders = orders.slice(0, 3);
  const pendingOrdersCount = orders.filter(
    (o) => o.status === "pending" || o.status === "confirmed" || o.status === "preparing",
  ).length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/95 via-primary to-emerald-900 p-6 sm:p-8 text-primary-foreground shadow-[var(--shadow-elegant)]">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl bg-white/10 ring-2 ring-white/20 overflow-hidden flex items-center justify-center font-display text-2xl font-bold text-white shadow-inner">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Profile"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>
                  {(
                    profile?.first_name?.[0] ||
                    profile?.full_name?.[0] ||
                    user?.email?.[0] ||
                    "U"
                  ).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/80 font-semibold">
                Welcome back
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
                {profile?.full_name || user?.email || "Valued Customer"}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 mt-1">
                {user?.email || profile?.phone || "Customer Account"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelectTab("settings")}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-all backdrop-blur-md"
            >
              <Settings className="h-3.5 w-3.5" /> Edit Profile
            </button>
            <button
              onClick={() => onSelectTab("support")}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 transition-all shadow-sm"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Get Support
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onSelectTab("orders")}
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Orders
            </span>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {orders.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              {pendingOrdersCount} active in delivery
            </p>
          </div>
        </button>

        <button
          onClick={() => onSelectTab("wishlist")}
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-rose-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Saved Wishlist
            </span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <Heart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {wishlistCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Synced across devices</p>
          </div>
        </button>

        <button
          onClick={() => onSelectTab("addresses")}
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Saved Addresses
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <MapPin className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">Manage</p>
            <p className="text-xs text-muted-foreground mt-1">Home, Office & Delivery</p>
          </div>
        </button>

        <button
          onClick={() => onSelectTab("notifications")}
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-amber-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notifications
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors relative">
              <Bell className="h-5 w-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-card" />
              )}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {unreadNotificationsCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Unread alerts & offers</p>
          </div>
        </button>
      </div>

      {/* Recent Orders Section */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Recent Orders
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quick status tracking and one-click reordering
            </p>
          </div>
          <button
            onClick={() => onSelectTab("orders")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            View all orders <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">No orders yet</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Explore our fresh dairy products, organic milk, and authentic ghee catalog to place
              your first order.
            </p>
            <Link
              to="/products"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Shop Fresh Products
            </Link>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border/60">
            {recentOrders.map((order) => {
              const statusColors: Record<string, string> = {
                pending: "bg-amber-500/10 text-amber-700 border-amber-300",
                confirmed: "bg-blue-500/10 text-blue-700 border-blue-300",
                preparing: "bg-purple-500/10 text-purple-700 border-purple-300",
                packed: "bg-indigo-500/10 text-indigo-700 border-indigo-300",
                out_for_delivery: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
                delivered: "bg-emerald-600/10 text-emerald-800 border-emerald-400",
                cancelled: "bg-rose-500/10 text-rose-700 border-rose-300",
              };

              return (
                <div
                  key={order.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-accent/40 rounded-xl px-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-bold text-foreground">
                        #{order.order_number || order.id.slice(0, 8)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          statusColors[order.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {order.status === "out_for_delivery" ? "Out for Delivery" : order.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Placed on{" "}
                      {new Date(order.created_at).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      • {order.delivery_method === "pickup" ? "Store Pickup" : "Delivery"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 justify-between md:justify-end">
                    <span className="text-sm font-bold text-primary font-mono">
                      Rs. {Number(order.total_amount || 0).toLocaleString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onTrackOrder(order)}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        <Truck className="h-3.5 w-3.5 text-primary" /> Track
                      </button>
                      <button
                        onClick={() => onViewOrderDetails(order)}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => onReorder(order)}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                        title="Add items back to cart"
                      >
                        Reorder
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onSelectTab("support")}
          className="cursor-pointer rounded-2xl border border-border bg-card p-5 hover:border-primary transition-all flex items-start gap-4"
        >
          <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Need Assistance?</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Create a support ticket for order queries, quality concerns or custom dairy bookings.
            </p>
          </div>
        </div>

        <div
          onClick={() => onSelectTab("addresses")}
          className="cursor-pointer rounded-2xl border border-border bg-card p-5 hover:border-primary transition-all flex items-start gap-4"
        >
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
            <PlusCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Add Saved Address</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Save home or office addresses for seamless 1-click checkout in Karachi delivery zones.
            </p>
          </div>
        </div>

        <div
          onClick={() => onSelectTab("settings")}
          className="cursor-pointer rounded-2xl border border-border bg-card p-5 hover:border-primary transition-all flex items-start gap-4"
        >
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Preferences & Language</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Update password, preferred language (English/Urdu) and WhatsApp alert preferences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
