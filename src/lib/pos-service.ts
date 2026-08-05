import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { getCachedProducts, saveCachedProducts, notifyCatalogUpdated } from "./catalog-cache";
import { recordInventoryHistory } from "./inventory-service";
import type { POSSale, POSItem, POSCustomer, PaymentSplitItem } from "@/types/pos";
import type { DbOrder } from "@/types/checkout";

const SALES_KEY = "bmc_sales";
const SALE_ITEMS_KEY = "bmc_sale_items";
const PAYMENTS_KEY = "bmc_payments";
const CUSTOMERS_KEY = "bmc_pos_customers";
const FAVORITES_KEY = "bmc_pos_favorites";

export const DEFAULT_WALK_IN_CUSTOMER: POSCustomer = {
  id: "walkin-customer-001",
  name: "Walk-in Customer",
  phone: "N/A",
  email: "walkin@store.com",
  address: "Counter Sale",
  outstanding_balance: 0,
  credit_limit: 50000,
  is_registered: false,
};

// --- CUSTOMERS MANAGEMENT ---
export function getStoredCustomers(): POSCustomer[] {
  if (typeof window === "undefined") return [DEFAULT_WALK_IN_CUSTOMER];
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify([DEFAULT_WALK_IN_CUSTOMER]));
      return [DEFAULT_WALK_IN_CUSTOMER];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [DEFAULT_WALK_IN_CUSTOMER];
  } catch {
    return [DEFAULT_WALK_IN_CUSTOMER];
  }
}

export function saveStoredCustomer(customer: POSCustomer): POSCustomer {
  const customers = getStoredCustomers();
  const existingIdx = customers.findIndex(
    (c) => c.id === customer.id || (c.phone !== "N/A" && c.phone === customer.phone),
  );
  if (existingIdx >= 0) {
    customers[existingIdx] = { ...customers[existingIdx], ...customer };
  } else {
    customers.push(customer);
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  }
  return customer;
}

export function updateCustomerOutstandingBalance(customerId: string, addAmount: number) {
  if (!customerId || customerId === DEFAULT_WALK_IN_CUSTOMER.id) return;
  const customers = getStoredCustomers();
  const c = customers.find((item) => item.id === customerId);
  if (c) {
    c.outstanding_balance = Math.max(0, (c.outstanding_balance || 0) + addAmount);
    saveStoredCustomer(c);
  }
}

// --- FAVORITE PRODUCTS ---
export function getFavoriteProductIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteProductId(productId: string): string[] {
  const current = getFavoriteProductIds();
  let updated: string[];
  if (current.includes(productId)) {
    updated = current.filter((id) => id !== productId);
  } else {
    updated = [...current, productId];
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  }
  return updated;
}

