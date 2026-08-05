import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Boxes,
  AlertTriangle,
  XCircle,
  History,
  Layers,
  ArrowUpDown,
  Plus,
  Minus,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Warehouse,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  Tag,
  ArrowRightLeft,
  DollarSign,
  PackageCheck,
  PackageX,
  SlidersHorizontal,
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
  getInventoryItems,
  getInventoryBatches,
  getInventoryHistory,
  processStockAdjustment,
  processStockTransfer,
} from "@/lib/inventory-service";
import type { InventoryItem, InventoryBatch, InventoryHistoryRecord } from "@/types/inventory";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  component: AdminInventoryPage,
});

function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState<
    "stock" | "low_stock" | "out_of_stock" | "batches" | "history"
  >("stock");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Refresh trigger for data updates
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for real-time catalog & stock updates
  useEffect(() => {
    const handleUpdate = () => {
      setRefreshKey((prev) => prev + 1);
    };
    window.addEventListener("catalog_updated", handleUpdate);
    return () => window.removeEventListener("catalog_updated", handleUpdate);
  }, []);

  // Modals state
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  // Form states for adjustment
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>("Stock Correction / Audit");
  const [adjustmentBatch, setAdjustmentBatch] = useState<string>("");
  const [adjustmentExpiry, setAdjustmentExpiry] = useState<string>("");

  // Form states for transfer
  const [transferQty, setTransferQty] = useState<number>(1);
  const [fromLocation, setFromLocation] = useState<string>("Main Warehouse");
  const [toLocation, setToLocation] = useState<string>("Retail Store Front");
  const [transferNotes, setTransferNotes] = useState<string>("");

  // Fetch data
  const inventoryItems = useMemo(() => {
    void refreshKey;
    return getInventoryItems();
  }, [refreshKey]);
  const inventoryBatches = useMemo(() => {
    void refreshKey;
    return getInventoryBatches();
  }, [refreshKey]);
  const inventoryHistory = useMemo(() => {
    void refreshKey;
    return getInventoryHistory();
  }, [refreshKey]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(inventoryItems.map((i) => i.category));
    return Array.from(set);
  }, [inventoryItems]);

  // Stock Summary Metrics
  const metrics = useMemo(() => {
    const totalItems = inventoryItems.length;
    const totalStockQty = inventoryItems.reduce((acc, i) => acc + i.current_stock, 0);
    const totalCostValue = inventoryItems.reduce(
      (acc, i) => acc + i.current_stock * i.cost_price,
      0,
    );
    const lowStockCount = inventoryItems.filter(
      (i) => i.current_stock > 0 && i.current_stock <= i.reorder_level,
    ).length;
    const outOfStockCount = inventoryItems.filter((i) => i.current_stock === 0).length;

    return { totalItems, totalStockQty, totalCostValue, lowStockCount, outOfStockCount };
  }, [inventoryItems]);

  // Filtered Stock Items
  const filteredStock = useMemo(() => {
    let list = inventoryItems;

    if (activeTab === "low_stock") {
      list = list.filter((i) => i.current_stock > 0 && i.current_stock <= i.reorder_level);
    } else if (activeTab === "out_of_stock") {
      list = list.filter((i) => i.current_stock === 0);
    }

    if (categoryFilter !== "all") {
      list = list.filter((i) => i.category === categoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.product_name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.barcode.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      );
    }

    return list;
  }, [inventoryItems, activeTab, categoryFilter, search]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!search.trim()) return inventoryHistory;
    const q = search.toLowerCase().trim();
    return inventoryHistory.filter(
      (h) =>
        h.product_name.toLowerCase().includes(q) ||
        h.sku.toLowerCase().includes(q) ||
        h.type.toLowerCase().includes(q) ||
        (h.reason && h.reason.toLowerCase().includes(q)) ||
        (h.reference_id && h.reference_id.toLowerCase().includes(q)),
    );
  }, [inventoryHistory, search]);

  // Handle Adjustment Submit
  const handlePerformAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (adjustmentQty === 0) {
      toast.error("Adjustment quantity cannot be 0");
      return;
    }

    const res = processStockAdjustment({
      product_id: selectedProduct.product_id,
      quantity_change: adjustmentQty,
      reason: adjustmentReason,
      batch_number: adjustmentBatch || undefined,
      expiry_date: adjustmentExpiry || undefined,
    });

    if (res.success) {
      toast.success(res.message);
      setShowAdjustmentModal(false);
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error(res.message);
    }
  };

  // Handle Transfer Submit
  const handlePerformTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (transferQty <= 0) {
      toast.error("Transfer quantity must be greater than 0");
      return;
    }
    if (transferQty > selectedProduct.current_stock) {
      toast.error(
        `Cannot transfer ${transferQty} units. Current stock is ${selectedProduct.current_stock}`,
      );
      return;
    }

    const res = processStockTransfer({
      product_id: selectedProduct.product_id,
      quantity: transferQty,
      from_location: fromLocation,
      to_location: toLocation,
      notes: transferNotes,
    });

    if (res.success) {
      toast.success(res.message);
      setShowTransferModal(false);
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
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Inventory & Stock Management
              </h1>
              <p className="text-xs text-muted-foreground">
                Real-Time Stock Audit, Low Stock Alerts, Batches, Expiry & History Logs
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              if (inventoryItems.length > 0) {
                setSelectedProduct(inventoryItems[0]);
                setShowAdjustmentModal(true);
              }
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
          >
            <SlidersHorizontal className="h-4 w-4" /> Stock Adjustment
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              if (inventoryItems.length > 0) {
                setSelectedProduct(inventoryItems[0]);
                setShowTransferModal(true);
              }
            }}
            className="text-xs gap-1.5"
          >
            <ArrowRightLeft className="h-4 w-4 text-primary" /> Stock Transfer
          </Button>
        </div>
      </div>

      {/* METRICS DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Total Inventory Value</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
            Rs {metrics.totalCostValue.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {metrics.totalStockQty} total units across {metrics.totalItems} SKUs
          </div>
        </div>

        <div
          onClick={() => setActiveTab("stock")}
          className={`bg-card border rounded-xl p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            activeTab === "stock"
              ? "ring-2 ring-primary border-transparent"
              : "hover:border-primary/50"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Total Active SKUs</span>
            <PackageCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            {metrics.totalItems}
          </div>
          <div className="text-[11px] text-blue-600 font-medium">In catalog directory</div>
        </div>

        <div
          onClick={() => setActiveTab("low_stock")}
          className={`bg-card border rounded-xl p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            activeTab === "low_stock"
              ? "ring-2 ring-amber-500 border-transparent bg-amber-50/20"
              : "hover:border-amber-400"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase">Low Stock Alerts</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-amber-600">{metrics.lowStockCount}</div>
          <div className="text-[11px] text-amber-700 font-medium">Below reorder threshold</div>
        </div>

        <div
          onClick={() => setActiveTab("out_of_stock")}
          className={`bg-card border rounded-xl p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            activeTab === "out_of_stock"
              ? "ring-2 ring-red-500 border-transparent bg-red-50/20"
              : "hover:border-red-400"
          }`}
        >
          <div className="flex items-center justify-between text-red-600">
            <span className="text-xs font-semibold uppercase">Out of Stock</span>
            <PackageX className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-red-600">{metrics.outOfStockCount}</div>
          <div className="text-[11px] text-red-700 font-medium">Urgent restock needed</div>
        </div>
      </div>

      {/* NAVIGATION TABS & CONTROLS */}
      <div className="bg-card border rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          {/* Main Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "stock", label: `Stock Management (${inventoryItems.length})`, icon: Boxes },
              {
                id: "low_stock",
                label: `Low Stock (${metrics.lowStockCount})`,
                icon: AlertTriangle,
                badgeColor: "bg-amber-500",
              },
              {
                id: "out_of_stock",
                label: `Out of Stock (${metrics.outOfStockCount})`,
                icon: XCircle,
                badgeColor: "bg-red-500",
              },
              {
                id: "batches",
                label: `Batches & Expiry (${inventoryBatches.length})`,
                icon: Layers,
              },
              {
                id: "history",
                label: `Inventory History (${inventoryHistory.length})`,
                icon: History,
              },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <Button
                  key={t.id}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => setActiveTab(t.id as typeof activeTab)}
                  className="text-xs h-9 gap-1.5 font-semibold"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </Button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="text-xs gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={
                activeTab === "history"
                  ? "Search history by product, reference # or reason..."
                  : "Search stock by product name, SKU, barcode, category..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {activeTab !== "history" && activeTab !== "batches" && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-xs font-medium shadow-xs"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* TAB CONTENTS */}

      {/* TAB 1, 2, 3: STOCK MANAGEMENT & ALERTS */}
      {(activeTab === "stock" || activeTab === "low_stock" || activeTab === "out_of_stock") && (
        <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-3">Product Name & SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Cost Price</th>
                  <th className="p-3 text-right">Selling Price</th>
                  <th className="p-3 text-center">Current Stock</th>
                  <th className="p-3 text-center">Reorder Level</th>
                  <th className="p-3 text-right">Total Stock Value</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      No stock records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((item) => {
                    const isLow =
                      item.current_stock > 0 && item.current_stock <= item.reorder_level;
                    const isOut = item.current_stock === 0;
                    const stockValue = item.current_stock * item.cost_price;

                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2.5">
                            {item.thumbnail_url ? (
                              <img
                                src={item.thumbnail_url}
                                alt=""
                                className="w-8 h-8 rounded border object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                <Boxes className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {item.product_name}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                SKU: {item.sku} | Barcode: {item.barcode}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-muted-foreground">{item.category}</td>

                        <td className="p-3 text-right font-mono font-medium">
                          Rs {item.cost_price.toLocaleString()}
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          Rs {item.selling_price.toLocaleString()}
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`font-black font-mono text-sm px-2 py-0.5 rounded ${
                              isOut
                                ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                                : isLow
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {item.current_stock} {item.unit}
                          </span>
                        </td>

                        <td className="p-3 text-center text-muted-foreground font-mono">
                          {item.reorder_level}
                        </td>

                        <td className="p-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                          Rs {stockValue.toLocaleString()}
                        </td>

                        <td className="p-3 text-muted-foreground text-[11px]">{item.location}</td>

                        <td className="p-3">
                          {isOut ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Out of Stock
                            </Badge>
                          ) : isLow ? (
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 text-amber-800 text-[10px]"
                            >
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-emerald-500 text-emerald-700"
                            >
                              In Stock
                            </Badge>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProduct(item);
                                setAdjustmentQty(0);
                                setShowAdjustmentModal(true);
                              }}
                              className="h-7 text-[11px] px-2"
                            >
                              Adjust
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedProduct(item);
                                setTransferQty(1);
                                setShowTransferModal(true);
                              }}
                              className="h-7 text-[11px] px-2 text-primary"
                            >
                              Transfer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BATCHES & EXPIRY DATES */}
      {activeTab === "batches" && (
        <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
          <div className="p-3 bg-muted/30 border-b flex justify-between items-center text-xs text-muted-foreground">
            <span>Tracked Batch Numbers & Expiry Dates</span>
            <span>Total Batches: {inventoryBatches.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="p-3">Batch Number</th>
                  <th className="p-3">Product Name & SKU</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3 text-center">Batch Quantity</th>
                  <th className="p-3 text-right">Cost Price</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inventoryBatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No batch records logged yet.
                    </td>
                  </tr>
                ) : (
                  inventoryBatches.map((batch) => {
                    const expiryDate = new Date(batch.expiry_date);
                    const now = new Date();
                    const daysDiff = Math.ceil(
                      (expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24),
                    );
                    const isExpired = daysDiff <= 0;
                    const isExpiringSoon = daysDiff > 0 && daysDiff <= 60;

                    return (
                      <tr key={batch.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-primary">
                          {batch.batch_number}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {batch.product_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            SKU: {batch.sku}
                          </div>
                        </td>
                        <td className="p-3 font-mono">{batch.expiry_date}</td>
                        <td className="p-3 text-center font-bold font-mono text-slate-900 dark:text-slate-100">
                          {batch.quantity} pcs
                        </td>
                        <td className="p-3 text-right font-mono">
                          Rs {batch.cost_price.toLocaleString()}
                        </td>
                        <td className="p-3 text-muted-foreground text-[11px]">
                          {batch.supplier_name || "N/A"}
                        </td>
                        <td className="p-3 text-muted-foreground text-[11px]">
                          {batch.warehouse_location}
                        </td>
                        <td className="p-3">
                          {isExpired ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Expired ({Math.abs(daysDiff)}d ago)
                            </Badge>
                          ) : isExpiringSoon ? (
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 text-amber-800 text-[10px]"
                            >
                              Expiring in {daysDiff} days
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-emerald-500 text-emerald-700"
                            >
                              Valid ({daysDiff} days left)
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: INVENTORY HISTORY AUDIT LOG */}
      {activeTab === "history" && (
        <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
          <div className="p-3 bg-muted/30 border-b flex justify-between items-center text-xs text-muted-foreground">
            <span>Complete Audit Log of Inventory Movements</span>
            <span>{filteredHistory.length} events logged</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Product Name & SKU</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-center">Change</th>
                  <th className="p-3 text-center">Stock Transition</th>
                  <th className="p-3">Batch #</th>
                  <th className="p-3">Reference ID</th>
                  <th className="p-3">Reason / Details</th>
                  <th className="p-3">By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No history records found.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((h) => {
                    const isPositive = h.quantity_change > 0;
                    return (
                      <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {new Date(h.created_at).toLocaleString()}
                        </td>

                        <td className="p-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {h.product_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">{h.sku}</div>
                        </td>

                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`capitalize text-[10px] ${
                              h.type === "purchase"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : h.type === "sale"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : h.type === "adjustment"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : h.type === "purchase_return"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {h.type.replace("_", " ")}
                          </Badge>
                        </td>

                        <td className="p-3 text-center font-bold font-mono">
                          <span
                            className={
                              isPositive
                                ? "text-emerald-600"
                                : h.quantity_change < 0
                                  ? "text-red-600"
                                  : "text-slate-500"
                            }
                          >
                            {isPositive ? `+${h.quantity_change}` : h.quantity_change}
                          </span>
                        </td>

                        <td className="p-3 text-center font-mono text-[11px]">
                          <span className="text-muted-foreground">{h.previous_stock}</span>
                          <span className="mx-1.5 text-slate-400">→</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {h.new_stock}
                          </span>
                        </td>

                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {h.batch_number || "—"}
                        </td>

                        <td className="p-3 font-mono font-medium text-primary text-[11px]">
                          {h.reference_id || "—"}
                        </td>

                        <td className="p-3 text-muted-foreground text-[11px] max-w-xs truncate">
                          {h.reason || "—"}
                        </td>

                        <td className="p-3 text-muted-foreground text-[11px]">
                          {h.created_by || "System"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: STOCK ADJUSTMENT */}
      <Dialog
        open={showAdjustmentModal}
        onOpenChange={(open) => !open && setShowAdjustmentModal(false)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Perform Stock Adjustment
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePerformAdjustment} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Select Product *
              </label>
              <select
                value={selectedProduct?.product_id || ""}
                onChange={(e) => {
                  const p = inventoryItems.find((i) => i.product_id === e.target.value);
                  if (p) setSelectedProduct(p);
                }}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs"
              >
                {inventoryItems.map((i) => (
                  <option key={i.product_id} value={i.product_id}>
                    {i.product_name} (Current Stock: {i.current_stock})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Stock:</span>
                  <span className="font-bold">{selectedProduct.current_stock} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Calculated Stock:</span>
                  <span className="font-bold text-primary">
                    {Math.max(0, selectedProduct.current_stock + adjustmentQty)} pcs
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Qty Change (+ / -) *
                </label>
                <Input
                  type="number"
                  value={adjustmentQty || ""}
                  onChange={(e) => setAdjustmentQty(Number(e.target.value) || 0)}
                  placeholder="e.g. +10 or -5"
                  className="mt-1 font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Adjustment Reason *
                </label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Damaged stock, Audit count"
                  className="mt-1 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Batch Number (Optional)
                </label>
                <Input
                  value={adjustmentBatch}
                  onChange={(e) => setAdjustmentBatch(e.target.value)}
                  placeholder="e.g. BATCH-2026-X"
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Expiry Date (Optional)
                </label>
                <Input
                  type="date"
                  value={adjustmentExpiry}
                  onChange={(e) => setAdjustmentExpiry(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdjustmentModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary">
                Confirm Adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: STOCK TRANSFER */}
      <Dialog
        open={showTransferModal}
        onOpenChange={(open) => !open && setShowTransferModal(false)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Stock Location Transfer
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePerformTransfer} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Select Product to Transfer *
              </label>
              <select
                value={selectedProduct?.product_id || ""}
                onChange={(e) => {
                  const p = inventoryItems.find((i) => i.product_id === e.target.value);
                  if (p) setSelectedProduct(p);
                }}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs"
              >
                {inventoryItems.map((i) => (
                  <option key={i.product_id} value={i.product_id}>
                    {i.product_name} (Current Stock: {i.current_stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  From Location *
                </label>
                <Input
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">To Location *</label>
                <Input
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Transfer Quantity *
              </label>
              <Input
                type="number"
                min={1}
                max={selectedProduct?.current_stock || 100}
                value={transferQty}
                onChange={(e) => setTransferQty(Number(e.target.value) || 1)}
                className="mt-1 text-xs font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Transfer Notes / Ref
              </label>
              <Input
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="e.g. Restocking front shelf display"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTransferModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary">
                Execute Stock Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
