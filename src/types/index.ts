export interface FoodItem {
  id: string
  name: string
  calories: number
  protein: number
  fiber: number
  quantity?: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'indulgence'

export interface MealContext {
  hungerLevel?: number
  stressLevel?: number
  ateWithOthers?: boolean
  notes?: string
}

export interface Meal {
  id: string
  date: string
  type: MealType
  items: FoodItem[]
  totalCalories: number
  totalProtein: number
  totalFiber: number
  context?: MealContext
  createdAt: string
}

export interface DayData {
  date: string
  meals: Meal[]
  totalCalories: number
  totalProtein: number
  totalFiber: number
  proteinPerCalorie: number
  fiberPerCalorie: number
}

// Daily goals (can be made configurable later)
export const DAILY_GOALS = {
  calories: 2000,  // Target max calories
  protein: 150,    // Target minimum protein (g)
  fiber: 30,       // Target minimum fiber (g)
}

// Goal ratios (derived from daily goals)
export const GOAL_RATIOS = {
  protein: DAILY_GOALS.protein / DAILY_GOALS.calories, // 0.075 = 7.5g per 100 cal
  fiber: DAILY_GOALS.fiber / DAILY_GOALS.calories,     // 0.015 = 1.5g per 100 cal
}

// Ratio thresholds for color coding (based on goal ratios)
export const THRESHOLDS = {
  protein: {
    green: GOAL_RATIOS.protein,        // At or above goal ratio
    yellow: GOAL_RATIOS.protein * 0.67, // 67% of goal ratio
  },
  fiber: {
    green: GOAL_RATIOS.fiber,          // At or above goal ratio
    yellow: GOAL_RATIOS.fiber * 0.67,  // 67% of goal ratio
  },
}

// Goals interface for score calculation
export interface DailyGoals {
  calories: number
  protein: number
  fiber: number
}

// Calculate daily score (0-100)
// 33.3% each for: calories (under goal), protein (meeting goal), fiber (meeting goal)
export function calculateDayScore(data: DayData, goals: DailyGoals = DAILY_GOALS): number {
  const WEIGHT = 100 / 3

  // Calories: 100% if at or under goal, scales down as you go over
  let calorieScore = 0
  if (data.totalCalories <= goals.calories) {
    calorieScore = WEIGHT // Full points for being under
  } else {
    // Gradually reduce score as you go over (0 at 1.2x the goal)
    const overBy = data.totalCalories - goals.calories
    const maxOver = goals.calories * 0.2 // 20% over = 0 points
    const penalty = Math.min(overBy / maxOver, 1)
    calorieScore = WEIGHT * (1 - penalty)
  }

  // Protein: Scale from 0% to 100% as you approach goal
  const proteinRatio = Math.min(data.totalProtein / goals.protein, 1)
  const proteinScore = WEIGHT * proteinRatio

  // Fiber: Scale from 0% to 100% as you approach goal
  const fiberRatio = Math.min(data.totalFiber / goals.fiber, 1)
  const fiberScore = WEIGHT * fiberRatio

  return Math.round(calorieScore + proteinScore + fiberScore)
}

export type QualityLevel = 'green' | 'yellow' | 'red' | 'muted'

export function getProteinQuality(proteinPerCalorie: number): QualityLevel {
  if (proteinPerCalorie >= THRESHOLDS.protein.green) return 'green'
  if (proteinPerCalorie >= THRESHOLDS.protein.yellow) return 'yellow'
  return 'red'
}

export function getFiberQuality(fiberPerCalorie: number): QualityLevel {
  if (fiberPerCalorie >= THRESHOLDS.fiber.green) return 'green'
  if (fiberPerCalorie >= THRESHOLDS.fiber.yellow) return 'yellow'
  return 'red'
}

// Mindfulness Report Types
export interface MindfulnessMetrics {
  totalMeals: number
  calmMeals: number
  hungryMeals: number
  calmPercent: number
  hungryPercent: number
}

export interface MealTypeMetrics {
  breakfast: MindfulnessMetrics
  lunch: MindfulnessMetrics
  dinner: MindfulnessMetrics
  snack: MindfulnessMetrics
  indulgence: MindfulnessMetrics
}

export interface MindfulnessReport {
  thisWeek: MindfulnessMetrics
  lastWeek: MindfulnessMetrics | null
  byMealType: MealTypeMetrics
  trends: {
    calmDelta: number | null      // percentage point change (null if no last week data)
    hungryDelta: number | null
  }
}
