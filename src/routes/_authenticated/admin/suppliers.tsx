import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Users,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Plus,
  Search,
  DollarSign,
  Receipt,
  FileText,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Wallet,
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
  getSuppliers,
  saveSupplier,
  getSupplierPayments,
  processSupplierPayment,
  getPurchaseOrders,
  getPurchaseReturns,
} from "@/lib/inventory-service";
import type { Supplier, SupplierPayment, PurchaseOrder, PurchaseReturn } from "@/types/inventory";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/suppliers")({
  component: AdminSuppliersPage,
});

function AdminSuppliersPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "ledger" | "payments">("directory");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Selected supplier for Ledger tab
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  // Modals state
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(
    null,
  );

  // Add Supplier Form
  const [supplierName, setSupplierName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  // Record Payment Form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] =
    useState<SupplierPayment["payment_method"]>("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [associatedPOId, setAssociatedPOId] = useState("");

  // Fetch data
  const suppliers = useMemo(() => {
    void refreshKey;
    return getSuppliers();
  }, [refreshKey]);
  const supplierPayments = useMemo(() => {
    void refreshKey;
    return getSupplierPayments();
  }, [refreshKey]);
  const purchaseOrders = useMemo(() => {
    void refreshKey;
    return getPurchaseOrders();
  }, [refreshKey]);
  const purchaseReturns = useMemo(() => {
    void refreshKey;
    return getPurchaseReturns();
  }, [refreshKey]);

  // Default selected supplier for ledger
  const activeSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
  }, [suppliers, selectedSupplierId]);

  // Metrics
  const totalPayableBalance = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + s.balance, 0);
  }, [suppliers]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.company_name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.email.toLowerCase().includes(q),
    );
  }, [suppliers, search]);

  // Ledger calculation for activeSupplier
  const supplierLedgerEntries = useMemo(() => {
    if (!activeSupplier) return [];
    const entries: {
      id: string;
      date: string;
      type: "PO Invoice" | "Payment" | "Return";
      reference: string;
      description: string;
      debit: number; // Payments / Returns (reduces liability)
      credit: number; // PO Invoices (increases liability)
    }[] = [];

    // 1. Add POs
    purchaseOrders
      .filter((p) => p.supplier_id === activeSupplier.id)
      .forEach((po) => {
        entries.push({
          id: `po-${po.id}`,
          date: po.created_at,
          type: "PO Invoice",
          reference: po.po_number,
          description: `Purchase Order for ${po.items.length} item(s)`,
          debit: 0,
          credit: po.grand_total,
        });
      });

    // 2. Add Payments
    supplierPayments
      .filter((p) => p.supplier_id === activeSupplier.id)
      .forEach((pm) => {
        entries.push({
          id: `pm-${pm.id}`,
          date: pm.created_at,
          type: "Payment",
          reference: pm.payment_number,
          description: `Payment via ${pm.payment_method.replace("_", " ")} ${pm.reference_no ? `(Ref: ${pm.reference_no})` : ""}`,
          debit: pm.amount,
          credit: 0,
        });
      });

    // 3. Add Returns
    purchaseReturns
      .filter((r) => r.supplier_id === activeSupplier.id)
      .forEach((ret) => {
        entries.push({
          id: `ret-${ret.id}`,
          date: ret.created_at,
          type: "Return",
          reference: ret.return_number,
          description: `Purchase Return: ${ret.reason}`,
          debit: ret.total_refund_amount,
          credit: 0,
        });
      });

    // Sort chronologically
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    return entries.map((e) => {
      runningBalance = runningBalance + e.credit - e.debit;
      return { ...e, runningBalance };
    });
  }, [activeSupplier, purchaseOrders, supplierPayments, purchaseReturns]);

  // Handle Add Supplier Submit
  const handleAddSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || !companyName) {
      toast.error("Contact name and Company name are required");
      return;
    }

    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      name: supplierName,
      company_name: companyName,
      phone,
      email,
      address,
      tax_number: taxNumber || "NTN-PENDING",
      balance: 0,
      status: "active",
      created_at: new Date().toISOString(),
    };

    saveSupplier(newSup);
    toast.success(`Supplier ${companyName} added successfully!`);
    setShowAddSupplierModal(false);
    setRefreshKey((prev) => prev + 1);

    // Reset Form
    setSupplierName("");
    setCompanyName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setTaxNumber("");
  };

  // Open Payment Modal
  const openPaymentModalForSupplier = (sup: Supplier) => {
    setSelectedSupplierForPayment(sup);
    setPaymentAmount(sup.balance);
    setShowPaymentModal(true);
  };

  // Handle Payment Submit
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPayment) return;
    if (paymentAmount <= 0) {
      toast.error("Payment amount must be greater than 0");
      return;
    }

    const res = processSupplierPayment({
      supplier_id: selectedSupplierForPayment.id,
      supplier_name: selectedSupplierForPayment.company_name || selectedSupplierForPayment.name,
      purchase_order_id: associatedPOId || undefined,
      amount: paymentAmount,
      payment_method: paymentMethod,
      reference_no: paymentRef || undefined,
      notes: paymentNotes || undefined,
    });

    if (res.success) {
      toast.success(res.message);
      setShowPaymentModal(false);
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
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Supplier Directory & Financial Ledger
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage Vendors, Track Outstanding Payables & Log Supplier Payments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (suppliers.length > 0) openPaymentModalForSupplier(suppliers[0]);
            }}
            variant="outline"
            className="text-xs gap-1.5"
          >
            <Wallet className="h-4 w-4 text-emerald-600" /> Record Supplier Payment
          </Button>

          <Button
            onClick={() => setShowAddSupplierModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add New Supplier
          </Button>
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Total Outstanding Vendor Payables
          </div>
          <div className="text-3xl font-black font-mono text-amber-400 mt-1">
            Rs {totalPayableBalance.toLocaleString()}
          </div>
          <div className="text-xs text-slate-300 mt-1">
            Across {suppliers.length} registered suppliers
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setActiveTab("ledger")}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs gap-1"
          >
            <FileText className="h-4 w-4" /> View Detailed Ledger
          </Button>
        </div>
      </div>

      {/* NAVIGATION TABS & CONTROLS */}
      <div className="bg-card border rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeTab === "directory" ? "default" : "outline"}
              onClick={() => setActiveTab("directory")}
              className="text-xs h-9 gap-1.5 font-semibold"
            >
              <Building className="h-3.5 w-3.5" /> Supplier Directory ({suppliers.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "ledger" ? "default" : "outline"}
              onClick={() => setActiveTab("ledger")}
              className="text-xs h-9 gap-1.5 font-semibold"
            >
              <FileText className="h-3.5 w-3.5" /> Supplier Statement Ledger
            </Button>
            <Button
              size="sm"
              variant={activeTab === "payments" ? "default" : "outline"}
              onClick={() => setActiveTab("payments")}
              className="text-xs h-9 gap-1.5 font-semibold"
            >
              <Receipt className="h-3.5 w-3.5" /> Payment History ({supplierPayments.length})
            </Button>
          </div>
        </div>

        {activeTab === "directory" && (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search supplier name, company, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        )}
      </div>

      {/* TAB 1: SUPPLIER DIRECTORY */}
      {activeTab === "directory" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-card border rounded-xl p-5 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                      {sup.company_name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">Contact: {sup.name}</p>
                  </div>
                  <Badge
                    variant={sup.balance > 0 ? "destructive" : "outline"}
                    className="text-[10px]"
                  >
                    {sup.balance > 0 ? "Payable Balance" : "Cleared"}
                  </Badge>
                </div>

                <div className="text-xs space-y-1 text-muted-foreground border-t pt-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-primary" /> {sup.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary" /> {sup.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {sup.address}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] pt-1 text-slate-700 dark:text-slate-300">
                    <Receipt className="h-3.5 w-3.5 text-primary" /> Tax NTN: {sup.tax_number}
                  </div>
                </div>
              </div>

              <div className="border-t pt-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                    Outstanding Payable
                  </div>
                  <div className="text-base font-black font-mono text-red-600">
                    Rs {sup.balance.toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedSupplierId(sup.id);
                      setActiveTab("ledger");
                    }}
                    className="h-8 text-[11px]"
                  >
                    Ledger
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openPaymentModalForSupplier(sup)}
                    className="h-8 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Pay Vendor
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: SUPPLIER STATEMENT LEDGER */}
      {activeTab === "ledger" && (
        <div className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Select Supplier Statement:
              </label>
              <select
                value={activeSupplier?.id || ""}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm font-bold shadow-xs"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name} (Payable: Rs {s.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {activeSupplier && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Current Net Balance Due</div>
                <div className="text-xl font-black font-mono text-red-600">
                  Rs {activeSupplier.balance.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {activeSupplier && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Reference #</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Debit (Paid/Return)</th>
                    <th className="p-3 text-right">Credit (PO Bill)</th>
                    <th className="p-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {supplierLedgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No transactions recorded for this supplier.
                      </td>
                    </tr>
                  ) : (
                    supplierLedgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {new Date(entry.date).toLocaleString()}
                        </td>

                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              entry.type === "PO Invoice"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : entry.type === "Payment"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {entry.type}
                          </Badge>
                        </td>

                        <td className="p-3 font-mono font-bold text-primary">{entry.reference}</td>
                        <td className="p-3 text-slate-800 dark:text-slate-200">
                          {entry.description}
                        </td>

                        <td className="p-3 text-right font-mono font-semibold text-emerald-600">
                          {entry.debit > 0 ? `Rs ${entry.debit.toLocaleString()}` : "—"}
                        </td>

                        <td className="p-3 text-right font-mono font-semibold text-amber-600">
                          {entry.credit > 0 ? `Rs ${entry.credit.toLocaleString()}` : "—"}
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          Rs {entry.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENTS HISTORY */}
      {activeTab === "payments" && (
        <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="p-3">Payment #</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Method</th>
                  <th className="p-3 text-right">Amount Paid</th>
                  <th className="p-3">Reference No</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {supplierPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No supplier payments logged yet.
                    </td>
                  </tr>
                ) : (
                  supplierPayments.map((pm) => (
                    <tr key={pm.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary">{pm.payment_number}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                        {pm.supplier_name}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {pm.payment_method.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        Rs {pm.amount.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {pm.reference_no || "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">{pm.notes || "—"}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground text-[11px]">
                        {new Date(pm.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW SUPPLIER */}
      <Dialog
        open={showAddSupplierModal}
        onOpenChange={(open) => !open && setShowAddSupplierModal(false)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Add New Supplier Record
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSupplierSubmit} className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Company / Organization Name *
              </label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Al-Rahim Dairy Farm Traders"
                className="mt-1 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Contact Representative *
                </label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Tariq Mahmood"
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sales@vendor.com"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">NTN / Tax ID</label>
                <Input
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="NTN-1234567-8"
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Physical Address
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Dairy Market, Wholesale Area, Karachi"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddSupplierModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary">
                Save Supplier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: RECORD SUPPLIER PAYMENT */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => !open && setShowPaymentModal(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Record Payment to Vendor
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePaymentSubmit} className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Select Supplier *
              </label>
              <select
                value={selectedSupplierForPayment?.id || ""}
                onChange={(e) => {
                  const s = suppliers.find((sup) => sup.id === e.target.value);
                  if (s) {
                    setSelectedSupplierForPayment(s);
                    setPaymentAmount(s.balance);
                  }
                }}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium shadow-xs"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name} (Payable: Rs {s.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Payment Amount (PKR) *
              </label>
              <Input
                type="number"
                value={paymentAmount || ""}
                onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                className="mt-1 text-xs font-mono font-bold text-emerald-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as SupplierPayment["payment_method"])
                  }
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium shadow-xs"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Transaction / Cheque Ref #
                </label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="TRX-981273"
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Notes / Remarks</label>
              <Input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. Partial settlement for PO-2026-001"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirm & Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
