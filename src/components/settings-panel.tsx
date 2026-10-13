import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  type OutputFormat,
  type ProcessOptions,
  sameOptions,
} from "@/lib/image-processor";
import { cn } from "@/lib/utils";
import { ChevronDown, Feather, Gem, Sparkles } from "lucide-react";

interface SettingsPanelProps {
  options: ProcessOptions;
  onChange: (options: ProcessOptions) => void;
  alwaysConvert: boolean;
  onAlwaysConvertChange: (value: boolean) => void;
  /** Formats the browser encodes natively; others use a slower WASM encoder. */
  formatSupport?: Record<OutputFormat, boolean>;
}

const FORMAT_OPTIONS: {
  value: OutputFormat;
  label: string;
  hint: string;
}[] = [
  { value: "webp", label: "WebP", hint: "small files that work everywhere" },
  { value: "avif", label: "AVIF", hint: "the smallest files, newer format" },
  { value: "jpeg", label: "JPEG", hint: "maximum compatibility" },
];

const PRESETS: {
  id: string;
  label: string;
  icon: typeof Sparkles;
  options: ProcessOptions;
}[] = [
  {
    id: "balanced",
    label: "Balanced",
    icon: Sparkles,
    options: { format: "webp", quality: 80, maxDimension: 2000 },
  },
  {
    id: "smallest",
    label: "Smallest",
    icon: Feather,
    options: { format: "avif", quality: 55, maxDimension: 1600 },
  },
  {
    id: "quality",
    label: "High quality",
    icon: Gem,
    options: { format: "webp", quality: 92, maxDimension: 0 },
  },
];

/** Quick max-dimension picks; 0 keeps the original size. */
const SIZE_PRESETS = [1280, 1920, 2560, 0];

export function SettingsPanel({
  options,
  onChange,
  alwaysConvert,
  onAlwaysConvertChange,
  formatSupport,
}: SettingsPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activePreset = PRESETS.find((p) => sameOptions(p.options, options));
  const format =
    FORMAT_OPTIONS.find((f) => f.value === options.format) ?? FORMAT_OPTIONS[0];
  const native = formatSupport?.[options.format] ?? true;
  const update = (patch: Partial<ProcessOptions>) =>
    onChange({ ...options, ...patch });

  return (
    <section aria-label="Settings" className="rounded-xl border bg-card shadow-sm">
      {/* Presets + advanced toggle */}
      <div className="flex flex-wrap items-center gap-3 border-b p-3 sm:px-4">
        <div
          role="group"
          aria-label="Presets"
          className="grid w-full grid-cols-3 gap-1 rounded-lg bg-muted p-1 sm:inline-flex sm:w-auto"
        >
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const selected = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ ...preset.options })}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all sm:text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn("hidden size-3.5 sm:block", selected && "text-brand")}
                />
                {preset.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          aria-controls="advanced-settings"
          aria-label="Advanced settings"
          className="ml-auto inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="hidden tabular-nums md:inline">
            {format.label} &middot; {options.quality}% &middot;{" "}
            {options.maxDimension > 0
              ? `max ${options.maxDimension}px`
              : "full size"}
          </span>
          <span className="font-medium text-foreground">Advanced</span>
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              advancedOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Format + quality */}
      <div className="grid gap-x-6 gap-y-3 p-3 sm:grid-cols-[auto_1fr] sm:items-center sm:px-4 sm:py-4">
        <div
          role="group"
          aria-label="Output format"
          className="grid grid-cols-3 gap-1 rounded-lg border p-1 sm:inline-flex"
        >
          {FORMAT_OPTIONS.map((opt) => {
            const selected = options.format === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ format: opt.value })}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-semibold transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "bg-gradient-brand text-white shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="quality" className="shrink-0">
            Quality
          </Label>
          <Slider
            value={[options.quality]}
            onValueChange={([v]) => update({ quality: v ?? 80 })}
            min={1}
            max={99}
            step={1}
            className="py-1.5"
          />
          <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5">
            <Input
              id="quality"
              type="number"
              min={1}
              max={99}
              value={options.quality}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isNaN(n)) {
                  update({ quality: Math.max(1, Math.min(99, n)) });
                }
              }}
              className="h-6 w-8 border-0 bg-transparent p-0 text-center text-xs font-medium tabular-nums shadow-none focus-visible:ring-0 dark:bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs font-medium text-muted-foreground">%</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground sm:col-span-2">
          <span className="font-medium text-foreground">{format.label}</span>{" "}
          &mdash; {format.hint}.
          {!native &&
            " This browser can't encode it natively, so a WebAssembly encoder is used (slower)."}
        </p>
      </div>

      {/* Advanced */}
      <div
        id="advanced-settings"
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          advancedOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden" inert={!advancedOpen}>
          <div className="grid gap-6 border-t p-3 sm:grid-cols-2 sm:px-4 sm:py-4">
            <div className="space-y-2.5">
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
                    if (!Number.isNaN(n) && n >= 0) update({ maxDimension: n });
                  }}
                  className="pr-10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  px
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SIZE_PRESETS.map((size) => {
                  const selected = options.maxDimension === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => update({ maxDimension: size })}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-brand bg-brand/10 text-brand"
                          : "text-muted-foreground hover:border-brand/40 hover:text-foreground"
                      )}
                    >
                      {size === 0 ? "Original" : size}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Larger images are scaled down to fit.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="always-convert">Always convert</Label>
                <Switch
                  id="always-convert"
                  checked={alwaysConvert}
                  onCheckedChange={onAlwaysConvertChange}
                  className="data-[state=checked]:bg-brand"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                If converting would make an image bigger, the smaller original
                is kept. Turn this on to always get {format.label}. You can
                also pick per image.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
