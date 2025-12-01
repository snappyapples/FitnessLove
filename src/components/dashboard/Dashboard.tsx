'use client'

import { useState, useEffect, useCallback } from 'react'
import { isToday, format } from 'date-fns'
import { DayCard } from './DayCard'
import { FloatingAddButton } from '../FloatingAddButton'
import { LogMealSheet } from '../logging/LogMealSheet'
import { DayData, MealType, FoodItem, MealContext, Meal } from '@/types'

export function Dashboard() {
  const [days, setDays] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchDays = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/meals?days=7')
      if (!res.ok) throw new Error('Failed to fetch meals')
      const data = await res.json()
      setDays(data.days || [])
    } catch (err) {
      console.error('Failed to fetch days:', err)
      setError('Failed to load meals. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDays()
  }, [fetchDays])

  const handleLogMeal = (type: MealType) => {
    setEditingMeal(null)
    setSelectedMealType(type)
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
      const res = await fetch(`/api/meals?id=${mealId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete meal')
      await fetchDays()
    } catch (err) {
      console.error('Failed to delete meal:', err)
      setError('Failed to delete meal. Please try again.')
    }
  }

  const handleSaveMeal = async (items: FoodItem[], context: MealContext) => {
    if (!selectedMealType) return

    try {
      setSaving(true)
      setError(null)

      if (editingMeal) {
        // Update existing meal
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
        // Create new meal
        const today = format(new Date(), 'yyyy-MM-dd')

        const res = await fetch('/api/meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: selectedMealType,
            date: today,
            items,
            context,
          }),
        })
        if (!res.ok) throw new Error('Failed to save meal')
      }

      setEditingMeal(null)
      await fetchDays()
    } catch (err) {
      console.error('Failed to save meal:', err)
      setError('Failed to save meal. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      setEditingMeal(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading meals...</span>
        </div>
      </div>
    )
  }

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

      <div className="space-y-4 pb-24">
        {days.map((day) => (
          <DayCard
            key={day.date}
            data={day}
            defaultExpanded={isToday(new Date(day.date + 'T00:00:00'))}
            onLogMeal={handleLogMeal}
            onEditMeal={handleEditMeal}
            onDeleteMeal={handleDeleteMeal}
          />
        ))}

        {days.length === 0 && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No meals logged yet</p>
            <p className="text-sm">Tap the + button to log your first meal</p>
          </div>
        )}
      </div>

      <FloatingAddButton onSelectMeal={handleLogMeal} />

      <LogMealSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        mealType={selectedMealType}
        editingMeal={editingMeal}
        onSave={handleSaveMeal}
      />
    </>
  )
}
