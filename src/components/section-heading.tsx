import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
}) {
  const Tag = as;
  return (
    <div className={"max-w-3xl " + (align === "center" ? "mx-auto text-center" : "")}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Tag className="mt-3 text-3xl sm:text-4xl md:text-5xl leading-[1.05] text-foreground">
        {title}
      </Tag>
      {description && (
        <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
