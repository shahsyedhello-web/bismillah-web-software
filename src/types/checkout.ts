import type { CatalogProduct } from "@/lib/catalog";

export type DeliveryMethodType = "standard" | "express" | "same_day" | "pickup";

export type PaymentMethodType = "cod" | "jazzcash" | "easypaisa" | "bank_transfer" | "card";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export type CustomerInfo = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export type DeliveryAddress = {
  house: string;
  street: string;
  area: string;
  city: "Karachi" | "Outside Karachi" | string;
  province: string;
  postalCode?: string;
  instructions?: string;
  googleMapsUrl?: string;
};

export type DeliveryRates = {
  freeThreshold: number; // e.g. 3000
  karachiRate: number; // e.g. 150
  outsideKarachiRate: number; // e.g. 250
  expressFee: number; // e.g. 200
  sameDayFee: number; // e.g. 350
};

export type Coupon = {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number; // e.g., 10 for 10% or 500 for 500 PKR
  min_order: number | null;
  max_discount: number | null;
  ends_at: string | null;
  is_active: boolean;
  usage_limit?: number | null;
  used_count?: number;
};

export type AppliedCoupon = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
};

export type CheckoutOrderPayload = {
  customer: CustomerInfo;
  address: DeliveryAddress;
  deliveryMethod: DeliveryMethodType;
  paymentMethod: PaymentMethodType;
  items: { product: CatalogProduct; quantity: number }[];
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  grandTotal: number;
  couponCode?: string;
  customerNotes?: string;
};

export type DbOrder = {
  id: string;
  order_number: string;
  invoice_number?: string;
  tracking_number?: string;
  customer_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  delivery_address: DeliveryAddress | null;
  delivery_method?: string;
  delivery_fee: number;
  subtotal: number;
  discount_total: number;
  total: number;
  coupon_code?: string | null;
  payment_method: string | null;
  payment_status: string;
  status: OrderStatus;
  customer_notes?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOrderItem = {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at?: string;
};
