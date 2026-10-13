import { useRef } from "react";
import { IMAGE_ACCEPT, isImageFile } from "@/lib/files";
import { cn } from "@/lib/utils";
import { ImagePlus, Plus } from "lucide-react";

interface ImageDropzoneProps {
  onFiles: (files: File[]) => void;
  /** "hero" is the large empty-state target; "tile" sits at the end of the grid. */
  variant?: "hero" | "tile";
  /** Files are being dragged over the page (drops are handled globally). */
  dragging?: boolean;
}

export function ImageDropzone({
  onFiles,
  variant = "hero",
  dragging,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(isImageFile);
    if (files.length > 0) onFiles(files);
    e.target.value = "";
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={IMAGE_ACCEPT}
      multiple
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={handleChange}
    />
  );

  if (variant === "tile") {
    return (
      <>
        {input}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          data-drag={dragging || undefined}
          className={cn(
            "group flex size-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 text-sm font-medium text-muted-foreground transition-colors",
            "hover:border-brand/50 hover:bg-brand/5 hover:text-foreground",
            "data-[drag]:border-brand data-[drag]:bg-brand/5 data-[drag]:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-brand/10 group-hover:text-brand group-data-[drag]:bg-brand/10 group-data-[drag]:text-brand">
            <Plus className="size-5" />
          </span>
          Add images
        </button>
      </>
    );
  }

  return (
    <>
      {input}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        data-drag={dragging || undefined}
        className={cn(
          "group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-card/60 px-6 py-14 text-center transition-all duration-300 sm:py-20",
          "hover:border-brand/50 hover:bg-brand/5",
          "data-[drag]:scale-[1.01] data-[drag]:border-brand data-[drag]:bg-brand/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <span className="pointer-events-none absolute -top-20 left-1/2 size-64 -translate-x-1/2 rounded-full bg-gradient-brand opacity-10 blur-3xl transition-opacity duration-500 group-hover:opacity-20 group-data-[drag]:opacity-30" />
        <span className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-brand/30 transition-transform duration-300 group-hover:-translate-y-1 group-data-[drag]:scale-110">
          <ImagePlus className="size-8" />
        </span>
        <span className="relative block text-base font-semibold">
          Drop images here
        </span>
        <span className="relative mt-1 block text-sm text-muted-foreground">
          or{" "}
          <span className="text-gradient-brand font-semibold">
            browse your files
          </span>
        </span>
        <span className="relative mt-5 block text-xs text-muted-foreground">
          PNG, JPG, WebP, AVIF, GIF &middot; folders and paste work too
        </span>
      </button>
    </>
  );
}
