import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProcessOptions, OutputFormat } from "@/lib/image-processor";
import { cn } from "@/lib/utils";
import { Settings2, Check } from "lucide-react";

interface SettingsPanelProps {
  options: ProcessOptions;
  onChange: (options: ProcessOptions) => void;
  disabled?: boolean;
}

const FORMAT_OPTIONS: {
  value: OutputFormat;
  label: string;
  hint: string;
}[] = [
  { value: "webp", label: "WebP", hint: "Balanced size & support" },
  { value: "avif", label: "AVIF", hint: "Smallest files" },
  { value: "jpeg", label: "JPEG", hint: "Most compatible" },
];

export function SettingsPanel({
  options,
  onChange,
  disabled,
}: SettingsPanelProps) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-5 py-3.5 text-sm font-medium">
        <Settings2 className="size-4 text-muted-foreground" />
        Settings
      </div>

      <div className="space-y-6 p-5">
        {/* Format */}
        <div className="space-y-2.5">
          <Label>Output format</Label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {FORMAT_OPTIONS.map((opt) => {
              const selected = options.format === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...options, format: opt.value })}
                  disabled={disabled}
                  aria-pressed={selected}
                  className={cn(
                    "relative flex flex-col items-start gap-0.5 rounded-lg border p-3.5 text-left transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-accent/50",
                    disabled && "pointer-events-none opacity-50"
                  )}
                >
                  {selected && (
                    <span className="absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quality + Max dimension */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="quality">Quality</Label>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                {options.quality}%
              </span>
            </div>
            <Slider
              id="quality"
              value={[options.quality]}
              onValueChange={([v]) => onChange({ ...options, quality: v ?? 80 })}
              min={1}
              max={100}
              step={1}
              disabled={disabled}
              className="py-1.5"
            />
            <p className="text-xs text-muted-foreground">
              Higher quality means a larger file. 75&ndash;85% is usually ideal.
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="maxDim">Max dimension</Label>
            <div className="relative">
              <Input
                id="maxDim"
                type="number"
                min={0}
                placeholder="No limit"
                value={options.maxDimension === 0 ? "" : options.maxDimension}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = v === "" ? 0 : parseInt(v, 10);
                  if (!Number.isNaN(n) && n >= 0) {
                    onChange({ ...options, maxDimension: n });
                  }
                }}
                disabled={disabled}
                className="pr-10"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                px
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Scales images down to fit. Leave empty to keep original size.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
