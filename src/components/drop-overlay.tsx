import { ImagePlus } from "lucide-react";

export function DropOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm animate-in fade-in-0 duration-150 sm:p-8"
    >
      <div className="flex size-full max-h-[34rem] max-w-4xl flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-brand bg-brand/5 text-center animate-in zoom-in-95 duration-200">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-brand/30 animate-float">
          <ImagePlus className="size-8" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold">Drop to optimize</p>
          <p className="text-sm text-muted-foreground">
            Images and folders are both fine
          </p>
        </div>
      </div>
    </div>
  );
}
