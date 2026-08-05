import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Phone, Mail, MapPin, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { SITE } from "@/lib/site-data";
import { useSiteSettings } from "@/context/site-settings-context";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeading } from "@/components/section-heading";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: `Contact — ${SITE.name}` },
      {
        name: "description",
        content: `Get in touch with ${SITE.name} in DHA Karachi. Call, WhatsApp, email or visit us for orders and enquiries.`,
      },
      { property: "og:title", content: `Contact — ${SITE.name}` },
      { property: "og:description", content: "Phone, WhatsApp, email and address." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Please enter a message").max(1500),
});

type Values = z.infer<typeof schema>;

function ContactPage() {
  const { whatsappLink, phones, email, address, hours, googleMapsUrl } = useSiteSettings();
  const [v, setV] = useState<Values>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof Values>(k: K, val: Values[K]) {
    setV((s) => ({ ...s, [k]: val }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setServerError(null);
    const p = schema.safeParse(v);
    if (!p.success) {
      const fe: Partial<Record<keyof Values, string>> = {};
      for (const i of p.error.issues) {
        const k = i.path[0] as keyof Values;
        if (!fe[k]) fe[k] = i.message;
      }
      setErrors(fe);
      return;
    }
    setStatus("submitting");
    const payload = {
      ...p.data,
      phone: p.data.phone || null,
      subject: p.data.subject || null,
    };

    // Save locally for fallback
    try {
      const existing = JSON.parse(localStorage.getItem("bmc_messages") || "[]");
      const newLocalMsg = {
        id: `msg-${Date.now()}`,
        ...payload,
        status: "unread",
        created_at: new Date().toISOString(),
      };
      localStorage.setItem("bmc_messages", JSON.stringify([newLocalMsg, ...existing]));
    } catch (e) {
      console.warn("Local contact msg save warning:", e);
    }

    const { error } = await supabase.from("contact_messages").insert(payload);
    if (error) {
      console.warn("Supabase contact insert error (saved locally):", error);
    }

    try {
      await supabase.from("notifications").insert({
        title: `New Contact Message from ${p.data.name}`,
        body: p.data.subject
          ? `${p.data.subject}: ${p.data.message.slice(0, 60)}`
          : p.data.message.slice(0, 80),
        is_read: false,
      });
    } catch (e) {
      console.warn("Contact notification error:", e);
    }
    setStatus("success");
    setV({ name: "", email: "", phone: "", subject: "", message: "" });
  }

  return (
    <>
      <section className="container-page py-16 md:py-24">
        <SectionHeading
          as="h1"
          eyebrow="Contact"
          title="Let's talk."
          description="Whether you need a same-day quote or want to visit our shop in DHA — we'd love to hear from you."
        />
      </section>

      <section className="container-page pb-24">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          {/* Info + Map */}
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard icon={<Phone className="h-5 w-5" />} title="Call us">
                {phones.map((p) => (
                  <a
                    key={p}
                    href={`tel:${p.replace(/[^0-9+]/g, "")}`}
                    className="block hover:text-primary"
                  >
                    {p}
                  </a>
                ))}
              </InfoCard>
              <InfoCard icon={<Mail className="h-5 w-5" />} title="Email">
                <a href={`mailto:${email}`} className="break-all hover:text-primary">
                  {email}
                </a>
              </InfoCard>
              <InfoCard icon={<MapPin className="h-5 w-5" />} title="Visit">
                {address}
              </InfoCard>
              <InfoCard icon={<Clock className="h-5 w-5" />} title="Hours">
                {hours}
              </InfoCard>
            </div>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center justify-between rounded-2xl bg-[#25D366] p-5 text-white shadow-[var(--shadow-soft)]"
            >
              <div>
                <p className="text-xs uppercase tracking-widest text-white/80">
                  Quickest way to reach us
                </p>
                <p className="mt-1 font-display text-xl">Message us on WhatsApp</p>
              </div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                Open chat →
              </span>
            </a>

            <div className="overflow-hidden rounded-3xl ring-1 ring-border">
              <iframe
                title={`${SITE.name} on Google Maps`}
                src={googleMapsUrl}
                width="100%"
                height="360"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block w-full"
              />
            </div>
          </div>

          {/* Form */}
          <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)] ring-1 ring-border md:p-8">
            {status === "success" ? (
              <div className="py-10 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="mt-5 font-display text-2xl text-foreground">Message sent</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We'll respond as soon as we can. Thank you.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="space-y-5">
                <h2 className="font-display text-2xl text-foreground">Send us a message</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" required error={errors.name}>
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => set("name", e.target.value)}
                      className={inputCls}
                      required
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Email" required error={errors.email}>
                    <input
                      type="email"
                      value={v.email}
                      onChange={(e) => set("email", e.target.value)}
                      className={inputCls}
                      required
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={v.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      className={inputCls}
                      inputMode="tel"
                    />
                  </Field>
                  <Field label="Subject">
                    <input
                      type="text"
                      value={v.subject}
                      onChange={(e) => set("subject", e.target.value)}
                      className={inputCls}
                      maxLength={120}
                    />
                  </Field>
                </div>
                <Field label="Message" required error={errors.message}>
                  <textarea
                    value={v.message}
                    onChange={(e) => set("message", e.target.value)}
                    className={inputCls}
                    rows={5}
                    required
                    maxLength={1500}
                  />
                </Field>
                {serverError && (
                  <p
                    role="alert"
                    className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {serverError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-0.5 disabled:opacity-70"
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    "Send message"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary">
        {icon}
      </div>
      <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
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
