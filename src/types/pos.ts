export type POSCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  outstanding_balance: number;
  credit_limit: number;
  is_registered: boolean;
};

export type POSItem = {
  product_id: string;
  slug?: string;
  product_name: string;
  sku: string;
  barcode: string;
  unit_price: number;
  quantity: number;
  discount: number;
  discount_type: "fixed" | "percentage";
  notes: string;
  thumbnail_url: string;
  stock: number;
};

export type PaymentMethod =
  "cash" | "easypaisa" | "jazzcash" | "card" | "bank_transfer" | "split" | "credit";

export type PaymentSplitItem = {
  method: PaymentMethod;
  amount: number;
  reference: string;
};

export type POSSale = {
  id: string;
  sale_number: string;
  invoice_number: string;
  customer: POSCustomer;
  items: POSItem[];
  subtotal: number;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  payment_method: PaymentMethod;
  payments: PaymentSplitItem[];
  payment_status: "paid" | "partial" | "unpaid";
  paid_amount: number;
  change_amount: number;
  notes?: string;
  created_at: string;
  is_pos: boolean;
};
