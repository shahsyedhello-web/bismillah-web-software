import jsPDF from "jspdf";
import type { DbOrder, DbOrderItem } from "@/types/checkout";

export type InvoiceInputOptions = {
  orderNumber?: string;
  date?: string | Date | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string | Record<string, string>;
  deliveryMethod?: string;
  paymentMethod?: string;
  items?: Array<{ name: string; price: number; quantity: number }>;
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  tax?: number;
  total?: number;
};

export type ShopInfo = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

const DEFAULT_SHOP_INFO: ShopInfo = {
  name: "Bismillah Milk Corner",
  phone: "0313-2025005 / 021-3580321",
  email: "info@bismillahmilkcorner.com",
  address: "Shop # 1, Main Commercial Area, Phase 2 Ext, DHA, Karachi",
};

/**
 * Flexible PDF Invoice Generator supporting both:
 * 1) generatePDFInvoice(options)
 * 2) generatePDFInvoice(order, items, shopInfo)
 */
export function generatePDFInvoice(
  arg1: InvoiceInputOptions | DbOrder,
  arg2?: DbOrderItem[] | ShopInfo,
  arg3?: ShopInfo,
): jsPDF {
  const doc = new jsPDF();

  let orderNum = "INV-2026-0001";
  let invoiceDateStr = new Date().toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  let custName = "Valued Customer";
  let custPhone = "N/A";
  let custEmail = "N/A";
  let deliveryAddrStr = "Karachi Store Pickup / Home Delivery";
  let lineItems: Array<{ name: string; price: number; quantity: number }> = [];
  let subtotalVal = 0;
  let deliveryFeeVal = 0;
  let discountVal = 0;
  let totalVal = 0;
  let shopInfo = DEFAULT_SHOP_INFO;

  // Check if first arg is an order object or options object
  if (arg1 && "id" in arg1 && "total" in arg1) {
    // Arg1 is DbOrder
    const order = arg1 as DbOrder & { items?: DbOrderItem[] };
    const items = (Array.isArray(arg2) ? arg2 : order.items || []) as DbOrderItem[];
    if (arg3 && typeof arg3 === "object") {
      shopInfo = { ...DEFAULT_SHOP_INFO, ...arg3 };
    } else if (arg2 && !Array.isArray(arg2) && typeof arg2 === "object") {
      shopInfo = { ...DEFAULT_SHOP_INFO, ...(arg2 as ShopInfo) };
    }

    orderNum = (order.order_number || order.id || "").replace("ORD", "INV");
    if (!orderNum.startsWith("INV")) orderNum = `INV-${orderNum}`;

    if (order.created_at) {
      const parsedDate = new Date(order.created_at);
      if (!isNaN(parsedDate.getTime())) {
        invoiceDateStr = parsedDate.toLocaleString("en-PK", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    const addrObj =
      typeof order.delivery_address === "object" && order.delivery_address
        ? (order.delivery_address as Record<string, string>)
        : {};

    custName = addrObj.customer_name || order.customer_name || "Valued Customer";
    custPhone = addrObj.customer_phone || order.customer_phone || "N/A";
    custEmail = order.customer_email || "N/A";

    if (typeof order.delivery_address === "string" && order.delivery_address) {
      deliveryAddrStr = order.delivery_address;
    } else if (addrObj && (addrObj.house || addrObj.street || addrObj.area)) {
      deliveryAddrStr = [addrObj.house, addrObj.street, addrObj.area, addrObj.city || "Karachi"]
        .filter(Boolean)
        .join(", ");
    }

    lineItems = items.map((i) => ({
      name: i.product_name || "Dairy Product",
      price: Number(i.unit_price || 0),
      quantity: Number(i.quantity || 1),
    }));

    subtotalVal = Number(order.subtotal || 0);
    deliveryFeeVal = Number(order.delivery_fee || 0);
    discountVal = Number(order.discount_total || 0);
    totalVal = Number(order.total || 0);
  } else {
    // Arg1 is InvoiceInputOptions
    const opts = (arg1 || {}) as InvoiceInputOptions;
    if (arg2 && !Array.isArray(arg2)) {
      shopInfo = { ...DEFAULT_SHOP_INFO, ...arg2 };
    }

    orderNum = opts.orderNumber
      ? opts.orderNumber.replace("ORD", "INV")
      : `INV-${Date.now().toString().slice(-6)}`;
    if (!orderNum.startsWith("INV")) orderNum = `INV-${orderNum}`;

    if (opts.date) {
      invoiceDateStr = new Date(opts.date).toLocaleDateString("en-PK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    custName = opts.customerName || "Valued Customer";
    custPhone = opts.customerPhone || "N/A";
    custEmail = opts.customerEmail || "N/A";

    if (typeof opts.deliveryAddress === "string") {
      deliveryAddrStr = opts.deliveryAddress;
    } else if (opts.deliveryAddress && typeof opts.deliveryAddress === "object") {
      const a = opts.deliveryAddress as Record<string, string>;
      deliveryAddrStr = [a.house, a.street, a.area, a.city || "Karachi"].filter(Boolean).join(", ");
    }

    lineItems = (opts.items || []).map((i) => ({
      name: i.name,
      price: Number(i.price || 0),
      quantity: Number(i.quantity || 1),
    }));

    subtotalVal = Number(opts.subtotal || 0);
    deliveryFeeVal = Number(opts.deliveryFee || 0);
    discountVal = Number(opts.discount || 0);
    totalVal = Number(opts.total || subtotalVal + deliveryFeeVal - discountVal);
  }

  // --- RENDERING PDF LAYOUT ---

  // Header Banner (Forest Green / Dark Navy)
  doc.setFillColor(20, 50, 35);
  doc.rect(0, 0, 210, 42, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(shopInfo.name, 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("PURE, FRESH & HYGIENIC DAIRY INVOICE", 14, 28);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`INVOICE #${orderNum}`, 140, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${invoiceDateStr}`, 140, 28);

  // Store & Customer Column Box
  doc.setTextColor(30, 41, 59);

  // Store Box (Left)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Supplier / Store:", 14, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(shopInfo.name, 14, 58);
  doc.text(shopInfo.address, 14, 64);
  doc.text(`Phone: ${shopInfo.phone}`, 14, 70);
  doc.text(`Email: ${shopInfo.email}`, 14, 76);

  // Customer Box (Right)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Billed & Delivered To:", 110, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${custName}`, 110, 58);
  doc.text(`Phone: ${custPhone}`, 110, 64);
  if (custEmail && custEmail !== "N/A") {
    doc.text(`Email: ${custEmail}`, 110, 70);
  }
  doc.text(
    `Address: ${deliveryAddrStr.slice(0, 45)}`,
    110,
    custEmail && custEmail !== "N/A" ? 76 : 70,
  );

  // Items Table Header
  let y = 92;
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
  if (lineItems.length === 0) {
    doc.text("Dairy Items Order", 18, y);
    doc.text("1", 122, y);
    doc.text(`Rs. ${totalVal.toLocaleString()}`, 145, y);
    doc.text(`Rs. ${totalVal.toLocaleString()}`, 175, y);
    y += 10;
  } else {
    lineItems.forEach((item) => {
      const lineTotal = item.price * item.quantity;
      doc.text(item.name.slice(0, 40), 18, y);
      doc.text(String(item.quantity), 122, y);
      doc.text(`Rs. ${item.price.toLocaleString()}`, 145, y);
      doc.text(`Rs. ${lineTotal.toLocaleString()}`, 175, y);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 3, 196, y + 3);
      y += 10;
    });
  }

  y += 5;

  // Calculation Summary
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 130, y);
  doc.text(`Rs. ${(subtotalVal || totalVal).toLocaleString()}`, 175, y);
  y += 6;

  if (discountVal > 0) {
    doc.text("Discount:", 130, y);
    doc.text(`-Rs. ${discountVal.toLocaleString()}`, 175, y);
    y += 6;
  }

  doc.text("Delivery Fee:", 130, y);
  doc.text(`Rs. ${deliveryFeeVal.toLocaleString()}`, 175, y);
  y += 8;

  // Total Box
  doc.setFillColor(20, 50, 35);
  doc.rect(125, y - 5, 71, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("GRAND TOTAL:", 130, y + 3);
  doc.text(`Rs. ${totalVal.toLocaleString()}`, 168, y + 3);

  // Footer / Thank You Note
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Thank you for choosing Bismillah Milk Corner!", 14, 268);
  doc.text(
    "Karachi's trusted supplier of 100% pure milk, yogurt, khoya and gourmet bakery items.",
    14,
    274,
  );

  // Auto-save the invoice file for immediate user download
  try {
    doc.save(`${orderNum}_Invoice.pdf`);
  } catch (err) {
    console.warn("Auto save invoice triggered:", err);
  }

  return doc;
}
