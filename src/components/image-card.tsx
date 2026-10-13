import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VersionSwitch } from "@/components/version-switch";
import { getItemOutput, type ImageItem } from "@/hooks/use-image-optimizer";
import { downloadSingle } from "@/lib/download";
import { extensionLabel } from "@/lib/files";
import { cn, formatBytes, formatPercent, getSavings } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  Download,
  Minus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";

interface ImageCardProps {
  item: ImageItem;
  isStale: boolean;
  alwaysConvert: boolean;
  onRemove: (id: string) => void;
  onOptimize: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onPreferConverted: (id: string, value: boolean) => void;
}

const PILL =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm";

export const ImageCard = memo(function ImageCard({
  item,
  isStale,
  alwaysConvert,
  onRemove,
  onOptimize,
  onOpen,
  onEdit,
  onPreferConverted,
}: ImageCardProps) {
  const { status, result } = item;
  const output = getItemOutput(item, alwaysConvert);
  const isBusy = status === "queued" || status === "processing";
  const savings =
    output && result ? getSavings(result.originalSize, output.blob.size) : null;
  const converted = output ? result?.converted : undefined;
  const optimizeLabel =
    status === "pending"
      ? "Optimize"
      : status === "error"
        ? "Retry"
        : isStale && status === "done"
          ? "Re-optimize"
          : null;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/5">
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          aria-label={`Preview ${item.file.name}`}
          className="block size-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <img
            src={item.thumbUrl ?? item.previewUrl}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className={cn(
              "size-full object-cover transition-all duration-500",
              status === "processing"
                ? "scale-105 blur-[2px] brightness-75"
                : "group-hover:scale-[1.04]",
              (status === "queued" || status === "pending") && "opacity-80"
            )}
          />
        </button>

        {status === "processing" && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Sweeping scan beam */}
            <div className="absolute inset-y-0 left-0 w-1/2 animate-scan-beam bg-gradient-to-r from-transparent via-white/70 to-transparent mix-blend-overlay" />
            {/* Tinted brand scrim */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand/40 via-transparent to-brand-2/30" />
            {/* Pulsing core */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span className="relative flex size-12 items-center justify-center">
                <span className="absolute inline-flex size-12 rounded-full bg-white/40 [animation:pulse-ring_1.6s_ease-out_infinite]" />
                <span className="absolute inline-flex size-12 rounded-full bg-white/30 [animation:pulse-ring_1.6s_ease-out_infinite_0.5s]" />
                <span className="relative flex size-10 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur">
                  <Zap className="size-5 animate-pulse text-brand" />
                </span>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white drop-shadow">
                Optimizing
              </span>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/15 backdrop-blur-[1px]">
            <AlertCircle className="size-7 text-destructive" />
            <span className="text-xs font-medium text-destructive">Failed</span>
          </div>
        )}

        {/* Status badge */}
        <div className="pointer-events-none absolute left-2 top-2">
          {status === "queued" && (
            <span className={cn(PILL, "bg-background/90 font-medium text-muted-foreground ring-1 ring-border backdrop-blur")}>
              <Clock className="size-3" />
              Queued
            </span>
          )}
          {output && savings &&
            (result?.keptOriginal && !output.isConverted ? (
              <span className={cn(PILL, "bg-background/90 font-medium text-muted-foreground ring-1 ring-border backdrop-blur")}>
                <Minus className="size-3" />
                Already optimal
              </span>
            ) : savings.saved > 0 ? (
              <span className={cn(PILL, "bg-emerald-500/95 text-white")}>
                <Check className="size-3" />
                {formatPercent(savings.percent)}
              </span>
            ) : (
              <span className={cn(PILL, "bg-amber-500/95 text-white")}>
                <TrendingUp className="size-3" />
                {formatPercent(savings.percent)}
              </span>
            ))}
        </div>

        {status === "done" && isStale && (
          <div className="pointer-events-none absolute bottom-2 left-2">
            <span className={cn(PILL, "bg-amber-500/95 font-medium text-white")}>
              Settings changed
            </span>
          </div>
        )}

        {/* Hover actions (always visible on touch screens) */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
          {!isBusy && (
            <CardAction label="Advanced edit" onClick={() => onEdit(item.id)}>
              <SlidersHorizontal className="size-3.5" />
            </CardAction>
          )}
          {optimizeLabel && (
            <CardAction label={optimizeLabel} onClick={() => onOptimize(item.id)}>
              {status === "pending" ? (
                <Zap className="size-3.5" />
              ) : (
                <RotateCcw className="size-3.5" />
              )}
            </CardAction>
          )}
          <CardAction label="Remove" onClick={() => onRemove(item.id)}>
            <Trash2 className="size-3.5" />
          </CardAction>
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

        {output && result && savings ? (
          <div
            className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground"
            title={`${result.originalWidth}\u00d7${result.originalHeight} \u2192 ${result.width}\u00d7${result.height}`}
          >
            <span>{formatBytes(result.originalSize)}</span>
            <ArrowRight className="size-3 shrink-0" />
            <span
              className={cn(
                "font-medium",
                savings.saved < 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground"
              )}
            >
              {formatBytes(output.blob.size)}
            </span>
          </div>
        ) : status === "error" ? (
          <p className="truncate text-xs text-destructive" title={item.error}>
            {item.error ?? "Could not process this image"}
          </p>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{formatBytes(item.file.size)}</span>
            <span className="ml-auto">
              {status === "processing"
                ? "Optimizing\u2026"
                : status === "queued"
                  ? "Queued"
                  : "Pending"}
            </span>
          </div>
        )}

        {output && result && converted && (
          <VersionSwitch
            fileName={item.file.name}
            originalSize={result.originalSize}
            converted={converted}
            useConverted={output.isConverted}
            onChange={(value) => onPreferConverted(item.id, value)}
          />
        )}

        {output && (
          <Button
            variant="outline"
            size="sm"
            className="mt-auto w-full"
            onClick={() =>
              downloadSingle(output.blob, item.file.name, output.extension)
            }
          >
            <Download className="size-4" />
            Download
            <span className="text-xs font-normal text-muted-foreground">
              {extensionLabel(output.extension)}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
});

function CardAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="size-7 rounded-full bg-background/90 shadow-sm backdrop-blur hover:bg-background"
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
