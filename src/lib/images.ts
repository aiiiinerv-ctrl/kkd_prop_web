import sharp from "sharp";

const MAX_IMAGE_DIMENSION_PX = 1920;

/**
 * Re-encodes an uploaded image to a size-capped JPEG. Keeps the memory
 * footprint of each stored file small and predictable regardless of what
 * was uploaded (raw marketing PNGs from a phone/design tool can run several
 * MB each) — this host's shared-hosting process has previously crashed
 * under memory pressure from a handful of multi-MB buffers alive at once.
 */
export async function compressImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({
      width: MAX_IMAGE_DIMENSION_PX,
      height: MAX_IMAGE_DIMENSION_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82 })
    .toBuffer();
}
