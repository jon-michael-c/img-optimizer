import {
  type OutputFormat,
  FORMAT_MIME,
  encodeCanvas,
  extensionForMimeType,
  supportsNativeEncoding,
} from "@/lib/codecs";

export type { OutputFormat };

export interface ProcessOptions {
  format: OutputFormat;
  quality: number;
  maxDimension: number;
}

export interface EncodedFile {
  blob: Blob;
  type: string;
  /** Including the leading dot. */
  extension: string;
}

export interface ProcessResult {
  blob: Blob;
  /** MIME type of the produced blob (may differ from the requested format if we kept the original). */
  outputType: string;
  /** File extension to use when saving this result, including the leading dot. */
  outputExtension: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  /**
   * True when re-encoding would have produced a larger file, so the original
   * bytes were kept instead. Guarantees the output is never bigger than the input.
   */
  keptOriginal: boolean;
  /** The larger file in the requested format, offered when the original was kept. */
  converted?: EncodedFile;
  /** Small grid preview; absent when the source is already small. */
  thumbnail?: Blob;
}

/** Shortest edge of grid thumbnails: enough for ~240px cards on 2x screens. */
const THUMBNAIL_EDGE = 480;

export function sameOptions(a?: ProcessOptions, b?: ProcessOptions): boolean {
  if (!a || !b) return false;
  return (
    a.format === b.format &&
    a.quality === b.quality &&
    a.maxDimension === b.maxDimension
  );
}

function calculateDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (maxDimension <= 0 || (width <= maxDimension && height <= maxDimension)) {
    return { width, height };
  }

  const aspectRatio = width / height;
  if (width > height) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / aspectRatio),
    };
  }
  return {
    width: Math.round(maxDimension * aspectRatio),
    height: maxDimension,
  };
}

/** Best-effort extension for keeping the original file (preserves its existing extension). */
function originalExtension(file: File): string {
  const match = /\.[^.]+$/.exec(file.name);
  if (match) return match[0].toLowerCase();
  return extensionForMimeType(file.type);
}

function context2d(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");
  return ctx;
}

/**
 * Draw `source` scaled to `width`x`height`. Big reductions are done in halving
 * steps, which avoids aliasing in browsers without high-quality smoothing.
 */
function drawScaled(
  source: ImageBitmap,
  width: number,
  height: number,
  background?: string
): OffscreenCanvas {
  let current: ImageBitmap | OffscreenCanvas = source;
  while (current.width / 2 > width && current.height / 2 > height) {
    const step: OffscreenCanvas = new OffscreenCanvas(
      Math.round(current.width / 2),
      Math.round(current.height / 2)
    );
    const stepCtx = context2d(step);
    stepCtx.imageSmoothingQuality = "high";
    stepCtx.drawImage(current, 0, 0, step.width, step.height);
    current = step;
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = context2d(canvas);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(current, 0, 0, width, height);
  return canvas;
}

function drawThumbnail(bitmap: ImageBitmap): OffscreenCanvas | undefined {
  const scale = THUMBNAIL_EDGE / Math.min(bitmap.width, bitmap.height);
  if (scale >= 1) return undefined;
  return drawScaled(
    bitmap,
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale)
  );
}

async function encodeThumbnail(canvas: OffscreenCanvas): Promise<Blob> {
  const type = (await supportsNativeEncoding("webp")) ? "image/webp" : "image/png";
  return canvas.convertToBlob({ type, quality: 0.8 });
}

/**
 * Process an image: resize and convert to the target format.
 */
export async function processImage(
  file: File,
  options: ProcessOptions
): Promise<ProcessResult> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width: originalWidth, height: originalHeight } = bitmap;
  const { width, height } = calculateDimensions(
    originalWidth,
    originalHeight,
    options.maxDimension
  );

  let canvas: OffscreenCanvas;
  let preview: OffscreenCanvas | undefined;
  try {
    // JPEG has no alpha channel, so flatten onto white.
    canvas = drawScaled(
      bitmap,
      width,
      height,
      options.format === "jpeg" ? "#ffffff" : undefined
    );
    preview = drawThumbnail(bitmap);
  } finally {
    // Free the full-size decode before encoding, which is memory-hungry too.
    bitmap.close();
  }

  const [blob, thumbnail] = await Promise.all([
    encodeCanvas(canvas, options.format, options.quality),
    preview && encodeThumbnail(preview),
  ]);

  const type = FORMAT_MIME[options.format];
  const encoded: EncodedFile = {
    blob,
    type,
    extension: extensionForMimeType(type),
  };
  const dimensions = {
    width,
    height,
    originalWidth,
    originalHeight,
    originalSize: file.size,
  };

  // Without a resize a bigger file has no benefit, so keep the original bytes,
  // but hold on to the conversion in case the user wants that format anyway.
  const resized = width !== originalWidth || height !== originalHeight;
  if (!resized && blob.size >= file.size) {
    return {
      ...dimensions,
      blob: file,
      outputType: file.type || type,
      outputExtension: originalExtension(file),
      keptOriginal: true,
      converted: file.type === type ? undefined : encoded,
      thumbnail,
    };
  }

  return {
    ...dimensions,
    blob,
    outputType: type,
    outputExtension: encoded.extension,
    keptOriginal: false,
    thumbnail,
  };
}
