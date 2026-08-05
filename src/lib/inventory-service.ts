import {
  getCachedProducts,
  saveCachedProducts,
  notifyCatalogUpdated,
  type CachedProduct,
} from "./catalog-cache";
import type {
  Supplier,
  InventoryBatch,
  InventoryHistoryRecord,
  StockAdjustmentPayload,
  StockTransferPayload,
  PurchaseOrder,
  PurchaseReturn,
  SupplierPayment,
  InventoryItem,
} from "@/types/inventory";

const SUPPLIERS_KEY = "bmc_suppliers_v1";
const BATCHES_KEY = "bmc_inventory_batches_v1";
const HISTORY_KEY = "bmc_inventory_history_v1";
const PO_KEY = "bmc_purchase_orders_v1";
const RETURNS_KEY = "bmc_purchase_returns_v1";
const PAYMENTS_KEY = "bmc_supplier_payments_v1";

// --- INITIAL DEFAULT SUPPLIERS (Empty by default: user-created suppliers only) ---

const INITIAL_SUPPLIERS: Supplier[] = [];

const INITIAL_BATCHES: InventoryBatch[] = [];

const INITIAL_HISTORY: InventoryHistoryRecord[] = [];

const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];

// --- SUPPLIER SERVICE ---

export function getSuppliers(): Supplier[] {
  if (typeof window === "undefined") return INITIAL_SUPPLIERS;
  try {
    const raw = localStorage.getItem(SUPPLIERS_KEY);
    if (!raw) {
      localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(INITIAL_SUPPLIERS));
      return INITIAL_SUPPLIERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_SUPPLIERS;
  } catch {
    return INITIAL_SUPPLIERS;
  }
}

export function saveSuppliers(suppliers: Supplier[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
  } catch (e) {
    console.error("Failed saving suppliers", e);
  }
}

export function saveSupplier(supplier: Supplier) {
  const current = getSuppliers();
  const idx = current.findIndex((s) => s.id === supplier.id);
  if (idx >= 0) {
    current[idx] = supplier;
  } else {
    current.unshift(supplier);
  }
  saveSuppliers(current);
}

export function updateSupplierBalance(supplierId: string, deltaBalance: number) {
  const current = getSuppliers();
  const supplier = current.find((s) => s.id === supplierId);
  if (supplier) {
    supplier.balance = Math.max(0, supplier.balance + deltaBalance);
    saveSuppliers(current);
  }
}

// --- INVENTORY SERVICE ---

export function getInventoryItems(): InventoryItem[] {
  const products = getCachedProducts();
  return products.map((prod) => {
    const currentStock = prod.stock_quantity ?? 50;
    const reorderLevel = prod.reorder_level ?? 10;
    const costPrice = prod.cost_price ?? Math.round(prod.price * 0.75);
    const location =
      ((prod as Record<string, unknown>).location as string) || "Main Warehouse - DHA Phase 2";

    return {
      id: `inv-${prod.id}`,
      product_id: prod.id,
      product_name: prod.name,
      sku: prod.sku || `BMC-${prod.slug.slice(0, 8).toUpperCase()}`,
      barcode: prod.barcode || prod.id,
      category: prod.category || "General",
      current_stock: currentStock,
      reorder_level: reorderLevel,
      cost_price: costPrice,
      selling_price: prod.price,
      unit: prod.unit || "1 Litre",
      location,
      thumbnail_url: prod.thumbnail_url || undefined,
      updated_at: prod.updated_at || new Date().toISOString(),
    };
  });
}

