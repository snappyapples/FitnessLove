# Longevity Nutrition Score

An adapted AHEI-2010 style 0-100 score tracking diet quality over time. The **7-day rolling average** is the primary metric.

## How to score 100 in a day (at ~2000 kcal)

| Pts | Component | Target |
|---|---|---|
| 15 | Vegetables | 5 servings (½ cup cooked or 1 cup raw each) |
| 10 | Fruit | 2 servings (1 piece or ½ cup) |
| 10 | Legumes / Soy | 1 serving (½ cup cooked beans/lentils or 4 oz tofu) |
| 10 | Whole grains | 3 servings (½ cup oats/quinoa/brown rice or 1 slice whole-wheat bread) |
| 5 | Nuts / Seeds | 1 serving (1 oz) |
| 10 | Healthy fat | 2 servings (EVOO, avocado, olives, nuts/seeds, fatty fish) |
| 10 | Fish (weekly) | 2 servings of fatty fish over the past 7 days (rolling) |
| 10 | No sugary drinks | Zero sweetened drinks |
| 10 | No red/processed meat | Zero beef, pork, lamb, bacon, sausage, deli meat |
| 10 | UPF under control | Ultra-processed < 10% of daily calories |

Positive-food targets are density-normalized per 1000 kcal, so if you eat fewer calories, you need proportionally less to hit the target.

**Plants subscore (0-50)** is the sum of vegetables + fruit + legumes + whole grains + nuts/seeds. Hitting 50/50 means nailing all five plant targets in one day. This is half the entire daily score — the single strongest longevity lever.

**"Next best bite" tip** on the dashboard points at the component with the largest current gap between your rolling 7-day average and the max. Acting on it is the highest-ROI food choice you can make next.

## Supabase schema migration

Run this once in the Supabase SQL editor (Project → SQL → New query):

```sql
-- Add scoring_mode column to settings table
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS scoring_mode TEXT NOT NULL DEFAULT 'longevity'
  CHECK (scoring_mode IN ('macros', 'longevity'));
```

No schema changes are needed on `meals` — new category/serving/processing fields live inside the existing `items` jsonb column.

## Scoring model (0-100)

### Positive components (60 pts, density-normalized per 1000 kcal)

| Component | Max pts | Target (per 1000 kcal) | Full target at 2000 kcal |
|---|---|---|---|
| Vegetables | 15 | 2.5 servings | 5 servings/day |
| Fruit | 10 | 1.0 serving | 2 servings/day |
| Legumes / Soy | 10 | 0.5 serving | 1 serving/day |
| Whole grains | 10 | 1.5 servings | 3 servings/day |
| Nuts / Seeds | 5 | 0.5 serving | 1 serving/day |
| Healthy fat quality | 10 | 1.0 serving | 2 servings/day (EVOO, avocado, olives, nuts/seeds, fatty fish) |

### Protective (10 pts, weekly)

| Component | Max pts | Target |
|---|---|---|
| Fish / Omega-3 | 10 | 2 servings/week (rolling 7-day window) |

### Harm reduction (30 pts, reverse-scored)

| Component | Max pts | Full score | Zero score |
|---|---|---|---|
| Sugary drinks | 10 | 0 svg/day | ≥2 svg/day |
| Red / processed meat | 10 | 0 svg/day | ≥1.5 combined/day (processed counts 2×) |
| Ultra-processed foods | 10 | ≤10% of kcal | ≥50% of kcal |

### Subscores

- **Plants** (0-50): vegetables + fruit + legumes + whole grains + nuts
- **Fat Quality** (0-10): healthy fat
- **Protein Quality** (0-10): fish / omega-3
- **Harm Reduction** (0-30): sugary drinks + red meat + UPF

## Implementation notes

- **Density normalization**: positive components are per-1000-kcal so the score doesn't penalize smaller eaters or reward volume.
- **Fish is rolling-7-day**: for any given day, fish score uses servings from the prior 7 days (including that day). Smooths out the "did you eat fish today" noise.
- **Empty days are excluded from rolling avg**: if you don't log on a day, it doesn't drag your 7-day average down.
- **Leafy/crucifer items double-count** as `vegetable` (they belong to both categories). The AI is instructed to include both.
- **Alcohol is not scored** (per user preference).

## Categories (stored on `FoodItem.categories`)

`vegetable | leafy_crucifer | fruit | legume_soy | whole_grain | nut_seed | healthy_fat | fish_omega3 | red_meat | processed_meat | sugary_drink | ultra_processed`

See `src/lib/openai.ts` PARSE_MEAL_PROMPT for full category definitions + serving-size reference used by the parser.
