import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProcessOptions, OutputFormat } from "@/lib/image-processor";
import { Settings2 } from "lucide-react";

interface SettingsPanelProps {
  options: ProcessOptions;
  onChange: (options: ProcessOptions) => void;
  disabled?: boolean;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
  { value: "jpeg", label: "JPEG" },
];

export function SettingsPanel({
  options,
  onChange,
  disabled,
}: SettingsPanelProps) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Settings2 className="size-4" />
        Settings
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="format">Output format</Label>
          <Select
            value={options.format}
            onValueChange={(v) =>
              onChange({ ...options, format: v as OutputFormat })
            }
            disabled={disabled}
          >
            <SelectTrigger id="format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quality">
            Quality: {options.quality}%
          </Label>
          <Slider
            id="quality"
            value={[options.quality]}
            onValueChange={([v]) => onChange({ ...options, quality: v ?? 80 })}
            min={1}
            max={100}
            step={1}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxDim">Max dimension (px)</Label>
          <Input
            id="maxDim"
            type="number"
            min={0}
            placeholder="0 = no resize"
            value={options.maxDimension === 0 ? "" : options.maxDimension}
            onChange={(e) => {
              const v = e.target.value;
              const n = v === "" ? 0 : parseInt(v, 10);
              if (!Number.isNaN(n) && n >= 0) {
                onChange({ ...options, maxDimension: n });
              }
            }}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
