import React, { useState } from "react";
import {
  Search,
  Filter,
  Package,
  Calendar,
  CreditCard,
  Download,
  Truck,
  Eye,
  RefreshCw,
  XCircle,
  FileText,
  AlertCircle,
} from "lucide-react";
import { generatePDFInvoice } from "@/lib/pdf-invoice";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DbOrder, DbOrderItem } from "@/types/checkout";

interface OrderHistoryTabProps {
  orders: DbOrder[];
  onViewDetails: (order: DbOrder) => void;
  onTrackOrder: (order: DbOrder) => void;
  onReorder: (order: DbOrder) => void;
  onRefreshOrders: () => void;
}

export function OrderHistoryTab({
  orders,
  onViewDetails,
  onTrackOrder,
  onReorder,
  onRefreshOrders,
}: OrderHistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(order.items || [])
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDownloadInvoice = (order: DbOrder) => {
    try {
      const items = (order.items || []) as DbOrderItem[];
      generatePDFInvoice(order, items);
      toast.success("Invoice downloaded successfully!");
    } catch (e) {
      console.error("PDF generation failed:", e);
      toast.error("Failed to generate PDF invoice.");
    }
  };

  const handleCancelOrder = async (order: DbOrder) => {
    if (order.status !== "pending" && order.status !== "confirmed") {
      toast.error("Order cannot be cancelled at this stage.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to cancel Order #${order.order_number || order.id.slice(0, 8)}?`,
      )
    ) {
      return;
    }

    setCancellingId(order.id);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id);

      if (error) throw error;

      toast.success("Order cancelled successfully.");
      onRefreshOrders();
    } catch (e: unknown) {
      console.error("Cancel order failed:", e);
      const msg = e instanceof Error ? e.message : "Failed to cancel order.";
      toast.error(msg);
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-300">
            Pending
          </span>
        );
      case "confirmed":
        return (
          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-300">
            Confirmed
          </span>
        );
      case "preparing":
        return (
          <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-300">
            Preparing
          </span>
        );
      case "packed":
        return (
          <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-300">
            Packed
          </span>
        );
      case "out_for_delivery":
        return (
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-300">
            Out for Delivery
          </span>
        );
      case "delivered":
        return (
          <span className="rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-400">
            Delivered
          </span>
        );
      case "cancelled":
        return (
          <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-300">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">My Orders History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            View detailed order receipts, live tracking timelines and instant reorder options
          </p>
        </div>

        <button
          onClick={onRefreshOrders}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary transition-all self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5 text-primary" /> Refresh Orders
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Order ID or item name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:inline" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="packed">Packed</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h3 className="mt-3 font-semibold text-base text-foreground">No orders found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your search terms or status filters."
              : "You haven't placed any orders yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const items = order.items || [];
            const canCancel = order.status === "pending" || order.status === "confirmed";

            return (
              <div
                key={order.id}
                className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:border-primary/40 transition-all space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/70">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-base font-bold text-foreground">
                      #{order.order_number || order.id.slice(0, 8)}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      {new Date(order.created_at).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="flex items-center gap-1 capitalize">
                      <CreditCard className="h-3.5 w-3.5 text-primary" />
                      {order.payment_method === "cod"
                        ? "Cash on Delivery"
                        : order.payment_method === "online" || order.payment_method === "card"
                          ? "Online Card Payment"
                          : order.payment_method || "COD"}
                    </span>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ordered Products ({items.length})
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {items.map((item: DbOrderItem, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0"
                        >
                          <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[280px]">
                            {item.quantity}x {item.name || item.product_name || "Dairy Item"}
                          </span>
                          <span className="font-mono text-muted-foreground shrink-0">
                            Rs.{" "}
                            {(
                              (item.unit_price || item.price || 0) * (item.quantity || 1)
                            ).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl bg-accent/40 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="font-mono text-base font-bold text-primary">
                        Rs. {Number(order.total_amount || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        <strong className="text-foreground">Delivery:</strong>{" "}
                        {order.delivery_method === "pickup"
                          ? "Store Pickup"
                          : "Doorstep Express Delivery"}
                      </p>
                      {order.address && (
                        <p className="truncate">
                          <strong className="text-foreground">Address:</strong>{" "}
                          {typeof order.address === "string"
                            ? order.address
                            : `${order.address.house || ""} ${order.address.street || ""}, ${order.address.area || ""}, ${order.address.city || ""}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/70">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onViewDetails(order)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Details
                    </button>

                    <button
                      onClick={() => onTrackOrder(order)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-accent hover:border-primary transition-colors"
                    >
                      <Truck className="h-3.5 w-3.5 text-primary" /> Realtime Track
                    </button>

                    <button
                      onClick={() => handleDownloadInvoice(order)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                      title="Download PDF Invoice"
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground" /> Invoice
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {canCancel && (
                      <button
                        disabled={cancellingId === order.id}
                        onClick={() => handleCancelOrder(order)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancel Order
                      </button>
                    )}

                    <button
                      onClick={() => onReorder(order)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-sm transition-all"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Reorder All Items
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
