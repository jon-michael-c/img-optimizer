import { Header } from "@/components/header";
import { ImageDropzone } from "@/components/image-dropzone";
import { ImageGrid } from "@/components/image-grid";
import { SettingsPanel } from "@/components/settings-panel";
import { StatsBar } from "@/components/stats-bar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useImageOptimizer } from "@/hooks/use-image-optimizer";
import { downloadAsZip } from "@/lib/download";
import { toast } from "sonner";
import { Zap, Download, Trash2, Loader2 } from "lucide-react";

function App() {
  const {
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
    stats,
    hasPending,
    hasProcessed,
  } = useImageOptimizer();

  const handleDownloadZip = async () => {
    if (processedImages.length === 0) {
      toast.error("No images to download");
      return;
    }
    try {
      await downloadAsZip(processedImages);
      toast.success(`Downloaded ${processedImages.length} image(s) as ZIP`);
    } catch {
      toast.error("Failed to create ZIP");
    }
  };

  const handleProcessAll = async () => {
    if (!hasPending) {
      toast.info("No pending images to process");
      return;
    }
    await processAll();
    toast.success("Optimization complete");
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-svh flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6">
          <SettingsPanel
            options={options}
            onChange={setOptions}
            disabled={isProcessing}
          />

          <ImageDropzone
            onFiles={(files) => addFiles(files)}
            disabled={isProcessing}
          />

          {items.length > 0 && (
            <div className="space-y-5">
              <StatsBar {...stats} />

              {/* Action bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {items.length}
                  </span>{" "}
                  image{items.length !== 1 ? "s" : ""}
                  {pendingCount > 0 && ` \u00b7 ${pendingCount} pending`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleProcessAll}
                    disabled={!hasPending || isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 size-4" />
                    )}
                    {isProcessing ? "Optimizing\u2026" : "Optimize all"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadZip}
                    disabled={!hasProcessed || isProcessing}
                  >
                    <Download className="mr-2 size-4" />
                    Download ZIP
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={clearAll}
                    disabled={isProcessing}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Clear
                  </Button>
                </div>
              </div>

              {isProcessing && progress.total > 0 && (
                <div className="space-y-1.5">
                  <Progress
                    value={(progress.current / progress.total) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optimizing {Math.min(progress.current + 1, progress.total)}{" "}
                    of {progress.total}
                  </p>
                </div>
              )}

              <ImageGrid items={items} onRemove={removeItem} />
            </div>
          )}
        </main>

        <footer className="border-t py-4">
          <p className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground">
            All processing happens locally in your browser &mdash; your images
            never leave your device.
          </p>
        </footer>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
