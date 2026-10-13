export interface ProcessedImage {
  file: File;
  blob: Blob;
  outputExtension: string;
}

/** Save a blob through a temporary download link. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can abort the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
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
  saveBlob(blob, `${baseName}${outputExtension}`);
}

/**
 * Download multiple processed images as a ZIP file. Each image keeps its own
 * output extension (some may have been preserved in their original format).
 */
export async function downloadAsZip(
  images: ProcessedImage[],
  zipFileName = "optimized-images.zip"
): Promise<void> {
  const { default: JSZip } = await import("jszip");
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
  saveBlob(content, zipFileName);
}
