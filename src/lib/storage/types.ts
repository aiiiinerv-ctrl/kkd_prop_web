export type StoredFile = {
  data: Buffer;
  contentType: string;
};

export interface StorageDriver {
  put(key: string, data: Buffer, meta: { contentType: string }): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
  /** Cheap existence check (no bytes read) — for blobs whose contents a caller never needs, only whether they're still there. */
  exists(key: string): Promise<boolean>;
  /** URL a browser can use to load the file (public keys only). */
  publicUrl(key: string): string;
}
