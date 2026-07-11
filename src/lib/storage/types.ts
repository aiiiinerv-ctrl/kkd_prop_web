export type StoredFile = {
  data: Buffer;
  contentType: string;
};

export interface StorageDriver {
  put(key: string, data: Buffer, meta: { contentType: string }): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
  /** URL a browser can use to load the file (public keys only). */
  publicUrl(key: string): string;
}
