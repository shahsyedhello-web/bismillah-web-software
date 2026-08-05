import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/context/site-settings-context";
import { buildWhatsAppOrderMessage, generatePDFInvoice } from "@/lib/checkout-service";
import type { DbOrder, DbOrderItem } from "@/types/checkout";
import {
  CheckCircle2,
  FileText,
  MessageSquare,
  Truck,
  ShoppingBag,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Share2,
  Copy,
  ExternalLink,
  PhoneCall,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/order-confirmation/$orderId")({
  component: OrderConfirmationPage,
});

function OrderConfirmationPage() {
  const { orderId } = Route.useParams();
  const { settings, getWhatsAppUrl } = useSiteSettings();

  const [order, setOrder] = useState<DbOrder | null>(null);
  const [items, setItems] = useState<DbOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      try {
        const { data: oData, error: oErr } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();

        if (oErr) console.error("Error loading order:", oErr);
        if (oData) {
          setOrder(oData as unknown as DbOrder);
        }

        const { data: iData, error: iErr } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", orderId);

        if (iErr) console.error("Error loading order items:", iErr);
        if (iData) {
          setItems(iData as unknown as DbOrderItem[]);
        }
      } catch (e) {
        console.error("Fetch order error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-16">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading order confirmation...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-16">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mx-auto">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Order Not Found</h1>
          <p className="text-sm text-slate-500">
            We couldn't locate the order details for ID: {orderId}.
          </p>
          <Button asChild className="rounded-full px-8">
            <Link to="/products">Return to Store</Link>
          </Button>
        </div>
      </div>
    );
  }

  const addr = (order.delivery_address as unknown as Record<string, string>) || {};
  const orderNum = order.order_number || `ORD-${order.id.slice(0, 8)}`;
  const invoiceNum = orderNum.replace("ORD", "INV");
  const trackingNum = `BMC-TRK-${order.id.slice(0, 6).toUpperCase()}`;

  const customerObj = {
    firstName: addr.customer_name?.split(" ")[0] || "Valued",
    lastName: addr.customer_name?.split(" ").slice(1).join(" ") || "Customer",
    phone: addr.customer_phone || order.customer_phone || settings?.phone || "",
    email: addr.customer_email || order.customer_email || "",
  };

  const deliveryAddrObj = {
    house: addr.house || "",
    street: addr.street || "",
    area: addr.area || "",
    city: addr.city || "Karachi",
    province: addr.province || "Sindh",
    instructions: addr.instructions || "",
  };

  // WhatsApp Message
  const waItems = items.map((i) => ({
    product: {
      name: i.product_name,
      price: i.unit_price,
    } as unknown as { name: string; price: number },
    quantity: i.quantity,
  }));

  const delMethod = ((order as unknown as Record<string, string>).delivery_method || "standard") as
    "standard" | "express" | "pickup";

  const rawWaMsg = buildWhatsAppOrderMessage(
    orderNum,
    customerObj,
    deliveryAddrObj,
    delMethod,
    (order.payment_method as "cod" | "bank_transfer" | "card") || "cod",
    waItems as unknown as { product: { name: string; price: number }; quantity: number }[],
    order.subtotal,
    order.discount_total,
    order.delivery_fee,
    order.total,
  );

  const whatsappUrl = getWhatsAppUrl(rawWaMsg);

  const handleCopyOrderNum = () => {
    navigator.clipboard.writeText(orderNum);
    toast.success(`Copied Order Number: ${orderNum}`);
  };

  const handleDownloadInvoice = () => {
    generatePDFInvoice(order, items, {
      name: settings?.shop_name || "Bismillah Milk Corner",
      phone: settings?.phone || "0313-2025005",
      email: settings?.email || "info@bismillahmilkcorner.com",
      address: settings?.address || "Shop # 1, DHA Phase 2 Ext, Karachi",
    });
    toast.success("Downloading PDF Invoice...");
  };

  const statusSteps = [
    { label: "Pending", key: "pending" },
    { label: "Confirmed", key: "confirmed" },
    { label: "Preparing", key: "preparing" },
    { label: "Packed", key: "packed" },
    { label: "Out For Delivery", key: "out_for_delivery" },
    { label: "Delivered", key: "delivered" },
  ];

  const currentStatusIndex = statusSteps.findIndex((s) => s.key === order.status) ?? 0;

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 lg:py-12">
      <div className="container-page max-w-4xl space-y-8">
        {/* Celebration Banner */}
        <Card className="rounded-2xl border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-6 sm:p-8 text-center shadow-sm">
          <CardContent className="space-y-4 p-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white mx-auto shadow-md animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-100/60 text-emerald-800 px-4 py-1 font-bold"
            >
              ORDER SUCCESSFULLY PLACED
            </Badge>

            <h1 className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Thank You For Your Order!
            </h1>

            <p className="max-w-xl mx-auto text-sm text-slate-600">
              We have received your order <strong className="text-slate-900">{orderNum}</strong>.
              Our team is preparing your fresh pure milk & dairy items.
            </p>

            {/* Top Quick Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors"
              >
                <MessageSquare className="h-4 w-4" /> Send Order Details on WhatsApp
              </a>

              <Button
                onClick={handleDownloadInvoice}
                variant="outline"
                className="rounded-full text-xs font-bold border-slate-300 gap-2"
              >
                <FileText className="h-4 w-4 text-slate-600" /> Download PDF Invoice
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Status Timeline */}
        <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Live Order Status
              </h3>
              <p className="text-xs text-slate-500">Tracking Number: {trackingNum}</p>
            </div>
            <Badge className="capitalize font-bold bg-primary text-white">
              {order.status.replace("_", " ")}
            </Badge>
          </div>

          <div className="overflow-x-auto py-2">
            <div className="flex min-w-[550px] items-center justify-between">
              {statusSteps.map((step, idx) => {
                const isPassed = idx <= (currentStatusIndex < 0 ? 0 : currentStatusIndex);
                const isCurrent = idx === currentStatusIndex;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          isPassed ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                        } ${isCurrent ? "ring-4 ring-emerald-200" : ""}`}
                      >
                        {idx + 1}
                      </div>
                      <span
                        className={`text-[11px] font-semibold ${isPassed ? "text-slate-900" : "text-slate-400"}`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < statusSteps.length - 1 && (
                      <div
                        className={`mx-2 h-0.5 flex-1 rounded-full ${idx < currentStatusIndex ? "bg-emerald-600" : "bg-slate-200"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Details Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Order Identifiers */}
          <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h3 className="font-display text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Order Information
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Order Number:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  {orderNum}{" "}
                  <button onClick={handleCopyOrderNum} className="text-primary hover:underline">
                    <Copy className="h-3 w-3" />
                  </button>
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Number:</span>
                <span className="font-semibold text-slate-800">{invoiceNum}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="text-slate-800">
                  {new Date(order.created_at).toLocaleString("en-PK")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold uppercase text-slate-900">
                  {order.payment_method || "COD"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {order.payment_status}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Delivery & Address */}
          <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h3 className="font-display text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" /> Delivery Details
            </h3>

            <div className="space-y-1 text-xs text-slate-700">
              <p className="font-bold text-slate-900">{addr.customer_name || "Valued Customer"}</p>
              <p className="text-slate-600">Phone: {addr.customer_phone || order.customer_phone}</p>
              <p className="text-slate-600">
                {addr.house}, {addr.street}, {addr.area}
              </p>
              <p className="text-slate-600">
                {addr.city}, {addr.province}
              </p>
              {addr.instructions && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded mt-2">
                  Instructions: {addr.instructions}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Itemized Order Table */}
        <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Items Ordered
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{item.product_name}</p>
                  <p className="text-slate-500">
                    Unit Price: PKR {item.unit_price} | Qty: {item.quantity}
                  </p>
                </div>
                <span className="font-bold text-sm text-slate-900">
                  PKR {item.line_total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">
                PKR {order.subtotal.toLocaleString()}
              </span>
            </div>

            {order.discount_total > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount ({order.coupon_code || "Coupon"})</span>
                <span>- PKR {order.discount_total.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Delivery Charges</span>
              <span className="font-semibold text-slate-900">
                PKR {order.delivery_fee.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
              <span>Grand Total</span>
              <span className="font-display text-xl text-primary">
                PKR {order.total.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Button asChild variant="outline" className="rounded-full px-6 text-xs font-semibold">
            <Link to="/products">
              <ShoppingBag className="mr-2 h-4 w-4" /> Continue Shopping
            </Link>
          </Button>

          <a
            href={`tel:${settings?.phone || "03132025005"}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-primary"
          >
            <PhoneCall className="h-4 w-4 text-emerald-600" /> Need Help? Call{" "}
            {settings?.phone || "0313-2025005"}
          </a>
        </div>
      </div>
    </div>
  );
}
