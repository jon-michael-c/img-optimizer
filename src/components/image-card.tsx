import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ImageItem } from "@/hooks/use-image-optimizer";
import { downloadSingle } from "@/lib/download";
import { cn, formatBytes, formatPercent, getSavings } from "@/lib/utils";
import {
  Loader2,
  Trash2,
  Download,
  AlertCircle,
  Check,
  ArrowRight,
  Minus,
  TrendingUp,
} from "lucide-react";

interface ImageCardProps {
  item: ImageItem;
  onRemove: (id: string) => void;
  onImageClick?: (item: ImageItem) => void;
}

export function ImageCard({ item, onRemove, onImageClick }: ImageCardProps) {
  const { status, result } = item;
  const isDone = status === "done" && result;
  const savings = isDone ? getSavings(result.originalSize, result.blob.size) : null;
  const clickable = onImageClick && status !== "processing";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      {/* Image / preview */}
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden bg-muted",
          clickable && "cursor-zoom-in"
        )}
        onClick={() => clickable && onImageClick?.(item)}
        onKeyDown={(e) => {
          if (clickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onImageClick?.(item);
          }
        }}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? `Compare ${item.file.name}` : undefined}
      >
        {status === "processing" ? (
          <div className="flex size-full items-center justify-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <img
            src={item.previewUrl}
            alt={item.file.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/15 backdrop-blur-[1px]">
            <AlertCircle className="size-7 text-destructive" />
            <span className="text-xs font-medium text-destructive">Failed</span>
          </div>
        )}

        {/* Savings badge */}
        {isDone && savings && (
          <div className="absolute left-2 top-2">
            {result.keptOriginal ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur">
                <Minus className="size-3" />
                Already optimal
              </span>
            ) : savings.saved > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                <Check className="size-3" />
                {formatPercent(savings.percent)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                <TrendingUp className="size-3" />
                {formatPercent(savings.percent)}
              </span>
            )}
          </div>
        )}

        {/* Remove button */}
        <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-7 rounded-full bg-background/90 shadow-sm backdrop-blur hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                  aria-label="Remove image"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p
          className="truncate text-sm font-medium leading-tight"
          title={item.file.name}
        >
          {item.file.name}
        </p>

        {isDone ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{formatBytes(result.originalSize)}</span>
            <ArrowRight className="size-3 shrink-0" />
            <span
              className={cn(
                "font-medium",
                savings && savings.saved < 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground"
              )}
            >
              {formatBytes(result.blob.size)}
            </span>
            <span className="ml-auto tabular-nums">
              {result.width}&times;{result.height}
            </span>
          </div>
        ) : status === "error" ? (
          <p className="truncate text-xs text-destructive" title={item.error}>
            {item.error ?? "Could not process this image"}
          </p>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{formatBytes(item.file.size)}</span>
            <span className="ml-auto capitalize">
              {status === "processing" ? "Optimizing\u2026" : "Pending"}
            </span>
          </div>
        )}

        {isDone && (
          <Button
            variant="outline"
            size="sm"
            className="mt-auto w-full"
            onClick={() =>
              downloadSingle(result.blob, item.file.name, result.outputExtension)
            }
          >
            <Download className="mr-2 size-4" />
            Download
          </Button>
        )}
      </div>
    </div>
  );
}
