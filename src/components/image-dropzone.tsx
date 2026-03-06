import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { ImagePlus } from "lucide-react";

interface ImageDropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

export function ImageDropzone({
  onFiles,
  disabled,
  className,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files) return;
      const arr = Array.from(files);
      const imageFiles = arr.filter(
        (f) =>
          f.type.startsWith("image/") ||
          /\.(png|jpg|jpeg|webp|avif|gif)$/i.test(f.name)
      );
      if (imageFiles.length > 0) {
        onFiles(imageFiles);
      }
    },
    [onFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      const items = e.dataTransfer?.items;
      if (items) {
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry?.() ?? items[i];
          if (typeof (entry as FileSystemEntry).isDirectory === "function") {
            const dirEntry = entry as FileSystemDirectoryEntry;
            if (dirEntry.isDirectory) {
              readDirectory(dirEntry, files);
              continue;
            }
          }
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
        handleFiles(files);
      } else {
        handleFiles(e.dataTransfer?.files ?? []);
      }
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        e.currentTarget.setAttribute("data-drag", "true");
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.currentTarget.removeAttribute("data-drag");
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-12 text-center transition-colors",
        "hover:border-primary/50 hover:bg-muted/50",
        "data-[drag=true]:border-primary data-[drag=true]:bg-muted/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif,.png,.jpg,.jpeg,.webp,.avif,.gif"
        multiple
        className="sr-only"
        onChange={handleInputChange}
      />
      <ImagePlus className="mb-3 size-12 text-muted-foreground" />
      <p className="mb-1 text-sm font-medium text-foreground">
        Drop images here or click to browse
      </p>
      <p className="text-xs text-muted-foreground">
        PNG, JPG, WebP, AVIF, GIF • Folders supported
      </p>
    </div>
  );
}

async function readDirectory(
  dir: FileSystemDirectoryEntry,
  out: File[]
): Promise<void> {
  const reader = dir.createReader();
  const read = (): Promise<void> =>
    new Promise((resolve, reject) => {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            resolve();
            return;
          }
          Promise.all(
            entries.map((entry) => {
              if (entry.isFile) {
                return new Promise<void>((res, rej) => {
                  (entry as FileSystemFileEntry).file(
                    (file) => {
                      if (
                        file.type.startsWith("image/") ||
                        /\.(png|jpg|jpeg|webp|avif|gif)$/i.test(file.name)
                      ) {
                        out.push(file);
                      }
                      res();
                    },
                    (err) => rej(err)
                  );
                });
              }
              if (entry.isDirectory) {
                return readDirectory(entry as FileSystemDirectoryEntry, out);
              }
              return Promise.resolve();
            })
          )
            .then(() => read())
            .then(resolve)
            .catch(reject);
        },
        (err) => reject(err)
      );
    });
  await read();
}
