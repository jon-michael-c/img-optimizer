import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import type { ImageItem } from "@/hooks/use-image-optimizer";
import type { ProcessResult, OutputFormat } from "@/lib/image-processor";
import {
  type EditFormat,
  type EditOptions,
  buildEditResult,
  computeOutputSize,
  defaultEditOptions,
  isLossless,
  renderToBlob,
} from "@/lib/image-editor";
import { cn, formatBytes, formatPercent, getSavings } from "@/lib/utils";
import { saveBlob } from "@/lib/download";
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Lock,
  Unlock,
  Download,
  Check,
  RefreshCw,
  Loader2,
  Columns2,
  Image as ImageIcon,
  GripVertical,
  X,
} from "lucide-react";

interface ImageEditorProps {
  item: ImageItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (id: string, result: ProcessResult) => void;
  formatSupport?: Record<OutputFormat, boolean>;
}

const FORMATS: { value: EditFormat; label: string }[] = [
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
];

export function ImageEditor({
  item,
  open,
  onOpenChange,
  onApply,
  formatSupport,
}: ImageEditorProps) {
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [src, setSrc] = useState({ width: 0, height: 0 });
  const [options, setOptions] = useState<EditOptions>(
    defaultEditOptions(0, 0)
  );
  const [lockAspect, setLockAspect] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const [encoding, setEncoding] = useState(false);
  const [compare, setCompare] = useState(false);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  // Decode the source once when the editor opens.
  useEffect(() => {
    if (!open || !item) return;
    let cancelled = false;
    (async () => {
      try {
        const bmp = await createImageBitmap(item.file);
        if (cancelled) {
          bmp.close();
          return;
        }
        bitmapRef.current = bmp;
        setSrc({ width: bmp.width, height: bmp.height });
        setOptions(defaultEditOptions(bmp.width, bmp.height));
        setLockAspect(true);
        setCompare(false);
        setPosition(50);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
      setPreviewUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
      setOutputSize(null);
    };
  }, [open, item]);

  // Debounced live re-encode whenever options change.
  useEffect(() => {
    const bmp = bitmapRef.current;
    if (!open || !bmp) return;
    const id = ++reqId.current;
    setEncoding(true);
    const t = setTimeout(async () => {
      try {
        const out = await renderToBlob(bmp, options);
        if (id !== reqId.current) return;
        const url = URL.createObjectURL(out.blob);
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
        setOutputSize(out.blob.size);
      } catch {
        /* ignore transient encode errors */
      } finally {
        if (id === reqId.current) setEncoding(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [open, options]);

  const baseSize = useMemo(() => {
    const rotated = options.rotate === 90 || options.rotate === 270;
    return {
      width: rotated ? src.height : src.width,
      height: rotated ? src.width : src.height,
    };
  }, [src, options.rotate]);

  const outDims = useMemo(
    () =>
      src.width > 0
        ? computeOutputSize(src.width, src.height, options)
        : { width: 0, height: 0 },
    [src, options]
  );

  const update = useCallback((patch: Partial<EditOptions>) => {
    setOptions((o) => ({ ...o, ...patch }));
  }, []);

  const setWidth = useCallback(
    (w: number) => {
      if (w <= 0) return update({ width: w });
      if (lockAspect && baseSize.width > 0) {
        const ratio = baseSize.height / baseSize.width;
        update({ width: w, height: Math.max(1, Math.round(w * ratio)) });
      } else {
        update({ width: w });
      }
    },
    [lockAspect, baseSize, update]
  );

  const setHeight = useCallback(
    (h: number) => {
      if (h <= 0) return update({ height: h });
      if (lockAspect && baseSize.height > 0) {
        const ratio = baseSize.width / baseSize.height;
        update({ height: h, width: Math.max(1, Math.round(h * ratio)) });
      } else {
        update({ height: h });
      }
    },
    [lockAspect, baseSize, update]
  );

  const scaleTo = useCallback(
    (pct: number) => {
      update({
        width: Math.max(1, Math.round(baseSize.width * pct)),
        height: Math.max(1, Math.round(baseSize.height * pct)),
      });
    },
    [baseSize, update]
  );

  const rotateBy = useCallback(
    (dir: 1 | -1) => {
      setOptions((o) => {
        const next = (((o.rotate + dir * 90) % 360) + 360) % 360 as
          | 0
          | 90
          | 180
          | 270;
        // Swap explicit width/height so the chosen size follows the rotation.
        return { ...o, rotate: next, width: o.height, height: o.width };
      });
    },
    []
  );

  const reset = useCallback(() => {
    setOptions(defaultEditOptions(src.width, src.height));
    setLockAspect(true);
  }, [src]);

  const handleApply = useCallback(async () => {
    const bmp = bitmapRef.current;
    if (!bmp || !item) return;
    const result = await buildEditResult(
      item.file,
      bmp,
      src.width,
      src.height,
      options
    );
    onApply(item.id, result);
    onOpenChange(false);
  }, [item, options, src, onApply, onOpenChange]);

  const handleDownload = useCallback(async () => {
    const bmp = bitmapRef.current;
    if (!bmp || !item) return;
    const result = await buildEditResult(
      item.file,
      bmp,
      src.width,
      src.height,
      options
    );
    const base = item.file.name.replace(/\.[^.]+$/, "");
    saveBlob(result.blob, `${base}-edited${result.outputExtension}`);
  }, [item, options, src]);

  // Compare slider handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
      );
      setPosition(pct);
    },
    [isDragging]
  );
  const onPointerUp = useCallback(() => setIsDragging(false), []);

  if (!item) return null;

  const savings =
    outputSize !== null ? getSavings(item.file.size, outputSize) : null;
  const lossless = isLossless(options.format);
  const showBackground = options.format === "jpeg" || options.flatten;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,72rem)]"
      >
        <DialogHeader className="flex-row items-center gap-3 border-b px-5 py-3.5 space-y-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-white">
            <ImageIcon className="size-4" />
          </div>
          <DialogTitle
            className="min-w-0 flex-1 truncate text-left leading-normal"
            title={item.file.name}
          >
            {item.file.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Change the format, size, orientation and colors of this image.
          </DialogDescription>
          <span className="hidden shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums sm:inline">
            {src.width || "\u2013"} &times; {src.height || "\u2013"}
          </span>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mr-2 shrink-0 text-muted-foreground"
              aria-label="Close"
            >
              <X />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Preview */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-lg border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setCompare(false)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    !compare
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ImageIcon className="size-3.5" /> Result
                </button>
                <button
                  type="button"
                  onClick={() => setCompare(true)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    compare
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Columns2 className="size-3.5" /> Compare
                </button>
              </div>
              {encoding && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Rendering
                </span>
              )}
            </div>

            <div
              ref={containerRef}
              className="relative flex min-h-[240px] flex-1 items-center justify-center overflow-hidden rounded-lg"
              style={{
                backgroundImage:
                  "repeating-conic-gradient(oklch(0.7 0 0 / 0.12) 0% 25%, transparent 0% 50%)",
                backgroundSize: "20px 20px",
              }}
            >
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="Edited preview"
                    className="max-h-[56vh] max-w-full object-contain"
                  />
                  {compare && (
                    <>
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
                      >
                        <img
                          src={item.previewUrl}
                          alt="Original"
                          className="max-h-[56vh] max-w-full object-contain"
                        />
                      </div>
                      <div
                        className={cn(
                          "absolute inset-y-0 z-10 flex w-1 cursor-ew-resize items-center justify-center bg-primary/80 transition-colors hover:bg-primary",
                          isDragging && "bg-primary"
                        )}
                        style={{
                          left: `${position}%`,
                          transform: "translateX(-50%)",
                        }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerLeave={onPointerUp}
                        role="slider"
                        aria-label="Compare original and edited"
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
                      <span className="absolute left-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur">
                        Original
                      </span>
                      <span className="absolute right-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur">
                        Edited
                      </span>
                    </>
                  )}
                </>
              ) : (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Size readout */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">
                Original:{" "}
                <span className="font-medium text-foreground">
                  {formatBytes(item.file.size)}
                </span>
              </span>
              <span className="text-muted-foreground">
                Edited:{" "}
                <span className="font-medium text-foreground">
                  {outputSize !== null ? formatBytes(outputSize) : "\u2026"}
                </span>
              </span>
              <span className="text-muted-foreground">
                {outDims.width} &times; {outDims.height}
              </span>
              {savings && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 font-semibold",
                    savings.saved >= 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {formatPercent(savings.percent)}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="w-full shrink-0 space-y-5 overflow-y-auto border-t p-4 md:w-80 md:border-l md:border-t-0">
            {/* Format */}
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {FORMATS.map((f) => {
                  const supported =
                    f.value === "png" ||
                    (formatSupport?.[f.value as OutputFormat] ?? true);
                  const selected = options.format === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      disabled={!supported}
                      onClick={() => update({ format: f.value })}
                      className={cn(
                        "rounded-md border py-1.5 text-xs font-medium transition-colors",
                        selected
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground",
                        !supported && "cursor-not-allowed opacity-40"
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quality */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Quality</Label>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {lossless ? "Lossless" : `${options.quality}%`}
                </span>
              </div>
              <Slider
                value={[options.quality]}
                onValueChange={([v]) => update({ quality: v ?? 80 })}
                min={1}
                max={99}
                step={1}
                disabled={lossless}
                className={cn(lossless && "opacity-50")}
              />
            </div>

            <Separator />

            {/* Resize */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label>Resize</Label>
                <button
                  type="button"
                  onClick={() => setLockAspect((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  aria-pressed={lockAspect}
                >
                  {lockAspect ? (
                    <Lock className="size-3.5" />
                  ) : (
                    <Unlock className="size-3.5" />
                  )}
                  {lockAspect ? "Locked" : "Free"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min={1}
                    value={outDims.width || ""}
                    onChange={(e) => setWidth(parseInt(e.target.value, 10) || 0)}
                    className="pr-7 text-sm"
                    aria-label="Width"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    W
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">&times;</span>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min={1}
                    value={outDims.height || ""}
                    onChange={(e) =>
                      setHeight(parseInt(e.target.value, 10) || 0)
                    }
                    className="pr-7 text-sm"
                    aria-label="Height"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    H
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {[0.25, 0.5, 1].map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    onClick={() => scaleTo(p)}
                  >
                    {p * 100}%
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Transform */}
            <div className="space-y-2">
              <Label>Transform</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => rotateBy(-1)}
                >
                  <RotateCcw className="mr-1.5 size-3.5" /> Left
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => rotateBy(1)}
                >
                  <RotateCw className="mr-1.5 size-3.5" /> Right
                </Button>
                <Button
                  variant={options.flipH ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => update({ flipH: !options.flipH })}
                >
                  <FlipHorizontal className="mr-1.5 size-3.5" /> Flip X
                </Button>
                <Button
                  variant={options.flipV ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => update({ flipV: !options.flipV })}
                >
                  <FlipVertical className="mr-1.5 size-3.5" /> Flip Y
                </Button>
              </div>
            </div>

            <Separator />

            {/* Adjustments */}
            <div className="space-y-3">
              <Label>Adjustments</Label>
              <AdjustSlider
                label="Brightness"
                value={options.brightness}
                onChange={(v) => update({ brightness: v })}
              />
              <AdjustSlider
                label="Contrast"
                value={options.contrast}
                onChange={(v) => update({ contrast: v })}
              />
              <AdjustSlider
                label="Saturation"
                value={options.saturate}
                onChange={(v) => update({ saturate: v })}
              />
            </div>

            {/* Background / flatten */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Background</Label>
                <button
                  type="button"
                  onClick={() => update({ flatten: !options.flatten })}
                  disabled={options.format === "jpeg"}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                    showBackground
                      ? "bg-brand/10 text-brand"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                    options.format === "jpeg" && "cursor-not-allowed opacity-70"
                  )}
                >
                  {showBackground ? "Flatten on" : "Flatten off"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={options.background}
                  onChange={(e) => update({ background: e.target.value })}
                  disabled={!showBackground}
                  className={cn(
                    "size-8 cursor-pointer rounded border bg-transparent",
                    !showBackground && "cursor-not-allowed opacity-50"
                  )}
                  aria-label="Background color"
                />
                <span className="text-xs text-muted-foreground">
                  {options.format === "jpeg"
                    ? "JPEG has no transparency"
                    : "Fills transparent areas"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t px-5 py-3">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RefreshCw className="mr-2 size-4" /> Reset
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 size-4" /> Download
            </Button>
            <Button
              size="sm"
              className="bg-gradient-brand text-white hover:opacity-95"
              onClick={handleApply}
            >
              <Check className="mr-2 size-4" /> Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdjustSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={() => onChange(100)}
          className="tabular-nums text-muted-foreground hover:text-foreground"
          title="Reset"
        >
          {value}%
        </button>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v ?? 100)}
        min={0}
        max={200}
        step={1}
      />
    </div>
  );
}
