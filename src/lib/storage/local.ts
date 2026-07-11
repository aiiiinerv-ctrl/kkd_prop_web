import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver, StoredFile } from "./types";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

function root() {
  return path.resolve(process.env.STORAGE_ROOT ?? "./storage");
}

/** Rejects path traversal and normalizes the key to a safe relative path. */
export function sanitizeKey(key: string): string | null {
  const normalized = path.posix.normalize(key.replace(/\\/g, "/"));
  if (
    normalized.startsWith("..") ||
    normalized.includes("/../") ||
    path.isAbsolute(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function contentTypeForKey(key: string): string {
  return CONTENT_TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";
}

export const localDriver: StorageDriver = {
  async put(key, data) {
    const safe = sanitizeKey(key);
    if (!safe) throw new Error(`Invalid storage key: ${key}`);
    const filePath = path.join(root(), safe);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  },

  async get(key): Promise<StoredFile | null> {
    const safe = sanitizeKey(key);
    if (!safe) return null;
    try {
      const data = await readFile(path.join(root(), safe));
      return { data, contentType: contentTypeForKey(safe) };
    } catch {
      return null;
    }
  },

  async delete(key) {
    const safe = sanitizeKey(key);
    if (!safe) return;
    await rm(path.join(root(), safe), { force: true });
  },

  publicUrl(key) {
    return `/files/${key}`;
  },
};
