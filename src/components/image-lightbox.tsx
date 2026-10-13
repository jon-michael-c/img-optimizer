import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VersionSwitch } from "@/components/version-switch";
import { getItemOutput, type ImageItem } from "@/hooks/use-image-optimizer";
import { extensionLabel } from "@/lib/files";
import { cn, formatBytes, formatPercent, getSavings } from "@/lib/utils";
import { GripVertical, X } from "lucide-react";

interface ImageLightboxProps {
  item: ImageItem;
  alwaysConvert: boolean;
  onPreferConverted: (id: string, value: boolean) => void;
  onClose: () => void;
}

const CHECKERBOARD: React.CSSProperties = {
  backgroundImage:
    "repeating-conic-gradient(oklch(0.7 0 0 / 0.12) 0% 25%, transparent 0% 50%)",
  backgroundSize: "20px 20px",
};

export function ImageLightbox({
  item,
  alwaysConvert,
  onPreferConverted,
  onClose,
}: ImageLightboxProps) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const output = getItemOutput(item, alwaysConvert);
  const result = output ? item.result : undefined;
  // A kept original would be compared with itself, so show its conversion.
  const compared = result?.keptOriginal ? result.converted : output;
  const savings =
    result && compared ? getSavings(result.originalSize, compared.blob.size) : null;

  const moveTo = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(
      Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(92vw,72rem)]"
      >
        <DialogHeader className="flex-row items-start gap-3 border-b px-5 py-3.5 text-left">
          <div className="min-w-0 flex-1 space-y-1">
            <DialogTitle className="truncate leading-normal" title={item.file.name}>
              {item.file.name}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span>
                Original{" "}
                <span className="font-medium text-foreground">
                  {formatBytes(item.file.size)}
                </span>
                {result && (
                  <span className="tabular-nums">
                    {" "}
                    &middot; {result.originalWidth}&times;{result.originalHeight}
                  </span>
                )}
              </span>
              {result && compared && (
                <span>
                  {extensionLabel(compared.extension)}{" "}
                  <span className="font-medium text-foreground">
                    {formatBytes(compared.blob.size)}
                  </span>
                  <span className="tabular-nums">
                    {" "}
                    &middot; {result.width}&times;{result.height}
                  </span>
                </span>
              )}
              {savings && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-semibold",
                    savings.saved > 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {formatPercent(savings.percent)}
                </span>
              )}
              {result?.keptOriginal && (
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                  Already optimal
                </span>
              )}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mr-2 -mt-0.5 shrink-0 text-muted-foreground"
              aria-label="Close"
            >
              <X />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-auto bg-muted/40 p-4">
          {result && compared ? (
            <>
              <div
                ref={containerRef}
                className="relative cursor-ew-resize touch-none select-none overflow-hidden rounded-md"
                style={{
                  ...CHECKERBOARD,
                  aspectRatio: `${result.originalWidth} / ${result.originalHeight}`,
                  width: `min(100%, calc(66vh * ${result.originalWidth / result.originalHeight}))`,
                }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging(true);
                  moveTo(e.clientX);
                }}
                onPointerMove={(e) => {
                  if (dragging) moveTo(e.clientX);
                }}
                onPointerUp={() => setDragging(false)}
                onPointerCancel={() => setDragging(false)}
              >
                <BlobImage
                  blob={compared.blob}
                  alt={`Optimized: ${item.file.name}`}
                  draggable={false}
                  className="absolute inset-0 size-full object-contain"
                />
                <div
                  className="absolute inset-0"
                  style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
                >
                  <img
                    src={item.previewUrl}
                    alt={`Original: ${item.file.name}`}
                    draggable={false}
                    className="size-full object-contain"
                  />
                </div>
                <span className="pointer-events-none absolute left-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur">
                  Original
                </span>
                <span className="pointer-events-none absolute right-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur">
                  {extensionLabel(compared.extension)}
                </span>
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label="Compare original and optimized"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(position)}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 10 : 2;
                    if (e.key === "ArrowLeft")
                      setPosition((p) => Math.max(0, p - step));
                    if (e.key === "ArrowRight")
                      setPosition((p) => Math.min(100, p + step));
                  }}
                  className={cn(
                    "absolute inset-y-0 z-10 flex w-1 -translate-x-1/2 items-center justify-center bg-primary/80 transition-colors focus-visible:outline-none",
                    dragging && "bg-primary"
                  )}
                  style={{ left: `${position}%` }}
                >
                  <div className="flex size-8 items-center justify-center rounded-full border-2 border-primary bg-background shadow-sm">
                    <GripVertical className="size-4 text-primary" />
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Drag across the image to compare
              </p>
            </>
          ) : (
            <img
              src={item.previewUrl}
              alt={item.file.name}
              className="max-h-[66vh] max-w-full rounded-md object-contain"
              style={CHECKERBOARD}
            />
          )}

          {output && result?.converted && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              Download as
              <VersionSwitch
                fileName={item.file.name}
                originalSize={result.originalSize}
                converted={result.converted}
                useConverted={output.isConverted}
                onChange={(value) => onPreferConverted(item.id, value)}
                className="w-44"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** An <img> for a Blob that owns its object URL for as long as it's shown. */
function BlobImage({ blob, ...props }: { blob: Blob } & React.ComponentProps<"img">) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return <img ref={ref} {...props} />;
}
