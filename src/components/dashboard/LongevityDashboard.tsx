'use client'

import { useState, useEffect, useCallback } from 'react'
import { isToday, format } from 'date-fns'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { FloatingAddButton } from '../FloatingAddButton'
import { LogMealSheet } from '../logging/LogMealSheet'
import { LongevityScoreRing } from './LongevityScoreRing'
import { LongevityDayCard } from './LongevityDayCard'
import { LongevityHelpSheet } from './LongevityHelpSheet'
import { LongevityComponentList } from './LongevityComponentList'
import { QuickLogInput } from './QuickLogInput'
import type { DayData, FoodItem, LongevityReport, Meal, MealContext, MealType } from '@/types'
import { buildLongevityReport } from '@/lib/longevity-score'
import { cn } from '@/lib/utils'

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-xs text-muted-foreground">No prior week data</span>
  }
  const isUp = delta > 0.5
  const isDown = delta < -0.5
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus
  const color = isUp ? 'text-quality-green' : isDown ? 'text-quality-red' : 'text-muted-foreground'
  const sign = delta > 0 ? '+' : ''
  return (
    <div className={cn('flex items-center gap-1 text-sm font-medium', color)}>
      <Icon className="w-4 h-4" />
      <span>
        {sign}
        {delta.toFixed(1)} vs previous 7 days
      </span>
    </div>
  )
}

export function LongevityDashboard() {
  const [days, setDays] = useState<DayData[]>([])
  const [allMeals, setAllMeals] = useState<Meal[]>([])
  const [report, setReport] = useState<LongevityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const today = format(new Date(), 'yyyy-MM-dd')
      // Fetch 14 days so we can compute this-week vs last-week delta
      const res = await fetch(`/api/meals?days=14&today=${today}`)
      if (!res.ok) throw new Error('Failed to fetch meals')
      const data = await res.json()
      const allDays: DayData[] = data.days || []
      const flattened: Meal[] = allDays.flatMap((d) => d.meals)
      setAllMeals(flattened)
      setDays(allDays.slice(0, 7))
      setReport(buildLongevityReport(flattened, new Date()))
    } catch (err) {
      console.error('Failed to fetch longevity data:', err)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleLogMeal = (type: MealType, date: string) => {
    setEditingMeal(null)
    setSelectedMealType(type)
    setSelectedDate(date)
    setSheetOpen(true)
  }

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal(meal)
    setSelectedMealType(meal.type)
    setSheetOpen(true)
  }

  const handleDeleteMeal = async (mealId: string) => {
    try {
      setError(null)
      const res = await fetch(`/api/meals?id=${mealId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete meal')
      await fetchData()
    } catch (err) {
      console.error('Failed to delete meal:', err)
      setError('Failed to delete meal. Please try again.')
    }
  }

  const handleSaveMeal = async (items: FoodItem[], context: MealContext) => {
    if (!selectedMealType) return
    try {
      setError(null)
      if (editingMeal) {
        const res = await fetch('/api/meals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingMeal.id,
            type: selectedMealType,
            date: editingMeal.date,
            items,
            context,
          }),
        })
        if (!res.ok) throw new Error('Failed to update meal')
      } else {
        const mealDate = selectedDate || format(new Date(), 'yyyy-MM-dd')
        const res = await fetch('/api/meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: selectedMealType,
            date: mealDate,
            items,
            context,
          }),
        })
        if (!res.ok) throw new Error('Failed to save meal')
      }
      setEditingMeal(null)
      await fetchData()
    } catch (err) {
      console.error('Failed to save meal:', err)
      setError('Failed to save meal. Please try again.')
    }
  }

  const handleQuickSave = async (type: MealType, date: string, items: FoodItem[]) => {
    setError(null)
    const res = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, date, items, context: {} }),
    })
    if (!res.ok) throw new Error('Failed to save meal')
    await fetchData()
  }

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      setEditingMeal(null)
      setSelectedDate(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading longevity score...</span>
        </div>
      </div>
    )
  }

  // Map scored days by date for quick lookup in day card rendering
  const scoresByDate = new Map(report?.dailyScores.map((s) => [s.date, s]) ?? [])

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {report && (
        <Card className="mb-4 p-5">
          <div className="flex items-center gap-5">
            <LongevityScoreRing
              score={report.rollingScore}
              hasData={report.rollingHasData}
              size={140}
              strokeWidth={12}
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Longevity Score
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Rolling 7-day window
                  </div>
                </div>
                <LongevityHelpSheet />
              </div>
              <DeltaBadge delta={report.weeklyDelta} />
            </div>
          </div>

          <LongevityComponentList report={report} />
        </Card>
      )}

      <QuickLogInput meals={allMeals} onSave={handleQuickSave} />

      <div className="space-y-4 pb-24">
        {days.map((day) => {
          const dayScore = scoresByDate.get(day.date)
          if (!dayScore) return null
          return (
            <LongevityDayCard
              key={day.date}
              data={day}
              score={dayScore}
              defaultExpanded={isToday(new Date(day.date + 'T00:00:00'))}
              onLogMeal={handleLogMeal}
              onEditMeal={handleEditMeal}
              onDeleteMeal={handleDeleteMeal}
            />
          )
        })}

        {days.length === 0 && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No meals logged yet</p>
            <p className="text-sm">Tap the + button to log your first meal</p>
          </div>
        )}
      </div>

      <FloatingAddButton onSelectMeal={handleLogMeal} defaultDate={format(new Date(), 'yyyy-MM-dd')} />

      <LogMealSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        mealType={selectedMealType}
        editingMeal={editingMeal}
        onSave={handleSaveMeal}
        hideMindfulness
      />
    </>
  )
}
