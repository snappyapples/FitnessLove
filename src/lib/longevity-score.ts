import { format, subDays } from 'date-fns'
import type {
  FoodCategory,
  FoodItem,
  LongevityComponentBreakdown,
  LongevityComponentScore,
  LongevityDailyScore,
  LongevityReport,
  LongevitySubscores,
  Meal,
} from '@/types'

// Targets per 1000 kcal (for density-normalized positive components)
const TARGETS_PER_1000_KCAL = {
  vegetable: 2.5,      // 5 servings/day at 2000 kcal
  fruit: 1.0,          // 2 servings/day at 2000 kcal
  legume_soy: 0.5,     // 1 serving/day
  whole_grain: 1.5,    // 3 servings/day
  nut_seed: 0.5,       // 1 serving/day
  healthy_fat: 1.0,    // 2 servings/day
}

// Harm thresholds (absolute per day)
const SUGARY_DRINKS_ZERO_SCORE_AT = 2    // ≥2 servings/day → 0 points
const RED_MEAT_ZERO_SCORE_AT = 1.5       // combined (processed counts 2x) → 0 points
const UPF_FULL_SCORE_AT_PCT = 10         // ≤10% of kcal → full points
const UPF_ZERO_SCORE_AT_PCT = 50         // ≥50% of kcal → 0 points

// Fish (weekly)
const FISH_TARGET_PER_WEEK = 2           // servings/week for full points

// Component max points
const POINTS = {
  vegetables: 15,
  fruit: 10,
  legumes: 10,
  wholeGrains: 10,
  nutsSeeds: 5,
  healthyFat: 10,
  fish: 10,
  sugaryDrinks: 10,
  redProcessedMeat: 10,
  ultraProcessed: 10,
} as const

