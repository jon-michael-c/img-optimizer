import { useState } from "react";
import type { ImageItem } from "@/hooks/use-image-optimizer";
import type { OutputFormat } from "@/lib/image-processor";
import { ImageCard } from "./image-card";
import { ImageLightbox } from "./image-lightbox";

interface ImageGridProps {
  items: ImageItem[];
  format: OutputFormat;
  onRemove: (id: string) => void;
}

export function ImageGrid({ items, format, onRemove }: ImageGridProps) {
  const [lightboxItem, setLightboxItem] = useState<ImageItem | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (items.length === 0) return null;

  const handleImageClick = (item: ImageItem) => {
    setLightboxItem(item);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <ImageCard
            key={item.id}
            item={item}
            format={format}
            onRemove={onRemove}
            onImageClick={handleImageClick}
          />
        ))}
      </div>
      <ImageLightbox
        item={lightboxItem}
        open={lightboxOpen}
        onOpenChange={(open) => {
          setLightboxOpen(open);
          if (!open) setLightboxItem(null);
        }}
      />
    </>
  );
}
