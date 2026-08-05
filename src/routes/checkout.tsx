import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useShop } from "@/context/shop-context";
import {
  getDeliveryRates,
  calculateDeliveryFee,
  validateCoupon,
  createOrder,
  DEFAULT_DELIVERY_RATES,
} from "@/lib/checkout-service";
import type {
  CustomerInfo,
  DeliveryAddress,
  DeliveryMethodType,
  PaymentMethodType,
  DeliveryRates,
} from "@/types/checkout";
import {
  User,
  MapPin,
  Truck,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Tag,
  X,
  Phone,
  Building,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, cartSubtotal, appliedCoupon, applyCoupon, removeCoupon, clearCart } = useShop();

  // Step state (1: Info, 2: Address, 3: Method, 4: Payment, 5: Review)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Delivery Rates
  const [rates, setRates] = useState<DeliveryRates>(DEFAULT_DELIVERY_RATES);

  // Form State
  const [customer, setCustomer] = useState<CustomerInfo>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const [address, setAddress] = useState<DeliveryAddress>({
    house: "",
    street: "",
    area: "",
    city: "Karachi",
    province: "Sindh",
    postalCode: "",
    instructions: "",
    googleMapsUrl: "",
  });

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodType>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cod");

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Order submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getDeliveryRates().then(setRates);
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      toast.info("Your cart is empty. Please add items before checking out.", {
        id: "cart-empty-toast",
      });
      navigate({ to: "/products" });
    }
  }, [cart, navigate]);

  // Pricing calculations
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const deliveryFee = calculateDeliveryFee(cartSubtotal, address.city, deliveryMethod, rates);
  const grandTotal = Math.max(0, cartSubtotal - discountAmount + deliveryFee);

  // Form Validation
  const validateStep1 = () => {
    if (!customer.firstName.trim()) {
      toast.error("Please enter your first name.");
      return false;
    }
    if (!customer.lastName.trim()) {
      toast.error("Please enter your last name.");
      return false;
    }
    if (!customer.phone.trim() || customer.phone.length < 10) {
      toast.error("Please enter a valid phone number.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!address.house.trim()) {
      toast.error("Please enter House/Flat/Building number.");
      return false;
    }
    if (!address.street.trim()) {
      toast.error("Please enter Street/Block.");
      return false;
    }
    if (!address.area.trim()) {
      toast.error("Please enter Area or Neighborhood.");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    const result = await validateCoupon(couponCode, cartSubtotal);
    setIsApplyingCoupon(false);
    if (result.success && result.coupon) {
      applyCoupon(result.coupon);
      setCouponCode("");
    } else {
      toast.error(result.message);
    }
  };

  const handlePlaceOrder = async () => {
    if (!validateStep1() || !validateStep2()) {
      toast.error("Please complete all required customer & shipping details.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createOrder({
        customer,
        address,
        deliveryMethod,
        paymentMethod,
        items: cart,
        subtotal: cartSubtotal,
        discountTotal: discountAmount,
        deliveryFee,
        grandTotal,
        couponCode: appliedCoupon?.code,
      });

      if (result.success) {
        clearCart();
        toast.success("Order placed successfully!");
        navigate({
          to: "/order-confirmation/$orderId",
          params: { orderId: result.orderId },
        });
      }
    } catch (error) {
      const err = error as Error;
      console.error("Order error:", error);
      toast.error(err.message || "Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: "Customer Info", icon: User },
    { num: 2, label: "Shipping Address", icon: MapPin },
    { num: 3, label: "Delivery Method", icon: Truck },
    { num: 4, label: "Payment", icon: CreditCard },
    { num: 5, label: "Review & Place", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 lg:py-12">
      <div className="container-page max-w-6xl">
        {/* Top Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Checkout</h1>
            <p className="text-sm text-slate-500">
              Fast, fresh & secure dairy delivery directly to your doorstep.
            </p>
          </div>
          <Link
            to="/cart"
            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-primary gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Cart
          </Link>
        </div>

        {/* Stepper Bar */}
        <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex min-w-[600px] items-center justify-between">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isDone = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div key={s.num} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (s.num < currentStep) setCurrentStep(s.num);
                    }}
                    disabled={s.num > currentStep}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                            ? "bg-primary text-white ring-4 ring-primary/20"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        isCurrent ? "text-slate-900 font-bold" : "text-slate-500"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className={`mx-3 h-0.5 flex-1 rounded-full ${
                        currentStep > s.num ? "bg-emerald-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Step Form Area */}
          <div className="space-y-6 lg:col-span-8">
            {/* STEP 1: CUSTOMER INFORMATION */}
            {currentStep === 1 && (
              <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Step 1: Customer Information
                    </h2>
                    <p className="text-xs text-slate-500">
                      Enter your name and contact details for order tracking & delivery
                      SMS/WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName" className="text-xs font-semibold">
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="e.g. Syed Muhammad"
                      value={customer.firstName}
                      onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName" className="text-xs font-semibold">
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="e.g. Ali"
                      value={customer.lastName}
                      onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-xs font-semibold">
                      Phone / WhatsApp Number *
                    </Label>
                    <Input
                      id="phone"
                      placeholder="e.g. 012345678910"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      className="mt-1"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      We will send order confirmation & status updates via WhatsApp to this number.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-xs font-semibold">
                      Email Address (Optional)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g. customer@example.com"
                      value={customer.email}
                      onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button onClick={handleNextStep} size="lg" className="rounded-full px-8">
                    Continue to Shipping <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* STEP 2: DELIVERY ADDRESS */}
            {currentStep === 2 && (
              <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Step 2: Shipping Address
                    </h2>
                    <p className="text-xs text-slate-500">
                      Provide exact location details for fast milk & dairy delivery.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="house" className="text-xs font-semibold">
                      House / Flat / Building No. *
                    </Label>
                    <Input
                      id="house"
                      placeholder="e.g. Flat 302, Al-Razi Heights"
                      value={address.house}
                      onChange={(e) => setAddress({ ...address, house: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="street" className="text-xs font-semibold">
                      Street / Block *
                    </Label>
                    <Input
                      id="street"
                      placeholder="e.g. Street 14, Block 5"
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="area" className="text-xs font-semibold">
                      Area / Neighborhood *
                    </Label>
                    <Input
                      id="area"
                      placeholder="e.g. Gulshan-e-Iqbal / DHA Phase 2 / Clifton"
                      value={address.area}
                      onChange={(e) => setAddress({ ...address, area: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city" className="text-xs font-semibold">
                      City *
                    </Label>
                    <select
                      id="city"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="Karachi">Karachi (Same Day / Fast Fresh Delivery)</option>
                      <option value="Outside Karachi">
                        Outside Karachi (Pakistani Metro Cities)
                      </option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="province" className="text-xs font-semibold">
                      Province
                    </Label>
                    <Input
                      id="province"
                      value={address.province}
                      onChange={(e) => setAddress({ ...address, province: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="postalCode" className="text-xs font-semibold">
                      Postal Code (Optional)
                    </Label>
                    <Input
                      id="postalCode"
                      placeholder="e.g. 75300"
                      value={address.postalCode}
                      onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="googleMapsUrl" className="text-xs font-semibold">
                      Google Maps Location Link (Optional)
                    </Label>
                    <Input
                      id="googleMapsUrl"
                      placeholder="e.g. https://maps.app.goo.gl/..."
                      value={address.googleMapsUrl}
                      onChange={(e) => setAddress({ ...address, googleMapsUrl: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="instructions" className="text-xs font-semibold">
                      Special Delivery Instructions (Optional)
                    </Label>
                    <Textarea
                      id="instructions"
                      placeholder="e.g. Leave with guard / Call upon arrival / Deliver before 10 AM"
                      rows={2}
                      value={address.instructions}
                      onChange={(e) => setAddress({ ...address, instructions: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                    size="lg"
                    className="rounded-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleNextStep} size="lg" className="rounded-full px-8">
                    Choose Delivery Method <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* STEP 3: DELIVERY METHOD */}
            {currentStep === 3 && (
              <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Step 3: Select Delivery Speed & Method
                    </h2>
                    <p className="text-xs text-slate-500">
                      Chilled temperature-controlled logistics to maintain dairy freshness.
                    </p>
                  </div>
                </div>

                <RadioGroup
                  value={deliveryMethod}
                  onValueChange={(val) => setDeliveryMethod(val as DeliveryMethodType)}
                  className="space-y-4"
                >
                  {/* Standard */}
                  <div
                    className={`flex items-start justify-between rounded-xl border p-4 transition-all cursor-pointer ${
                      deliveryMethod === "standard"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setDeliveryMethod("standard")}
                  >
                    <div className="flex gap-3">
                      <RadioGroupItem value="standard" id="std" className="mt-1" />
                      <div>
                        <Label htmlFor="std" className="font-bold text-slate-900 cursor-pointer">
                          Standard Delivery
                        </Label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Delivered within 24–48 hours in cold-storage vans.
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-slate-900">
                      {cartSubtotal >= rates.freeThreshold ? "FREE" : `Rs. ${rates.karachiRate}`}
                    </span>
                  </div>

                  {/* Express */}
                  <div
                    className={`flex items-start justify-between rounded-xl border p-4 transition-all cursor-pointer ${
                      deliveryMethod === "express"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setDeliveryMethod("express")}
                  >
                    <div className="flex gap-3">
                      <RadioGroupItem value="express" id="exp" className="mt-1" />
                      <div>
                        <Label
                          htmlFor="exp"
                          className="font-bold text-slate-900 cursor-pointer flex items-center gap-2"
                        >
                          Express Delivery{" "}
                          <Badge className="bg-amber-500 text-white text-[10px]">Fast</Badge>
                        </Label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Priority dispatch within 6–12 hours for fresh morning consumption.
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-slate-900">
                      Rs. {rates.karachiRate + rates.expressFee}
                    </span>
                  </div>

                  {/* Same Day (Karachi Only) */}
                  <div
                    className={`flex items-start justify-between rounded-xl border p-4 transition-all cursor-pointer ${
                      deliveryMethod === "same_day"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setDeliveryMethod("same_day")}
                  >
                    <div className="flex gap-3">
                      <RadioGroupItem value="same_day" id="sameday" className="mt-1" />
                      <div>
                        <Label
                          htmlFor="sameday"
                          className="font-bold text-slate-900 cursor-pointer flex items-center gap-2"
                        >
                          Same Day Urgent Delivery{" "}
                          <Badge className="bg-emerald-600 text-white text-[10px]">Karachi</Badge>
                        </Label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Instant dispatch within 3–5 hours (Orders placed before 3:00 PM).
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-slate-900">
                      Rs. {rates.karachiRate + rates.sameDayFee}
                    </span>
                  </div>
                </RadioGroup>

                <div className="mt-8 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                    size="lg"
                    className="rounded-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleNextStep} size="lg" className="rounded-full px-8">
                    Proceed to Payment <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* STEP 4: PAYMENT METHOD */}
            {currentStep === 4 && (
              <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Step 4: Select Payment Method
                    </h2>
                    <p className="text-xs text-slate-500">
                      Select your preferred payment option. Cash on Delivery and digital wallets
                      accepted.
                    </p>
                  </div>
                </div>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(val) => setPaymentMethod(val as PaymentMethodType)}
                  className="space-y-4"
                >
                  {/* COD */}
                  <div
                    className={`rounded-xl border p-4 transition-all cursor-pointer ${
                      paymentMethod === "cod"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setPaymentMethod("cod")}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="cod" id="pm_cod" />
                      <div>
                        <Label htmlFor="pm_cod" className="font-bold text-slate-900 cursor-pointer">
                          Cash on Delivery (COD)
                        </Label>
                        <p className="text-xs text-slate-500">
                          Pay cash to the rider when your milk & dairy products arrive.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* JazzCash */}
                  <div
                    className={`rounded-xl border p-4 transition-all cursor-pointer ${
                      paymentMethod === "jazzcash"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setPaymentMethod("jazzcash")}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="jazzcash" id="pm_jc" />
                      <div>
                        <Label htmlFor="pm_jc" className="font-bold text-slate-900 cursor-pointer">
                          JazzCash Mobile Wallet
                        </Label>
                        <p className="text-xs text-slate-500">
                          Transfer to 0313-2025005 (Bismillah Milk Corner).
                        </p>
                      </div>
                    </div>
                    {paymentMethod === "jazzcash" && (
                      <div className="mt-3 rounded-lg bg-amber-50/80 p-3 text-xs text-amber-900 space-y-1">
                        <p className="font-semibold">JazzCash Account Details:</p>
                        <p>Title: Bismillah Milk Corner</p>
                        <p>Number: 0313-2025005</p>
                        <p className="text-[11px] text-amber-700">
                          Please attach or send screenshot via WhatsApp after order placement.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* EasyPaisa */}
                  <div
                    className={`rounded-xl border p-4 transition-all cursor-pointer ${
                      paymentMethod === "easypaisa"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setPaymentMethod("easypaisa")}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="easypaisa" id="pm_ep" />
                      <div>
                        <Label htmlFor="pm_ep" className="font-bold text-slate-900 cursor-pointer">
                          EasyPaisa Mobile Wallet
                        </Label>
                        <p className="text-xs text-slate-500">
                          Transfer to 0313-2025005 (Bismillah Milk Corner).
                        </p>
                      </div>
                    </div>
                    {paymentMethod === "easypaisa" && (
                      <div className="mt-3 rounded-lg bg-emerald-50/80 p-3 text-xs text-emerald-900 space-y-1">
                        <p className="font-semibold">EasyPaisa Account Details:</p>
                        <p>Title: Bismillah Milk Corner</p>
                        <p>Number: 0313-2025005</p>
                      </div>
                    )}
                  </div>

                  {/* Bank Transfer */}
                  <div
                    className={`rounded-xl border p-4 transition-all cursor-pointer ${
                      paymentMethod === "bank_transfer"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setPaymentMethod("bank_transfer")}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="bank_transfer" id="pm_bt" />
                      <div>
                        <Label htmlFor="pm_bt" className="font-bold text-slate-900 cursor-pointer">
                          Direct Bank Transfer
                        </Label>
                        <p className="text-xs text-slate-500">
                          Meezan Bank / HBL Direct Account Deposit.
                        </p>
                      </div>
                    </div>
                    {paymentMethod === "bank_transfer" && (
                      <div className="mt-3 rounded-lg bg-blue-50/80 p-3 text-xs text-blue-900 space-y-1">
                        <p className="font-semibold">Meezan Bank Account:</p>
                        <p>Title: Bismillah Milk Corner</p>
                        <p>Account #: 01020109283741</p>
                        <p>IBAN: PK36MEZN0001020109283741</p>
                      </div>
                    )}
                  </div>

                  {/* Credit / Debit Card */}
                  <div
                    className={`rounded-xl border p-4 transition-all cursor-pointer ${
                      paymentMethod === "card"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setPaymentMethod("card")}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="card" id="pm_card" />
                      <div>
                        <Label
                          htmlFor="pm_card"
                          className="font-bold text-slate-900 cursor-pointer flex items-center gap-2"
                        >
                          Credit / Debit Card{" "}
                          <Badge variant="outline" className="text-[10px]">
                            Visa / MasterCard
                          </Badge>
                        </Label>
                        <p className="text-xs text-slate-500">
                          Secure online card gateway (Architecture ready).
                        </p>
                      </div>
                    </div>
                    {paymentMethod === "card" && (
                      <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <Label className="text-[11px]">Card Number</Label>
                            <Input
                              placeholder="4000 0000 0000 0000"
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">Cardholder Name</Label>
                            <Input placeholder="Full Name" className="h-8 text-xs bg-white" />
                          </div>
                          <div>
                            <Label className="text-[11px]">Expiry Date</Label>
                            <Input placeholder="MM / YY" className="h-8 text-xs bg-white" />
                          </div>
                          <div>
                            <Label className="text-[11px]">CVV</Label>
                            <Input
                              placeholder="123"
                              type="password"
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </RadioGroup>

                <div className="mt-8 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                    size="lg"
                    className="rounded-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleNextStep} size="lg" className="rounded-full px-8">
                    Review Order <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* STEP 5: REVIEW & PLACE ORDER */}
            {currentStep === 5 && (
              <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Step 5: Final Review & Confirmation
                    </h2>
                    <p className="text-xs text-slate-500">
                      Please verify all order details before clicking Place Order.
                    </p>
                  </div>
                </div>

                {/* Info Review Cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Customer
                    </h4>
                    <p className="font-bold text-slate-900">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className="text-xs text-slate-600">{customer.phone}</p>
                    <p className="text-xs text-slate-600">
                      {customer.email || "No email provided"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Shipping Address
                    </h4>
                    <p className="text-xs font-semibold text-slate-900">
                      {address.house}, {address.street}, {address.area}
                    </p>
                    <p className="text-xs text-slate-600">
                      {address.city}, {address.province}
                    </p>
                    {address.instructions && (
                      <p className="text-[11px] text-slate-500 italic mt-1">
                        "{address.instructions}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Delivery Method
                    </h4>
                    <p className="font-bold text-slate-900 capitalize mt-1">
                      {deliveryMethod.replace("_", " ")} Delivery
                    </p>
                    <p className="text-xs text-slate-600">Fee: PKR {deliveryFee}</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Payment Method
                    </h4>
                    <p className="font-bold text-slate-900 uppercase mt-1">{paymentMethod}</p>
                    <p className="text-xs text-slate-600">Status: Pending on delivery</p>
                  </div>
                </div>

                {/* Items Review */}
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Order Items ({cart.length})
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <div
                        key={item.product.id || item.product.slug}
                        className="flex justify-between py-2 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{item.product.name}</span>
                          <span className="text-slate-500 ml-2">x {item.quantity}</span>
                        </div>
                        <span className="font-semibold text-slate-900">
                          Rs. {(item.product.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between border-t border-slate-100 pt-6">
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                    size="lg"
                    className="rounded-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    size="lg"
                    className="rounded-full px-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                  >
                    {isSubmitting
                      ? "Placing Order..."
                      : `Confirm & Place Order (Rs. ${grandTotal.toLocaleString()})`}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right Summary Sidebar */}
          <div className="space-y-6 lg:col-span-4">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                Order Summary
              </h2>

              {/* Items List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.product.id || item.product.slug}
                    className="flex items-center gap-3"
                  >
                    <img
                      src={item.product.image || item.product.images[0] || SITE.logo}
                      alt={item.product.name}
                      className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Qty: {item.quantity} x Rs. {item.product.price}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-900 shrink-0">
                      Rs. {item.product.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon Section */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" /> Coupon Code
                </label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800">
                    <div>
                      <span className="font-bold">{appliedCoupon.code}</span>
                      <p className="text-[10px] text-emerald-600">
                        -PKR {appliedCoupon.discountAmount.toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="rounded-full p-1 hover:bg-emerald-100 text-emerald-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <Input
                      placeholder="e.g. WELCOME10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="uppercase text-xs"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isApplyingCoupon || !couponCode.trim()}
                      className="shrink-0 text-xs font-semibold"
                    >
                      {isApplyingCoupon ? "..." : "Apply"}
                    </Button>
                  </form>
                )}
              </div>

              {/* Price Totals */}
              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    Rs. {cartSubtotal.toLocaleString()}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>- Rs. {discountAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Delivery Charges ({address.city})</span>
                  <span className="font-semibold text-slate-900">
                    {deliveryFee === 0 ? "FREE" : `Rs. ${deliveryFee}`}
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                  <span>Total Amount</span>
                  <span className="font-display text-xl text-primary">
                    Rs. {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1 border border-slate-200">
                <p className="flex items-center gap-1 font-semibold text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Bismillah Dairy Guarantee
                </p>
                <p>All items freshly packaged directly from DHA Phase 2 main unit.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