// --- SALES & PAYMENTS PROCESSOR ---
export async function processPOSSale(
  sale: POSSale,
): Promise<{ success: boolean; sale: POSSale; message?: string }> {
  // 1. Save to local sales log
  if (typeof window !== "undefined") {
    try {
      const existingSales: POSSale[] = JSON.parse(localStorage.getItem(SALES_KEY) || "[]");
      existingSales.unshift(sale);
      localStorage.setItem(SALES_KEY, JSON.stringify(existingSales));

      // Also append to bmc_sale_items
      const existingItems = JSON.parse(localStorage.getItem(SALE_ITEMS_KEY) || "[]");
      const newItems = sale.items.map((item) => ({
        id: `si-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sale_id: sale.id,
        ...item,
      }));
      localStorage.setItem(SALE_ITEMS_KEY, JSON.stringify([...newItems, ...existingItems]));

      // Also append to bmc_payments
      const existingPayments = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || "[]");
      const newPayments = sale.payments.map((p) => ({
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sale_id: sale.id,
        created_at: sale.created_at,
        ...p,
      }));
      localStorage.setItem(PAYMENTS_KEY, JSON.stringify([...newPayments, ...existingPayments]));

      // Also sync to bmc_orders so admin order page picks it up!
      const dbOrderRepresentation: DbOrder = {
        id: sale.id,
        order_number: sale.sale_number,
        invoice_number: sale.invoice_number,
        customer_name: sale.customer.name,
        customer_phone: sale.customer.phone,
        customer_email: sale.customer.email,
        delivery_address: {
          house: sale.customer.address || "Counter",
          street: "POS In-Store",
          area: "Store Terminal",
          city: "Karachi",
          province: "Sindh",
        },
        delivery_method: "POS Counter Pickup",
        delivery_fee: 0,
        subtotal: sale.subtotal,
        discount_total: sale.discount_amount,
        total: sale.grand_total,
        payment_method: sale.payment_method,
        payment_status: sale.payment_status,
        status: "delivered",
        created_at: sale.created_at,
        updated_at: sale.created_at,
      };
      const existingOrders: DbOrder[] = JSON.parse(localStorage.getItem("bmc_orders") || "[]");
      existingOrders.unshift(dbOrderRepresentation);
      localStorage.setItem("bmc_orders", JSON.stringify(existingOrders));
    } catch (e) {
      console.error("Local storage POS sale saving error:", e);
    }
  }

  // 2. Update stock in local cache
  try {
    const products = getCachedProducts();
    let updatedAny = false;
    sale.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.product_id || p.slug === item.slug);
      if (prod) {
        // Reduce stock if stock property exists or default
        const currentStock = Number(
          (prod as Record<string, unknown>).stock_quantity ??
            (prod as Record<string, unknown>).stock ??
            50,
        );
        const newStock = Math.max(0, currentStock - item.quantity);
        (prod as Record<string, unknown>).stock_quantity = newStock;
        (prod as Record<string, unknown>).stock = newStock;
        updatedAny = true;

        // Record inventory history log
        recordInventoryHistory({
          product_id: prod.id,
          product_name: prod.name,
          sku: prod.slug ? prod.slug.slice(0, 10).toUpperCase() : item.product_id,
          type: "sale",
          quantity_change: -item.quantity,
          previous_stock: currentStock,
          new_stock: newStock,
          reference_no: sale.sale_number,
          reason: `POS Sale #${sale.sale_number} (${sale.customer.name})`,
          created_by: "POS Cashier",
        });
      }
    });
    if (updatedAny) {
      saveCachedProducts(products);
      notifyCatalogUpdated();
    }
  } catch (e) {
    console.error("Failed updating product stock cache:", e);
  }

  // 3. Update customer outstanding balance if credit sale
  if (sale.payment_method === "credit" || sale.payments.some((p) => p.method === "credit")) {
    const creditAmount = sale.payments
      .filter((p) => p.method === "credit")
      .reduce(
        (acc, curr) => acc + curr.amount,
        sale.payment_method === "credit" ? sale.grand_total : 0,
      );
    updateCustomerOutstandingBalance(
      sale.customer.id,
      creditAmount > 0 ? creditAmount : sale.grand_total,
    );
  }

  // 4. Try Supabase synchronization if configured
  if (isSupabaseConfigured()) {
    try {
      // Try inserting into sales table
      const { error: saleErr } = await supabase.from("sales").insert([
        {
          id: sale.id,
          sale_number: sale.sale_number,
          invoice_number: sale.invoice_number,
          customer_id: sale.customer.id,
          customer_name: sale.customer.name,
          customer_phone: sale.customer.phone,
          subtotal: sale.subtotal,
          discount_amount: sale.discount_amount,
          tax_amount: sale.tax_amount,
          grand_total: sale.grand_total,
          payment_method: sale.payment_method,
          payment_status: sale.payment_status,
          paid_amount: sale.paid_amount,
          change_amount: sale.change_amount,
          notes: sale.notes || null,
          created_at: sale.created_at,
        },
      ] as never);

      if (!saleErr) {
        // Insert sale_items
        const saleItemsPayload = sale.items.map((i) => ({
          sale_id: sale.id,
          product_id: i.product_id,
          product_name: i.product_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          discount: i.discount,
          total_price: (i.unit_price - i.discount) * i.quantity,
        }));
        await supabase.from("sale_items").insert(saleItemsPayload as never);

        // Insert payments
        const paymentsPayload = sale.payments.map((p) => ({
          sale_id: sale.id,
          payment_method: p.method,
          amount: p.amount,
          reference_no: p.reference,
          created_at: sale.created_at,
        }));
        await supabase.from("payments").insert(paymentsPayload as never);
      } else {
        // Fallback to orders table in Supabase
        await supabase.from("orders").insert([
          {
            id: sale.id,
            order_number: sale.sale_number,
            customer_name: sale.customer.name,
            customer_phone: sale.customer.phone,
            delivery_address: { city: "Karachi", note: "POS Counter Sale" } as never,
            delivery_fee: 0,
            subtotal: sale.subtotal,
            discount_total: sale.discount_amount,
            total: sale.grand_total,
            payment_method: sale.payment_method,
            payment_status: sale.payment_status,
            status: "delivered",
            created_at: sale.created_at,
          },
        ] as never);
      }
    } catch (e) {
      console.warn("Supabase POS sync notice (local backup preserved):", e);
    }
  }

  return { success: true, sale };
}

export function getStoredSales(): POSSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SALES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
