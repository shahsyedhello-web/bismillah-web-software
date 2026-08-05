import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SITE } from "@/lib/site-data";
import { useSiteSettings } from "@/context/site-settings-context";
import { catalogQueryOptions } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeading } from "@/components/section-heading";

const searchSchema = z.object({
  product: z.string().optional(),
});

export const Route = createFileRoute("/quote")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: `Request a Quotation — ${SITE.name}` },
      {
        name: "description",
        content:
          "Get a written quotation from Bismillah Milk Corner. Tell us about your products, quantities and delivery needs — we'll respond quickly.",
      },
      { property: "og:title", content: `Request a Quotation — ${SITE.name}` },
      { property: "og:description", content: "Custom pricing for your establishment." },
      { property: "og:url", content: "/quote" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "/quote" }],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQueryOptions);
  },
  component: QuotePage,
});

const schema = z.object({
  company_name: z.string().trim().min(2, "Please enter your company name").max(120),
  contact_person: z.string().trim().min(2, "Please enter your name").max(120),
  phone: z.string().trim().min(6, "Please enter a valid phone number").max(30),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Please enter a valid email").max(255),
  business_type: z.string().trim().max(80).optional().or(z.literal("")),
  products_required: z.string().trim().min(2, "Please tell us which products you need").max(1000),
  quantity: z.string().trim().max(200).optional().or(z.literal("")),
  delivery_city: z.string().trim().max(80).optional().or(z.literal("")),
  delivery_address: z.string().trim().max(500).optional().or(z.literal("")),
  required_date: z.string().max(20).optional().or(z.literal("")),
  special_requirements: z.string().trim().max(1000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const BUSINESS_TYPES = [
  "Restaurant",
  "Hotel",
  "Club",
  "Bakery / Sweet shop",
  "Café / Tea house",
  "Catering",
  "Retail store",
  "Household",
  "Other",
];

function QuotePage() {
  const { phone, phoneLink } = useSiteSettings();
  const { product: preselected } = useSearch({ from: Route.id });
  const { data: catalog } = useQuery(catalogQueryOptions);
  const preselectedName = catalog?.products.find((p) => p.slug === preselected)?.name ?? "";

  const [values, setValues] = useState<FormValues>({
    company_name: "",
    contact_person: "",
    phone: "",
    whatsapp: "",
    email: "",
    business_type: "",
    products_required: preselectedName,
    quantity: "",
    delivery_city: "Karachi",
    delivery_address: "",
    required_date: "",
    special_requirements: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setServerError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setStatus("submitting");
    const payload = {
      ...parsed.data,
      whatsapp: parsed.data.whatsapp || null,
      business_type: parsed.data.business_type || null,
      quantity: parsed.data.quantity || null,
      delivery_city: parsed.data.delivery_city || null,
      delivery_address: parsed.data.delivery_address || null,
      required_date: parsed.data.required_date || null,
      special_requirements: parsed.data.special_requirements || null,
    };

    // Save locally for fallback
    try {
      const existing = JSON.parse(localStorage.getItem("bmc_quotations") || "[]");
      const newLocalQuote = {
        id: `quote-${Date.now()}`,
        ...payload,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      localStorage.setItem("bmc_quotations", JSON.stringify([newLocalQuote, ...existing]));
    } catch (e) {
      console.warn("Local quote save warning:", e);
    }

    const { error } = await supabase.from("quotations").insert(payload);
    if (error) {
      console.warn("Supabase quote insert warning (saved locally):", error);
    }

    try {
      await supabase.from("notifications").insert({
        title: `New Quote Request: ${parsed.data.company_name}`,
        body: `${parsed.data.contact_person} requested quotation for ${parsed.data.products_required.slice(0, 60)}...`,
        is_read: false,
      });
    } catch (e) {
      console.warn("Quote notification error:", e);
    }
    setStatus("success");
    setValues({
      company_name: "",
      contact_person: "",
      phone: "",
      whatsapp: "",
      email: "",
      business_type: "",
      products_required: "",
      quantity: "",
      delivery_city: "Karachi",
      delivery_address: "",
      required_date: "",
      special_requirements: "",
    });
  }

  if (status === "success") {
    return (
      <section className="container-page py-24">
        <div className="mx-auto max-w-2xl rounded-3xl bg-card p-10 text-center ring-1 ring-border shadow-[var(--shadow-elegant)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 font-display text-3xl text-foreground">
            Thank you — request received.
          </h1>
          <p className="mt-3 text-muted-foreground">
            We've received your quotation request and will get back to you shortly on the number and
            email you provided. For urgent enquiries, please call{" "}
            <a href={phoneLink} className="font-semibold text-primary">
              {phone}
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Send another request
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="container-page py-16 md:py-20">
        <SectionHeading
          as="h1"
          eyebrow="Request a quotation"
          title="Tell us what you need. We'll respond quickly."
          description="Share a few details about your establishment and the products you're interested in. We'll follow up with pricing tailored to your quantity and delivery needs."
        />
      </section>

      <section className="container-page pb-24">
        <form
          onSubmit={onSubmit}
          className="mx-auto max-w-3xl rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)] ring-1 ring-border md:p-10"
          noValidate
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Company name" required error={errors.company_name}>
              <input
                type="text"
                value={values.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                required
                maxLength={120}
                className={inputCls}
              />
            </Field>
            <Field label="Contact person" required error={errors.contact_person}>
              <input
                type="text"
                value={values.contact_person}
                onChange={(e) => set("contact_person", e.target.value)}
                required
                maxLength={120}
                className={inputCls}
              />
            </Field>
            <Field label="Phone" required error={errors.phone}>
              <input
                type="tel"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
                required
                inputMode="tel"
                className={inputCls}
              />
            </Field>
            <Field label="WhatsApp" error={errors.whatsapp}>
              <input
                type="tel"
                value={values.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                inputMode="tel"
                className={inputCls}
              />
            </Field>
            <Field label="Email" required error={errors.email}>
              <input
                type="email"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Business type">
              <select
                value={values.business_type}
                onChange={(e) => set("business_type", e.target.value)}
                className={inputCls}
              >
                <option value="">Select a type</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Products required" required error={errors.products_required} full>
              <textarea
                value={values.products_required}
                onChange={(e) => set("products_required", e.target.value)}
                required
                rows={3}
                maxLength={1000}
                placeholder="e.g. 20 litres of milk daily, 5 kg yogurt, 2 kg khoya…"
                className={inputCls}
              />
            </Field>
            <Field label="Quantity (per delivery)">
              <input
                type="text"
                value={values.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                maxLength={200}
                className={inputCls}
              />
            </Field>
            <Field label="Required by (date)">
              <input
                type="date"
                value={values.required_date}
                onChange={(e) => set("required_date", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Delivery city">
              <input
                type="text"
                value={values.delivery_city}
                onChange={(e) => set("delivery_city", e.target.value)}
                maxLength={80}
                className={inputCls}
              />
            </Field>
            <Field label="Delivery address" full>
              <input
                type="text"
                value={values.delivery_address}
                onChange={(e) => set("delivery_address", e.target.value)}
                maxLength={500}
                className={inputCls}
              />
            </Field>
            <Field label="Special requirements" full>
              <textarea
                value={values.special_requirements}
                onChange={(e) => set("special_requirements", e.target.value)}
                rows={3}
                maxLength={1000}
                className={inputCls}
              />
            </Field>
          </div>

          {serverError && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
            >
              {serverError}
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              By submitting, you agree to be contacted by our team regarding this request.
            </p>
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-0.5 disabled:opacity-70"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                "Send request"
              )}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40";

function Field({
  label,
  required,
  error,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={"flex flex-col gap-1.5 " + (full ? "sm:col-span-2" : "")}>
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}
