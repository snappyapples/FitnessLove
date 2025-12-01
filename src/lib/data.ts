import { promises as fs } from 'fs'
import path from 'path'
import { Meal, DayData } from '@/types'

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'meals.json')

interface MealsData {
  meals: Meal[]
}

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ meals: [] }, null, 2))
  }
}

export async function getMeals(): Promise<Meal[]> {
  await ensureDataFile()
  const data = await fs.readFile(DATA_FILE, 'utf-8')
  const parsed: MealsData = JSON.parse(data)
  return parsed.meals
}

export async function saveMeal(meal: Meal): Promise<Meal> {
  const meals = await getMeals()
  meals.push(meal)
  await fs.writeFile(DATA_FILE, JSON.stringify({ meals }, null, 2))
  return meal
}

export async function updateMeal(updatedMeal: Meal): Promise<Meal> {
  const meals = await getMeals()
  const index = meals.findIndex(m => m.id === updatedMeal.id)
  if (index === -1) {
    throw new Error('Meal not found')
  }
  meals[index] = updatedMeal
  await fs.writeFile(DATA_FILE, JSON.stringify({ meals }, null, 2))
  return updatedMeal
}

export async function deleteMeal(mealId: string): Promise<void> {
  const meals = await getMeals()
  const filtered = meals.filter(m => m.id !== mealId)
  await fs.writeFile(DATA_FILE, JSON.stringify({ meals: filtered }, null, 2))
}

export async function getMealsByDate(date: string): Promise<Meal[]> {
  const meals = await getMeals()
  return meals.filter(m => m.date === date)
}

export async function getDayData(date: string): Promise<DayData> {
  const meals = await getMealsByDate(date)

  const totalCalories = meals.reduce((sum, m) => sum + m.totalCalories, 0)
  const totalProtein = meals.reduce((sum, m) => sum + m.totalProtein, 0)
  const totalFiber = meals.reduce((sum, m) => sum + m.totalFiber, 0)

  return {
    date,
    meals,
    totalCalories,
    totalProtein,
    totalFiber,
    proteinPerCalorie: totalCalories > 0 ? totalProtein / totalCalories : 0,
    fiberPerCalorie: totalCalories > 0 ? totalFiber / totalCalories : 0,
  }
}

function getLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function getRecentDays(count: number = 7): Promise<DayData[]> {
  const meals = await getMeals()

  // Get unique dates
  const dates = [...new Set(meals.map(m => m.date))].sort().reverse().slice(0, count)

  // Add today if not present (using local time)
  const today = getLocalDateString()
  if (!dates.includes(today)) {
    dates.unshift(today)
  }

  // Get day data for each date
  const days = await Promise.all(dates.map(getDayData))
  return days
}
