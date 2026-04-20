'use client'

import { cn } from '@/lib/utils'
import type { LongevityComponentScore } from '@/types'

interface Props {
  label: string
  score: LongevityComponentScore
  className?: string
}

function colorFor(pct: number): string {
  if (pct >= 0.8) return 'bg-quality-green'
  if (pct >= 0.5) return 'bg-quality-yellow'
  return 'bg-quality-red'
}

function textColorFor(pct: number): string {
  if (pct >= 0.8) return 'text-quality-green'
  if (pct >= 0.5) return 'text-quality-yellow'
  return 'text-quality-red'
}

export function LongevitySubscoreBar({ label, score, className }: Props) {
  const pct = score.max > 0 ? score.points / score.max : 0

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn('tabular-nums font-medium', textColorFor(pct))}>
          {score.points.toFixed(1)}
          <span className="text-muted-foreground font-normal">/{score.max}</span>
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500', colorFor(pct))}
          style={{ width: `${Math.max(0, Math.min(100, pct * 100))}%` }}
        />
      </div>
    </div>
  )
}
