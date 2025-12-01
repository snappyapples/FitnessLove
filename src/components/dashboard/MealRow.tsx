'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Coffee, Sun, Moon, Cookie, Cake, Pencil, Trash2 } from 'lucide-react'
import { Meal, MealType, getProteinQuality, QualityLevel, DAILY_GOALS } from '@/types'
import { cn } from '@/lib/utils'
import { useSettings } from '@/components/settings/SettingsSheet'

const mealIcons: Record<MealType, React.ReactNode> = {
  breakfast: <Coffee className="w-4 h-4" />,
  lunch: <Sun className="w-4 h-4" />,
  dinner: <Moon className="w-4 h-4" />,
  snack: <Cookie className="w-4 h-4" />,
  indulgence: <Cake className="w-4 h-4" />,
}

const mealLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  indulgence: 'Indulgence',
}

function QualityDot({ level }: { level: QualityLevel }) {
  const colorMap = {
    green: 'bg-quality-green',
    yellow: 'bg-quality-yellow',
    red: 'bg-quality-red',
    muted: 'bg-muted-foreground',
  }
  return <div className={cn('w-2 h-2 rounded-full', colorMap[level])} />
}

// Interactive metric that shows efficiency index with math breakdown in tooltip
function RatioMetric({
  value,
  unit,
  calories,
  type,
  nutrientGoal,
  calorieGoal
}: {
  value: number
  unit: string
  calories: number
  type: 'protein' | 'fiber'
  nutrientGoal: number
  calorieGoal: number
}) {
  const [showRatio, setShowRatio] = useState(false)

  // Calculate raw percentages of daily goals (for accurate efficiency)
  const rawNutrientPercent = nutrientGoal > 0 ? (value / nutrientGoal) * 100 : 0
  const rawCaloriePercent = calorieGoal > 0 ? (calories / calorieGoal) * 100 : 0

  // Efficiency calculated from raw values, then rounded
  const efficiencyIndex = rawCaloriePercent > 0 ? Math.round((rawNutrientPercent / rawCaloriePercent) * 100) : 0

  // Quality based on efficiency: green >= 100%, yellow >= 67%, red < 67%
  const quality: QualityLevel = efficiencyIndex >= 100 ? 'green' : efficiencyIndex >= 67 ? 'yellow' : 'red'

  // Format percentages for display (show <1% for small non-zero values)
  const nutrientPercent = rawNutrientPercent > 0 && rawNutrientPercent < 1 ? '<1' : Math.round(rawNutrientPercent)
  const caloriePercent = rawCaloriePercent > 0 && rawCaloriePercent < 1 ? '<1' : Math.round(rawCaloriePercent)

  const nutrientName = type === 'protein' ? 'Protein' : 'Fiber'

  const bgColors = {
    green: '#4CAF50',
    yellow: '#FFCA28',
    red: '#E53935',
    muted: '#9E9E9E',
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShowRatio(true)}
      onMouseLeave={() => setShowRatio(false)}
    >
      <span
        className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: bgColors[quality] }}
        onClick={(e) => {
          e.stopPropagation()
          setShowRatio(!showRatio)
        }}
      >
        {efficiencyIndex}%
      </span>
      {showRatio && (
        <span
          className="absolute right-0 top-full mt-2 z-[100]"
        >
          <span
            className="absolute right-2 -top-1 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: `6px solid ${bgColors[quality]}`,
            }}
          />
          <span
            className="block px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg"
            style={{
              backgroundColor: bgColors[quality],
              color: quality === 'yellow' ? '#000' : '#fff',
            }}
          >
            <span className="font-bold block">{nutrientName}: {value}g</span>
            <span className="block mt-1">Efficiency: {efficiencyIndex}% ({nutrientPercent}% of {type} vs {caloriePercent}% of cal)</span>
          </span>
        </span>
      )}
    </span>
  )
}

