import { lazy, Suspense, useState } from "react";
import type { ImageItem } from "@/hooks/use-image-optimizer";
import {
  type OutputFormat,
  type ProcessOptions,
  type ProcessResult,
  sameOptions,
} from "@/lib/image-processor";
import { ImageCard } from "./image-card";
import { ImageDropzone } from "./image-dropzone";

const ImageLightbox = lazy(() =>
  import("./image-lightbox").then((m) => ({ default: m.ImageLightbox }))
);
const ImageEditor = lazy(() =>
  import("./image-editor").then((m) => ({ default: m.ImageEditor }))
);

interface ImageGridProps {
  items: ImageItem[];
  options: ProcessOptions;
  alwaysConvert: boolean;
  dragging: boolean;
  formatSupport: Record<OutputFormat, boolean>;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onOptimize: (id: string) => void;
  onApplyEdit: (id: string, result: ProcessResult) => void;
  onPreferConverted: (id: string, value: boolean) => void;
}

export function ImageGrid({
  items,
  options,
  alwaysConvert,
  dragging,
  formatSupport,
  onAddFiles,
  onRemove,
  onOptimize,
  onApplyEdit,
  onPreferConverted,
}: ImageGridProps) {
  // Store ids, not items, so open dialogs always show the latest state.
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [editorId, setEditorId] = useState<string | null>(null);
  const lightboxItem = items.find((i) => i.id === lightboxId);
  const editorItem = items.find((i) => i.id === editorId);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="animate-card-in"
            style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
          >
            <ImageCard
              item={item}
              isStale={
                item.status === "done" &&
                !sameOptions(item.optimizedWith, options)
              }
              alwaysConvert={alwaysConvert}
              onRemove={onRemove}
              onOptimize={onOptimize}
              onOpen={setLightboxId}
              onEdit={setEditorId}
              onPreferConverted={onPreferConverted}
            />
          </div>
        ))}
        <div className="animate-card-in">
          <ImageDropzone variant="tile" onFiles={onAddFiles} dragging={dragging} />
        </div>
      </div>

      <Suspense fallback={null}>
        {lightboxItem && (
          <ImageLightbox
            item={lightboxItem}
            alwaysConvert={alwaysConvert}
            onPreferConverted={onPreferConverted}
            onClose={() => setLightboxId(null)}
          />
        )}
        {editorItem && (
          <ImageEditor
            item={editorItem}
            open
            onOpenChange={(open) => {
              if (!open) setEditorId(null);
            }}
            onApply={onApplyEdit}
            formatSupport={formatSupport}
          />
        )}
      </Suspense>
    </>
  );
}
