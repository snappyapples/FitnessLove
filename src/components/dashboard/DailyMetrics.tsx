'use client'

import { DayData, DAILY_GOALS, QualityLevel } from '@/types'
import { useSettings } from '@/components/settings/SettingsSheet'

interface DailyMetricsProps {
  data: DayData
}

function ProgressRing({
  value,
  max,
  color,
  size = 60
}: {
  value: number
  max: number
  color: string
  size?: number
}) {
  const progress = Math.min(value / max, 1)
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress * circumference)

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-secondary"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  )
}

function MetricCard({
  label,
  value,
  unit,
  goal,
  color,
  isUnder = false,
  efficiency
}: {
  label: string
  value: number
  unit: string
  goal: number
  color: string
  isUnder?: boolean
  efficiency?: { value: number; quality: QualityLevel }
}) {
  // Calculate percentage of goal
  const percentage = Math.round((value / goal) * 100)

  // For "under is good" metrics (calories):
  // - Under goal: show progress in green
  // - Over goal: show overage in red
  const isOver = isUnder && value > goal
  const ringValue = isOver
    ? value - goal  // Show just the overage amount
    : value
  const ringColor = isOver ? '#E53935' : color

  const efficiencyColors = {
    green: 'bg-quality-green text-white',
    yellow: 'bg-quality-yellow text-black',
    red: 'bg-quality-red text-white',
    muted: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="flex flex-col items-center p-3 rounded-xl bg-card border">
      <div className="relative">
        <ProgressRing value={ringValue} max={goal} color={ringColor} size={70} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-bold ${isOver ? 'text-red-500' : ''}`}>{percentage}%</span>
        </div>
      </div>
      <span className="text-xs font-medium mt-1">{label}</span>
      <span className="text-xs text-muted-foreground">{value} / {goal}{unit === 'cal' ? '' : 'g'}</span>
      {efficiency && (
        <span className={`text-xs px-1.5 py-0.5 rounded mt-1 ${efficiencyColors[efficiency.quality]}`}>
          {efficiency.value}% eff
        </span>
      )}
    </div>
  )
}

// Get ring color based on percentage of goal (for "higher is better" metrics)
function getProgressColor(percent: number): string {
  if (percent >= 80) return '#4CAF50' // green
  if (percent >= 50) return '#FFCA28' // yellow
  return '#E53935' // red
}

export function DailyMetrics({ data }: DailyMetricsProps) {
  const settings = useSettings()

  // Use settings or fall back to defaults
  const calorieGoal = settings.calorieGoal || DAILY_GOALS.calories
  const proteinGoal = settings.proteinGoal || DAILY_GOALS.protein
  const fiberGoal = settings.fiberGoal || DAILY_GOALS.fiber

  // Calculate goal ratios based on settings
  const proteinGoalRatio = proteinGoal / calorieGoal
  const fiberGoalRatio = fiberGoal / calorieGoal

  // Calculate day's efficiency for protein and fiber
  const proteinRatio = data.totalCalories > 0 ? data.totalProtein / data.totalCalories : 0
  const fiberRatio = data.totalCalories > 0 ? data.totalFiber / data.totalCalories : 0

  const proteinEfficiency = Math.round((proteinRatio / proteinGoalRatio) * 100)
  const fiberEfficiency = Math.round((fiberRatio / fiberGoalRatio) * 100)

  // Quality based on efficiency: green >= 100%, yellow >= 67%, red < 67%
  const proteinQuality: QualityLevel = proteinEfficiency >= 100 ? 'green' : proteinEfficiency >= 67 ? 'yellow' : 'red'
  const fiberQuality: QualityLevel = fiberEfficiency >= 100 ? 'green' : fiberEfficiency >= 67 ? 'yellow' : 'red'

  // Calculate percentages for ring colors
  const proteinPercent = Math.round((data.totalProtein / proteinGoal) * 100)
  const fiberPercent = Math.round((data.totalFiber / fiberGoal) * 100)

  return (
    <div className="space-y-4">
      {/* Main metrics with progress rings */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Calories"
          value={data.totalCalories}
          unit="cal"
          goal={calorieGoal}
          color="#4CAF50"
          isUnder={true}
        />
        <MetricCard
          label="Protein"
          value={data.totalProtein}
          unit="g"
          goal={proteinGoal}
          color={getProgressColor(proteinPercent)}
          efficiency={{ value: proteinEfficiency, quality: proteinQuality }}
        />
        <MetricCard
          label="Fiber"
          value={data.totalFiber}
          unit="g"
          goal={fiberGoal}
          color={getProgressColor(fiberPercent)}
          efficiency={{ value: fiberEfficiency, quality: fiberQuality }}
        />
      </div>
    </div>
  )
}
