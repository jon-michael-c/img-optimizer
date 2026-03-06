import { Header } from "@/components/header";
import { ImageDropzone } from "@/components/image-dropzone";
import { ImageGrid } from "@/components/image-grid";
import { SettingsPanel } from "@/components/settings-panel";
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
    hasPending,
    hasProcessed,
  } = useImageOptimizer();

  const handleDownloadZip = async () => {
    if (processedImages.length === 0) {
      toast.error("No images to download");
      return;
    }
    try {
      await downloadAsZip(processedImages, options.format);
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
    toast.success("Processing complete");
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-svh flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4">
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
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-sm font-medium">
                  {items.length} image{items.length !== 1 ? "s" : ""} • {processedImages.length} optimized
                </h2>
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
                    Optimize All
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadZip}
                    disabled={!hasProcessed || isProcessing}
                  >
                    <Download className="mr-2 size-4" />
                    Download as ZIP
                  </Button>
                  <Button variant="ghost" onClick={clearAll}>
                    <Trash2 className="mr-2 size-4" />
                    Clear All
                  </Button>
                </div>
              </div>

              {isProcessing && progress.total > 0 && (
                <Progress
                  value={(progress.current / progress.total) * 100}
                  className="h-2"
                />
              )}

              <ImageGrid
                items={items}
                format={options.format}
                onRemove={removeItem}
              />
            </div>
          )}
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
