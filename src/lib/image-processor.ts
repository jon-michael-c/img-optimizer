export type OutputFormat = "webp" | "avif" | "jpeg";

export interface ProcessOptions {
  format: OutputFormat;
  quality: number;
  maxDimension: number;
}

export interface ProcessResult {
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export function isImageFile(file: File): boolean {
  return IMAGE_MIME_TYPES.some((t) => file.type === t) || /\.(png|jpg|jpeg|webp|avif|gif)$/i.test(file.name);
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

function getMimeType(format: OutputFormat): string {
  switch (format) {
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "jpeg":
      return "image/jpeg";
    default:
      return "image/webp";
  }
}

/**
 * Check if the browser supports a given output format.
 */
export async function supportsFormat(format: OutputFormat): Promise<boolean> {
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 1, 1);

  const mimeType = getMimeType(format);
  try {
    const blob = await canvas.convertToBlob({
      type: mimeType,
      quality: 0.8,
    });
    return blob !== null && blob.type === mimeType;
  } catch {
    return false;
  }
}

/**
 * Process an image: resize and convert to the target format.
 */
export async function processImage(
  file: File,
  options: ProcessOptions
): Promise<ProcessResult> {
  const bitmap = await createImageBitmap(file);
  const { width: origWidth, height: origHeight } = bitmap;

  const { width, height } = calculateDimensions(
    origWidth,
    origHeight,
    options.maxDimension
  );

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2D context");
  }

  // For JPEG (no alpha), fill with white background first
  if (options.format === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mimeType = getMimeType(options.format);
  let blob = await canvas.convertToBlob({
    type: mimeType,
    quality: options.quality / 100,
  });

  // Fallback: if AVIF fails, try WebP
  if (!blob && options.format === "avif") {
    blob = await canvas.convertToBlob({
      type: "image/webp",
      quality: options.quality / 100,
    });
  }

  if (!blob) {
    throw new Error(`Failed to encode image as ${options.format}`);
  }

  return {
    blob,
    width,
    height,
    originalWidth: origWidth,
    originalHeight: origHeight,
  };
}

export function getOutputExtension(format: OutputFormat): string {
  switch (format) {
    case "webp":
      return ".webp";
    case "avif":
      return ".avif";
    case "jpeg":
      return ".jpg";
    default:
      return ".webp";
  }
}
