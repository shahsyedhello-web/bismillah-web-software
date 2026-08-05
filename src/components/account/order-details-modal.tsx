import React from "react";
import {
  X,
  Package,
  Calendar,
  CreditCard,
  Truck,
  MapPin,
  Download,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
} from "lucide-react";
import { generatePDFInvoice } from "@/lib/pdf-invoice";
import { toast } from "sonner";
import type { DbOrder, DbOrderItem } from "@/types/checkout";

interface OrderDetailsModalProps {
  order: DbOrder | null;
  onClose: () => void;
  onTrackOrder: (order: DbOrder) => void;
  onReorder: (order: DbOrder) => void;
}

export function OrderDetailsModal({
  order,
  onClose,
  onTrackOrder,
  onReorder,
}: OrderDetailsModalProps) {
  if (!order) return null;

  const items = order.items || [];

  const handleDownloadInvoice = () => {
    try {
      generatePDFInvoice(order, items);
      toast.success("Invoice downloaded!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to download invoice.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-card p-6 sm:p-8 shadow-2xl ring-1 ring-border">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Order Details
            </span>
            <h2 className="font-display text-2xl font-bold text-foreground mt-0.5">
              Order #{order.order_number || order.id.slice(0, 8)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* Status & Quick Specs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-accent/50 text-xs">
            <div>
              <span className="text-muted-foreground block">Order Status</span>
              <span className="font-bold capitalize text-primary mt-0.5 block">
                {order.status === "out_for_delivery" ? "Out For Delivery" : order.status}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Date Placed</span>
              <span className="font-medium text-foreground mt-0.5 block">
                {new Date(order.created_at).toLocaleDateString("en-PK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Payment Method</span>
              <span className="font-medium text-foreground mt-0.5 block uppercase">
                {order.payment_method === "cod"
                  ? "Cash on Delivery"
                  : order.payment_method || "COD"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Delivery Type</span>
              <span className="font-medium text-foreground mt-0.5 block capitalize">
                {order.delivery_method === "pickup" ? "Store Pickup" : "Express Delivery"}
              </span>
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div>
            <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Purchased Items ({items.length})
            </h3>
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Item</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((item: DbOrderItem, idx: number) => {
                    const unitPrice = item.unit_price || 0;
                    const qty = item.quantity || 1;
                    return (
                      <tr key={idx} className="hover:bg-accent/20">
                        <td className="p-3 font-medium text-foreground">
                          {item.name || item.product_name || "Dairy Item"}
                        </td>
                        <td className="p-3 text-center font-mono">{qty}</td>
                        <td className="p-3 text-right font-mono">
                          Rs. {unitPrice.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          Rs. {(unitPrice * qty).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Summary & Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Delivery Address */}
            <div className="rounded-2xl border border-border p-4 space-y-2">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" /> Delivery Information
              </h4>
              <p className="text-xs font-bold text-foreground">
                {order.customer_name || "Valued Customer"}
              </p>
              <p className="text-xs text-muted-foreground">
                Phone: {order.customer_phone || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                Email: {order.customer_email || "N/A"}
              </p>
              <div className="mt-2 text-xs text-foreground bg-accent/40 p-2.5 rounded-xl">
                {typeof order.address === "string"
                  ? order.address
                  : order.address
                    ? `${order.address.house || ""} ${order.address.street || ""}, ${order.address.area || ""}, ${order.address.city || "Karachi"}`
                    : "Store Pickup at Defence Market Phase 2, Karachi"}
              </div>
            </div>

            {/* Bill Calculations */}
            <div className="rounded-2xl border border-border p-4 space-y-2 bg-accent/20">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Payment Summary
              </h4>
              <div className="space-y-1.5 text-xs pt-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">
                    Rs. {Number(order.subtotal || order.total_amount || 0).toLocaleString()}
                  </span>
                </div>
                {Number(order.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="font-mono">
                      -Rs. {Number(order.discount_amount).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Fee</span>
                  <span className="font-mono">
                    {Number(order.delivery_fee || 0) === 0
                      ? "FREE"
                      : `Rs. ${Number(order.delivery_fee).toLocaleString()}`}
                  </span>
                </div>
                {Number(order.tax || 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span className="font-mono">Rs. {Number(order.tax).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border font-bold text-sm text-foreground">
                  <span>Total Paid</span>
                  <span className="font-mono text-primary">
                    Rs. {Number(order.total_amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
            <button
              onClick={handleDownloadInvoice}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-accent"
            >
              <Download className="h-4 w-4 text-primary" /> Download Invoice PDF
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onTrackOrder(order);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Truck className="h-4 w-4" /> Live Tracking
              </button>

              <button
                onClick={() => {
                  onClose();
                  onReorder(order);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Reorder Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
