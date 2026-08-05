import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import { getCachedProducts, saveCachedProducts, notifyCatalogUpdated } from "./catalog-cache";
import { recordInventoryHistory } from "./inventory-service";
import type {
  DeliveryRates,
  DeliveryAddress,
  CustomerInfo,
  DeliveryMethodType,
  PaymentMethodType,
  Coupon,
  AppliedCoupon,
  DbOrder,
  DbOrderItem,
} from "@/types/checkout";
import type { CartItem } from "@/context/shop-context";

export const DEFAULT_DELIVERY_RATES: DeliveryRates = {
  freeThreshold: 3000,
  karachiRate: 150,
  outsideKarachiRate: 250,
  expressFee: 200,
  sameDayFee: 350,
};

// 1. Fetch Delivery Rates from Supabase (site_settings / delivery_zones)
export async function getDeliveryRates(): Promise<DeliveryRates> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_DELIVERY_RATES;
  }
  try {
    const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();

    if (data) {
      const bh = (data as unknown as Record<string, unknown>).business_hours as
        Record<string, unknown> | undefined;
      if (bh?.delivery_rates) {
        return { ...DEFAULT_DELIVERY_RATES, ...(bh.delivery_rates as Partial<DeliveryRates>) };
      }
    }
  } catch (e) {
    console.warn("Using default delivery rates", e);
  }
  return DEFAULT_DELIVERY_RATES;
}

// 2. Calculate Delivery Fee
export function calculateDeliveryFee(
  subtotal: number,
  city: string,
  method: DeliveryMethodType,
  rates: DeliveryRates = DEFAULT_DELIVERY_RATES,
): number {
  const isKarachi = city.trim().toLowerCase().includes("karachi");

  if (method === "express") {
    return isKarachi
      ? rates.karachiRate + rates.expressFee
      : rates.outsideKarachiRate + rates.expressFee;
  }

  if (method === "same_day") {
    return rates.karachiRate + rates.sameDayFee;
  }

  // Standard
  if (subtotal >= rates.freeThreshold) {
    return 0; // Free delivery threshold met!
  }

  return isKarachi ? rates.karachiRate : rates.outsideKarachiRate;
}

// 3. Validate & Apply Coupon Code
export async function validateCoupon(
  code: string,
  subtotal: number,
): Promise<{ success: boolean; coupon?: AppliedCoupon; message: string }> {
  const trimmedCode = code.trim().toUpperCase();
  if (!trimmedCode) {
    return { success: false, message: "Please enter a valid coupon code." };
  }

  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", trimmedCode)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      if (data.min_order && subtotal < data.min_order) {
        return {
          success: false,
          message: `Coupon "${trimmedCode}" requires a minimum order of PKR ${data.min_order}.`,
        };
      }

      if (data.ends_at && new Date(data.ends_at) < new Date()) {
        return { success: false, message: `Coupon "${trimmedCode}" has expired.` };
      }

      if (data.usage_limit && data.used_count >= data.usage_limit) {
        return { success: false, message: `Coupon "${trimmedCode}" usage limit reached.` };
      }

      let discountAmount = 0;
      if (data.discount_type === "percentage") {
        discountAmount = Math.round((subtotal * data.discount_value) / 100);
        if (data.max_discount && discountAmount > data.max_discount) {
          discountAmount = data.max_discount;
        }
      } else {
        discountAmount = data.discount_value;
      }

      return {
        success: true,
        coupon: {
          code: data.code,
          discountType: data.discount_type as "percentage" | "fixed",
          discountValue: data.discount_value,
          discountAmount,
        },
        message: `Coupon "${data.code}" applied successfully!`,
      };
    }
  } catch (e) {
    console.warn("Error fetching coupon from Supabase, checking local storage & built-in codes", e);
  }

  // Check local storage bmc_coupons
  if (typeof window !== "undefined") {
    try {
      const localCoupons = JSON.parse(localStorage.getItem("bmc_coupons") || "[]") as Coupon[];
      const localMatch = localCoupons.find(
        (c) => c.code.toUpperCase() === trimmedCode && c.is_active,
      );
      if (localMatch) {
        if (localMatch.min_order && subtotal < localMatch.min_order) {
          return {
            success: false,
            message: `Coupon "${trimmedCode}" requires a minimum order of PKR ${localMatch.min_order}.`,
          };
        }
        if (localMatch.ends_at && new Date(localMatch.ends_at) < new Date()) {
          return { success: false, message: `Coupon "${trimmedCode}" has expired.` };
        }
        if (localMatch.usage_limit && (localMatch.used_count || 0) >= localMatch.usage_limit) {
          return { success: false, message: `Coupon "${trimmedCode}" usage limit reached.` };
        }

        let discountAmount = 0;
        if (localMatch.discount_type === "percentage") {
          discountAmount = Math.round((subtotal * localMatch.discount_value) / 100);
          if (localMatch.max_discount && discountAmount > localMatch.max_discount) {
            discountAmount = localMatch.max_discount;
          }
        } else {
          discountAmount = localMatch.discount_value;
        }

        return {
          success: true,
          coupon: {
            code: localMatch.code,
            discountType: localMatch.discount_type as "percentage" | "fixed",
            discountValue: localMatch.discount_value,
            discountAmount,
          },
          message: `Coupon "${localMatch.code}" applied successfully!`,
        };
      }
    } catch (e) {
      console.warn("Local storage coupon parse error:", e);
    }
  }

  return { success: false, message: "Invalid or expired coupon code." };
}

