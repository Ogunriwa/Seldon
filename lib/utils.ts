import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// ── Utility Function ──────────────────────────────────────────────
// cn is a helper to intelligently merge tailwind classes, resolving
// conflicts automatically (e.g. padding, colors) using tailwind-merge.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
