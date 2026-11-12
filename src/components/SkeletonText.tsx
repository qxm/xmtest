import type { ReactNode } from 'react'

// Invisible sample text preserves the exact typography/line box of the real slot.
export function SkeletonText({ children }: { children: ReactNode }) {
  return <span className="skeleton-text" aria-hidden="true">{children}</span>
}
