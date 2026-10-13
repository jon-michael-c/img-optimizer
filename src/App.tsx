import { useEffect, useRef } from "react";
import { ActionBar } from "@/components/action-bar";
import { DropOverlay } from "@/components/drop-overlay";
import { Header } from "@/components/header";
import { ImageDropzone } from "@/components/image-dropzone";
import { ImageGrid } from "@/components/image-grid";
import { SettingsPanel } from "@/components/settings-panel";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useFileIntake } from "@/hooks/use-file-intake";
import { useImageOptimizer } from "@/hooks/use-image-optimizer";
import { downloadAsZip, downloadSingle } from "@/lib/download";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";
import { Layers, ShieldCheck, WifiOff } from "lucide-react";

function App() {
  const {
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
    isProcessing,
    batch,
    counts,
    outputs,
    stats,
    formatSupport,
  } = useImageOptimizer();

  const dragging = useFileIntake(addFiles);

  // Failures already present when a run starts, so only new ones are reported.
  const run = useRef<{ failedBefore: number } | null>(null);
  useEffect(() => {
    if (isProcessing) {
      run.current ??= { failedBefore: counts.failed };
      return;
    }
    if (!run.current) return;
    const { failedBefore } = run.current;
    run.current = null;
    if (items.length === 0 || counts.pending > 0) return;

    const failed = counts.failed - failedBefore;
    if (failed > 0) {
      toast.error(
        `${failed} image${failed !== 1 ? "s" : ""} couldn't be optimized`
      );
    } else if (stats.saved > 0) {
      toast.success(`Saved ${formatBytes(stats.saved)}`, {
        description: `${Math.min(99, Math.round(stats.percent))}% smaller across ${stats.count} image${stats.count !== 1 ? "s" : ""}`,
      });
    } else {
      toast.success("All done", {
        description: "These images were already well optimized.",
      });
    }
  }, [isProcessing, items.length, counts.pending, counts.failed, stats]);

  const handleCancel = () => {
    run.current = null;
    cancel();
    toast.info("Optimization stopped");
  };

  const handleClear = () => {
    run.current = null;
    clearAll();
  };

  const handleDownload = () => {
    if (outputs.length === 1) {
      const [only] = outputs;
      downloadSingle(only.blob, only.file.name, only.outputExtension);
      return;
    }
    toast.promise(downloadAsZip(outputs), {
      loading: `Zipping ${outputs.length} images\u2026`,
      success: `Downloaded ${outputs.length} images as ZIP`,
      error: "Failed to create ZIP",
    });
  };

  const settings = (
    <SettingsPanel
      options={options}
      onChange={setOptions}
      alwaysConvert={alwaysConvert}
      onAlwaysConvertChange={setAlwaysConvert}
      formatSupport={formatSupport}
    />
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative flex min-h-svh flex-col">
        {/* Decorative background */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-brand/5 blur-3xl" />
          <div className="absolute -right-40 top-1/3 size-[30rem] rounded-full bg-brand-2/5 blur-3xl" />
        </div>

        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:py-8">
          {items.length === 0 ? (
            <>
              <div className="mx-auto max-w-2xl space-y-3 pt-2 text-center sm:pt-6">
                <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                  Smaller images,{" "}
                  <span className="text-gradient-brand">same quality</span>
                </h2>
                <p className="text-balance text-muted-foreground">
                  Compress and convert to WebP, AVIF or JPEG in seconds. Drop
                  your images and they&rsquo;re optimized right away.
                </p>
              </div>
              <ImageDropzone onFiles={addFiles} dragging={dragging} />
              {settings}
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-brand" />
                  Private: nothing is uploaded
                </li>
                <li className="flex items-center gap-1.5">
                  <WifiOff className="size-3.5 text-brand" />
                  Works offline
                </li>
                <li className="flex items-center gap-1.5">
                  <Layers className="size-3.5 text-brand" />
                  Batch &amp; ZIP download
                </li>
              </ul>
            </>
          ) : (
            <>
              {settings}
              <ImageGrid
                items={items}
                options={options}
                alwaysConvert={alwaysConvert}
                dragging={dragging}
                formatSupport={formatSupport}
                onAddFiles={addFiles}
                onRemove={removeItem}
                onOptimize={optimizeOne}
                onApplyEdit={applyEditResult}
                onPreferConverted={setPreferConverted}
              />
            </>
          )}
        </main>

        {items.length > 0 && (
          <ActionBar
            itemCount={items.length}
            isProcessing={isProcessing}
            batch={batch}
            counts={counts}
            stats={stats}
            onCancel={handleCancel}
            onProcessPending={processPending}
            onReoptimize={reoptimizeStale}
            onDownload={handleDownload}
            onClear={handleClear}
          />
        )}

        <footer className="border-t py-4">
          <p className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground">
            All processing happens locally in your browser &mdash; your images
            never leave your device.
          </p>
        </footer>
      </div>
      <DropOverlay visible={dragging} />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}

export default App;
