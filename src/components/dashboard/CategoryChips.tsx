'use client'

import type { FoodCategory, FoodItem } from '@/types'

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  vegetable: 'Veg',
  leafy_crucifer: 'Leafy/Cruc.',
  fruit: 'Fruit',
  legume_soy: 'Legume',
  whole_grain: 'Whole Grain',
  nut_seed: 'Nut/Seed',
  healthy_fat: 'Healthy Fat',
  fish_omega3: 'Fish',
  red_meat: 'Red Meat',
  processed_meat: 'Processed Meat',
  sugary_drink: 'Sugary Drink',
  ultra_processed: 'UPF',
}

export const POSITIVE_CATEGORIES: FoodCategory[] = [
  'vegetable',
  'leafy_crucifer',
  'fruit',
  'legume_soy',
  'whole_grain',
  'nut_seed',
  'healthy_fat',
  'fish_omega3',
]

interface Props {
  item: FoodItem
  size?: 'sm' | 'xs'
}

export function CategoryChips({ item, size = 'xs' }: Props) {
  // Item was never classified (legacy meal pre-backfill) — render nothing.
  if (item.categories === undefined) return null

  const cats = item.categories
  const showUpfFromProcessing =
    item.processingLevel === 'ultra_processed' && !cats.includes('ultra_processed')
  const allChips: FoodCategory[] = showUpfFromProcessing ? [...cats, 'ultra_processed'] : cats
  const textSize = size === 'sm' ? 'text-sm' : 'text-xs'

  if (allChips.length === 0) {
    // Classifier evaluated the item but it doesn't fit any scoring category —
    // show a neutral chip so the user sees it was processed, not forgotten.
    return (
      <div className="flex flex-wrap gap-1">
        <span
          className={`px-1.5 py-0.5 ${textSize} font-medium rounded bg-muted text-muted-foreground`}
          title="No scoring impact"
        >
          Neutral
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {allChips.map((cat) => {
        const isPositive = POSITIVE_CATEGORIES.includes(cat)
        const servings = item.servings?.[cat]
        const colorClass = isPositive
          ? 'bg-quality-green/15 text-quality-green'
          : 'bg-quality-red/15 text-quality-red'
        return (
          <span
            key={cat}
            className={`px-1.5 py-0.5 ${textSize} font-medium rounded ${colorClass}`}
          >
            {CATEGORY_LABELS[cat]}
            {servings !== undefined && cat !== 'ultra_processed' && ` · ${servings}`}
          </span>
        )
      })}
    </div>
  )
}
