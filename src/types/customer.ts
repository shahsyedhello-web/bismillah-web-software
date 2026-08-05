import type { Database } from "@/integrations/supabase/types";

export type CustomerProfile = {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
  notification_preferences: {
    email_updates: boolean;
    whatsapp_updates: boolean;
    promotional_offers: boolean;
    stock_alerts: boolean;
  } | null;
  created_at?: string;
  updated_at?: string;
};

export type SavedAddress = {
  id: string;
  user_id: string;
  label: "Home" | "Office" | "Other" | string;
  recipient_name: string;
  phone: string;
  house: string;
  street: string;
  area: string;
  city: string;
  province: string;
  instructions?: string | null;
  is_default: boolean;
  created_at?: string;
};

export type CustomerNotification = {
  id: string;
  user_id: string | null;
  title: string;
  body: string | null;
  type: "order" | "coupon" | "offer" | "system" | "wishlist" | string;
  is_read: boolean;
  entity?: string | null;
  entity_id?: string | null;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  category:
    | "Order Inquiry"
    | "Delivery Issue"
    | "Product Quality"
    | "Payment & Refund"
    | "General"
    | string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  updated_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_type: "customer" | "admin";
  sender_id: string;
  message: string;
  image_url?: string | null;
  created_at: string;
};

export type WishlistItem = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
};

export type RecentlyViewedItem = {
  id: string;
  user_id: string;
  product_id: string;
  viewed_at: string;
};
