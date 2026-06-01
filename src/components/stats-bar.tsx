import { formatBytes } from "@/lib/utils";
import { FileDown, HardDrive, Sparkles, TrendingUp } from "lucide-react";

interface StatsBarProps {
  count: number;
  originalBytes: number;
  optimizedBytes: number;
  saved: number;
  percent: number;
}

export function StatsBar({
  count,
  originalBytes,
  optimizedBytes,
  saved,
  percent,
}: StatsBarProps) {
  if (count === 0) return null;

  const reduced = saved > 0;
  const pct = Math.round(percent);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-2 divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <Stat
          icon={<Sparkles className="size-4" />}
          label="Optimized"
          value={`${count} image${count !== 1 ? "s" : ""}`}
        />
        <Stat
          icon={<HardDrive className="size-4" />}
          label="Original size"
          value={formatBytes(originalBytes)}
        />
        <Stat
          icon={<FileDown className="size-4" />}
          label="New size"
          value={formatBytes(optimizedBytes)}
        />
        <div className="flex items-center gap-3 p-4">
          <div
            className={
              reduced
                ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }
          >
            {reduced ? (
              <FileDown className="size-4" />
            ) : (
              <TrendingUp className="size-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {reduced ? "Total saved" : "Size increase"}
            </p>
            <p
              className={
                reduced
                  ? "truncate text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                  : "truncate text-sm font-semibold text-amber-600 dark:text-amber-400"
              }
            >
              {formatBytes(Math.abs(saved))}
              <span className="ml-1 font-normal">
                ({reduced ? "-" : "+"}
                {Math.abs(pct)}%)
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
