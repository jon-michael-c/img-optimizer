import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a byte count into a compact human-readable string. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Compute size savings between an original and optimized size.
 * `percent` is positive when the file shrank, negative when it grew.
 */
export function getSavings(originalBytes: number, optimizedBytes: number) {
  const saved = originalBytes - optimizedBytes
  const percent = originalBytes > 0 ? (saved / originalBytes) * 100 : 0
  return { saved, percent }
}

/** Format a savings percentage as a signed label, e.g. "-72%" or "+4%". */
export function formatPercent(percent: number): string {
  const rounded = Math.round(percent)
  if (rounded === 0) return "0%"
  return rounded > 0 ? `\u2212${rounded}%` : `+${Math.abs(rounded)}%`
}
