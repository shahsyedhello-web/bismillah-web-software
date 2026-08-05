import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const STORAGE_BUCKET = "products";

/**
 * Convert any JS object into a valid Supabase Json type.
 */
function toSupabaseJson(value: unknown): Json {
  if (value === null || value === undefined) return null;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSupabaseJson(item)) as Json;
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        toSupabaseJson(item),
      ]),
    ) as Json;
  }

  return String(value);
}

function getStoragePathFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;

    const publicMarker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;

    if (pathname.includes(publicMarker)) {
      return pathname.split(publicMarker)[1];
    }

    const signedMarker = `/storage/v1/object/sign/${STORAGE_BUCKET}/`;

    if (pathname.includes(signedMarker)) {
      return pathname.split(signedMarker)[1].split("?")[0];
    }

    return null;
  } catch {
    return null;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadMedia(
  file: File,
  folder: string,
  options?: {
    currentUrl?: string | null;
    onProgress?: (progress: number) => void;
  },
): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image size must be less than 5 MB");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  options?.onProgress?.(10);

  if (!isSupabaseConfigured()) {
    options?.onProgress?.(100);
    return await readFileAsDataUrl(file);
  }

  try {
    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const path = `${folder}/${fileName}`;

    if (options?.currentUrl) {
      const oldPath = getStoragePathFromUrl(options.currentUrl);
      if (oldPath) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([oldPath])
          .catch(() => {});
      }
    }

    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (uploadError) {
      console.warn(
        "Supabase storage upload failed, falling back to data URL:",
        uploadError.message,
      );
      options?.onProgress?.(100);
      return await readFileAsDataUrl(file);
    }

    options?.onProgress?.(70);
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    options?.onProgress?.(100);
    return data.publicUrl;
  } catch (err) {
    console.warn("Supabase storage exception, falling back to data URL:", err);
    options?.onProgress?.(100);
    return await readFileAsDataUrl(file);
  }
}

export async function logActivity(
  action: string,
  entity: string,
  entity_id?: string,
  meta?: Record<string, unknown>,
) {
  if (!isSupabaseConfigured()) return;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("activity_logs").insert({
      actor_user_id: user?.id ?? null,
      action,
      entity,
      entity_id: entity_id ?? null,
      meta: toSupabaseJson(meta ?? {}),
    });

    if (error) {
      console.error("Activity Log Error:", error);
    }
  } catch (e) {
    console.warn("Activity Log Exception:", e);
  }
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);

  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";

    const s = String(value).replace(/"/g, '""');

    return /[",\n]/.test(s) ? `"${s}"` : s;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}
