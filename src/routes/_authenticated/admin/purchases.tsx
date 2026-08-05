import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  DollarSign,
  FileText,
  User,
  Calendar,
  AlertCircle,
  Trash2,
  Package,
  Layers,
  Building,
  ArrowRight,
  Printer,
  XCircle,
  Receipt,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getPurchaseOrders,
  savePurchaseOrder,
  processGoodsReceived,
  getPurchaseReturns,
  processPurchaseReturn,
  getSuppliers,
  getInventoryItems,
} from "@/lib/inventory-service";
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseReturn,
  Supplier,
  InventoryItem,
} from "@/types/inventory";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/purchases")({
  component: AdminPurchasesPage,
});

function AdminPurchasesPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "returns">("orders");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Selected Order for Goods Received / Returns
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Goods Received Form state: map item.id -> received quantity
  const [receivedQtyMap, setReceivedQtyMap] = useState<Record<string, number>>({});

  // Purchase Return Form state
  const [returnQtyMap, setReturnQtyMap] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState<string>("Damaged / Defective goods received");

  // Create PO Form state
  const suppliers = useMemo(() => {
    void refreshKey;
    return getSuppliers();
  }, [refreshKey]);
  const inventoryItems = useMemo(() => {
    void refreshKey;
    return getInventoryItems();
  }, [refreshKey]);

  const [poSupplierId, setPoSupplierId] = useState<string>(suppliers[0]?.id || "");
  const [poNotes, setPoNotes] = useState("");
  const [poExpectedDate, setPoExpectedDate] = useState("");
  const [poItems, setPoItems] = useState<
    {
      product_id: string;
      product_name: string;
      sku: string;
      quantity_ordered: number;
      unit_cost: number;
      batch_number: string;
      expiry_date: string;
    }[]
  >([
    {
      product_id: inventoryItems[0]?.product_id || "",
      product_name: inventoryItems[0]?.product_name || "",
      sku: inventoryItems[0]?.sku || "",
      quantity_ordered: 50,
      unit_cost: inventoryItems[0]?.cost_price || 1000,
      batch_number: `BATCH-${Date.now().toString().slice(-4)}`,
      expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    },
  ]);

  // Fetch POs & Returns
  const purchaseOrders = useMemo(() => {
    void refreshKey;
    return getPurchaseOrders();
  }, [refreshKey]);
  const purchaseReturns = useMemo(() => {
    void refreshKey;
    return getPurchaseReturns();
  }, [refreshKey]);

  // Metrics
  const metrics = useMemo(() => {
    const totalOrders = purchaseOrders.length;
    const totalSpent = purchaseOrders.reduce((acc, p) => acc + p.grand_total, 0);
    const totalPaid = purchaseOrders.reduce((acc, p) => acc + p.paid_amount, 0);
    const totalDue = purchaseOrders.reduce((acc, p) => acc + p.due_amount, 0);
    const pendingOrders = purchaseOrders.filter(
      (p) => p.status === "ordered" || p.status === "draft",
    ).length;

    return { totalOrders, totalSpent, totalPaid, totalDue, pendingOrders };
  }, [purchaseOrders]);

  // Filtered POs
  const filteredPOs = useMemo(() => {
    let list = purchaseOrders;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.po_number.toLowerCase().includes(q) ||
          p.supplier_name.toLowerCase().includes(q) ||
          p.items.some((i) => i.product_name.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [purchaseOrders, statusFilter, search]);

  // PO Creation Handlers
  const addPoItemRow = () => {
    const defaultProd = inventoryItems[0];
    setPoItems((prev) => [
      ...prev,
      {
        product_id: defaultProd?.product_id || "",
        product_name: defaultProd?.product_name || "",
        sku: defaultProd?.sku || "",
        quantity_ordered: 10,
        unit_cost: defaultProd?.cost_price || 500,
        batch_number: `BATCH-${Date.now().toString().slice(-4)}`,
        expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      },
    ]);
  };

  const removePoItemRow = (index: number) => {
    if (poItems.length <= 1) return;
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePOSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find((s) => s.id === poSupplierId) || suppliers[0];
    if (!supplier) {
      toast.error("Please select a valid supplier");
      return;
    }

    const calculatedItems: PurchaseOrderItem[] = poItems.map((item, idx) => ({
      id: `poi-${Date.now()}-${idx}`,
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      quantity_ordered: item.quantity_ordered,
      quantity_received: 0,
      unit_cost: item.unit_cost,
      total_cost: item.quantity_ordered * item.unit_cost,
      batch_number: item.batch_number,
      expiry_date: item.expiry_date,
    }));

    const subtotal = calculatedItems.reduce((acc, i) => acc + i.total_cost, 0);

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      po_number: `PO-${Date.now().toString().slice(-6)}`,
      supplier_id: supplier.id,
      supplier_name: supplier.company_name || supplier.name,
      status: "ordered",
      payment_status: "unpaid",
      items: calculatedItems,
      subtotal,
      tax_amount: 0,
      discount_amount: 0,
      grand_total: subtotal,
      paid_amount: 0,
      due_amount: subtotal,
      notes: poNotes,
      expected_delivery_date:
        poExpectedDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      created_at: new Date().toISOString(),
    };

    savePurchaseOrder(newPO);
    toast.success(`Purchase Order ${newPO.po_number} created!`);
    setShowCreatePOModal(false);
    setRefreshKey((prev) => prev + 1);
  };

  // Open Goods Received GRN Modal
  const openGRNModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const initialMap: Record<string, number> = {};
    po.items.forEach((item) => {
      initialMap[item.id] = Math.max(0, item.quantity_ordered - item.quantity_received);
    });
    setReceivedQtyMap(initialMap);
    setShowGRNModal(true);
  };

  // Goods Received GRN Submit (Increases stock automatically!)
  const handleGRNSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    const res = processGoodsReceived(selectedPO.id, receivedQtyMap);
    if (res.success) {
      toast.success(res.message);
      setShowGRNModal(false);
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error(res.message);
    }
  };

  // Open Return to Supplier Modal
  const openReturnModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const initialMap: Record<string, number> = {};
    po.items.forEach((item) => {
      initialMap[item.id] = 0;
    });
    setReturnQtyMap(initialMap);
    setShowReturnModal(true);
  };

  // Purchase Return Submit (Decreases stock automatically!)
  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    const returnItems = selectedPO.items
      .filter((item) => (returnQtyMap[item.id] || 0) > 0)
      .map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: returnQtyMap[item.id],
        unit_cost: item.unit_cost,
        total_cost: returnQtyMap[item.id] * item.unit_cost,
        batch_number: item.batch_number,
      }));

    if (returnItems.length === 0) {
      toast.error("Please enter return quantity for at least one item");
      return;
    }

    const totalRefund = returnItems.reduce((acc, i) => acc + i.total_cost, 0);

    const res = processPurchaseReturn({
      purchase_order_id: selectedPO.id,
      supplier_id: selectedPO.supplier_id,
      supplier_name: selectedPO.supplier_name,
      items: returnItems,
      total_refund_amount: totalRefund,
      reason: returnReason,
    });

    if (res.success) {
      toast.success(res.message);
      setShowReturnModal(false);
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Purchase Orders & Goods Received
              </h1>
              <p className="text-xs text-muted-foreground">
                Automated Inventory Inward Sync, Goods Received (GRN) & Purchase Returns
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setShowCreatePOModal(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Create Purchase Order
        </Button>
      </div>

      {/* METRICS DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-xs space-y-1">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Total Purchases
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
            Rs {metrics.totalSpent.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {metrics.totalOrders} total Purchase Orders
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs space-y-1">
          <div className="text-xs font-semibold uppercase text-emerald-600">
            Total Payments Made
          </div>
          <div className="text-xl font-black text-emerald-600 font-mono">
            Rs {metrics.totalPaid.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">Cleared supplier invoices</div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs space-y-1">
          <div className="text-xs font-semibold uppercase text-red-600">Outstanding Payables</div>
          <div className="text-xl font-black text-red-600 font-mono">
            Rs {metrics.totalDue.toLocaleString()}
          </div>
          <div className="text-[11px] text-red-700 font-medium">Due to suppliers</div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs space-y-1">
          <div className="text-xs font-semibold uppercase text-amber-600">Pending Deliveries</div>
          <div className="text-xl font-black text-amber-600 font-mono">
            {metrics.pendingOrders} POs
          </div>
          <div className="text-[11px] text-amber-700 font-medium">Awaiting GRN verification</div>
        </div>
      </div>

      {/* TABS & FILTERS */}
      <div className="bg-card border rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeTab === "orders" ? "default" : "outline"}
              onClick={() => setActiveTab("orders")}
              className="text-xs h-9 gap-1.5 font-semibold"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Purchase Orders ({purchaseOrders.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "returns" ? "default" : "outline"}
              onClick={() => setActiveTab("returns")}
              className="text-xs h-9 gap-1.5 font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Purchase Returns ({purchaseReturns.length})
            </Button>
          </div>

          {activeTab === "orders" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-xs"
              >
                <option value="all">All Statuses</option>
                <option value="ordered">Ordered (Pending)</option>
                <option value="received">Received (GRN Complete)</option>
                <option value="partially_received">Partially Received</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by PO Number, Supplier Name, or Product Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* TAB 1: PURCHASE ORDERS LIST */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {filteredPOs.length === 0 ? (
            <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground space-y-2">
              <ShoppingBag className="h-8 w-8 mx-auto text-slate-400" />
              <p className="font-medium text-sm">No Purchase Orders found.</p>
            </div>
          ) : (
            filteredPOs.map((po) => {
              const isReceived = po.status === "received";
              const isPartial = po.status === "partially_received";

              return (
                <div
                  key={po.id}
                  className="bg-card border rounded-xl p-4 shadow-xs hover:border-primary/50 transition-all space-y-3"
                >
                  {/* PO Top Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary font-bold font-mono text-sm">
                        {po.po_number}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {po.supplier_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>Created: {new Date(po.created_at).toLocaleDateString()}</span>
                          {po.expected_delivery_date && (
                            <span>• Delivery: {po.expected_delivery_date}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isReceived ? "outline" : isPartial ? "secondary" : "default"}
                        className={`capitalize text-xs ${
                          isReceived
                            ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                            : isPartial
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-600 text-white"
                        }`}
                      >
                        {po.status.replace("_", " ")}
                      </Badge>

                      <Badge
                        variant="outline"
                        className={`capitalize text-xs ${
                          po.payment_status === "paid"
                            ? "border-emerald-500 text-emerald-700"
                            : po.payment_status === "partially_paid"
                              ? "border-amber-500 text-amber-700"
                              : "border-red-500 text-red-700"
                        }`}
                      >
                        Payment: {po.payment_status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  {/* PO Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/30 text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-2">Product</th>
                          <th className="p-2">Batch #</th>
                          <th className="p-2 text-center">Ordered</th>
                          <th className="p-2 text-center">Received</th>
                          <th className="p-2 text-right">Unit Cost</th>
                          <th className="p-2 text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {po.items.map((item) => (
                          <tr key={item.id}>
                            <td className="p-2 font-medium">{item.product_name}</td>
                            <td className="p-2 font-mono text-muted-foreground">
                              {item.batch_number || "—"}
                            </td>
                            <td className="p-2 text-center font-mono">
                              {item.quantity_ordered} pcs
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-emerald-700">
                              {item.quantity_received} pcs
                            </td>
                            <td className="p-2 text-right font-mono">
                              Rs {item.unit_cost.toLocaleString()}
                            </td>
                            <td className="p-2 text-right font-mono font-bold">
                              Rs {item.total_cost.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PO Footer & Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <div className="text-xs space-y-0.5">
                      <div className="text-slate-900 dark:text-slate-100 font-bold">
                        Grand Total:{" "}
                        <span className="text-primary font-mono text-sm">
                          Rs {po.grand_total.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Paid: Rs {po.paid_amount.toLocaleString()} | Due Balance: Rs{" "}
                        {po.due_amount.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isReceived && (
                        <Button
                          size="sm"
                          onClick={() => openGRNModal(po)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-bold"
                        >
                          <Truck className="h-4 w-4" /> Receive Goods (GRN)
                        </Button>
                      )}

                      {po.items.some((i) => i.quantity_received > 0) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReturnModal(po)}
                          className="text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Return to Supplier
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: PURCHASE RETURNS LIST */}
      {activeTab === "returns" && (
        <div className="space-y-4">
          {purchaseReturns.length === 0 ? (
            <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground space-y-2">
              <RotateCcw className="h-8 w-8 mx-auto text-slate-400" />
              <p className="font-medium text-sm">No Purchase Returns logged yet.</p>
            </div>
          ) : (
            purchaseReturns.map((ret) => (
              <div key={ret.id} className="bg-card border rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between border-b pb-2">
                  <div>
                    <span className="font-mono font-bold text-sm text-red-600">
                      {ret.return_number}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Supplier: {ret.supplier_name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ret.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="font-semibold text-slate-800">Returned Items:</div>
                  {ret.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-muted-foreground font-mono">
                      <span>
                        {i.product_name} x {i.quantity} pcs @ Rs {i.unit_cost}
                      </span>
                      <span>-Rs {i.total_cost.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground italic">Reason: "{ret.reason}"</span>
                  <span className="font-bold text-red-600 font-mono text-sm">
                    Total Refund / Ledger Credit: Rs {ret.total_refund_amount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL 1: CREATE PURCHASE ORDER */}
      <Dialog
        open={showCreatePOModal}
        onOpenChange={(open) => !open && setShowCreatePOModal(false)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Create New Purchase Order
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreatePOSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Select Supplier *
                </label>
                <select
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium shadow-xs"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.company_name} ({s.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Expected Delivery Date
                </label>
                <Input
                  type="date"
                  value={poExpectedDate}
                  onChange={(e) => setPoExpectedDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* PO Line Items */}
            <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
              <div className="flex justify-between items-center border-b pb-2 text-xs font-bold text-slate-800">
                <span>Order Items Breakdown</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addPoItemRow}
                  className="h-7 text-[11px] gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Item Row
                </Button>
              </div>

              {poItems.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center border-b pb-2 pt-1 text-xs"
                >
                  <div className="col-span-4">
                    <label className="text-[10px] text-muted-foreground">Product</label>
                    <select
                      value={item.product_id}
                      onChange={(e) => {
                        const selectedProd = inventoryItems.find(
                          (p) => p.product_id === e.target.value,
                        );
                        if (selectedProd) {
                          const updated = [...poItems];
                          updated[idx] = {
                            ...updated[idx],
                            product_id: selectedProd.product_id,
                            product_name: selectedProd.product_name,
                            sku: selectedProd.sku,
                            unit_cost: selectedProd.cost_price,
                          };
                          setPoItems(updated);
                        }
                      }}
                      className="w-full rounded border text-xs p-1 bg-background"
                    >
                      {inventoryItems.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.product_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground">Qty</label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity_ordered}
                      onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx].quantity_ordered = Number(e.target.value) || 1;
                        setPoItems(updated);
                      }}
                      className="h-7 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground">Unit Cost (Rs)</label>
                    <Input
                      type="number"
                      value={item.unit_cost}
                      onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx].unit_cost = Number(e.target.value) || 0;
                        setPoItems(updated);
                      }}
                      className="h-7 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] text-muted-foreground">Batch #</label>
                    <Input
                      value={item.batch_number}
                      onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx].batch_number = e.target.value;
                        setPoItems(updated);
                      }}
                      className="h-7 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-1 text-right pt-4">
                    {poItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePoItemRow(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Order Notes / Terms
              </label>
              <Input
                placeholder="e.g. 50% advance payment, balance on GRN delivery"
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreatePOModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary">
                Save & Issue Purchase Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: GOODS RECEIVED (GRN) */}
      <Dialog open={showGRNModal} onOpenChange={(open) => !open && setShowGRNModal(false)}>
        <DialogContent className="max-w-xl p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              Goods Received Note (GRN) - {selectedPO?.po_number}
            </DialogTitle>
          </DialogHeader>

          {selectedPO && (
            <form onSubmit={handleGRNSubmit} className="space-y-4 py-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 dark:text-emerald-200">
                <p className="font-semibold">Automatic Stock Sync Enabled:</p>
                <p className="text-[11px] mt-0.5">
                  Entering received quantities will{" "}
                  <strong>automatically increase catalog stock</strong> and generate batch records.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Enter Received Quantities:
                </label>
                {selectedPO.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg bg-card text-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {item.product_name}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Ordered: {item.quantity_ordered} pcs | Previously Received:{" "}
                        {item.quantity_received} pcs
                      </div>
                    </div>

                    <div className="w-28">
                      <label className="text-[10px] font-semibold text-muted-foreground">
                        Newly Received:
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity_ordered - item.quantity_received}
                        value={receivedQtyMap[item.id] ?? 0}
                        onChange={(e) =>
                          setReceivedQtyMap({
                            ...receivedQtyMap,
                            [item.id]: Number(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGRNModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Confirm GRN & Update Stock
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: PURCHASE RETURN */}
      <Dialog open={showReturnModal} onOpenChange={(open) => !open && setShowReturnModal(false)}>
        <DialogContent className="max-w-xl p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-600">
              <RotateCcw className="h-5 w-5" />
              Purchase Return to Supplier - {selectedPO?.supplier_name}
            </DialogTitle>
          </DialogHeader>

          {selectedPO && (
            <form onSubmit={handleReturnSubmit} className="space-y-4 py-2">
              <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 text-xs text-red-900 dark:text-red-200">
                <p className="font-semibold">Automatic Stock & Ledger Adjustment:</p>
                <p className="text-[11px] mt-0.5">
                  Returned items will be deducted from inventory, logged in history, and credited to
                  the supplier's balance.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Select Items to Return:
                </label>
                {selectedPO.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg bg-card text-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {item.product_name}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Unit Cost: Rs {item.unit_cost}
                      </div>
                    </div>

                    <div className="w-28">
                      <label className="text-[10px] font-semibold text-muted-foreground">
                        Return Qty:
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity_received || item.quantity_ordered}
                        value={returnQtyMap[item.id] ?? 0}
                        onChange={(e) =>
                          setReturnQtyMap({
                            ...returnQtyMap,
                            [item.id]: Number(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs font-mono font-bold text-red-600"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Reason for Return *
                </label>
                <Input
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Expired batch, physical damage in transport"
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReturnModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Confirm Return & Deduct Stock
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
