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
  const cats = item.categories ?? []
  const showUpfFromProcessing =
    item.processingLevel === 'ultra_processed' && !cats.includes('ultra_processed')
  const allChips: FoodCategory[] = showUpfFromProcessing ? [...cats, 'ultra_processed'] : cats
  if (allChips.length === 0) return null

  const textSize = size === 'sm' ? 'text-xs' : 'text-[10px]'

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