// 4. Create Order in Supabase
export async function createOrder(payload: {
  customer: CustomerInfo;
  address: DeliveryAddress;
  deliveryMethod: DeliveryMethodType;
  paymentMethod: PaymentMethodType;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  grandTotal: number;
  couponCode?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  message?: string;
}> {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `ORD-2026-${timestamp}${random.toString().slice(-2)}`;
  const invoiceNumber = `INV-2026-${timestamp}${random.toString().slice(-2)}`;
  const trackingNumber = `BMC-TRK-${Math.floor(100000 + Math.random() * 900000)}`;

  const customerName = `${payload.customer.firstName} ${payload.customer.lastName}`.trim();

  // Try creating/upserting customer record
  let customerId: string | null = null;
  try {
    if (payload.customer.email) {
      const { data: existingCust } = await supabase
        .from("customers")
        .select("id")
        .eq("email", payload.customer.email)
        .maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const { data: newCust } = await supabase
          .from("customers")
          .insert({
            name: customerName,
            email: payload.customer.email,
            phone: payload.customer.phone,
          })
          .select("id")
          .maybeSingle();
        if (newCust) customerId = newCust.id;
      }
    }
  } catch (e) {
    console.warn("Customer table insert bypassed", e);
  }

  const dbOrderData = {
    order_number: orderNumber,
    customer_id: customerId,
    delivery_address: {
      ...payload.address,
      customer_name: customerName,
      customer_phone: payload.customer.phone,
      customer_email: payload.customer.email,
    },
    delivery_fee: payload.deliveryFee,
    subtotal: payload.subtotal,
    discount_total: payload.discountTotal,
    total: payload.grandTotal,
    coupon_code: payload.couponCode || null,
    payment_method: payload.paymentMethod,
    payment_status: payload.paymentMethod === "cod" ? "pending" : "pending_verification",
    status: "pending",
    customer_notes: payload.notes || payload.address.instructions || null,
    admin_notes: `Tracking Number: ${trackingNumber} | Method: ${payload.deliveryMethod}`,
  };

  let orderId = `ord-local-${timestamp}${random}`;

  if (isSupabaseConfigured()) {
    try {
      const { data: insertedOrder, error: orderError } = await supabase
        .from("orders")
        .insert([dbOrderData])
        .select("id")
        .single();

      if (!orderError && insertedOrder) {
        orderId = insertedOrder.id;

        // Insert Order Items
        const orderItemsData = payload.items.map((item) => ({
          order_id: orderId,
          product_name: item.product.name,
          unit_price: item.product.price,
          quantity: item.quantity,
          line_total: item.product.price * item.quantity,
        }));

        await supabase.from("order_items").insert(orderItemsData);
      }
    } catch (e) {
      console.warn("Supabase Order Insert bypassed, using local order ID", e);
    }
  }

  // Always save to local storage cache as well for instant dashboard availability & offline fallback
  if (typeof window !== "undefined") {
    try {
      const existingStr = localStorage.getItem("bmc_orders");
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const newLocalOrder = {
        id: orderId,
        ...dbOrderData,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem("bmc_orders", JSON.stringify([newLocalOrder, ...existing]));

      // Deduct stock from master product repository
      const products = getCachedProducts();
      let stockUpdated = false;
      payload.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.product.id || p.slug === item.product.slug);
        if (prod) {
          const currentStock = prod.stock_quantity ?? 50;
          const newStock = Math.max(0, currentStock - item.quantity);
          prod.stock_quantity = newStock;
          prod.available_stock = Math.max(0, newStock - (prod.reserved_stock || 0));
          stockUpdated = true;

          recordInventoryHistory({
            product_id: prod.id,
            product_name: prod.name,
            sku: prod.sku || `BMC-${prod.slug.slice(0, 8).toUpperCase()}`,
            type: "sale",
            quantity_change: -item.quantity,
            previous_stock: currentStock,
            new_stock: newStock,
            reference_no: orderNumber,
            reason: `Website Order #${orderNumber}`,
            created_by: "Online Customer",
          });
        }
      });
      if (stockUpdated) {
        saveCachedProducts(products);
        notifyCatalogUpdated();
      }
    } catch (e) {
      console.warn("Error saving order or updating stock in local storage:", e);
    }
  }

  // Update Coupon usage count if coupon applied
  if (payload.couponCode) {
    try {
      const { data: cData } = await supabase
        .from("coupons")
        .select("used_count")
        .eq("code", payload.couponCode)
        .maybeSingle();
      if (cData) {
        await supabase
          .from("coupons")
          .update({ used_count: (cData.used_count || 0) + 1 })
          .eq("code", payload.couponCode);
      }
    } catch (e) {
      console.warn("Coupon count update failed", e);
    }
  }

  return {
    success: true,
    orderId,
    orderNumber,
    invoiceNumber,
  };
}

