'use client'

import { cn } from '@/lib/utils'

interface Props {
  score: number       // 0-100
  hasData?: boolean   // if false, render muted
  size?: number
  strokeWidth?: number
  label?: string
  className?: string
}

function colorFor(score: number): string {
  if (score >= 80) return '#4CAF50'
  if (score >= 60) return '#8BC34A'
  if (score >= 40) return '#FFCA28'
  if (score >= 20) return '#FF9800'
  return '#E53935'
}

export function LongevityScoreRing({
  score,
  hasData = true,
  size = 120,
  strokeWidth = 10,
  label,
  className,
}: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference - (clamped / 100) * circumference
  const color = hasData ? colorFor(clamped) : '#9CA3AF'

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="currentColor"
            className="text-muted"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke={color}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color: hasData ? color : undefined }}
          >
            {hasData ? Math.round(clamped) : '—'}
          </span>
          {hasData && <span className="text-[10px] text-muted-foreground">/ 100</span>}
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>}
    </div>
  )
}
