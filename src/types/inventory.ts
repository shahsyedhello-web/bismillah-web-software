export type InventoryAdjustmentType =
  "purchase" | "sale" | "adjustment" | "transfer" | "purchase_return" | "sale_return";

export type InventoryItem = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  barcode: string;
  category: string;
  current_stock: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  unit: string;
  location: string;
  thumbnail_url?: string;
  updated_at: string;
};

export type InventoryBatch = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  batch_number: string;
  expiry_date: string; // YYYY-MM-DD
  quantity: number;
  cost_price: number;
  supplier_id?: string;
  supplier_name?: string;
  warehouse_location: string;
  created_at: string;
};

export type InventoryHistoryRecord = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  type: InventoryAdjustmentType;
  quantity_change: number; // e.g. +10 or -5
  previous_stock: number;
  new_stock: number;
  batch_number?: string;
  reference_id?: string; // e.g. PO-1001, POS-8821
  reason?: string;
  created_by?: string;
  created_at: string;
};

export type StockAdjustmentPayload = {
  product_id: string;
  quantity_change: number; // positive to add, negative to deduct
  reason: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
};

export type StockTransferPayload = {
  product_id: string;
  quantity: number;
  from_location: string;
  to_location: string;
  batch_number?: string;
  notes?: string;
};

// --- PURCHASE & SUPPLIER TYPES ---

export type Supplier = {
  id: string;
  name: string;
  company_name: string;
  phone: string;
  email: string;
  address: string;
  tax_number: string;
  balance: number; // Outstanding payable balance (PKR)
  status: "active" | "inactive";
  created_at: string;
};

export type PurchaseOrderStatus =
  "draft" | "ordered" | "received" | "partially_received" | "cancelled";
export type PurchasePaymentStatus = "unpaid" | "partially_paid" | "paid";

export type PurchaseOrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  batch_number?: string;
  expiry_date?: string;
};

export type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  status: PurchaseOrderStatus;
  payment_status: PurchasePaymentStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  notes?: string;
  expected_delivery_date?: string;
  received_date?: string;
  created_at: string;
};

export type PurchaseReturnItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  batch_number?: string;
};

export type PurchaseReturn = {
  id: string;
  return_number: string;
  purchase_order_id: string;
  supplier_id: string;
  supplier_name: string;
  items: PurchaseReturnItem[];
  total_refund_amount: number;
  reason: string;
  created_at: string;
};

export type SupplierPayment = {
  id: string;
  payment_number: string;
  supplier_id: string;
  supplier_name: string;
  purchase_order_id?: string;
  amount: number;
  payment_method: "cash" | "bank_transfer" | "cheque" | "easypaisa" | "jazzcash";
  reference_no?: string;
  notes?: string;
  created_at: string;
};
