import React, { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Home,
  Briefcase,
  Building2,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import type { SavedAddress } from "@/types/customer";
import { toast } from "sonner";

export function SavedAddressesTab() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [label, setLabel] = useState<"Home" | "Office" | "Other">("Home");
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [house, setHouse] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Karachi");
  const [province, setProvince] = useState("Sindh");
  const [instructions, setInstructions] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetchAddresses error:", error);
      } else if (data) {
        setAddresses((data as unknown as SavedAddress[]) || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const openAddModal = () => {
    setEditingAddress(null);
    setLabel("Home");
    setRecipientName("");
    setPhone("");
    setHouse("");
    setStreet("");
    setArea("DHA Phase 2");
    setCity("Karachi");
    setProvince("Sindh");
    setInstructions("");
    setIsDefault(addresses.length === 0);
    setIsModalOpen(true);
  };

  const openEditModal = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setLabel((addr.label as "Home" | "Office" | "Other") || "Home");
    setRecipientName(addr.recipient_name || "");
    setPhone(addr.phone || "");
    setHouse(addr.house || "");
    setStreet(addr.street || "");
    setArea(addr.area || "");
    setCity(addr.city || "Karachi");
    setProvince(addr.province || "Sindh");
    setInstructions(addr.instructions || "");
    setIsDefault(addr.is_default);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Address deleted.");
      fetchAddresses();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete address";
      toast.error(msg);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    try {
      // First unmark all as default
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      // Mark target as default
      const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);

      if (error) throw error;
      toast.success("Default address updated!");
      fetchAddresses();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update default address";
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!recipientName || !phone || !house || !area) {
      toast.error("Please fill in recipient name, phone, house/building, and area.");
      return;
    }

    setSubmitting(true);
    try {
      if (isDefault) {
        // Clear previous defaults
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      }

      const payload = {
        user_id: user.id,
        label,
        recipient_name: recipientName,
        phone,
        house,
        street,
        area,
        city,
        province,
        instructions,
        is_default: isDefault || addresses.length === 0,
      };

      if (editingAddress) {
        const { error } = await supabase
          .from("addresses")
          .update(payload as never)
          .eq("id", editingAddress.id);
        if (error) throw error;
        toast.success("Address updated successfully!");
      } else {
        const { error } = await supabase.from("addresses").insert([payload as never]);
        if (error) throw error;
        toast.success("New address added!");
      }

      setIsModalOpen(false);
      fetchAddresses();
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to save address.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getLabelIcon = (lbl: string) => {
    switch (lbl?.toLowerCase()) {
      case "home":
        return <Home className="h-4 w-4 text-primary" />;
      case "office":
        return <Briefcase className="h-4 w-4 text-emerald-600" />;
      default:
        return <Building2 className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Saved Delivery Addresses
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your saved delivery locations for fast 1-click checkout
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Add New Address
        </button>
      </div>

      {/* Addresses Grid */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" /> Loading saved
          addresses…
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h3 className="mt-3 font-semibold text-base text-foreground">No saved addresses</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Save your home or office address to select it instantly during online checkout.
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Address Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`relative rounded-3xl border p-5 bg-card transition-all space-y-3 ${
                addr.is_default
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-accent">{getLabelIcon(addr.label)}</span>
                  <span className="font-bold text-sm text-foreground">{addr.label}</span>
                  {addr.is_default && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/30">
                      Default
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(addr)}
                    className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-2 rounded-full hover:bg-rose-50 text-muted-foreground hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold text-foreground text-sm">{addr.recipient_name}</p>
                <p className="text-muted-foreground font-mono">Phone: {addr.phone}</p>
                <p className="text-foreground mt-2 leading-relaxed">
                  {addr.house}, {addr.street && `${addr.street}, `}
                  {addr.area}, {addr.city} ({addr.province})
                </p>
                {addr.instructions && (
                  <p className="text-muted-foreground italic text-[11px] mt-1 bg-accent/30 p-2 rounded-xl">
                    Note: "{addr.instructions}"
                  </p>
                )}
              </div>

              {!addr.is_default && (
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Set as Default Address
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-card p-6 sm:p-8 shadow-2xl ring-1 ring-border">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="font-display text-lg font-bold text-foreground">
                {editingAddress ? "Edit Saved Address" : "Add New Delivery Address"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
              {/* Label selector */}
              <div>
                <label className="font-semibold text-foreground block mb-1.5">Address Label</label>
                <div className="flex gap-2">
                  {(["Home", "Office", "Other"] as const).map((lbl) => (
                    <button
                      type="button"
                      key={lbl}
                      onClick={() => setLabel(lbl)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        label === lbl
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:bg-accent"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Recipient Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Syed Shah"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="012345678910"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  House / Flat / Building No *
                </label>
                <input
                  type="text"
                  required
                  value={house}
                  onChange={(e) => setHouse(e.target.value)}
                  placeholder="House 45-B, Flat 302"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Street / Block</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Street 12, Commercial Area"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Area / Sector *
                  </label>
                  <input
                    type="text"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="DHA Phase 2, Clifton..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Province</label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Ring bell twice, deliver near gate"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-semibold text-foreground">
                  Set as my default shipping address
                </span>
              </label>

              <div className="pt-4 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-border px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
