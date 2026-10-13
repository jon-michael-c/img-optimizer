import type { EncodedFile } from "@/lib/image-processor";
import { extensionLabel } from "@/lib/files";
import { cn, formatBytes } from "@/lib/utils";

interface VersionSwitchProps {
  fileName: string;
  originalSize: number;
  converted: EncodedFile;
  useConverted: boolean;
  onChange: (useConverted: boolean) => void;
  className?: string;
}

/** Pick between a kept (smaller) original and its conversion to the chosen format. */
export function VersionSwitch({
  fileName,
  originalSize,
  converted,
  useConverted,
  onChange,
  className,
}: VersionSwitchProps) {
  const versions = [
    {
      isConverted: false,
      label: extensionLabel(fileName) || "Original",
      size: originalSize,
    },
    {
      isConverted: true,
      label: extensionLabel(converted.extension),
      size: converted.blob.size,
    },
  ];

  return (
    <div
      role="group"
      aria-label="Version to download"
      title="The original is smaller than the converted file. Pick the one you want."
      className={cn("grid grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5", className)}
    >
      {versions.map((version) => {
        const active = version.isConverted === useConverted;
        return (
          <button
            key={String(version.isConverted)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(version.isConverted)}
            className={cn(
              "flex flex-col items-center rounded-md px-1.5 py-1 leading-tight transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-[11px] font-semibold">{version.label}</span>
            <span className="text-[10px] tabular-nums">
              {formatBytes(version.size)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
