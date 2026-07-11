import { createId } from "@paralleldrive/cuid2";
import { storage, validateImage } from "@/lib/storage";

/** Turns a title into a URL slug; falls back to a cuid for non-latin input. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return slug || createId();
}

/** Splits a textarea's lines into a trimmed non-empty string array. */
export function linesToList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * Validates and stores an optional uploaded image under a public prefix.
 * Returns the storage key, or null when no file was provided.
 */
export async function storePublicImage(
  file: FormDataEntryValue | null,
  prefix: string
): Promise<{ ok: true; key: string | null } | { ok: false; error: string }> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: true, key: null };
  }
  const check = validateImage(file, { maxMb: 5 });
  if (!check.ok) return { ok: false, error: check.error };

  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const key = `public/${prefix}/${createId()}${ext}`;
  await storage.put(key, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
  });
  return { ok: true, key };
}
