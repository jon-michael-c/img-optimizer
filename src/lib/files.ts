const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
]);
const IMAGE_EXTENSION = /\.(png|jpe?g|webp|avif|gif)$/i;

export const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/avif,image/gif,.png,.jpg,.jpeg,.webp,.avif,.gif";

export function isImageFile(file: File): boolean {
  return IMAGE_TYPES.has(file.type) || IMAGE_EXTENSION.test(file.name);
}

/** Upper-case extension label for display, e.g. "photo.jpeg" -> "JPEG". */
export function extensionLabel(nameOrExtension: string): string {
  const match = /\.([^.]+)$/.exec(nameOrExtension);
  return match ? match[1].toUpperCase() : "";
}

/** Collect image files from a drop, including files inside dropped folders. */
export async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const files: File[] = [];
  const dirs: FileSystemDirectoryEntry[] = [];
  // Items are only readable synchronously, before the drop handler yields.
  for (const item of Array.from(dt.items)) {
    if (item.kind !== "file") continue;
    const entry = item.webkitGetAsEntry?.();
    if (entry?.isDirectory) {
      dirs.push(entry as FileSystemDirectoryEntry);
      continue;
    }
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  await Promise.all(dirs.map((dir) => readDirectory(dir, files)));
  return files.filter(isImageFile);
}

async function readDirectory(
  dir: FileSystemDirectoryEntry,
  out: File[]
): Promise<void> {
  const reader = dir.createReader();
  // readEntries returns results in batches; keep reading until it's empty.
  for (;;) {
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject)
    );
    if (entries.length === 0) return;
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.isDirectory) {
          await readDirectory(entry as FileSystemDirectoryEntry, out);
        } else if (entry.isFile) {
          const file = await new Promise<File>((resolve, reject) =>
            (entry as FileSystemFileEntry).file(resolve, reject)
          );
          if (isImageFile(file)) out.push(file);
        }
      })
    );
  }
}
