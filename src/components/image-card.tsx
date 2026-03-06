import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ImageItem } from "@/hooks/use-image-optimizer";
import { downloadSingle } from "@/lib/download";
import type { OutputFormat } from "@/lib/image-processor";
import { cn } from "@/lib/utils";
import { Loader2, Trash2, Download, AlertCircle } from "lucide-react";

interface ImageCardProps {
  item: ImageItem;
  format: OutputFormat;
  onRemove: (id: string) => void;
  onImageClick?: (item: ImageItem) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageCard({
  item,
  format,
  onRemove,
  onImageClick,
}: ImageCardProps) {
  const statusVariant =
    item.status === "done"
      ? "default"
      : item.status === "error"
        ? "destructive"
        : item.status === "processing"
          ? "secondary"
          : "outline";

  const sizeInfo =
    item.status === "done" && item.result
      ? `${formatBytes(item.file.size)} → ${formatBytes(item.result.blob.size)}`
      : `${formatBytes(item.file.size)}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="truncate text-sm font-medium" title={item.file.name}>
          {item.file.name}
        </span>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => onRemove(item.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className={cn(
            "relative aspect-square w-full bg-muted",
            onImageClick &&
              item.status !== "processing" &&
              "cursor-pointer hover:opacity-90"
          )}
          onClick={() => onImageClick?.(item)}
          onKeyDown={(e) => {
            if (
              onImageClick &&
              item.status !== "processing" &&
              (e.key === "Enter" || e.key === " ")
            ) {
              e.preventDefault();
              onImageClick(item);
            }
          }}
          role={onImageClick && item.status !== "processing" ? "button" : undefined}
          tabIndex={onImageClick && item.status !== "processing" ? 0 : undefined}
        >
          {item.status === "processing" ? (
            <div className="flex size-full items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <img
              src={item.previewUrl}
              alt={item.file.name}
              className="size-full object-contain"
            />
          )}
          {item.status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
              <AlertCircle className="size-8 text-destructive" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 p-2">
          <Badge variant={statusVariant} className="text-xs">
            {item.status}
          </Badge>
          <span className="text-xs text-muted-foreground">{sizeInfo}</span>
        </div>
      </CardContent>
      {item.status === "done" && item.result && (
        <CardFooter className="p-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    downloadSingle(item.result!.blob, item.file.name, format)
                  }
                >
                  <Download className="mr-2 size-4" />
                  Download
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download optimized image</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      )}
      {item.status === "error" && item.error && (
        <CardFooter className="p-2">
          <p className="text-xs text-destructive" title={item.error}>
            {item.error}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
