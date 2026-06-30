// Time-in-stage age indicator. PRD §7: >7 days subtle yellow, >14 days orange.

export type AgeTier = 'fresh' | 'warning' | 'stale'

const DAY = 1000 * 60 * 60 * 24

export function daysInStage(stageSince: string, now: number = Date.now()): number {
  return Math.floor((now - new Date(stageSince).getTime()) / DAY)
}

export function ageTier(stageSince: string, now: number = Date.now()): AgeTier {
  const days = daysInStage(stageSince, now)
  if (days > 14) return 'stale'
  if (days > 7) return 'warning'
  return 'fresh'
}

/** Compact human label, e.g. "just now", "3d", "2w". */
export function ageLabel(stageSince: string, now: number = Date.now()): string {
  const days = daysInStage(stageSince, now)
  if (days <= 0) {
    const hours = Math.floor((now - new Date(stageSince).getTime()) / (DAY / 24))
    if (hours <= 0) return 'just now'
    return `${hours}h`
  }
  if (days < 14) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

/** Tailwind classes for the age pill, keyed by tier. */
export const AGE_TIER_CLASS: Record<AgeTier, string> = {
  fresh: 'text-neutral-500',
  warning: 'text-yellow-400/90',
  stale: 'text-orange-400',
}