// 5. Generate WhatsApp Order Message
export function buildWhatsAppOrderMessage(
  orderNumber: string,
  customer: CustomerInfo,
  address: DeliveryAddress,
  deliveryMethod: DeliveryMethodType,
  paymentMethod: PaymentMethodType,
  items: CartItem[],
  subtotal: number,
  discount: number,
  deliveryFee: number,
  grandTotal: number,
): string {
  const customerName = `${customer.firstName} ${customer.lastName}`.trim();
  const addressText = `${address.house}, ${address.street}, ${address.area}, ${address.city} (${address.province})`;

  const methodLabels: Record<DeliveryMethodType, string> = {
    standard: "Standard Delivery (24-48 hrs)",
    express: "Express Delivery (Same Day/Morning)",
    same_day: "Same Day Urgent Delivery",
  };

  const paymentLabels: Record<PaymentMethodType, string> = {
    cod: "Cash on Delivery (COD)",
    jazzcash: "JazzCash Mobile Wallet",
    easypaisa: "EasyPaisa Mobile Wallet",
    bank_transfer: "Direct Bank Transfer",
    card: "Credit / Debit Card",
  };

  const itemLines = items
    .map(
      (item) =>
        `• *${item.product.name}* (x${item.quantity}) - PKR ${item.product.price * item.quantity}`,
    )
    .join("\n");

  return `🛍️ *NEW ORDER - Bismillah Milk Corner*
---------------------------------------
*Order Number:* ${orderNumber}
*Customer Name:* ${customerName}
*Phone:* ${customer.phone}
*Email:* ${customer.email || "N/A"}

📦 *DELIVERY DETAILS:*
*Address:* ${addressText}
*Delivery Method:* ${methodLabels[deliveryMethod] || deliveryMethod}
${address.googleMapsUrl ? `*Map Link:* ${address.googleMapsUrl}\n` : ""}${
    address.instructions ? `*Instructions:* ${address.instructions}\n` : ""
  }
💳 *PAYMENT METHOD:*
${paymentLabels[paymentMethod] || paymentMethod}

🛒 *ORDER ITEMS:*
${itemLines}

---------------------------------------
*Subtotal:* PKR ${subtotal.toLocaleString()}
${discount > 0 ? `*Discount:* -PKR ${discount.toLocaleString()}\n` : ""}*Delivery Fee:* PKR ${deliveryFee.toLocaleString()}
*TOTAL AMOUNT:* PKR ${grandTotal.toLocaleString()}

Please confirm my order and share processing updates. Thank you!`;
}