function clamp01(n: number): number {
  if (!isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function mkComponent(points: number, max: number, value: number): LongevityComponentScore {
  return { points: Math.round(points * 10) / 10, max, value: Math.round(value * 100) / 100 }
}

/**
 * Get servings for a specific category from a food item.
 * Falls back to 0 if item lacks categorization (backwards-compat with old meals).
 */
function itemServings(item: FoodItem, cat: FoodCategory): number {
  return item.servings?.[cat] ?? 0
}

function itemHasCategory(item: FoodItem, cat: FoodCategory): boolean {
  return !!item.categories?.includes(cat)
}

/**
 * Aggregate all servings by category and calorie totals across a list of items.
 */
export interface DayAggregate {
  totalKcal: number
  servingsByCat: Record<FoodCategory, number>
  upfKcal: number
}

export function aggregateItems(items: FoodItem[]): DayAggregate {
  const servingsByCat: Record<FoodCategory, number> = {
    vegetable: 0,
    leafy_crucifer: 0,
    fruit: 0,
    legume_soy: 0,
    whole_grain: 0,
    nut_seed: 0,
    healthy_fat: 0,
    fish_omega3: 0,
    red_meat: 0,
    processed_meat: 0,
    sugary_drink: 0,
    ultra_processed: 0,
  }

  let totalKcal = 0
  let upfKcal = 0

  for (const item of items) {
    const kcal = Number(item.calories) || 0
    totalKcal += kcal

    if (item.processingLevel === 'ultra_processed' || itemHasCategory(item, 'ultra_processed')) {
      upfKcal += kcal
    }

    for (const cat of Object.keys(servingsByCat) as FoodCategory[]) {
      servingsByCat[cat] += itemServings(item, cat)
    }
  }

  return { totalKcal, servingsByCat, upfKcal }
}

/**
 * Score a single day given its aggregate and the 7-day-rolling fish servings
 * leading up to and including that day.
 */
export function scoreDay(
  date: string,
  agg: DayAggregate,
  fishServingsLast7Days: number,
): LongevityDailyScore {
  const hasData = agg.totalKcal > 0
  const kcal1000 = agg.totalKcal / 1000

  // --- Positive components (density-normalized per 1000 kcal) ---
  const density = (cat: FoodCategory) => (kcal1000 > 0 ? agg.servingsByCat[cat] / kcal1000 : 0)

  const vegDensity = density('vegetable')
  const vegetables = mkComponent(
    clamp01(vegDensity / TARGETS_PER_1000_KCAL.vegetable) * POINTS.vegetables,
    POINTS.vegetables,
    vegDensity,
  )

  const fruitDensity = density('fruit')
  const fruit = mkComponent(
    clamp01(fruitDensity / TARGETS_PER_1000_KCAL.fruit) * POINTS.fruit,
    POINTS.fruit,
    fruitDensity,
  )

  const legumeDensity = density('legume_soy')
  const legumes = mkComponent(
    clamp01(legumeDensity / TARGETS_PER_1000_KCAL.legume_soy) * POINTS.legumes,
    POINTS.legumes,
    legumeDensity,
  )

  const wgDensity = density('whole_grain')
  const wholeGrains = mkComponent(
    clamp01(wgDensity / TARGETS_PER_1000_KCAL.whole_grain) * POINTS.wholeGrains,
    POINTS.wholeGrains,
    wgDensity,
  )

  const nsDensity = density('nut_seed')
  const nutsSeeds = mkComponent(
    clamp01(nsDensity / TARGETS_PER_1000_KCAL.nut_seed) * POINTS.nutsSeeds,
    POINTS.nutsSeeds,
    nsDensity,
  )

  const hfDensity = density('healthy_fat')
  const healthyFat = mkComponent(
    clamp01(hfDensity / TARGETS_PER_1000_KCAL.healthy_fat) * POINTS.healthyFat,
    POINTS.healthyFat,
    hfDensity,
  )

  // --- Fish (rolling 7-day) ---
  const fishPct = clamp01(fishServingsLast7Days / FISH_TARGET_PER_WEEK)
  const fish = mkComponent(fishPct * POINTS.fish, POINTS.fish, fishServingsLast7Days)

  // --- Harm (absolute per day, reverse-scored) ---
  const sdServings = agg.servingsByCat.sugary_drink
  const sugaryDrinks = mkComponent(
    clamp01(1 - sdServings / SUGARY_DRINKS_ZERO_SCORE_AT) * POINTS.sugaryDrinks,
    POINTS.sugaryDrinks,
    sdServings,
  )

  const redMeatCombined =
    agg.servingsByCat.red_meat + 2 * agg.servingsByCat.processed_meat
  const redProcessedMeat = mkComponent(
    clamp01(1 - redMeatCombined / RED_MEAT_ZERO_SCORE_AT) * POINTS.redProcessedMeat,
    POINTS.redProcessedMeat,
    redMeatCombined,
  )

  const upfPct = agg.totalKcal > 0 ? (agg.upfKcal / agg.totalKcal) * 100 : 0
  const upfScoreFrac = clamp01(
    (UPF_ZERO_SCORE_AT_PCT - upfPct) / (UPF_ZERO_SCORE_AT_PCT - UPF_FULL_SCORE_AT_PCT),
  )
  const ultraProcessed = mkComponent(upfScoreFrac * POINTS.ultraProcessed, POINTS.ultraProcessed, upfPct)

  const components: LongevityComponentBreakdown = {
    vegetables,
    fruit,
    legumes,
    wholeGrains,
    nutsSeeds,
    healthyFat,
    fish,
    sugaryDrinks,
    redProcessedMeat,
    ultraProcessed,
  }

  const totalScore = hasData
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            vegetables.points +
              fruit.points +
              legumes.points +
              wholeGrains.points +
              nutsSeeds.points +
              healthyFat.points +
              fish.points +
              sugaryDrinks.points +
              redProcessedMeat.points +
              ultraProcessed.points,
          ),
        ),
      )
    : 0

  const subscores: LongevitySubscores = {
    plants: mkComponent(
      vegetables.points + fruit.points + legumes.points + wholeGrains.points + nutsSeeds.points,
      POINTS.vegetables + POINTS.fruit + POINTS.legumes + POINTS.wholeGrains + POINTS.nutsSeeds,
      0,
    ),
    fatQuality: mkComponent(healthyFat.points, POINTS.healthyFat, 0),
    proteinQuality: mkComponent(fish.points, POINTS.fish, 0),
    harmReduction: mkComponent(
      sugaryDrinks.points + redProcessedMeat.points + ultraProcessed.points,
      POINTS.sugaryDrinks + POINTS.redProcessedMeat + POINTS.ultraProcessed,
      0,
    ),
  }

  return { date, totalScore, hasData, components, subscores }
}

