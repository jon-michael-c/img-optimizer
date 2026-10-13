import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getNativeSupport } from "@/lib/codecs";
import type { ProcessedImage } from "@/lib/download";
import { isImageFile } from "@/lib/files";
import {
  type OutputFormat,
  type ProcessOptions,
  type ProcessResult,
  sameOptions,
} from "@/lib/image-processor";
import { processInWorker } from "@/lib/worker-pool";

export type ImageStatus = "pending" | "queued" | "processing" | "done" | "error";

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  /** Lightweight grid preview, available once the image has been processed. */
  thumbUrl?: string;
  status: ImageStatus;
  result?: ProcessResult;
  error?: string;
  /** Snapshot of the options used to produce `result`, for staleness checks. */
  optimizedWith?: ProcessOptions;
  /** Per-image pick between a kept original and its conversion; unset follows the global setting. */
  preferConverted?: boolean;
}

export interface ItemOutput {
  blob: Blob;
  type: string;
  extension: string;
  isConverted: boolean;
}

interface Batch {
  total: number;
  done: number;
}

const SETTINGS_KEY = "image-optimizer-settings";
const FORMATS: OutputFormat[] = ["webp", "avif", "jpeg"];
const DEFAULT_OPTIONS: ProcessOptions = {
  format: "webp",
  quality: 80,
  maxDimension: 2000,
};
const EMPTY_BATCH: Batch = { total: 0, done: 0 };

/** The file that gets downloaded for a finished item. */
export function getItemOutput(
  item: ImageItem,
  alwaysConvert: boolean
): ItemOutput | null {
  const { result } = item;
  if (item.status !== "done" || !result) return null;
  if (result.converted && (item.preferConverted ?? alwaysConvert)) {
    return { ...result.converted, isConverted: true };
  }
  return {
    blob: result.blob,
    type: result.outputType,
    extension: result.outputExtension,
    isConverted: false,
  };
}

