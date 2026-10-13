export type OutputFormat = "webp" | "avif" | "jpeg";

export const FORMAT_MIME: Record<OutputFormat, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpeg: "image/jpeg",
};

export function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    default:
      return ".bin";
  }
}

const nativeProbes = new Map<OutputFormat, Promise<boolean>>();

/** Whether the browser's canvas can encode `format` itself (memoized per thread). */
export function supportsNativeEncoding(format: OutputFormat): Promise<boolean> {
  let probe = nativeProbes.get(format);
  if (!probe) {
    probe = (async () => {
      try {
        const canvas = new OffscreenCanvas(1, 1);
        const ctx = canvas.getContext("2d");
        if (!ctx) return false;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 1, 1);
        const mime = FORMAT_MIME[format];
        // Unsupported types silently fall back to PNG, so check what came out.
        const blob = await canvas.convertToBlob({ type: mime, quality: 0.8 });
        return blob.type === mime;
      } catch {
        return false;
      }
    })();
    nativeProbes.set(format, probe);
  }
  return probe;
}

export async function getNativeSupport(): Promise<Record<OutputFormat, boolean>> {
  const [webp, avif, jpeg] = await Promise.all([
    supportsNativeEncoding("webp"),
    supportsNativeEncoding("avif"),
    supportsNativeEncoding("jpeg"),
  ]);
  return { webp, avif, jpeg };
}

/**
 * libavif's quality scale is much stricter than browser WebP/JPEG. Map the
 * slider so equal values give similar SSIM on photos (measured: 60->49,
 * 70->53, 80->59, 90->80), which keeps AVIF smaller at the same setting.
 */
function avifQuality(quality: number): number {
  return Math.round(quality <= 80 ? 0.55 * quality + 15 : 59 + (quality - 80) * 2);
}

async function encodeWithWasm(
  pixels: ImageData,
  format: "webp" | "avif",
  quality: number
): Promise<ArrayBuffer> {
  if (format === "avif") {
    const { default: encode } = await import("@jsquash/avif/encode");
    return encode(pixels, { quality: avifQuality(quality) });
  }
  const { default: encode } = await import("@jsquash/webp/encode");
  return encode(pixels, { quality });
}

/**
 * Encode a canvas with the browser's built-in encoder, falling back to a
 * lazily loaded WASM encoder when the browser can't produce the format.
 */
export async function encodeCanvas(
  canvas: OffscreenCanvas,
  format: OutputFormat,
  quality: number
): Promise<Blob> {
  const mime = FORMAT_MIME[format];
  if (await supportsNativeEncoding(format)) {
    const blob = await canvas.convertToBlob({ type: mime, quality: quality / 100 });
    if (blob.type === mime) return blob;
  }
  if (format === "jpeg") throw new Error("This browser can't encode JPEG");

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const buffer = await encodeWithWasm(pixels, format, quality);
  return new Blob([buffer], { type: mime });
}
