'use client'

import { useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DayData, MealType, getProteinQuality, QualityLevel, calculateDayScore, DAILY_GOALS, Meal } from '@/types'
import { DailyMetrics } from './DailyMetrics'
import { MealRow, EmptyMealSlot } from './MealRow'
import { cn } from '@/lib/utils'
import { useSettings } from '@/components/settings/SettingsSheet'

// Single meal types (one per day)
const SINGLE_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner']
// Multiple meal types (can have many per day)
const MULTI_MEAL_TYPES: MealType[] = ['snack', 'indulgence']

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMM d')
}

function QualityBar({ level }: { level: QualityLevel }) {
  const colorMap = {
    green: 'bg-quality-green',
    yellow: 'bg-quality-yellow',
    red: 'bg-quality-red',
    muted: 'bg-muted',
  }
  return <div className={cn('w-1 h-full rounded-full', colorMap[level])} />
}

function ScoreBadge({ score }: { score: number }) {
  // Color based on score thresholds
  let colorClass = 'bg-quality-red/20 text-quality-red'
  if (score >= 80) {
    colorClass = 'bg-quality-green/20 text-quality-green'
  } else if (score >= 50) {
    colorClass = 'bg-quality-yellow/20 text-quality-yellow'
  }

  return (
    <div className={cn('px-2 py-1 rounded-md text-sm font-bold', colorClass)}>
      {score}%
    </div>
  )
}

// Mini ring for collapsed view - shows progress as circular indicator
function MiniRing({
  percent,
  label,
  type
}: {
  percent: number
  label: string
  type: 'score' | 'calories' | 'protein' | 'fiber'
}) {
  const size = 48
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI

  // For calories: 100% is good (at goal), over is bad
  // For protein/fiber/score: 100% is good (meeting goal)
  const displayPercent = Math.min(percent, 100)
  const offset = circumference - (displayPercent / 100) * circumference

  // Color logic
  let color = '#E53935' // red
  if (type === 'calories') {
    if (percent <= 100) color = '#4CAF50' // green - under goal
    else if (percent <= 110) color = '#FFCA28' // yellow - slightly over
    else color = '#E53935' // red - way over
  } else {
    // score, protein, fiber - higher is better
    if (percent >= 80) color = '#4CAF50' // green - meeting goal
    else if (percent >= 50) color = '#FFCA28' // yellow - close
    else color = '#E53935' // red - far from goal
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="currentColor"
            className="text-muted/30"
            fill="none"
          />
          {/* Progress circle */}
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
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-bold"
          style={{ color }}
        >
          {Math.round(percent)}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
    </div>
  )
}

interface DayCardProps {
  data: DayData
  defaultExpanded?: boolean
  onLogMeal: (type: MealType, date: string) => void
  onEditMeal: (meal: Meal) => void
  onDeleteMeal: (mealId: string) => void
}

export function DayCard({ data, defaultExpanded = false, onLogMeal, onEditMeal, onDeleteMeal }: DayCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const settings = useSettings()

  // Use settings or fall back to defaults
  const goals = {
    calories: settings.calorieGoal || DAILY_GOALS.calories,
    protein: settings.proteinGoal || DAILY_GOALS.protein,
    fiber: settings.fiberGoal || DAILY_GOALS.fiber,
  }

  const quality = data.totalCalories > 0
    ? getProteinQuality(data.proteinPerCalorie)
    : 'muted'

  const score = calculateDayScore(data, goals)

  // Calculate percentages for collapsed view
  const caloriePercent = goals.calories > 0 ? (data.totalCalories / goals.calories) * 100 : 0
  const proteinPercent = goals.protein > 0 ? (data.totalProtein / goals.protein) * 100 : 0
  const fiberPercent = goals.fiber > 0 ? (data.totalFiber / goals.fiber) * 100 : 0

  // Group meals by type
  const getMealsByType = (type: MealType) => data.meals.filter(m => m.type === type)
  const getFirstMealByType = (type: MealType) => data.meals.find(m => m.type === type)

  if (!expanded) {
    return (
      <Card
        className="cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center gap-3 p-3">
          <QualityBar level={quality} />
          <div className="flex-1 flex items-center justify-between">
            <h3 className="font-medium">{formatDateLabel(data.date)}</h3>
            <div className="flex items-center gap-2">
              <MiniRing percent={score} label="Score" type="score" />
              <MiniRing percent={caloriePercent} label="Cal" type="calories" />
              <MiniRing percent={proteinPercent} label="Pro" type="protein" />
              <MiniRing percent={fiberPercent} label="Fib" type="fiber" />
              <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded(false)}
        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors border-b"
      >
        <QualityBar level={quality} />
        <div className="flex-1 flex items-center justify-between">
          <h3 className="font-medium">{formatDateLabel(data.date)}</h3>
          <div className="flex items-center gap-2">
            <MiniRing percent={score} label="Score" type="score" />
            <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" />
          </div>
        </div>
      </button>

      <div className="p-4 space-y-4">
        <DailyMetrics data={data} />

        <div className="space-y-2">
          {/* Single meal types - breakfast, lunch, dinner */}
          {SINGLE_MEAL_TYPES.map((type) => {
            const meal = getFirstMealByType(type)
            if (meal) {
              return <MealRow key={meal.id} meal={meal} onEdit={onEditMeal} onDelete={onDeleteMeal} />
            }
            return (
              <EmptyMealSlot
                key={type}
                type={type}
                onLog={() => onLogMeal(type, data.date)}
              />
            )
          })}

          {/* Multiple meal types - snacks and indulgences */}
          {MULTI_MEAL_TYPES.map((type) => {
            const meals = getMealsByType(type)
            return (
              <div key={type} className="space-y-2">
                {meals.map((meal) => (
                  <MealRow key={meal.id} meal={meal} onEdit={onEditMeal} onDelete={onDeleteMeal} />
                ))}
                <EmptyMealSlot
                  type={type}
                  onLog={() => onLogMeal(type, data.date)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
