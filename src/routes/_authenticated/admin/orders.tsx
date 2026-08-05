import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { buildWhatsAppOrderMessage } from "@/lib/checkout-service";
import { generatePDFInvoice } from "@/lib/pdf-invoice";
import { useSiteSettings } from "@/context/site-settings-context";
import type { DbOrder, DbOrderItem, OrderStatus } from "@/types/checkout";
import { getCachedProducts, saveCachedProducts, notifyCatalogUpdated } from "@/lib/catalog-cache";
import { recordInventoryHistory } from "@/lib/inventory-service";
import {
  Search,
  Filter,
  Eye,
  FileText,
  MessageSquare,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  const qc = useQueryClient();
  const { settings, getWhatsAppUrl } = useSiteSettings();

  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected Order Modal
  const [selectedOrder, setSelectedOrder] = useState<DbOrder | null>(null);
  const [selectedItems, setSelectedItems] = useState<DbOrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let dbOrders: DbOrder[] = [];
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data) {
            dbOrders = data as unknown as DbOrder[];
          }
        } catch (e) {
          console.warn("Error fetching Supabase orders:", e);
        }
      }

      let localOrders: DbOrder[] = [];
      if (typeof window !== "undefined") {
        try {
          localOrders = JSON.parse(localStorage.getItem("bmc_orders") || "[]");
        } catch (e) {
          console.warn("Error reading local orders:", e);
        }
      }

      const dbOrderIds = new Set(dbOrders.map((o) => o.id));
      const extraLocalOrders = localOrders.filter((o) => !dbOrderIds.has(o.id));
      let combined = [...dbOrders, ...extraLocalOrders];

      if (statusFilter !== "all") {
        combined = combined.filter((o) => o.status === statusFilter);
      }

      setOrders(combined);
    } catch (e) {
      const err = e as Error;
      console.error("Error fetching orders:", e);
      toast.error(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const viewOrderDetails = async (order: DbOrder) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      if (error) throw error;
      setSelectedItems((data as unknown as DbOrderItem[]) || []);
    } catch (e) {
      console.error("Error fetching order items:", e);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdatingStatus(true);
    try {
      const currentOrder = orders.find((o) => o.id === orderId);
      const isConfirming = newStatus === "confirmed" && currentOrder?.status !== "confirmed";

      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("orders")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", orderId);

        if (error) throw error;
      }

      // If cancelling or refunding order, restore stock and record inventory history
      const isCancelling = newStatus === "cancelled" || newStatus === "refunded";
      if (
        isCancelling &&
        currentOrder?.status !== "cancelled" &&
        currentOrder?.status !== "refunded"
      ) {
        let orderItemsToProcess = selectedOrder?.id === orderId ? selectedItems : [];
        if (!orderItemsToProcess.length && isSupabaseConfigured()) {
          const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
          if (data) orderItemsToProcess = data as unknown as DbOrderItem[];
        }

        if (orderItemsToProcess.length > 0) {
          const products = getCachedProducts();
          let updatedAny = false;

          orderItemsToProcess.forEach((item) => {
            const prod = products.find(
              (p) =>
                p.id === item.product_id ||
                (p.slug && p.slug === item.product_name?.toLowerCase().replace(/\s+/g, "-")),
            );
            if (prod) {
              const currentStock = prod.stock_quantity ?? 50;
              const newStock = currentStock + item.quantity;
              prod.stock_quantity = newStock;
              prod.available_stock = Math.max(0, newStock - (prod.reserved_stock || 0));
              updatedAny = true;

              recordInventoryHistory({
                product_id: prod.id,
                product_name: prod.name,
                sku: prod.sku || prod.slug.slice(0, 10).toUpperCase(),
                type: "adjustment",
                quantity_change: item.quantity,
                previous_stock: currentStock,
                new_stock: newStock,
                reference_no: currentOrder?.order_number || orderId.slice(0, 8),
                reason: `Website Order #${currentOrder?.order_number || orderId.slice(0, 8)} ${newStatus.toUpperCase()}`,
                created_by: "Admin",
              });
            }
          });

          if (updatedAny) {
            saveCachedProducts(products);
            notifyCatalogUpdated();
          }
        }
      }

      toast.success(`Order status updated to "${newStatus}"`);

      // Update local state and localStorage backup
      setOrders((prev) => {
        const updated = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
        try {
          localStorage.setItem("bmc_orders", JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: newPaymentStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      toast.success(`Payment status updated to "${newPaymentStatus}"`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, payment_status: newPaymentStatus } : o)),
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, payment_status: newPaymentStatus } : null));
      }
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Failed to update payment status");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    // Immediately remove from local state
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (selectedOrder?.id === orderId) setSelectedOrder(null);

    // Also update local storage cache if present
    try {
      const stored = localStorage.getItem("bmc_orders");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            "bmc_orders",
            JSON.stringify(parsed.filter((o: { id: string }) => o.id !== orderId)),
          );
        }
      }
    } catch (e) {
      console.warn("Error updating local orders cache:", e);
    }

    toast.success("Order deleted successfully");
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("order_items").delete().eq("order_id", orderId);
        await supabase.from("orders").delete().eq("id", orderId);
      } catch (e) {
        console.warn("Supabase order deletion error (deleted locally):", e);
      }
    }
  };

  const filteredOrders = orders.filter((o) => {
    const addr = (o.delivery_address as unknown as Record<string, string>) || {};
    const searchLower = search.toLowerCase();
    const orderNumMatch = o.order_number?.toLowerCase().includes(searchLower);
    const nameMatch =
      addr.customer_name?.toLowerCase().includes(searchLower) ||
      o.customer_name?.toLowerCase().includes(searchLower);
    const phoneMatch =
      addr.customer_phone?.includes(searchLower) || o.customer_phone?.includes(searchLower);
    return orderNumMatch || nameMatch || phoneMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
      case "confirmed":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Confirmed</Badge>;
      case "preparing":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Preparing</Badge>;
      case "packed":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Packed</Badge>;
      case "out_for_delivery":
        return (
          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">Out for Delivery</Badge>
        );
      case "delivered":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Delivered</Badge>
        );
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Order Management
          </h1>
          <p className="text-sm text-slate-500">
            Track customer orders, manage status lifecycle, print invoices, and update WhatsApp
            status.
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh Orders
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search Order #, Customer Name, Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] text-xs h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="packed">Packed</SelectItem>
              <SelectItem value="out_for_delivery">Out For Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No orders found</p>
            <p className="text-xs text-slate-400 mt-1">
              Orders placed by customers will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">Order #</TableHead>
                <TableHead className="font-bold">Customer</TableHead>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Payment</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold text-right">Total</TableHead>
                <TableHead className="font-bold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const addr = (order.delivery_address as unknown as Record<string, string>) || {};
                const name = addr.customer_name || order.customer_name || "Valued Customer";
                const phone = addr.customer_phone || order.customer_phone || "N/A";

                return (
                  <TableRow key={order.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-bold text-slate-900">
                      {order.order_number || `ORD-${order.id.slice(0, 6)}`}
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-slate-900">{name}</div>
                      <div className="text-xs text-slate-500">{phone}</div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      {new Date(order.created_at).toLocaleDateString("en-PK")}
                    </TableCell>

                    <TableCell>
                      <span className="uppercase text-xs font-bold text-slate-700">
                        {order.payment_method || "COD"}
                      </span>
                      <div className="text-[10px] text-slate-400">{order.payment_status}</div>
                    </TableCell>

                    <TableCell>{getStatusBadge(order.status)}</TableCell>

                    <TableCell className="text-right font-bold text-slate-900">
                      Rs. {order.total.toLocaleString()}
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewOrderDetails(order)}
                          className="h-8 px-2 text-xs text-primary hover:bg-primary/10"
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* View Order Modal */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold flex items-center justify-between">
                <span>Order #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}</span>
                {getStatusBadge(selectedOrder.status)}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Quick Status Control Bar */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Update Order Lifecycle Status:
                  </label>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(
                      [
                        "pending",
                        "confirmed",
                        "preparing",
                        "packed",
                        "out_for_delivery",
                        "delivered",
                        "cancelled",
                      ] as OrderStatus[]
                    ).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                        disabled={isUpdatingStatus}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                          selectedOrder.status === st
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {st.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Payment Status:</label>
                  <Select
                    value={selectedOrder.payment_status}
                    onValueChange={(val) => handleUpdatePaymentStatus(selectedOrder.id, val)}
                  >
                    <SelectTrigger className="w-[140px] text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Customer & Shipping */}
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-slate-200 p-3 bg-white space-y-1">
                  <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Customer Info
                  </p>
                  <p className="font-bold text-slate-900 text-sm">
                    {(selectedOrder.delivery_address as unknown as Record<string, string>)
                      ?.customer_name ||
                      selectedOrder.customer_name ||
                      "Valued Customer"}
                  </p>
                  <p className="text-slate-600">
                    Phone:{" "}
                    {(selectedOrder.delivery_address as unknown as Record<string, string>)
                      ?.customer_phone ||
                      selectedOrder.customer_phone ||
                      "N/A"}
                  </p>
                  <p className="text-slate-600">
                    Email:{" "}
                    {(selectedOrder.delivery_address as unknown as Record<string, string>)
                      ?.customer_email ||
                      selectedOrder.customer_email ||
                      "N/A"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-3 bg-white space-y-1">
                  <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Shipping Address
                  </p>
                  {selectedOrder.delivery_address ? (
                    <>
                      <p className="font-semibold text-slate-900">
                        {
                          (selectedOrder.delivery_address as unknown as Record<string, string>)
                            .house
                        }
                        ,{" "}
                        {
                          (selectedOrder.delivery_address as unknown as Record<string, string>)
                            .street
                        }
                        ,{" "}
                        {(selectedOrder.delivery_address as unknown as Record<string, string>).area}
                      </p>
                      <p className="text-slate-600">
                        {(selectedOrder.delivery_address as unknown as Record<string, string>).city}
                        ,{" "}
                        {
                          (selectedOrder.delivery_address as unknown as Record<string, string>)
                            .province
                        }
                      </p>
                    </>
                  ) : (
                    <p className="text-slate-400">No structured address record found.</p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Ordered Items
                </h4>
                {loadingItems ? (
                  <p className="text-xs text-slate-400">Loading items...</p>
                ) : (
                  <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex justify-between p-3 bg-white">
                        <div>
                          <p className="font-bold text-slate-900">{item.product_name}</p>
                          <p className="text-slate-500">
                            Rs. {item.unit_price} x {item.quantity}
                          </p>
                        </div>
                        <span className="font-bold text-slate-900">
                          Rs. {item.line_total.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    Rs. {selectedOrder.subtotal.toLocaleString()}
                  </span>
                </div>
                {selectedOrder.discount_total > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({selectedOrder.coupon_code || "Coupon"})</span>
                    <span>- Rs. {selectedOrder.discount_total.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-slate-900">
                    Rs. {selectedOrder.delivery_fee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-primary">Rs. {selectedOrder.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Button
                  onClick={() =>
                    generatePDFInvoice(selectedOrder, selectedItems, {
                      name: settings?.shop_name || "Bismillah Milk Corner",
                      phone: settings?.phone || "0313-2025005",
                      email: settings?.email || "info@bismillahmilkcorner.com",
                      address: settings?.address || "Shop # 1, DHA Phase 2 Ext, Karachi",
                    })
                  }
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" /> Download PDF Invoice
                </Button>

                <Button onClick={() => setSelectedOrder(null)} variant="default" size="sm">
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
