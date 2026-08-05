import heroMilk from "../assets/hero-milk.jpg";
import gallery1 from "../assets/gallery-1.jpg";
import gallery2 from "../assets/gallery-2.jpg";
import gallery3 from "../assets/gallery-3.jpg";
import gallery4 from "../assets/gallery-4.jpg";

export const SITE = {
  name: "Bismillah Milk Corner",
  short: "BMC",
  tagline: "Your Trusted Dairy & Gourmet Partner",
  description:
    "Bismillah Milk Corner supplies premium fresh milk, artisanal yogurt, authentic khoya, gourmet butter, bakery ingredients, and everyday kitchen essentials to restaurants, hotels, clubs, and households across Karachi.",
  phones: ["021-3580321", "0313-2025005"],
  whatsapp: "923132025005",
  email: "info@bismillahmilkcorner.com",
  address: "78/C Defence Market, Phase 2, DHA, Karachi",
  city: "Karachi, Pakistan",
  hours: "Monday – Sunday · 5:00 AM – 2:00 AM",
  founded: "Established in Karachi",
  logo: "/bmc-logo.jpg",
  video: "/bmc-video.mp4",
  mapEmbed: "https://www.google.com/maps?q=Defence+Market+Phase+2+DHA+Karachi&output=embed",
};

export const HERO_IMAGE = heroMilk;
export const GALLERY = [
  { src: gallery1, alt: "Fresh milk, yogurt and khoya on linen backdrop" },
  { src: gallery2, alt: "Freshly prepared samosas and papri" },
  { src: gallery3, alt: "Bismillah Milk Corner delivery van at sunrise" },
  { src: gallery4, alt: "Customer holding a glass of fresh milk" },
];

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "available_soon";

export type Product = {
  slug: string;
  name: string;
  category:
    | "Milk"
    | "Yogurt"
    | "Butter"
    | "Cheese"
    | "Cream"
    | "Khoya"
    | "Bakery Ingredients"
    | "Food Ingredients"
    | "Grocery"
    | "Dry Fruits"
    | "Organic Products";
  description: string;
  price: number;
  originalPrice?: number | null;
  unit: string;
  brand: string;
  tags: string[];
  stockStatus: StockStatus;
  stockCount: number;
  sku: string;
  rating: number;
  reviewCount: number;
  images: string[];
  specifications: Record<string, string>;
  frequentlyBoughtTogether?: string[];
  isNew?: boolean;
  isBestSeller?: boolean;
};

export const CATEGORIES = [
  "Milk",
  "Yogurt",
  "Butter",
  "Cheese",
  "Cream",
  "Khoya",
  "Bakery Ingredients",
  "Food Ingredients",
  "Grocery",
  "Dry Fruits",
  "Organic Products",
] as const;

export type CategoryName = (typeof CATEGORIES)[number];

export const CATEGORY_DESCRIPTIONS: Record<CategoryName, string> = {
  Milk: "Farm-fresh, pure pasteurized whole and toned milk sourced daily.",
  Yogurt: "Thick, creamy set dahi and artisanal drained yogurts.",
  Butter: "Pure deshi unsalted & salted butter made from whole milk cream.",
  Cheese: "Artisanal paneer, mozzarella, and cheddar for commercial & home kitchens.",
  Cream: "Rich heavy whipping cream and malai for desserts and savory curries.",
  Khoya: "Traditional slow-reduced khoya — essential base for South Asian sweets.",
  "Bakery Ingredients": "Professional roll patti, dough sheets, yeast, and baking powders.",
  "Food Ingredients": "Crispy papri, hand-folded samosas, phoolki, and chaat bases.",
  Grocery: "Farm-fresh eggs, cooking fats, pulses, and kitchen pantry staples.",
  "Dry Fruits": "Premium hand-picked almonds, pistachios, cashews, and dates.",
  "Organic Products": "100% organic raw honey, cold-pressed oils, and grass-fed ghee.",
};

export const PRODUCTS: Product[] = [];

export const CLIENTS = [
  "Beach View Club",
  "Creek Club",
  "Marina Club",
  "Sindh Club",
  "Karachi Gymkhana",
];

export const STATS = [
  { value: "15+", label: "Gourmet product lines" },
  { value: "5", label: "Elite clubs & hotels" },
  { value: "365", label: "Days fresh delivery" },
  { value: "100%", label: "Lab quality-tested" },
];

export const WHATSAPP_LINK = `https://wa.me/${SITE.whatsapp}`;
export const PHONE_LINK = `tel:${SITE.phones[0].replace(/[^0-9+]/g, "")}`;
