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

// Harm thresholds (absolute per day — scaled by windowDays for rolling windows)
const SUGARY_DRINKS_ZERO_SCORE_AT_PER_DAY = 2
const RED_MEAT_ZERO_SCORE_AT_PER_DAY = 1.5
const UPF_FULL_SCORE_AT_PCT = 10
const UPF_ZERO_SCORE_AT_PCT = 50

// Fish target (rolling, always a weekly quantity regardless of computation window)
const FISH_TARGET_PER_WEEK = 2

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

function itemServings(item: FoodItem, cat: FoodCategory): number {
  return item.servings?.[cat] ?? 0
}

function itemHasCategory(item: FoodItem, cat: FoodCategory): boolean {
  return !!item.categories?.includes(cat)
}

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
 * Core scoring computation. Given an aggregate, a fish-servings total for the
 * rolling window, and the window size in days, produces the full score.
 *
 * - Positive components are density-normalized per 1000 kcal (scale-free).
 * - Fish target is always FISH_TARGET_PER_WEEK over 7 days; for longer/shorter
 *   windows it scales linearly.
 * - Harm thresholds (sugary drinks, red meat) scale with windowDays.
 * - UPF is a ratio of window kcal — already scale-free.
 */
function computeScore(
  date: string,
  agg: DayAggregate,
  fishServings: number,
  windowDays: number,
): LongevityDailyScore {
  const hasData = agg.totalKcal > 0
  const kcal1000 = agg.totalKcal / 1000

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

  // Fish target scales with window (2/week = 2/7 per day)
  const fishTarget = FISH_TARGET_PER_WEEK * (windowDays / 7)
  const fishPct = fishTarget > 0 ? clamp01(fishServings / fishTarget) : 0
  const fish = mkComponent(fishPct * POINTS.fish, POINTS.fish, fishServings)

  // Harm thresholds scale with window
  const sdServings = agg.servingsByCat.sugary_drink
  const sdZeroAt = SUGARY_DRINKS_ZERO_SCORE_AT_PER_DAY * windowDays
  const sugaryDrinks = mkComponent(
    clamp01(1 - sdServings / sdZeroAt) * POINTS.sugaryDrinks,
    POINTS.sugaryDrinks,
    sdServings,
  )

  const redMeatCombined = agg.servingsByCat.red_meat + 2 * agg.servingsByCat.processed_meat
  const rmZeroAt = RED_MEAT_ZERO_SCORE_AT_PER_DAY * windowDays
  const redProcessedMeat = mkComponent(
    clamp01(1 - redMeatCombined / rmZeroAt) * POINTS.redProcessedMeat,
    POINTS.redProcessedMeat,
    redMeatCombined,
  )

  // UPF is a ratio — scale-free
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
 * Score a single day given its aggregate and the 7-day-rolling fish servings
 * leading up to and including that day. Used for per-day breakdowns in the UI.
 */
export function scoreDay(
  date: string,
  agg: DayAggregate,
  fishServingsLast7Days: number,
): LongevityDailyScore {
  return computeScore(date, agg, fishServingsLast7Days, 1)
}

/**
 * Score an arbitrary rolling window of items. All positive/harm components are
 * computed against the whole-window totals; density-normalization and ratios
 * make this continuous — one more apple nudges the score by the right fraction
 * regardless of which "day" it lands on.
 */
export function scoreWindow(items: FoodItem[], windowDays: number = 7): LongevityDailyScore {
  const agg = aggregateItems(items)
  const fishServings = agg.servingsByCat.fish_omega3
  return computeScore('', agg, fishServings, windowDays)
}

/**
 * Given all meals in a window and a "today" date, produce a full LongevityReport.
 * The primary `rollingScore` is a pure 7-day window score (continuously updating),
 * not an average of daily scores. Day-level scores are still produced for the
 * per-day breakdown UI.
 *
 * Caller should pass meals covering at least the last 14 days so that
 * `weeklyDelta` (this 7-day window vs. the prior 7-day window) can be computed.
 */
export function buildLongevityReport(meals: Meal[], today: Date = new Date()): LongevityReport {
  const mealsByDate: Record<string, Meal[]> = {}
  for (const m of meals) {
    if (!mealsByDate[m.date]) mealsByDate[m.date] = []
    mealsByDate[m.date].push(m)
  }

  const itemsInRange = (startOffset: number, endOffset: number): FoodItem[] => {
    const out: FoodItem[] = []
    for (let i = startOffset; i < endOffset; i++) {
      const dateStr = format(subDays(today, i), 'yyyy-MM-dd')
      const dayMeals = mealsByDate[dateStr] || []
      for (const m of dayMeals) out.push(...(m.items || []))
    }
    return out
  }

  const currentWindowItems = itemsInRange(0, 7)
  const priorWindowItems = itemsInRange(7, 14)

  const currentWindow = scoreWindow(currentWindowItems, 7)
  const priorWindow = scoreWindow(priorWindowItems, 7)

  // Per-day scores for the day cards. Fish for a given day still uses the
  // trailing-7-day count (unchanged behavior).
  const scoreForDate = (d: Date): LongevityDailyScore => {
    const dateStr = format(d, 'yyyy-MM-dd')
    const dayMeals = mealsByDate[dateStr] || []
    const items: FoodItem[] = dayMeals.flatMap((m) => m.items || [])
    const agg = aggregateItems(items)

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

  const dailyScores: LongevityDailyScore[] = []
  for (let i = 0; i < 7; i++) {
    dailyScores.push(scoreForDate(subDays(today, i)))
  }

  const rollingHasData = currentWindow.hasData
  const priorHasData = priorWindow.hasData
  const rollingScore = currentWindow.totalScore
  const priorRollingScore = priorWindow.totalScore
  const weeklyDelta = priorHasData
    ? Math.round((rollingScore - priorRollingScore) * 10) / 10
    : null

  return {
    todayScore: dailyScores[0],
    rollingScore,
    rollingHasData,
    dailyScores,
    subscoresRolling: currentWindow.subscores,
    componentsRolling: currentWindow.components,
    thisWeekAvg: rollingScore,
    lastWeekAvg: priorHasData ? priorRollingScore : null,
    weeklyDelta,
  }
}

/**
 * Returns the single highest-impact food recommendation to improve the
 * rolling score. Reads component gaps directly from the current window.
 */
export interface NextMealTip {
  component:
    | 'vegetables'
    | 'fruit'
    | 'legumes'
    | 'wholeGrains'
    | 'nutsSeeds'
    | 'healthyFat'
    | 'fish'
    | 'sugaryDrinks'
    | 'redProcessedMeat'
    | 'ultraProcessed'
    | 'none'
  label: string
  gapPoints: number
  suggestion: string
  kind: 'add' | 'avoid'
}

export function getNextMealTip(report: LongevityReport): NextMealTip {
  if (!report.rollingHasData) {
    return {
      component: 'none',
      label: '',
      gapPoints: 0,
      suggestion: 'Log a meal to get a personalized tip.',
      kind: 'add',
    }
  }

  const c = report.componentsRolling

  const candidates = [
    {
      id: 'vegetables' as const,
      label: 'Vegetables',
      max: c.vegetables.max,
      current: c.vegetables.points,
      kind: 'add' as const,
      suggestion: 'Add a 1-cup salad or ½ cup roasted broccoli/cauliflower to your next meal.',
    },
    {
      id: 'fruit' as const,
      label: 'Fruit',
      max: c.fruit.max,
      current: c.fruit.points,
      kind: 'add' as const,
      suggestion: 'Grab a piece of whole fruit or ½ cup berries — berries punch above their weight.',
    },
    {
      id: 'legumes' as const,
      label: 'Legumes / Soy',
      max: c.legumes.max,
      current: c.legumes.points,
      kind: 'add' as const,
      suggestion: 'Add ½ cup beans, lentils, or 4 oz tofu to your next meal.',
    },
    {
      id: 'wholeGrains' as const,
      label: 'Whole grains',
      max: c.wholeGrains.max,
      current: c.wholeGrains.points,
      kind: 'add' as const,
      suggestion: 'Swap white rice/bread for oats, quinoa, brown rice, or 100% whole-wheat bread.',
    },
    {
      id: 'nutsSeeds' as const,
      label: 'Nuts / Seeds',
      max: c.nutsSeeds.max,
      current: c.nutsSeeds.points,
      kind: 'add' as const,
      suggestion: 'Have a 1 oz handful of walnuts, almonds, or pistachios as a snack.',
    },
    {
      id: 'healthyFat' as const,
      label: 'Healthy fat',
      max: c.healthyFat.max,
      current: c.healthyFat.points,
      kind: 'add' as const,
      suggestion: 'Drizzle 1 tbsp extra-virgin olive oil on your next meal, or add ½ avocado.',
    },
    {
      id: 'fish' as const,
      label: 'Fish',
      max: c.fish.max,
      current: c.fish.points,
      kind: 'add' as const,
      suggestion: 'Plan a 3.5 oz serving of salmon, sardines, or mackerel this week — 2 servings maxes this out.',
    },
    {
      id: 'sugaryDrinks' as const,
      label: 'Sugary drinks',
      max: c.sugaryDrinks.max,
      current: c.sugaryDrinks.points,
      kind: 'avoid' as const,
      suggestion: 'Swap sweetened drinks (soda, juice, sweet coffee) for water, sparkling water, or unsweetened tea.',
    },
    {
      id: 'redProcessedMeat' as const,
      label: 'Red / processed meat',
      max: c.redProcessedMeat.max,
      current: c.redProcessedMeat.points,
      kind: 'avoid' as const,
      suggestion: 'Swap red meat or deli meat for poultry, fish, tofu, or beans at your next meal.',
    },
    {
      id: 'ultraProcessed' as const,
      label: 'Ultra-processed',
      max: c.ultraProcessed.max,
      current: c.ultraProcessed.points,
      kind: 'avoid' as const,
      suggestion: 'Skip packaged snacks, fast food, and sweetened cereals — pick fruit, nuts, or yogurt.',
    },
  ]

  let best = candidates[0]
  let bestGap = best.max - best.current
  for (const cand of candidates.slice(1)) {
    const gap = cand.max - cand.current
    if (gap > bestGap + 0.01 || (Math.abs(gap - bestGap) < 0.01 && cand.max > best.max)) {
      best = cand
      bestGap = gap
    }
  }

  return {
    component: best.id,
    label: best.label,
    gapPoints: Math.round(bestGap * 10) / 10,
    suggestion: best.suggestion,
    kind: best.kind,
  }
}