export function getInventoryBatches(): InventoryBatch[] {
  if (typeof window === "undefined") return INITIAL_BATCHES;
  try {
    const raw = localStorage.getItem(BATCHES_KEY);
    if (!raw) {
      localStorage.setItem(BATCHES_KEY, JSON.stringify(INITIAL_BATCHES));
      return INITIAL_BATCHES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_BATCHES;
  } catch {
    return INITIAL_BATCHES;
  }
}

export function saveInventoryBatches(batches: InventoryBatch[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
  } catch (e) {
    console.error("Failed saving inventory batches", e);
  }
}

export function getInventoryHistory(): InventoryHistoryRecord[] {
  if (typeof window === "undefined") return INITIAL_HISTORY;
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(INITIAL_HISTORY));
      return INITIAL_HISTORY;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_HISTORY;
  } catch {
    return INITIAL_HISTORY;
  }
}

export function recordInventoryHistory(entry: Omit<InventoryHistoryRecord, "id" | "created_at">) {
  const current = getInventoryHistory();
  const newRecord: InventoryHistoryRecord = {
    ...entry,
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
  };
  current.unshift(newRecord);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(current));
    } catch (e) {
      console.error("Failed recording inventory history", e);
    }
  }
  return newRecord;
}

// Update catalog stock helper (NO duplicate calculations)
export function updateProductStock(
  productId: string,
  newStock: number,
  costPrice?: number,
  reorderLevel?: number,
) {
  const products = getCachedProducts();
  const prod = products.find((p) => p.id === productId || p.slug === productId);
  if (prod) {
    const rec = prod as Record<string, unknown>;
    rec.stock_quantity = Math.max(0, newStock);
    rec.stock = Math.max(0, newStock);
    if (costPrice !== undefined) rec.cost_price = costPrice;
    if (reorderLevel !== undefined) rec.reorder_level = reorderLevel;
    saveCachedProducts(products);
    notifyCatalogUpdated();
  }
}

// Perform Manual Stock Adjustment
export function processStockAdjustment(payload: StockAdjustmentPayload) {
  const products = getCachedProducts();
  const prod = products.find((p) => p.id === payload.product_id || p.slug === payload.product_id);
  if (!prod) return { success: false, message: "Product not found" };

  const rec = prod as Record<string, unknown>;
  const prevStock = Number(rec.stock_quantity ?? rec.stock ?? 50);
  const newStock = Math.max(0, prevStock + payload.quantity_change);

  updateProductStock(prod.id, newStock);

  recordInventoryHistory({
    product_id: prod.id,
    product_name: prod.name,
    sku: prod.slug.slice(0, 10).toUpperCase(),
    type: "adjustment",
    quantity_change: payload.quantity_change,
    previous_stock: prevStock,
    new_stock: newStock,
    batch_number: payload.batch_number,
    reason: payload.reason || "Manual Stock Adjustment",
    created_by: "Admin",
  });

  // If batch & expiry provided, log/update batch
  if (payload.batch_number) {
    const batches = getInventoryBatches();
    batches.unshift({
      id: `batch-${Date.now()}`,
      product_id: prod.id,
      product_name: prod.name,
      sku: prod.slug.slice(0, 10).toUpperCase(),
      batch_number: payload.batch_number,
      expiry_date:
        payload.expiry_date || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      quantity: Math.max(0, payload.quantity_change),
      cost_price: Number(rec.cost_price ?? prod.price * 0.7),
      warehouse_location: "Main Warehouse",
      created_at: new Date().toISOString(),
    });
    saveInventoryBatches(batches);
  }

  return {
    success: true,
    message: `Adjusted stock for ${prod.name} from ${prevStock} to ${newStock}`,
  };
}

// Perform Stock Transfer
export function processStockTransfer(payload: StockTransferPayload) {
  const products = getCachedProducts();
  const prod = products.find((p) => p.id === payload.product_id || p.slug === payload.product_id);
  if (!prod) return { success: false, message: "Product not found" };

  const rec = prod as Record<string, unknown>;
  const currentStock = Number(rec.stock_quantity ?? rec.stock ?? 50);

  recordInventoryHistory({
    product_id: prod.id,
    product_name: prod.name,
    sku: prod.slug.slice(0, 10).toUpperCase(),
    type: "transfer",
    quantity_change: 0,
    previous_stock: currentStock,
    new_stock: currentStock,
    batch_number: payload.batch_number,
    reason: `Transferred ${payload.quantity} units from ${payload.from_location} to ${payload.to_location}. Notes: ${payload.notes || "N/A"}`,
    created_by: "Admin",
  });

  return {
    success: true,
    message: `Stock transfer of ${payload.quantity} units logged for ${prod.name}`,
  };
}