// 6. Generate PDF Invoice
export function generatePDFInvoice(
  order: DbOrder,
  items: DbOrderItem[],
  shopInfo = {
    name: "Bismillah Milk Corner",
    phone: "0313-2025005 / 021-3580321",
    email: "info@bismillahmilkcorner.com",
    address: "Shop # 1, Main Commercial Area, Phase 2 Ext, DHA, Karachi",
  },
) {
  const doc = new jsPDF();

  // Header Colors & Fonts
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(shopInfo.name, 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("OFFICIAL PURCHASE INVOICE", 14, 28);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`INVOICE #${order.order_number.replace("ORD", "INV")}`, 140, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(order.created_at || Date.now()).toLocaleDateString()}`, 140, 28);

  // Store & Customer Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Store Details:", 14, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(shopInfo.address, 14, 58);
  doc.text(`Phone: ${shopInfo.phone}`, 14, 64);
  doc.text(`Email: ${shopInfo.email}`, 14, 70);

  // Customer Details
  const addr = (order.delivery_address as unknown as Record<string, string>) || {};
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Billed & Shipped To:", 110, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Customer: ${addr.customer_name || order.customer_name || "Valued Customer"}`, 110, 58);
  doc.text(`Phone: ${addr.customer_phone || order.customer_phone || "N/A"}`, 110, 64);
  doc.text(`Address: ${addr.house || ""}, ${addr.street || ""}, ${addr.area || ""}`, 110, 70);
  doc.text(`City: ${addr.city || "Karachi"}, ${addr.province || "Pakistan"}`, 110, 76);

  // Table Header
  let y = 90;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 10, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("ITEM DESCRIPTION", 18, y + 7);
  doc.text("QTY", 120, y + 7);
  doc.text("UNIT PRICE", 145, y + 7);
  doc.text("TOTAL (PKR)", 175, y + 7);

  y += 12;

  // Table Rows
  doc.setFont("helvetica", "normal");
  items.forEach((item) => {
    doc.text(item.product_name, 18, y);
    doc.text(String(item.quantity), 122, y);
    doc.text(`Rs. ${item.unit_price.toLocaleString()}`, 145, y);
    doc.text(`Rs. ${item.line_total.toLocaleString()}`, 175, y);

    // subtle line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 3, 196, y + 3);
    y += 10;
  });

  y += 5;

  // Calculation Summary
  doc.setFontSize(10);
  doc.text(`Subtotal:`, 130, y);
  doc.text(`Rs. ${order.subtotal.toLocaleString()}`, 175, y);
  y += 6;

  if (order.discount_total > 0) {
    doc.text(`Discount (${order.coupon_code || "Coupon"}):`, 130, y);
    doc.text(`-Rs. ${order.discount_total.toLocaleString()}`, 175, y);
    y += 6;
  }

  doc.text(`Delivery Fee:`, 130, y);
  doc.text(`Rs. ${order.delivery_fee.toLocaleString()}`, 175, y);
  y += 8;

  // Total Box
  doc.setFillColor(15, 23, 42);
  doc.rect(125, y - 5, 71, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`GRAND TOTAL:`, 130, y + 3);
  doc.text(`Rs. ${order.total.toLocaleString()}`, 168, y + 3);

  // Footer / Thank You
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Thank you for shopping with Bismillah Milk Corner!", 14, 270);
  doc.text("100% Pure, Fresh & Hygienic Commercial & Home Dairy Products.", 14, 276);

  doc.save(`${order.order_number}_Invoice.pdf`);
}
