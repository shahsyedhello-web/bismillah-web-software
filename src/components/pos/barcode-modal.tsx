import React, { useState } from "react";
import { Barcode, Printer, Camera, Search, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarcodeGenerator } from "./barcode-generator";
import { toast } from "sonner";
import type { CatalogProduct } from "@/lib/catalog";

interface BarcodeModalProps {
  open: boolean;
  onClose: () => void;
  products: CatalogProduct[];
  onScanCode: (code: string) => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  open,
  onClose,
  products,
  onScanCode,
}) => {
  const [activeTab, setActiveTab] = useState<"scan" | "generate">("scan");
  const [manualCode, setManualCode] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [labelCount, setLabelCount] = useState<number>(12);
  const [customCode, setCustomCode] = useState("");

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScanCode(manualCode.trim());
    setManualCode("");
    toast.success(`Scanned code: ${manualCode}`);
    onClose();
  };

  const handlePrintLabels = () => {
    window.print();
  };

  const displayBarcode =
    customCode || selectedProduct?.slug || selectedProduct?.id || "BARCODE-001";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Barcode className="h-5 w-5 text-primary" />
              Barcode Scanner & Generator
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex gap-2 border-b pb-3">
          <Button
            variant={activeTab === "scan" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("scan")}
            className="flex-1 gap-1.5"
          >
            <Camera className="h-4 w-4" /> Scanner / Lookup
          </Button>
          <Button
            variant={activeTab === "generate" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("generate")}
            className="flex-1 gap-1.5"
          >
            <Printer className="h-4 w-4" /> Print Barcode Labels
          </Button>
        </div>

        {activeTab === "scan" ? (
          <div className="space-y-4 py-2">
            <div className="bg-slate-900 text-white rounded-xl p-6 text-center border space-y-3 relative overflow-hidden">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/20 text-primary mb-1 animate-pulse">
                <Camera className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-sm">USB Scanner / Camera Architecture Ready</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Point your hardware USB scanner or type any SKU / Barcode / Product ID below to
                instant-add to cart.
              </p>
            </div>

            <form onSubmit={handleManualScanSubmit} className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Direct Barcode / SKU Input
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Scan or enter barcode (e.g. 1001 or product SKU)..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="pl-9 font-mono text-sm"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="bg-primary">
                  Scan / Add
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Select Product to Print:
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Rs {p.price})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Custom Barcode (Optional):
                </label>
                <Input
                  placeholder="e.g. 890123456789"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Label Quantity:
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={labelCount}
                  onChange={(e) => setLabelCount(Number(e.target.value) || 1)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Live Barcode Label Preview Sheet */}
            <div className="border rounded-lg p-4 bg-white text-slate-900 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500 border-b pb-2">
                <span>Label Preview Sheet ({labelCount} labels)</span>
                <Button size="sm" onClick={handlePrintLabels} className="h-7 text-xs gap-1">
                  <Printer className="h-3.5 w-3.5" /> Print Sheet
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-2 border rounded bg-slate-50">
                {Array.from({ length: Math.min(labelCount, 12) }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white p-2 border rounded text-center flex flex-col items-center justify-center shadow-xs"
                  >
                    <span className="text-[10px] font-bold max-w-[120px] truncate text-slate-800">
                      {selectedProduct?.name}
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-700">
                      Rs {selectedProduct?.price}
                    </span>
                    <div className="my-1 scale-90">
                      <BarcodeGenerator value={displayBarcode} height={30} width={1.2} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