// --- PURCHASE ORDER & GOODS RECEIVED SERVICE ---

export function getPurchaseOrders(): PurchaseOrder[] {
  if (typeof window === "undefined") return INITIAL_PURCHASE_ORDERS;
  try {
    const raw = localStorage.getItem(PO_KEY);
    if (!raw) {
      localStorage.setItem(PO_KEY, JSON.stringify(INITIAL_PURCHASE_ORDERS));
      return INITIAL_PURCHASE_ORDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_PURCHASE_ORDERS;
  } catch {
    return INITIAL_PURCHASE_ORDERS;
  }
}

export function savePurchaseOrders(pos: PurchaseOrder[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PO_KEY, JSON.stringify(pos));
  } catch (e) {
    console.error("Failed saving purchase orders", e);
  }
}

export function savePurchaseOrder(po: PurchaseOrder) {
  const current = getPurchaseOrders();
  const idx = current.findIndex((p) => p.id === po.id);
  if (idx >= 0) {
    current[idx] = po;
  } else {
    current.unshift(po);
  }
  savePurchaseOrders(current);
}

// Process Goods Received (GRN): Automatically increases stock
export function processGoodsReceived(poId: string, receivedMap: Record<string, number>) {
  const pos = getPurchaseOrders();
  const po = pos.find((p) => p.id === poId);
  if (!po) return { success: false, message: "Purchase Order not found" };

  const products = getCachedProducts();
  let allReceived = true;
  let totalCostAdded = 0;

  po.items.forEach((item) => {
    const newlyReceived = receivedMap[item.id] || 0;
    if (newlyReceived > 0) {
      item.quantity_received = (item.quantity_received || 0) + newlyReceived;
      totalCostAdded += newlyReceived * item.unit_cost;

      // Automatically INCREASE stock in catalog
      const prod = products.find((p) => p.id === item.product_id || p.slug === item.product_id);
      if (prod) {
        const rec = prod as Record<string, unknown>;
        const prevStock = Number(rec.stock_quantity ?? rec.stock ?? 50);
        const newStock = prevStock + newlyReceived;

        rec.stock_quantity = newStock;
        rec.stock = newStock;
        rec.cost_price = item.unit_cost;

        // Record Inventory History Log
        recordInventoryHistory({
          product_id: prod.id,
          product_name: prod.name,
          sku: item.sku,
          type: "purchase",
          quantity_change: newlyReceived,
          previous_stock: prevStock,
          new_stock: newStock,
          batch_number: item.batch_number || `GRN-${po.po_number}`,
          reference_id: po.po_number,
          reason: `Goods Received from Supplier ${po.supplier_name}`,
          created_by: "Admin",
        });

        // Add Batch
        if (item.batch_number) {
          const batches = getInventoryBatches();
          batches.unshift({
            id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            product_id: prod.id,
            product_name: prod.name,
            sku: item.sku,
            batch_number: item.batch_number,
            expiry_date:
              item.expiry_date || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
            quantity: newlyReceived,
            cost_price: item.unit_cost,
            supplier_id: po.supplier_id,
            supplier_name: po.supplier_name,
            warehouse_location: "Main Warehouse",
            created_at: new Date().toISOString(),
          });
          saveInventoryBatches(batches);
        }
      }
    }

    if (item.quantity_received < item.quantity_ordered) {
      allReceived = false;
    }
  });

  saveCachedProducts(products);
  notifyCatalogUpdated();

  po.status = allReceived ? "received" : "partially_received";
  po.received_date = new Date().toISOString();
  savePurchaseOrders(pos);

  // Increase supplier payable balance by total cost of received goods if unpaid
  if (po.payment_status !== "paid") {
    updateSupplierBalance(po.supplier_id, totalCostAdded);
  }

  return {
    success: true,
    message: `Goods received successfully for PO ${po.po_number}. Stock automatically increased!`,
  };
}

