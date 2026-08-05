import { useEffect, useState } from "react";
import { Phone, ArrowUp } from "lucide-react";
import { useSiteSettings } from "@/context/site-settings-context";

export function FloatingButtons() {
  const [showTop, setShowTop] = useState(false);
  const { whatsappLink, phoneLink } = useSiteSettings();

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <a
        href={whatsappLink}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Chat with us on WhatsApp"
        className="group grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-1"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-white">
          <path d="M20.52 3.48A11.86 11.86 0 0 0 12.03 0C5.42 0 .06 5.36.06 11.98c0 2.11.55 4.17 1.6 5.99L0 24l6.19-1.62a11.9 11.9 0 0 0 5.83 1.49h.01c6.61 0 11.97-5.36 11.97-11.98 0-3.2-1.25-6.2-3.48-8.41ZM12.03 21.8h-.01a9.83 9.83 0 0 1-5.01-1.37l-.36-.21-3.68.96.98-3.59-.24-.37a9.79 9.79 0 0 1-1.5-5.24c0-5.42 4.41-9.83 9.83-9.83 2.62 0 5.09 1.02 6.94 2.88a9.78 9.78 0 0 1 2.88 6.95c0 5.42-4.41 9.82-9.83 9.82Zm5.4-7.35c-.29-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.29-.75.96-.92 1.15-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.75-1.63-2.04-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.5-.66-.51h-.56c-.19 0-.51.07-.78.37-.27.29-1.03 1.01-1.03 2.46 0 1.45 1.05 2.85 1.2 3.05.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.67.62.7.22 1.34.19 1.85.11.56-.08 1.75-.71 2-1.39.25-.68.25-1.26.17-1.39-.07-.13-.27-.2-.56-.35Z" />
        </svg>
      </a>
      <a
        href={phoneLink}
        aria-label="Call Bismillah Milk Corner"
        className="grid h-13 w-13 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-1"
        style={{ height: 52, width: 52 }}
      >
        <Phone className="h-5 w-5" />
      </a>
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={
          "grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow transition-all " +
          (showTop ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
}
