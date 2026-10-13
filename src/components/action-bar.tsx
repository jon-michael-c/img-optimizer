import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatBytes, formatPercent } from "@/lib/utils";
import { Download, Loader2, RotateCcw, Trash2, X, Zap } from "lucide-react";

interface ActionBarProps {
  itemCount: number;
  isProcessing: boolean;
  batch: { total: number; done: number };
  counts: { pending: number; stale: number; failed: number };
  stats: {
    count: number;
    originalBytes: number;
    optimizedBytes: number;
    saved: number;
    percent: number;
    keptCount: number;
  };
  onCancel: () => void;
  onProcessPending: () => void;
  onReoptimize: () => void;
  onDownload: () => void;
  onClear: () => void;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count !== 1 ? "s" : ""}`;
}

export function ActionBar({
  itemCount,
  isProcessing,
  batch,
  counts,
  stats,
  onCancel,
  onProcessPending,
  onReoptimize,
  onDownload,
  onClear,
}: ActionBarProps) {
  const progress = batch.total > 0 ? (batch.done / batch.total) * 100 : 0;
  const details = [
    plural(itemCount, "image"),
    stats.keptCount > 0 && `${stats.keptCount} already optimal`,
    counts.pending > 0 && `${counts.pending} waiting`,
    counts.failed > 0 && `${counts.failed} failed`,
  ]
    .filter(Boolean)
    .join(" \u00b7 ");

  return (
    <div
      role="region"
      aria-label="Batch actions"
      className="sticky bottom-0 z-30 border-t bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-background/65"
    >
      {isProcessing && (
        <div
          role="progressbar"
          aria-label="Optimization progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-muted"
        >
          <div
            className="animate-gradient-pan h-full bg-gradient-brand transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="min-w-0 flex-1 text-sm">
          {isProcessing ? (
            <p className="flex items-center gap-2 font-medium tabular-nums">
              <Loader2 className="size-4 animate-spin text-brand" />
              Optimizing {Math.min(batch.done + 1, batch.total)} of{" "}
              {batch.total}
            </p>
          ) : (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {stats.count > 0 && (
                <>
                  <span className="font-semibold tabular-nums">
                    {formatBytes(stats.originalBytes)} &rarr;{" "}
                    {formatBytes(stats.optimizedBytes)}
                  </span>
                  <span
                    key={stats.saved}
                    className={cn(
                      "animate-count-pop rounded-full px-2 py-0.5 text-xs font-semibold",
                      stats.saved >= 0
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {formatPercent(stats.percent)}
                  </span>
                </>
              )}
              <span className="text-xs text-muted-foreground">{details}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isProcessing ? (
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X />
              Cancel
            </Button>
          ) : (
            <>
              {counts.pending > 0 && (
                <Button variant="secondary" size="sm" onClick={onProcessPending}>
                  <Zap />
                  Optimize {counts.pending}
                </Button>
              )}
              {counts.stale > 0 && (
                <Button variant="secondary" size="sm" onClick={onReoptimize}>
                  <RotateCcw />
                  Re-optimize {counts.stale}
                </Button>
              )}
            </>
          )}
          <Button
            size="sm"
            onClick={onDownload}
            disabled={isProcessing || stats.count === 0}
            className="bg-gradient-brand text-white shadow-sm shadow-brand/30 hover:opacity-95"
          >
            <Download />
            {stats.count === 1 ? "Download" : "Download ZIP"}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClear}
                aria-label="Clear all images"
              >
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear all</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
