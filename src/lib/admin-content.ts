import { createId } from "@paralleldrive/cuid2";
import { compressImage } from "@/lib/images";
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

  const key = `public/${prefix}/${createId()}.jpg`;
  const compressed = await compressImage(Buffer.from(await file.arrayBuffer()));
  await storage.put(key, compressed, { contentType: "image/jpeg" });
  return { ok: true, key };
}

/**
 * Validates and stores zero or more uploaded images under a public prefix.
 * Returns the storage keys in submission order; empty array when no files
 * were provided.
 */
export async function storePublicImages(
  files: FormDataEntryValue[],
  prefix: string
): Promise<{ ok: true; keys: string[] } | { ok: false; error: string }> {
  const keys: string[] = [];
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    const check = validateImage(file, { maxMb: 5 });
    if (!check.ok) return { ok: false, error: check.error };

    const key = `public/${prefix}/${createId()}.jpg`;
    const compressed = await compressImage(Buffer.from(await file.arrayBuffer()));
    await storage.put(key, compressed, { contentType: "image/jpeg" });
    keys.push(key);
  }
  return { ok: true, keys };
}
