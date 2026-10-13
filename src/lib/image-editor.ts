import type { ProcessResult } from "@/lib/image-processor";

export type EditFormat = "webp" | "avif" | "jpeg" | "png";

export interface EditOptions {
  format: EditFormat;
  /** 1-100, ignored for png (lossless). */
  quality: number;
  /** Target output width in px. 0 = derive from height/aspect or source. */
  width: number;
  /** Target output height in px. 0 = derive from width/aspect or source. */
  height: number;
  /** Clockwise rotation applied before export. */
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  /** CSS filter percentages (100 = no change). */
  brightness: number;
  contrast: number;
  saturate: number;
  /** Hex color used to flatten transparency (always used for JPEG). */
  background: string;
  /** When false, transparency is preserved (except JPEG). */
  flatten: boolean;
}

export interface RenderOutput {
  blob: Blob;
  width: number;
  height: number;
  /** MIME type actually produced (may fall back from AVIF -> WebP). */
  type: string;
}

const FORMAT_MIME: Record<EditFormat, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
};

const FORMAT_EXT: Record<EditFormat, string> = {
  webp: ".webp",
  avif: ".avif",
  jpeg: ".jpg",
  png: ".png",
};

export function isLossless(format: EditFormat): boolean {
  return format === "png";
}

/** Build sensible defaults for a freshly opened image. */
export function defaultEditOptions(
  width: number,
  height: number
): EditOptions {
  return {
    format: "webp",
    quality: 80,
    width,
    height,
    rotate: 0,
    flipH: false,
    flipV: false,
    brightness: 100,
    contrast: 100,
    saturate: 100,
    background: "#ffffff",
    flatten: false,
  };
}

/**
 * Given the source bitmap size and the desired options, compute the final
 * canvas size, accounting for 90/270° rotation swapping width & height.
 */
export function computeOutputSize(
  srcWidth: number,
  srcHeight: number,
  options: EditOptions
): { width: number; height: number } {
  const rotated = options.rotate === 90 || options.rotate === 270;
  const baseW = rotated ? srcHeight : srcWidth;
  const baseH = rotated ? srcWidth : srcHeight;

  let w = options.width > 0 ? options.width : baseW;
  let h = options.height > 0 ? options.height : baseH;

  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  return { width: w, height: h };
}

/**
 * Render an edited image to a Blob. The bitmap is NOT closed so it can be
 * reused across many live-preview renders.
 */
export async function renderToBlob(
  bitmap: ImageBitmap,
  options: EditOptions
): Promise<RenderOutput> {
  const { width, height } = computeOutputSize(
    bitmap.width,
    bitmap.height,
    options
  );

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  const needsBackground = options.format === "jpeg" || options.flatten;
  if (needsBackground) {
    ctx.fillStyle = options.background || "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.filter = `brightness(${options.brightness}%) contrast(${options.contrast}%) saturate(${options.saturate}%)`;

  // The drawn area before rotation: for 90/270 the canvas is swapped, so the
  // image is drawn at the un-swapped dimensions and rotated into place.
  const rotated = options.rotate === 90 || options.rotate === 270;
  const drawW = rotated ? height : width;
  const drawH = rotated ? width : height;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((options.rotate * Math.PI) / 180);
  ctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);
  ctx.drawImage(bitmap, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const requested = FORMAT_MIME[options.format];
  const quality = isLossless(options.format) ? undefined : options.quality / 100;

  let type = requested;
  let blob = await canvas.convertToBlob({ type: requested, quality });

  // Some browsers can't encode AVIF — fall back to WebP transparently.
  if ((!blob || blob.type !== requested) && options.format === "avif") {
    type = "image/webp";
    blob = await canvas.convertToBlob({ type, quality });
  }

  if (!blob) throw new Error(`Failed to encode image as ${options.format}`);

  return { blob, width, height, type };
}

/** Produce a `ProcessResult` so an edit can replace a grid item's result. */
export async function buildEditResult(
  file: File,
  bitmap: ImageBitmap,
  srcWidth: number,
  srcHeight: number,
  options: EditOptions
): Promise<ProcessResult> {
  const out = await renderToBlob(bitmap, options);
  const ext =
    out.type === "image/webp" && options.format === "avif"
      ? ".webp"
      : FORMAT_EXT[options.format];

  return {
    blob: out.blob,
    outputType: out.type,
    outputExtension: ext,
    width: out.width,
    height: out.height,
    originalWidth: srcWidth,
    originalHeight: srcHeight,
    originalSize: file.size,
    keptOriginal: false,
  };
}
