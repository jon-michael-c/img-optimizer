import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ImageItem } from "@/hooks/use-image-optimizer";
import { cn, formatBytes, formatPercent, getSavings } from "@/lib/utils";
import { GripVertical } from "lucide-react";

interface ImageLightboxProps {
  item: ImageItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({
  item,
  open,
  onOpenChange,
}: ImageLightboxProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const hasResult = item?.status === "done" && item?.result;

  useEffect(() => {
    if (hasResult && item?.result) {
      const blob = item.result.blob;
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setResultUrl(null);
      };
    }
    setResultUrl(null);
    return undefined;
  }, [hasResult, item?.id]);

  useEffect(() => {
    if (!open) setPosition(50);
  }, [open]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setPosition(pct);
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-[95vw] overflow-hidden p-0 sm:max-w-[90vw]"
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="truncate pr-8" title={item.file.name}>
            {item.file.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 pb-6">
          {hasResult && resultUrl ? (
            <>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  Before:{" "}
                  <span className="font-medium text-foreground">
                    {formatBytes(item.result!.originalSize)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  After:{" "}
                  <span className="font-medium text-foreground">
                    {formatBytes(item.result!.blob.size)}
                  </span>
                </span>
                {(() => {
                  const s = getSavings(
                    item.result!.originalSize,
                    item.result!.blob.size
                  );
                  return item.result!.keptOriginal ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                      Already optimal
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/95 px-2 py-0.5 font-semibold text-white">
                      {formatPercent(s.percent)}
                    </span>
                  );
                })()}
              </div>
              <div
                ref={containerRef}
                className="relative aspect-auto max-h-[70vh] w-full overflow-hidden rounded-md bg-muted"
              >
                {/* After (optimized) - full image */}
                <img
                  src={resultUrl}
                  alt={`Optimized: ${item.file.name}`}
                  className="size-full object-contain"
                />
                {/* Before (original) - clipped by position */}
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath: `inset(0 ${100 - position}% 0 0)`,
                  }}
                >
                  <img
                    src={item.previewUrl}
                    alt={`Original: ${item.file.name}`}
                    className="size-full object-contain"
                  />
                </div>
                {/* Slider handle */}
                <div
                  className={cn(
                    "absolute top-0 bottom-0 z-10 flex w-1 cursor-ew-resize items-center justify-center bg-primary/80 transition-colors hover:bg-primary",
                    isDragging && "bg-primary"
                  )}
                  style={{ left: `${position}%`, transform: "translateX(-50%)" }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  role="slider"
                  aria-label="Compare before and after"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(position)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 10 : 2;
                    if (e.key === "ArrowLeft")
                      setPosition((p) => Math.max(0, p - step));
                    if (e.key === "ArrowRight")
                      setPosition((p) => Math.min(100, p + step));
                  }}
                >
                  <div className="flex size-8 items-center justify-center rounded-full border-2 border-primary bg-background shadow-sm">
                    <GripVertical className="size-4 text-primary" />
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Drag the slider to compare before (left) and after (right)
              </p>
            </>
          ) : (
            <div className="flex max-h-[70vh] items-center justify-center overflow-hidden rounded-md bg-muted">
              <img
                src={item.previewUrl}
                alt={item.file.name}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
