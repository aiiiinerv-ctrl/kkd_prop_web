import { localDriver } from "./local";
import type { StorageDriver } from "./types";

function selectDriver(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  switch (driver) {
    case "local":
      return localDriver;
    case "s3":
      throw new Error("STORAGE_DRIVER=s3 is not implemented yet");
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
  }
}

export const storage = selectDriver();
export { sanitizeKey } from "./local";
export type { StorageDriver, StoredFile } from "./types";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function validateImage(
  file: File,
  { maxMb = 5 }: { maxMb?: number } = {}
): { ok: true } | { ok: false; error: string } {
  if (!IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: "Only JPEG, PNG or WebP images are allowed" };
  }
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) {
    return { ok: false, error: "Invalid file extension" };
  }
  if (file.size > maxMb * 1024 * 1024) {
    return { ok: false, error: `File must be smaller than ${maxMb}MB` };
  }
  return { ok: true };
}