/**
 * Given all meals in a window and a "today" date, produce a full LongevityReport
 * covering today + last 6 days (7-day rolling) with this-week vs last-week deltas.
 * Caller should pass meals covering at least the last 14 days for lastWeekAvg to populate.
 */
export function buildLongevityReport(meals: Meal[], today: Date = new Date()): LongevityReport {
  // Build an index of meals by date
  const mealsByDate: Record<string, Meal[]> = {}
  for (const m of meals) {
    if (!mealsByDate[m.date]) mealsByDate[m.date] = []
    mealsByDate[m.date].push(m)
  }

  // Score a single date, including its rolling-7 fish window
  const scoreForDate = (d: Date): LongevityDailyScore => {
    const dateStr = format(d, 'yyyy-MM-dd')
    const dayMeals = mealsByDate[dateStr] || []
    const items: FoodItem[] = dayMeals.flatMap((m) => m.items || [])
    const agg = aggregateItems(items)

    // Sum fish servings over rolling 7-day window ending on this date
    let fish7 = 0
    for (let i = 0; i < 7; i++) {
      const windowDate = format(subDays(d, i), 'yyyy-MM-dd')
      const windowMeals = mealsByDate[windowDate] || []
      for (const m of windowMeals) {
        for (const item of m.items || []) {
          fish7 += itemServings(item, 'fish_omega3')
        }
      }
    }

    return scoreDay(dateStr, agg, fish7)
  }

  // Compute daily scores for last 14 days (today back 13)
  const last14: LongevityDailyScore[] = []
  for (let i = 0; i < 14; i++) {
    last14.push(scoreForDate(subDays(today, i)))
  }

  const thisWeek = last14.slice(0, 7)  // most recent 7 days, index 0 = today
  const lastWeek = last14.slice(7, 14) // prior 7 days

  const avgOf = (days: LongevityDailyScore[]): number | null => {
    const withData = days.filter((d) => d.hasData)
    if (withData.length === 0) return null
    return (
      Math.round((withData.reduce((s, d) => s + d.totalScore, 0) / withData.length) * 10) / 10
    )
  }

  const thisWeekAvg = avgOf(thisWeek) ?? 0
  const lastWeekAvg = avgOf(lastWeek)
  const rollingHasData = thisWeek.some((d) => d.hasData)
  const weeklyDelta = lastWeekAvg !== null ? Math.round((thisWeekAvg - lastWeekAvg) * 10) / 10 : null

  // Rolling-window subscores: avg subscore points across days with data
  const subscoresRolling = avgSubscores(thisWeek)

  return {
    todayScore: thisWeek[0],
    rollingScore: thisWeekAvg,
    rollingHasData,
    dailyScores: thisWeek,
    subscoresRolling,
    thisWeekAvg,
    lastWeekAvg,
    weeklyDelta,
  }
}

function avgSubscores(days: LongevityDailyScore[]): LongevitySubscores {
  const withData = days.filter((d) => d.hasData)
  const avg = (picker: (d: LongevityDailyScore) => LongevityComponentScore): LongevityComponentScore => {
    if (withData.length === 0) {
      const first = picker(days[0] || ({} as LongevityDailyScore))
      return mkComponent(0, first?.max ?? 0, 0)
    }
    const totalPts = withData.reduce((s, d) => s + picker(d).points, 0)
    const max = picker(withData[0]).max
    return mkComponent(totalPts / withData.length, max, 0)
  }

  return {
    plants: avg((d) => d.subscores.plants),
    fatQuality: avg((d) => d.subscores.fatQuality),
    proteinQuality: avg((d) => d.subscores.proteinQuality),
    harmReduction: avg((d) => d.subscores.harmReduction),
  }
}