// --- PURCHASE RETURNS SERVICE ---

export function getPurchaseReturns(): PurchaseReturn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RETURNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function processPurchaseReturn(
  payload: Omit<PurchaseReturn, "id" | "return_number" | "created_at">,
) {
  const returnNumber = `PR-${Date.now().toString().slice(-6)}`;
  const returnRecord: PurchaseReturn = {
    ...payload,
    id: `pr-${Date.now()}`,
    return_number: returnNumber,
    created_at: new Date().toISOString(),
  };

  const products = getCachedProducts();

  // Process item stock decrease & log history
  returnRecord.items.forEach((item) => {
    const prod = products.find((p) => p.id === item.product_id || p.slug === item.product_id);
    if (prod) {
      const rec = prod as Record<string, unknown>;
      const prevStock = Number(rec.stock_quantity ?? rec.stock ?? 50);
      const newStock = Math.max(0, prevStock - item.quantity);

      rec.stock_quantity = newStock;
      rec.stock = newStock;

      recordInventoryHistory({
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.slug.slice(0, 10).toUpperCase(),
        type: "purchase_return",
        quantity_change: -item.quantity,
        previous_stock: prevStock,
        new_stock: newStock,
        batch_number: item.batch_number,
        reference_id: returnNumber,
        reason: `Purchase Return to Supplier ${payload.supplier_name}. Reason: ${payload.reason}`,
        created_by: "Admin",
      });
    }
  });

  saveCachedProducts(products);
  notifyCatalogUpdated();

  // Save Return Record
  const currentReturns = getPurchaseReturns();
  currentReturns.unshift(returnRecord);
  if (typeof window !== "undefined") {
    localStorage.setItem(RETURNS_KEY, JSON.stringify(currentReturns));
  }

  // Reduce Supplier Outstanding Payable Balance
  updateSupplierBalance(payload.supplier_id, -payload.total_refund_amount);

  return {
    success: true,
    message: `Purchase Return ${returnNumber} processed! Stock decreased & supplier balance updated.`,
  };
}

// --- SUPPLIER PAYMENTS SERVICE ---

export function getSupplierPayments(): SupplierPayment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function processSupplierPayment(
  payload: Omit<SupplierPayment, "id" | "payment_number" | "created_at">,
) {
  const paymentNumber = `SP-${Date.now().toString().slice(-6)}`;
  const paymentRecord: SupplierPayment = {
    ...payload,
    id: `sp-${Date.now()}`,
    payment_number: paymentNumber,
    created_at: new Date().toISOString(),
  };

  const currentPayments = getSupplierPayments();
  currentPayments.unshift(paymentRecord);
  if (typeof window !== "undefined") {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(currentPayments));
  }

  // Reduce Supplier Payable Balance
  updateSupplierBalance(payload.supplier_id, -payload.amount);

  // If tied to PO, update PO paid/due amounts
  if (payload.purchase_order_id) {
    const pos = getPurchaseOrders();
    const po = pos.find((p) => p.id === payload.purchase_order_id);
    if (po) {
      po.paid_amount += payload.amount;
      po.due_amount = Math.max(0, po.grand_total - po.paid_amount);
      if (po.due_amount === 0) {
        po.payment_status = "paid";
      } else if (po.paid_amount > 0) {
        po.payment_status = "partially_paid";
      }
      savePurchaseOrders(pos);
    }
  }

  return {
    success: true,
    message: `Supplier payment ${paymentNumber} of Rs ${payload.amount.toLocaleString()} recorded!`,
  };
}
