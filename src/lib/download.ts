import { saveAs } from "file-saver";
import JSZip from "jszip";

export interface ProcessedImage {
  file: File;
  blob: Blob;
  outputExtension: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Download a single processed image, using the extension chosen for that result.
 */
export function downloadSingle(
  blob: Blob,
  originalFileName: string,
  outputExtension: string
): void {
  const baseName = originalFileName.replace(/\.[^.]+$/, "");
  const fileName = `${baseName}${outputExtension}`;
  saveAs(blob, fileName);
}

/**
 * Download multiple processed images as a ZIP file. Each image keeps its own
 * output extension (some may have been preserved in their original format).
 */
export async function downloadAsZip(
  images: ProcessedImage[],
  zipFileName = "optimized-images.zip"
): Promise<void> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const { file, blob, outputExtension } of images) {
    const baseName = file.name.replace(/\.[^.]+$/, "");
    let name = `${baseName}${outputExtension}`;
    let counter = 1;
    while (usedNames.has(name)) {
      name = `${baseName}-${counter}${outputExtension}`;
      counter++;
    }
    usedNames.add(name);
    zip.file(name, blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, zipFileName);
}
