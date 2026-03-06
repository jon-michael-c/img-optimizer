import { saveAs } from "file-saver";
import JSZip from "jszip";
import type { OutputFormat } from "./image-processor";
import { getOutputExtension } from "./image-processor";

export interface ProcessedImage {
  file: File;
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Download a single processed image.
 */
export function downloadSingle(
  blob: Blob,
  originalFileName: string,
  format: OutputFormat
): void {
  const baseName = originalFileName.replace(/\.[^.]+$/, "");
  const ext = getOutputExtension(format);
  const fileName = `${baseName}${ext}`;
  saveAs(blob, fileName);
}

/**
 * Download multiple processed images as a ZIP file.
 */
export async function downloadAsZip(
  images: ProcessedImage[],
  format: OutputFormat,
  zipFileName = "optimized-images.zip"
): Promise<void> {
  const zip = new JSZip();
  const ext = getOutputExtension(format);

  for (let i = 0; i < images.length; i++) {
    const { file, blob } = images[i];
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const name = images.length > 1 ? `${baseName}-${i + 1}${ext}` : `${baseName}${ext}`;
    zip.file(name, blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, zipFileName);
}
