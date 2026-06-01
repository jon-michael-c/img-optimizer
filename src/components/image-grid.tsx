import { useState } from "react";
import type { ImageItem } from "@/hooks/use-image-optimizer";
import { ImageCard } from "./image-card";
import { ImageLightbox } from "./image-lightbox";

interface ImageGridProps {
  items: ImageItem[];
  onRemove: (id: string) => void;
}

export function ImageGrid({ items, onRemove }: ImageGridProps) {
  const [lightboxItem, setLightboxItem] = useState<ImageItem | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (items.length === 0) return null;

  const handleImageClick = (item: ImageItem) => {
    setLightboxItem(item);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
        {items.map((item) => (
          <ImageCard
            key={item.id}
            item={item}
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
