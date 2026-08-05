import React, { useState } from "react";
import {
  Banknote,
  CreditCard,
  Smartphone,
  Building,
  Split,
  UserCheck,
  CheckCircle2,
  DollarSign,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { POSCustomer, POSItem, PaymentMethod, PaymentSplitItem, POSSale } from "@/types/pos";
import { processPOSSale } from "@/lib/pos-service";
import { toast } from "sonner";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  customer: POSCustomer;
  items: POSItem[];
  subtotal: number;
  discountType: "fixed" | "percentage";
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  billNotes: string;
  onSaleComplete: (sale: POSSale) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onClose,
  customer,
  items,
  subtotal,
  discountType,
  discountValue,
  discountAmount,
  taxRate,
  taxAmount,
  grandTotal,
  billNotes,
  onSaleComplete,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [tenderedAmount, setTenderedAmount] = useState<string>(grandTotal.toString());
  const [referenceNo, setReferenceNo] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Split Payment state
  const [splits, setSplits] = useState<PaymentSplitItem[]>([
    { method: "cash", amount: Math.ceil(grandTotal / 2), reference: "" },
    { method: "card", amount: Math.floor(grandTotal / 2), reference: "" },
  ]);

  const numericTendered = Number(tenderedAmount) || 0;
  const changeAmount = selectedMethod === "cash" ? Math.max(0, numericTendered - grandTotal) : 0;

  const quickTenders = [
    grandTotal,
    Math.ceil(grandTotal / 100) * 100,
    Math.ceil(grandTotal / 500) * 500,
    Math.ceil(grandTotal / 1000) * 1000,
  ].filter((v, idx, arr) => v >= grandTotal && arr.indexOf(v) === idx);

  const splitTotal = splits.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const remainingSplit = grandTotal - splitTotal;

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (selectedMethod === "cash" && numericTendered < grandTotal) {
      toast.error(
        `Cash tendered (Rs ${numericTendered}) is less than Grand Total (Rs ${grandTotal})`,
      );
      return;
    }

    if (selectedMethod === "split" && Math.abs(remainingSplit) > 0.01) {
      toast.error(
        `Split amounts total (Rs ${splitTotal}) must match Grand Total (Rs ${grandTotal})`,
      );
      return;
    }

    if (selectedMethod === "credit" && customer.id === "walkin-customer-001") {
      toast.error(
        "Credit Sales require a registered customer. Please select or register a customer first.",
      );
      return;
    }

    setIsProcessing(true);

    const saleNumber = `POS-${Date.now().toString().slice(-6)}`;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();

    let finalPayments: PaymentSplitItem[] = [];
    if (selectedMethod === "split") {
      finalPayments = splits;
    } else {
      finalPayments = [
        {
          method: selectedMethod,
          amount: grandTotal,
          reference: referenceNo,
        },
      ];
    }

    const saleRecord: POSSale = {
      id: `sale-${Date.now()}`,
      sale_number: saleNumber,
      invoice_number: invoiceNumber,
      customer,
      items,
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: discountAmount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      payment_method: selectedMethod,
      payments: finalPayments,
      payment_status: selectedMethod === "credit" ? "unpaid" : "paid",
      paid_amount: selectedMethod === "cash" ? numericTendered : grandTotal,
      change_amount: changeAmount,
      notes: billNotes,
      created_at: timestamp,
      is_pos: true,
    };

    const res = await processPOSSale(saleRecord);
    setIsProcessing(false);

    if (res.success) {
      toast.success(`POS Checkout Completed! Sale #${saleNumber}`);
      onSaleComplete(saleRecord);
      onClose();
    } else {
      toast.error(res.message || "Failed completing POS transaction");
    }
  };

  const updateSplit = (index: number, field: keyof PaymentSplitItem, value: unknown) => {
    const updated = [...splits];
    updated[index] = { ...updated[index], [field]: value };
    setSplits(updated);
  };

  const addSplitRow = () => {
    setSplits([
      ...splits,
      { method: "easypaisa", amount: Math.max(0, remainingSplit), reference: "" },
    ]);
  };

  const removeSplitRow = (index: number) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <DollarSign className="h-5 w-5 text-primary" />
              Complete Payment Checkout
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-2">
          {/* Summary Column */}
          <div className="md:col-span-5 bg-muted/40 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-2">
              Order Summary
            </h3>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Items ({items.reduce((acc, i) => acc + i.quantity, 0)}):</span>
                <span>Rs {subtotal.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Bill Discount:</span>
                  <span>-Rs {discountAmount.toLocaleString()}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({taxRate}%):</span>
                  <span>+Rs {taxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-black text-slate-950 dark:text-slate-50 border-t pt-2 mt-2">
                <span>Grand Total:</span>
                <span className="text-primary">Rs {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="border-t pt-2 mt-2 text-xs space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">Customer:</div>
              <div className="text-muted-foreground">
                {customer.name} ({customer.phone})
              </div>
              {customer.outstanding_balance > 0 && (
                <div className="text-red-600 font-semibold mt-1">
                  Outstanding Debt: Rs {customer.outstanding_balance}
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Selector Column */}
          <div className="md:col-span-7 space-y-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Select Payment Method
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "cash", label: "Cash", icon: Banknote, color: "text-emerald-600" },
                { id: "easypaisa", label: "EasyPaisa", icon: Smartphone, color: "text-green-600" },
                { id: "jazzcash", label: "JazzCash", icon: Smartphone, color: "text-red-600" },
                { id: "card", label: "Card Terminal", icon: CreditCard, color: "text-blue-600" },
                {
                  id: "bank_transfer",
                  label: "Bank Transfer",
                  icon: Building,
                  color: "text-purple-600",
                },
                { id: "split", label: "Split Payment", icon: Split, color: "text-amber-600" },
                { id: "credit", label: "Credit Sale", icon: UserCheck, color: "text-indigo-600" },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = selectedMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(m.id as PaymentMethod);
                      if (m.id === "cash") setTenderedAmount(grandTotal.toString());
                    }}
                    className={`p-3 rounded-lg border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                        : "hover:bg-muted/50 border-input"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${m.color}`} />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Method Details */}
            {selectedMethod === "cash" && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Cash Received (PKR):
                  </label>
                  <Input
                    type="number"
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                    className="mt-1 text-lg font-bold font-mono"
                  />
                </div>

                {/* Quick Tender buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {quickTenders.map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTenderedAmount(amt.toString())}
                      className="text-xs font-mono h-8"
                    >
                      Rs {amt}
                    </Button>
                  ))}
                </div>

                {numericTendered >= grandTotal && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 flex justify-between items-center text-emerald-800 dark:text-emerald-300">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Change to Return:
                    </span>
                    <span className="text-xl font-black font-mono">
                      Rs {changeAmount.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {(selectedMethod === "easypaisa" || selectedMethod === "jazzcash") && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border">
                <div className="text-xs text-muted-foreground">
                  Ask customer to transfer{" "}
                  <strong className="text-foreground">Rs {grandTotal}</strong> via{" "}
                  {selectedMethod === "easypaisa" ? "EasyPaisa" : "JazzCash"}.
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sender Mobile / Transaction Ref ID:
                  </label>
                  <Input
                    placeholder="e.g. 03001234567 or TXN987654"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="mt-1 text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {selectedMethod === "card" && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    POS Terminal Reference / Card Last 4 Digits:
                  </label>
                  <Input
                    placeholder="e.g. Terminal-01 / **** 4321"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="mt-1 text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {selectedMethod === "bank_transfer" && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Bank Name & IBAN / Ref ID:
                  </label>
                  <Input
                    placeholder="e.g. HBL / Meezan - Ref # 887766"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            )}

            {selectedMethod === "split" && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold">Split Breakdown</span>
                  <span
                    className={
                      remainingSplit === 0
                        ? "text-emerald-600 font-bold"
                        : "text-amber-600 font-bold"
                    }
                  >
                    {remainingSplit === 0 ? "Balanced ✓" : `Remaining: Rs ${remainingSplit}`}
                  </span>
                </div>

                {splits.map((split, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={split.method}
                      onChange={(e) => updateSplit(idx, "method", e.target.value)}
                      className="rounded border text-xs p-1.5 bg-background"
                    >
                      <option value="cash">Cash</option>
                      <option value="easypaisa">EasyPaisa</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank</option>
                    </select>
                    <Input
                      type="number"
                      value={split.amount}
                      onChange={(e) => updateSplit(idx, "amount", Number(e.target.value))}
                      className="text-xs h-8 w-24 font-mono"
                    />
                    <Input
                      placeholder="Ref ID"
                      value={split.reference}
                      onChange={(e) => updateSplit(idx, "reference", e.target.value)}
                      className="text-xs h-8 flex-1 font-mono"
                    />
                    {splits.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSplitRow(idx)}
                        className="h-8 w-8 p-0 text-red-500"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSplitRow}
                  className="w-full text-xs"
                >
                  + Add Payment Split
                </Button>
              </div>
            )}

            {selectedMethod === "credit" && (
              <div className="space-y-2 bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-200 text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  Credit Sale (Add to Outstanding Ledger)
                </div>
                <p className="text-xs">
                  This transaction of <strong className="text-foreground">Rs {grandTotal}</strong>{" "}
                  will be billed directly to <strong>{customer.name}</strong>'s credit ledger.
                </p>
                {customer.id === "walkin-customer-001" && (
                  <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Select a registered customer first!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-3 border-t pt-4 mt-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleCompleteSale}
            disabled={isProcessing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 gap-2"
          >
            <CheckCircle2 className="h-5 w-5" />
            {isProcessing
              ? "Processing Sale..."
              : `Confirm Sale & Pay Rs ${grandTotal.toLocaleString()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
