import { useCallback, useState } from "react";
import {
  type ProcessOptions,
  type ProcessResult,
  processImage,
  isImageFile,
} from "@/lib/image-processor";
import type { ProcessedImage } from "@/lib/download";

export type ImageStatus = "pending" | "processing" | "done" | "error";

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ImageStatus;
  result?: ProcessResult;
  error?: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function collectImageFiles(files: FileList | File[]): File[] {
  const arr = Array.from(files);
  return arr.filter(isImageFile);
}

export function useImageOptimizer() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [options, setOptions] = useState<ProcessOptions>({
    format: "webp",
    quality: 80,
    maxDimension: 1500,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const addFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = collectImageFiles(files);
    const newItems: ImageItem[] = imageFiles.map((file) => ({
      id: generateId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setItems([]);
    setProgress({ current: 0, total: 0 });
    setIsProcessing(false);
  }, [items]);

  const processAll = useCallback(async () => {
    const pending = items.filter((i) => i.status === "pending");
    if (pending.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: pending.length });

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, status: "processing" as const } : p
        )
      );
      setProgress((p) => ({ ...p, current: i }));

      try {
        const result = await processImage(item.file, options);
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: "done" as const, result }
              : p
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, status: "error" as const, error: message } : p
          )
        );
      }
      setProgress((p) => ({ ...p, current: i + 1 }));
    }

    setIsProcessing(false);
  }, [items, options]);

  const processedImages: ProcessedImage[] = items
    .filter((i): i is ImageItem & { result: ProcessResult } => i.status === "done" && !!i.result)
    .map((i) => ({
      file: i.file,
      blob: i.result!.blob,
      width: i.result!.width,
      height: i.result!.height,
      originalWidth: i.result!.originalWidth,
      originalHeight: i.result!.originalHeight,
    }));

  const hasPending = items.some((i) => i.status === "pending");
  const hasProcessed = processedImages.length > 0;
  const allDone = items.length > 0 && items.every((i) => i.status === "done" || i.status === "error");

  return {
    items,
    options,
    setOptions,
    addFiles,
    removeItem,
    clearAll,
    processAll,
    isProcessing,
    progress,
    processedImages,
    hasPending,
    hasProcessed,
    allDone,
  };
}