// Version for individual food items with colored bubble
function FoodRatioMetric({
  value,
  calories,
  type,
  nutrientGoal,
  calorieGoal
}: {
  value: number
  calories: number
  type: 'protein' | 'fiber'
  nutrientGoal: number
  calorieGoal: number
}) {
  const [showRatio, setShowRatio] = useState(false)

  // Calculate raw percentages of daily goals (for accurate efficiency)
  const rawNutrientPercent = nutrientGoal > 0 ? (value / nutrientGoal) * 100 : 0
  const rawCaloriePercent = calorieGoal > 0 ? (calories / calorieGoal) * 100 : 0

  // Efficiency calculated from raw values, then rounded
  const efficiencyIndex = rawCaloriePercent > 0 ? Math.round((rawNutrientPercent / rawCaloriePercent) * 100) : 0

  // Quality based on efficiency: green >= 100%, yellow >= 67%, red < 67%
  const quality: QualityLevel = efficiencyIndex >= 100 ? 'green' : efficiencyIndex >= 67 ? 'yellow' : 'red'

  // Format percentages for display (show <1% for small non-zero values)
  const nutrientPercent = rawNutrientPercent > 0 && rawNutrientPercent < 1 ? '<1' : Math.round(rawNutrientPercent)
  const caloriePercent = rawCaloriePercent > 0 && rawCaloriePercent < 1 ? '<1' : Math.round(rawCaloriePercent)

  const nutrientName = type === 'protein' ? 'Protein' : 'Fiber'

  const bgColors = {
    green: '#4CAF50',
    yellow: '#FFCA28',
    red: '#E53935',
    muted: '#9E9E9E',
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShowRatio(true)}
      onMouseLeave={() => setShowRatio(false)}
    >
      <span
        className="cursor-pointer inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white"
        style={{ backgroundColor: bgColors[quality] }}
        onClick={(e) => {
          e.stopPropagation()
          setShowRatio(!showRatio)
        }}
      >
        {efficiencyIndex}%
      </span>
      {showRatio && (
        <span
          className="absolute right-0 bottom-full mb-2 z-[100]"
        >
          <span
            className="block px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg"
            style={{
              backgroundColor: bgColors[quality],
              color: quality === 'yellow' ? '#000' : '#fff',
            }}
          >
            <span className="font-bold block">{nutrientName}: {value}g</span>
            <span className="block mt-1">Efficiency: {efficiencyIndex}% ({nutrientPercent}% of {type} vs {caloriePercent}% of cal)</span>
          </span>
          <span
            className="absolute right-2 -bottom-1 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${bgColors[quality]}`,
            }}
          />
        </span>
      )}
    </span>
  )
}

interface MealRowProps {
  meal: Meal
  onEdit: (meal: Meal) => void
  onDelete: (mealId: string) => void
}

export function MealRow({ meal, onEdit, onDelete }: MealRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const settings = useSettings()

  // Get goals from settings
  const calorieGoal = settings.calorieGoal || DAILY_GOALS.calories
  const proteinGoal = settings.proteinGoal || DAILY_GOALS.protein
  const fiberGoal = settings.fiberGoal || DAILY_GOALS.fiber

  const proteinPerCalorie = meal.totalCalories > 0
    ? meal.totalProtein / meal.totalCalories
    : 0
  const quality = getProteinQuality(proteinPerCalorie)

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(meal)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete(meal.id)
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{mealIcons[meal.type]}</span>
          <span className="font-medium">{mealLabels[meal.type]}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-sm">
            <span className="text-muted-foreground">{meal.totalCalories} cal</span>
            <RatioMetric
              value={meal.totalProtein}
              unit="P"
              calories={meal.totalCalories}
              type="protein"
              nutrientGoal={proteinGoal}
              calorieGoal={calorieGoal}
            />
            <RatioMetric
              value={meal.totalFiber}
              unit="F"
              calories={meal.totalCalories}
              type="fiber"
              nutrientGoal={fiberGoal}
              calorieGoal={calorieGoal}
            />
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-secondary/30 p-3 space-y-1.5">
          {meal.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-sm">
              <span className="truncate">
                {item.name}
                {item.quantity && (
                  <span className="text-muted-foreground ml-1 text-xs">({item.quantity})</span>
                )}
              </span>
              <span className="text-muted-foreground text-right w-14">{item.calories} cal</span>
              <FoodRatioMetric value={item.protein} calories={item.calories} type="protein" nutrientGoal={proteinGoal} calorieGoal={calorieGoal} />
              <FoodRatioMetric value={item.fiber} calories={item.calories} type="fiber" nutrientGoal={fiberGoal} calorieGoal={calorieGoal} />
            </div>
          ))}
          {meal.context?.notes && (
            <p className="text-sm text-muted-foreground italic mt-2 pt-2 border-t">
              {meal.context.notes}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 pt-2 border-t">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className={cn(
                "flex items-center gap-2 text-sm",
                confirmDelete
                  ? "text-red-500 font-medium"
                  : "text-muted-foreground hover:text-red-500"
              )}
            >
              <Trash2 className="w-3 h-3" />
              {confirmDelete ? "Tap again to delete" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface EmptyMealSlotProps {
  type: MealType
  onLog: () => void
}

export function EmptyMealSlot({ type, onLog }: EmptyMealSlotProps) {
  return (
    <button
      onClick={onLog}
      className="w-full flex items-center justify-between p-3 border border-dashed rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground"
    >
      <div className="flex items-center gap-3">
        <span>{mealIcons[type]}</span>
        <span>{mealLabels[type]}</span>
      </div>
      <span className="text-sm">+ Log</span>
    </button>
  )
}
