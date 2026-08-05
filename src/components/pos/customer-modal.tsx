import React, { useState } from "react";
import {
  User,
  UserPlus,
  Phone,
  Search,
  History,
  DollarSign,
  Check,
  MapPin,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  getStoredCustomers,
  saveStoredCustomer,
  DEFAULT_WALK_IN_CUSTOMER,
} from "@/lib/pos-service";
import type { POSCustomer, POSSale } from "@/types/pos";
import { toast } from "sonner";

interface CustomerModalProps {
  open: boolean;
  onClose: () => void;
  selectedCustomer: POSCustomer;
  onSelectCustomer: (customer: POSCustomer) => void;
  salesHistory: POSSale[];
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  open,
  onClose,
  selectedCustomer,
  onSelectCustomer,
  salesHistory,
}) => {
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"select" | "history">("select");

  // New Customer Form State
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("20000");

  const customersList = getStoredCustomers();

  const filteredCustomers = customersList.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );

  const customerSales = salesHistory.filter(
    (s) =>
      s.customer.id === selectedCustomer.id ||
      (selectedCustomer.phone !== "N/A" && s.customer.phone === selectedCustomer.phone),
  );

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      toast.error("Please provide both Customer Name and Phone Number");
      return;
    }

    const created: POSCustomer = {
      id: `cust-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || "N/A",
      address: newAddress.trim() || "Karachi",
      outstanding_balance: 0,
      credit_limit: Number(creditLimit) || 20000,
      is_registered: true,
    };

    saveStoredCustomer(created);
    onSelectCustomer(created);
    toast.success(`Registered customer "${created.name}" successfully!`);
    setShowAddForm(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Customer Selector & Accounts
            </DialogTitle>
            <Button
              size="sm"
              variant={showAddForm ? "secondary" : "default"}
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-1 text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {showAddForm ? "Cancel Add" : "+ Register Customer"}
            </Button>
          </div>
        </DialogHeader>

        {showAddForm ? (
          <form
            onSubmit={handleAddCustomer}
            className="space-y-4 py-2 border rounded-lg p-4 bg-muted/20"
          >
            <h3 className="font-semibold text-sm border-b pb-2 text-primary">
              New Customer Registration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                <Input
                  placeholder="e.g. Muhammad Ali"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Phone Number *
                </label>
                <Input
                  placeholder="e.g. 0300 1234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="mt-1 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                <Input
                  placeholder="e.g. customer@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Credit Limit (PKR)
                </label>
                <Input
                  type="number"
                  placeholder="20000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Delivery / Business Address
              </label>
              <Input
                placeholder="e.g. Shop 12, Gulshan-e-Iqbal, Karachi"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary">
                Save & Select
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-1">
            {/* Customer Overview Card */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {selectedCustomer.name}
                  </span>
                  {selectedCustomer.is_registered ? (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-emerald-100 text-emerald-800"
                    >
                      Registered
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Walk-in
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>Phone: {selectedCustomer.phone}</span>
                  <span>Address: {selectedCustomer.address}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Outstanding Balance
                  </div>
                  <div
                    className={`text-sm font-extrabold ${selectedCustomer.outstanding_balance > 0 ? "text-red-600" : "text-emerald-600"}`}
                  >
                    Rs {selectedCustomer.outstanding_balance.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Credit Limit
                  </div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Rs {selectedCustomer.credit_limit.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation tabs */}
            <div className="flex border-b">
              <button
                className={`px-4 py-2 font-semibold text-xs border-b-2 transition-all ${
                  activeTab === "select"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("select")}
              >
                Select Customer Directory ({filteredCustomers.length})
              </button>
              <button
                className={`px-4 py-2 font-semibold text-xs border-b-2 transition-all ${
                  activeTab === "history"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("history")}
              >
                Customer Order History ({customerSales.length})
              </button>
            </div>

            {activeTab === "select" ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name, phone number, or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {/* Default Walk-in Customer card */}
                  <div
                    onClick={() => {
                      onSelectCustomer(DEFAULT_WALK_IN_CUSTOMER);
                      onClose();
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      selectedCustomer.id === DEFAULT_WALK_IN_CUSTOMER.id
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {DEFAULT_WALK_IN_CUSTOMER.name}
                        <Badge variant="outline" className="text-[10px]">
                          Default
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Standard fast counter sales without customer logging
                      </p>
                    </div>
                    {selectedCustomer.id === DEFAULT_WALK_IN_CUSTOMER.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>

                  {filteredCustomers
                    .filter((c) => c.id !== DEFAULT_WALK_IN_CUSTOMER.id)
                    .map((cust) => {
                      const isSelected = selectedCustomer.id === cust.id;
                      return (
                        <div
                          key={cust.id}
                          onClick={() => {
                            onSelectCustomer(cust);
                            onClose();
                          }}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {cust.name}
                              <span className="text-xs font-normal text-muted-foreground">
                                ({cust.phone})
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                              <span>{cust.address}</span>
                              {cust.email !== "N/A" && <span>• {cust.email}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-xs font-bold ${cust.outstanding_balance > 0 ? "text-red-600" : "text-emerald-600"}`}
                            >
                              Bal: Rs {cust.outstanding_balance}
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary ml-auto mt-1" />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {customerSales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No sales history found for {selectedCustomer.name} yet.
                  </div>
                ) : (
                  customerSales.map((sale) => (
                    <div key={sale.id} className="p-3 border rounded-lg bg-card text-xs space-y-1">
                      <div className="flex justify-between font-semibold text-slate-900 dark:text-slate-100">
                        <span>Sale #{sale.sale_number}</span>
                        <span>Rs {sale.grand_total}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>{new Date(sale.created_at).toLocaleString()}</span>
                        <span className="capitalize font-medium text-emerald-700">
                          {sale.payment_method}
                        </span>
                      </div>
                      <div className="text-slate-600 pt-1 border-t mt-1">
                        Items:{" "}
                        {sale.items.map((i) => `${i.product_name} (${i.quantity})`).join(", ")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