function loadSettings(): { options: ProcessOptions; alwaysConvert: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    const { format, quality, maxDimension } = saved.options ?? {};
    return {
      options: {
        format: FORMATS.includes(format) ? format : DEFAULT_OPTIONS.format,
        quality: Number.isInteger(quality)
          ? Math.min(99, Math.max(1, quality))
          : DEFAULT_OPTIONS.quality,
        maxDimension:
          Number.isInteger(maxDimension) && maxDimension >= 0
            ? maxDimension
            : DEFAULT_OPTIONS.maxDimension,
      },
      alwaysConvert: saved.alwaysConvert === true,
    };
  } catch {
    return { options: DEFAULT_OPTIONS, alwaysConvert: false };
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function revokeUrls(item: ImageItem) {
  URL.revokeObjectURL(item.previewUrl);
  if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
}

/** Count a finished (or withdrawn) job, resetting once the queue drains. */
function settleBatch(batch: Batch, withdrawn: boolean): Batch {
  const total = withdrawn ? batch.total - 1 : batch.total;
  const done = withdrawn ? batch.done : batch.done + 1;
  return done >= total ? EMPTY_BATCH : { total, done };
}

export function useImageOptimizer() {
  const [initialSettings] = useState(loadSettings);
  const [items, setItems] = useState<ImageItem[]>([]);
  const [options, setOptions] = useState(initialSettings.options);
  const [alwaysConvert, setAlwaysConvertState] = useState(
    initialSettings.alwaysConvert
  );
  const [batch, setBatch] = useState(EMPTY_BATCH);
  // Formats the browser encodes natively; the rest fall back to WASM.
  const [formatSupport, setFormatSupport] = useState<
    Record<OutputFormat, boolean>
  >({ webp: true, avif: true, jpeg: true });

  // Keep latest options/items available inside async callbacks without
  // re-creating callbacks or capturing stale closures.
  const optionsRef = useRef(options);
  const itemsRef = useRef(items);
  useLayoutEffect(() => {
    optionsRef.current = options;
    itemsRef.current = items;
  });
  const controllers = useRef(new Map<string, AbortController>());

  useEffect(() => {
    let cancelled = false;
    getNativeSupport().then((support) => {
      if (!cancelled) setFormatSupport(support);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ options, alwaysConvert })
    );
  }, [options, alwaysConvert]);

  const updateItem = useCallback(
    (id: string, update: (item: ImageItem) => ImageItem) => {
      setItems((prev) => prev.map((p) => (p.id === id ? update(p) : p)));
    },
    []
  );

  /** Queue items on the worker pool using the current settings. */
  const enqueue = useCallback(
    (targets: ImageItem[]) => {
      if (targets.length === 0) return;
      const opts = optionsRef.current;
      const ids = new Set(targets.map((t) => t.id));
      setItems((prev) =>
        prev.map(
          (p): ImageItem =>
            ids.has(p.id) ? { ...p, status: "queued", error: undefined } : p
        )
      );
      setBatch((b) => ({ total: b.total + targets.length, done: b.done }));

      for (const { id, file } of targets) {
        controllers.current.get(id)?.abort();
        const controller = new AbortController();
        controllers.current.set(id, controller);

        processInWorker(file, opts, {
          signal: controller.signal,
          onStart: () => updateItem(id, (p) => ({ ...p, status: "processing" })),
        })
          .then(
            (result) => {
              const thumbUrl =
                result.thumbnail && URL.createObjectURL(result.thumbnail);
              updateItem(id, (p) => {
                if (thumbUrl && p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
                return {
                  ...p,
                  status: "done",
                  result,
                  error: undefined,
                  optimizedWith: opts,
                  thumbUrl: thumbUrl ?? p.thumbUrl,
                };
              });
              setBatch((b) => settleBatch(b, false));
            },
            (err: unknown) => {
              // Removed, cancelled or re-queued: the caller already updated the item.
              if (controller.signal.aborted) {
                setBatch((b) => settleBatch(b, true));
                return;
              }
              const message =
                err instanceof Error ? err.message : "Unknown error";
              updateItem(id, (p) => ({ ...p, status: "error", error: message }));
              setBatch((b) => settleBatch(b, false));
            }
          )
          .finally(() => {
            if (controllers.current.get(id) === controller) {
              controllers.current.delete(id);
            }
          });
      }
    },
    [updateItem]
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newItems: ImageItem[] = Array.from(files)
        .filter(isImageFile)
        .map((file) => ({
          id: generateId(),
          file,
          previewUrl: URL.createObjectURL(file),
          status: "queued",
        }));
      setItems((prev) => [...prev, ...newItems]);
      enqueue(newItems);
      return newItems.length;
    },
    [enqueue]
  );

  const abortAll = useCallback(() => {
    controllers.current.forEach((c) => c.abort());
    controllers.current.clear();
    setBatch(EMPTY_BATCH);
  }, []);

  const removeItem = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) revokeUrls(item);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    abortAll();
    setItems((prev) => {
      prev.forEach(revokeUrls);
      return [];
    });
  }, [abortAll]);

  /** Stop all queued and running work; unfinished items go back to pending. */
  const cancel = useCallback(() => {
    abortAll();
    setItems((prev) =>
      prev.map(
        (p): ImageItem =>
          p.status === "queued" || p.status === "processing"
            ? { ...p, status: p.result ? "done" : "pending" }
            : p
      )
    );
  }, [abortAll]);

  const optimizeOne = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((i) => i.id === id);
      if (item) enqueue([item]);
    },
    [enqueue]
  );

  const processPending = useCallback(() => {
    enqueue(itemsRef.current.filter((i) => i.status === "pending"));
  }, [enqueue]);

  /** Re-run images made with different settings, plus any that failed. */
  const reoptimizeStale = useCallback(() => {
    enqueue(
      itemsRef.current.filter(
        (i) =>
          i.status === "error" ||
          (i.status === "done" &&
            !sameOptions(i.optimizedWith, optionsRef.current))
      )
    );
  }, [enqueue]);

  /** Replace an item's result with one produced by the advanced editor. */
  const applyEditResult = useCallback(
    (id: string, result: ProcessResult) => {
      const thumbUrl = URL.createObjectURL(result.blob);
      updateItem(id, (p) => {
        if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
        return {
          ...p,
          status: "done",
          result,
          error: undefined,
          // Mark as freshly produced so it isn't flagged "stale".
          optimizedWith: optionsRef.current,
          thumbUrl,
          preferConverted: undefined,
        };
      });
    },
    [updateItem]
  );

  const setPreferConverted = useCallback(
    (id: string, value: boolean) => {
      updateItem(id, (p) => ({ ...p, preferConverted: value }));
    },
    [updateItem]
  );

  /** The global switch applies to every image, replacing per-image picks. */
  const setAlwaysConvert = useCallback((value: boolean) => {
    setAlwaysConvertState(value);
    setItems((prev) =>
      prev.map((p) =>
        p.preferConverted === undefined ? p : { ...p, preferConverted: undefined }
      )
    );
  }, []);

  const outputs: ProcessedImage[] = useMemo(
    () =>
      items.flatMap((item) => {
        const output = getItemOutput(item, alwaysConvert);
        return output
          ? [
              {
                file: item.file,
                blob: output.blob,
                outputExtension: output.extension,
              },
            ]
          : [];
      }),
    [items, alwaysConvert]
  );

  const stats = useMemo(() => {
    let count = 0;
    let originalBytes = 0;
    let optimizedBytes = 0;
    let keptCount = 0;
    for (const item of items) {
      const output = getItemOutput(item, alwaysConvert);
      if (!output) continue;
      count++;
      originalBytes += item.file.size;
      optimizedBytes += output.blob.size;
      if (item.result?.keptOriginal && !output.isConverted) keptCount++;
    }
    const saved = originalBytes - optimizedBytes;
    const percent = originalBytes > 0 ? (saved / originalBytes) * 100 : 0;
    return { count, originalBytes, optimizedBytes, saved, percent, keptCount };
  }, [items, alwaysConvert]);

  const counts = useMemo(() => {
    let pending = 0;
    let active = 0;
    let failed = 0;
    let stale = 0;
    for (const item of items) {
      if (item.status === "pending") pending++;
      else if (item.status === "queued" || item.status === "processing") active++;
      else if (item.status === "error") failed++;
      else if (!sameOptions(item.optimizedWith, options)) stale++;
    }
    return { pending, active, failed, stale };
  }, [items, options]);

  return {
    items,
    options,
    setOptions,
    alwaysConvert,
    setAlwaysConvert,
    addFiles,
    removeItem,
    clearAll,
    cancel,
    optimizeOne,
    processPending,
    reoptimizeStale,
    applyEditResult,
    setPreferConverted,
    isProcessing: counts.active > 0,
    batch,
    counts,
    outputs,
    stats,
    formatSupport,
  };
}
