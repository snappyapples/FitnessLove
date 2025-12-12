import { Meal, DayData, MindfulnessMetrics, MealTypeMetrics, MindfulnessReport, MealType } from '@/types'

// Thresholds for mindful eating
const CALM_THRESHOLD = 4      // 4-5 on calm scale = "eating when calm"
const HUNGER_MIN = 3          // 3-4 on hunger scale = "eating when actually hungry"
const HUNGER_MAX = 4          // (not 5 = too hungry/starving)

function isCalmMeal(meal: Meal): boolean {
  return (meal.context?.stressLevel ?? 0) >= CALM_THRESHOLD
}

function isHungryMeal(meal: Meal): boolean {
  const hunger = meal.context?.hungerLevel ?? 0
  return hunger >= HUNGER_MIN && hunger <= HUNGER_MAX
}

export function calculateMindfulnessMetrics(meals: Meal[]): MindfulnessMetrics {
  const totalMeals = meals.length
  const calmMeals = meals.filter(isCalmMeal).length
  const hungryMeals = meals.filter(isHungryMeal).length

  return {
    totalMeals,
    calmMeals,
    hungryMeals,
    calmPercent: totalMeals > 0 ? Math.round((calmMeals / totalMeals) * 100) : 0,
    hungryPercent: totalMeals > 0 ? Math.round((hungryMeals / totalMeals) * 100) : 0,
  }
}

function createEmptyMetrics(): MindfulnessMetrics {
  return {
    totalMeals: 0,
    calmMeals: 0,
    hungryMeals: 0,
    calmPercent: 0,
    hungryPercent: 0,
  }
}

export function calculateMealTypeMetrics(meals: Meal[]): MealTypeMetrics {
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'indulgence']

  const result = {} as MealTypeMetrics

  for (const type of mealTypes) {
    const typeMeals = meals.filter(m => m.type === type)
    result[type] = calculateMindfulnessMetrics(typeMeals)
  }

  return result
}

export function calculateMindfulnessReport(days: DayData[]): MindfulnessReport {
  // Sort days by date descending
  const sortedDays = [...days].sort((a, b) => b.date.localeCompare(a.date))

  // Split into this week (first 7 days) and last week (next 7 days)
  const thisWeekDays = sortedDays.slice(0, 7)
  const lastWeekDays = sortedDays.slice(7, 14)

  // Flatten meals
  const thisWeekMeals = thisWeekDays.flatMap(d => d.meals)
  const lastWeekMeals = lastWeekDays.flatMap(d => d.meals)

  // Calculate metrics
  const thisWeek = calculateMindfulnessMetrics(thisWeekMeals)
  const lastWeek = lastWeekMeals.length > 0
    ? calculateMindfulnessMetrics(lastWeekMeals)
    : null

  // Calculate by meal type (for this week only)
  const byMealType = calculateMealTypeMetrics(thisWeekMeals)

  // Calculate trends
  const trends = {
    calmDelta: lastWeek ? thisWeek.calmPercent - lastWeek.calmPercent : null,
    hungryDelta: lastWeek ? thisWeek.hungryPercent - lastWeek.hungryPercent : null,
  }

  return {
    thisWeek,
    lastWeek,
    byMealType,
    trends,
  }
}

export function getPercentColor(percent: number): 'green' | 'yellow' | 'red' {
  if (percent >= 70) return 'green'
  if (percent >= 50) return 'yellow'
  return 'red'
}

export function findWeakestMealType(byMealType: MealTypeMetrics): { type: MealType; metric: 'calm' | 'hungry'; percent: number } | null {
  const types: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

  let weakest: { type: MealType; metric: 'calm' | 'hungry'; percent: number } | null = null

  for (const type of types) {
    const metrics = byMealType[type]
    if (metrics.totalMeals === 0) continue

    // Check calm percent
    if (!weakest || metrics.calmPercent < weakest.percent) {
      weakest = { type, metric: 'calm', percent: metrics.calmPercent }
    }

    // Check hungry percent
    if (metrics.hungryPercent < weakest.percent) {
      weakest = { type, metric: 'hungry', percent: metrics.hungryPercent }
    }
  }

  return weakest
}

// Daily time series data point
export interface DailyMindfulnessPoint {
  date: string
  dayLabel: string  // e.g., "Mon", "Tue"
  calmPercent: number | null  // null if no meals that day
  hungryPercent: number | null
  totalMeals: number
}

export function calculateDailyTimeSeries(days: DayData[]): DailyMindfulnessPoint[] {
  // Sort by date ascending for time series display
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date))

  return sortedDays.map(day => {
    const metrics = calculateMindfulnessMetrics(day.meals)
    const date = new Date(day.date + 'T00:00:00')
    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' })

    return {
      date: day.date,
      dayLabel,
      calmPercent: metrics.totalMeals > 0 ? metrics.calmPercent : null,
      hungryPercent: metrics.totalMeals > 0 ? metrics.hungryPercent : null,
      totalMeals: metrics.totalMeals,
    }
  })
}
