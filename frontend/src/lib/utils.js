// cn utility — clsx + tailwind-merge (mirrors shadcn @/lib/utils)
// Used by UI components that were designed for Tailwind-based projects.
// In this project (vanilla CSS), cn is mainly used for className composition.
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
