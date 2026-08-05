import React, { useState } from "react";
import {
  Printer,
  FileText,
  Share2,
  Mail,
  Copy,
  Download,
  X,
  Check,
  Building2,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarcodeGenerator } from "./barcode-generator";
import type { POSSale } from "@/types/pos";
import { useSiteSettings } from "@/context/site-settings-context";
import { toast } from "sonner";

interface ReceiptModalProps {
  sale: POSSale | null;
  open: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, open, onClose }) => {
  const { settings } = useSiteSettings();
  const [receiptType, setReceiptType] = useState<"thermal" | "a4">("thermal");
  const [thermalWidth, setThermalWidth] = useState<"58" | "80">("80");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  const storeName = settings?.site_title || "Modern POS Store";
  const storePhone = settings?.whatsapp_number || "+92 300 1234567";
  const storeAddress = settings?.store_address || "Main Commercial Area, Karachi, Pakistan";

  const formattedDate = new Date(sale.created_at).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const handlePrint = () => {
    window.print();
  };

  const getWhatsAppMessage = () => {
    let msg = `*RECEIPT - ${storeName}*\n`;
    msg += `Sale #: ${sale.sale_number}\n`;
    msg += `Date: ${formattedDate}\n`;
    msg += `Customer: ${sale.customer.name}\n\n`;
    msg += `*Items:*\n`;
    sale.items.forEach((item) => {
      msg += `• ${item.product_name} x${item.quantity} @ Rs ${item.unit_price} = Rs ${(item.unit_price - item.discount) * item.quantity}\n`;
    });
    msg += `\nSubtotal: Rs ${sale.subtotal}`;
    if (sale.discount_amount > 0) msg += `\nDiscount: -Rs ${sale.discount_amount}`;
    if (sale.tax_amount > 0) msg += `\nTax: +Rs ${sale.tax_amount}`;
    msg += `\n*Grand Total: Rs ${sale.grand_total}*`;
    msg += `\nPayment Method: ${sale.payment_method.toUpperCase()}`;
    msg += `\n\nThank you for shopping with us!`;
    return encodeURIComponent(msg);
  };

  const handleShareWhatsApp = () => {
    const rawPhone = sale.customer.phone.replace(/[^0-9]/g, "");
    const targetPhone = rawPhone.length >= 10 ? rawPhone : "";
    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${getWhatsAppMessage()}`
      : `https://wa.me/?text=${getWhatsAppMessage()}`;
    window.open(url, "_blank");
    toast.success("Opening WhatsApp share link...");
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Receipt #${sale.sale_number} from ${storeName}`);
    const body = getWhatsAppMessage();
    window.open(`mailto:${sale.customer.email}?subject=${subject}&body=${body}`, "_blank");
    toast.success("Opening Email client...");
  };

  const handleCopyText = () => {
    const text = decodeURIComponent(getWhatsAppMessage());
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Receipt text copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                POS Sale Receipt #{sale.sale_number}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Completed on {formattedDate}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isDuplicate ? "default" : "outline"}
                size="sm"
                onClick={() => setIsDuplicate(!isDuplicate)}
                className="text-xs"
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                {isDuplicate ? "Duplicate Copy ON" : "Normal Copy"}
              </Button>
              <Button onClick={handlePrint} size="sm" className="bg-primary gap-1">
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Receipt Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg text-sm border print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-medium text-xs text-muted-foreground">Format:</span>
            <Tabs value={receiptType} onValueChange={(v) => setReceiptType(v as "thermal" | "a4")}>
              <TabsList className="h-8">
                <TabsTrigger value="thermal" className="text-xs px-3 py-1">
                  Thermal Roll
                </TabsTrigger>
                <TabsTrigger value="a4" className="text-xs px-3 py-1">
                  A4 Tax Invoice
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {receiptType === "thermal" && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-xs text-muted-foreground">Width:</span>
                <Button
                  size="sm"
                  variant={thermalWidth === "58" ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setThermalWidth("58")}
                >
                  58mm
                </Button>
                <Button
                  size="sm"
                  variant={thermalWidth === "80" ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setThermalWidth("80")}
                >
                  80mm
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={handleShareWhatsApp}
            >
              <Share2 className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={handleShareEmail}
            >
              <Mail className="h-3.5 w-3.5 text-blue-600" /> Email
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={handleCopyText}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Printable & Scrollable Receipt Area */}
        <div className="print-area flex justify-center py-2 bg-slate-100 dark:bg-slate-900 rounded-lg p-4 min-h-[400px]">
          {receiptType === "thermal" ? (
            /* THERMAL RECEIPT VIEW */
            <div
              className={`bg-white text-slate-900 p-4 shadow-md font-mono text-xs transition-all ${
                thermalWidth === "58" ? "w-[280px]" : "w-[360px]"
              }`}
              style={{ minHeight: "450px" }}
            >
              {isDuplicate && (
                <div className="text-center font-bold border-b border-dashed border-slate-400 pb-1 mb-2 text-red-600 tracking-widest uppercase">
                  *** DUPLICATE COPY ***
                </div>
              )}

              {/* Header */}
              <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
                <h2 className="text-base font-bold uppercase tracking-wide">{storeName}</h2>
                <p className="text-[11px] text-slate-600 leading-tight mt-0.5">{storeAddress}</p>
                <p className="text-[11px] text-slate-600">Tel: {storePhone}</p>
              </div>

              {/* Meta */}
              <div className="space-y-1 mb-3 text-[11px] border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>Sale #:</span>
                  <span className="font-bold">{sale.sale_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-semibold">{sale.customer.name}</span>
                </div>
                {sale.customer.phone !== "N/A" && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span>{sale.customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full text-left mb-3">
                <thead>
                  <tr className="border-b border-slate-400 text-[11px]">
                    <th className="py-1">ITEM</th>
                    <th className="py-1 text-center">QTY</th>
                    <th className="py-1 text-right">PRICE</th>
                    <th className="py-1 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sale.items.map((item, idx) => {
                    const lineTotal = (item.unit_price - item.discount) * item.quantity;
                    return (
                      <tr key={idx} className="align-top">
                        <td className="py-1 max-w-[140px] truncate pr-1">
                          <div className="font-medium text-slate-900">{item.product_name}</div>
                          {item.discount > 0 && (
                            <div className="text-[10px] text-emerald-700">
                              disc: -Rs {item.discount}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-[10px] text-slate-500 italic">"{item.notes}"</div>
                          )}
                        </td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right">Rs {item.unit_price}</td>
                        <td className="py-1 text-right font-semibold">Rs {lineTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-[11px] mb-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs {sale.subtotal}</span>
                </div>
                {sale.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-Rs {sale.discount_amount}</span>
                  </div>
                )}
                {sale.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({sale.tax_rate}%):</span>
                    <span>+Rs {sale.tax_amount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-slate-800 pt-1 mt-1 text-slate-950">
                  <span>GRAND TOTAL:</span>
                  <span>Rs {sale.grand_total}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Payment ({sale.payment_method.toUpperCase()}):</span>
                  <span>Rs {sale.paid_amount}</span>
                </div>
                {sale.change_amount > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-800">
                    <span>Change Returned:</span>
                    <span>Rs {sale.change_amount}</span>
                  </div>
                )}
              </div>

              {/* Barcode Footer */}
              <div className="text-center border-t border-dashed border-slate-300 pt-3 mt-2">
                <BarcodeGenerator value={sale.sale_number} height={40} width={1.8} />
                <p className="mt-2 text-[10px] text-slate-500">Thank you for your business!</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Software Powered by POS Terminal</p>
              </div>
            </div>
          ) : (
            /* A4 INVOICE VIEW */
            <div className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded shadow border space-y-6">
              {isDuplicate && (
                <div className="bg-red-50 text-red-600 font-bold text-center py-1.5 rounded border border-red-200 tracking-widest">
                  *** DUPLICATE INVOICE COPY ***
                </div>
              )}

              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
                    {storeName}
                  </h1>
                  <p className="text-xs text-slate-600 max-w-xs mt-1">{storeAddress}</p>
                  <p className="text-xs text-slate-600">Phone: {storePhone}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 uppercase tracking-wider mb-2">
                    TAX INVOICE
                  </Badge>
                  <div className="text-sm font-bold text-slate-900"># {sale.invoice_number}</div>
                  <div className="text-xs text-slate-500">Date: {formattedDate}</div>
                  <div className="text-xs text-slate-500">POS Ref: {sale.sale_number}</div>
                </div>
              </div>

              {/* Customer & Payment Info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded border">
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Billed To:
                  </h4>
                  <p className="font-semibold text-sm text-slate-900">{sale.customer.name}</p>
                  <p className="text-slate-600">Phone: {sale.customer.phone}</p>
                  <p className="text-slate-600">Email: {sale.customer.email}</p>
                  <p className="text-slate-600">{sale.customer.address}</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Summary:
                  </h4>
                  <p className="text-slate-800">
                    <span className="font-semibold">Method:</span>{" "}
                    {sale.payment_method.toUpperCase()}
                  </p>
                  <p className="text-slate-800">
                    <span className="font-semibold">Status:</span>{" "}
                    <span className="capitalize text-emerald-700 font-bold">
                      {sale.payment_status}
                    </span>
                  </p>
                  <p className="text-slate-800">
                    <span className="font-semibold">Paid Amount:</span> Rs {sale.paid_amount}
                  </p>
                  {sale.change_amount > 0 && (
                    <p className="text-slate-800">
                      <span className="font-semibold">Change Returned:</span> Rs{" "}
                      {sale.change_amount}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b">
                    <th className="p-2">#</th>
                    <th className="p-2">Product Description</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Discount</th>
                    <th className="p-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sale.items.map((item, idx) => {
                    const lineTotal = (item.unit_price - item.discount) * item.quantity;
                    return (
                      <tr key={idx}>
                        <td className="p-2 text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-medium text-slate-900">{item.product_name}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-right">Rs {item.unit_price}</td>
                        <td className="p-2 text-right text-emerald-700">
                          {item.discount > 0 ? `Rs ${item.discount}` : "-"}
                        </td>
                        <td className="p-2 text-right font-bold">Rs {lineTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-between items-end border-t pt-4">
                <div className="w-1/2 pr-4">
                  <BarcodeGenerator value={sale.sale_number} height={45} width={1.8} />
                </div>
                <div className="w-1/2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>Rs {sale.subtotal}</span>
                  </div>
                  {sale.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span>-Rs {sale.discount_amount}</span>
                    </div>
                  )}
                  {sale.tax_amount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax ({sale.tax_rate}%):</span>
                      <span>+Rs {sale.tax_amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold text-slate-950 border-t pt-2 mt-1">
                    <span>Grand Total:</span>
                    <span>Rs {sale.grand_total}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
