# Longevity Nutrition Score

An adapted AHEI-2010 style 0-100 score tracking diet quality over time. The score is a **pure 7-day rolling window** — every item you log enters the current window, and the score updates continuously. No daily reset, no averaging of daily scores.

## What a 100 looks like (daily average at ~2,000 kcal)

Targets are expressed as a *per-day average* across the 7-day window — so 5 veg/day means 35 veg across the last 7 days. A big-salad day can offset a light day.

| Pts | Component | Target (per day avg) |
|---|---|---|
| 15 | Vegetables | 5 servings (½ cup cooked or 1 cup raw each) |
| 10 | Fruit | 2 servings (1 piece or ½ cup) |
| 10 | Legumes / Soy | 1 serving (½ cup cooked beans/lentils or 4 oz tofu) |
| 10 | Whole grains | 3 servings (½ cup oats/quinoa/brown rice or 1 slice whole-wheat bread) |
| 5 | Nuts / Seeds | 1 serving (1 oz) |
| 10 | Healthy fat | 2 servings (EVOO, avocado, olives, nuts/seeds, fatty fish) |
| 10 | Fish | 2 servings of fatty fish over the 7-day window |
| 10 | No sugary drinks | Zero sweetened drinks |
| 10 | No red/processed meat | Zero beef, pork, lamb, bacon, sausage, deli meat |
| 10 | UPF under control | Ultra-processed < 10% of window calories |

Positive-food targets are density-normalized per 1,000 kcal, so if you eat fewer calories, you need proportionally less to hit the target. Harm thresholds (sugary drinks, red meat) scale with the window — so `≥2 sugary drinks/day` becomes `≥14 over 7 days` for a zero score.

## Architecture

### Data flow

```
User logs meal (natural language)
    ↓
POST /api/parse-meal → OpenAI gpt-5-mini parses text into FoodItem[]
    ↓                  (includes name, cal/P/F, categories, servings, processingLevel)
User confirms + sets hunger/calm
    ↓
POST /api/meals → Supabase `meals` row (items in jsonb)
    ↓
Dashboard fetches GET /api/meals?days=14&today=YYYY-MM-DD
    ↓
Client: buildLongevityReport(meals, today) in src/lib/longevity-score.ts
    ↓
LongevityDashboard renders: 7-day ring, today's score, subscores, day cards, tip
```

### Key files

| File | Role |
|---|---|
| [src/types/index.ts](../src/types/index.ts) | `FoodCategory`, `ProcessingLevel`, `ScoringMode`, `LongevityReport`, etc. |
| [src/lib/longevity-score.ts](../src/lib/longevity-score.ts) | All scoring logic: `scoreDay`, `buildLongevityReport`, `getNextMealTip` |
| [src/lib/openai.ts](../src/lib/openai.ts) | `PARSE_MEAL_PROMPT` — classifies items on the way in |
| [src/app/api/parse-meal/route.ts](../src/app/api/parse-meal/route.ts) | Uses gpt-5-mini; passes category/serving/processing fields through |
| [src/app/api/settings/route.ts](../src/app/api/settings/route.ts) | `scoring_mode` column; defaults to `'longevity'` |
| [src/components/dashboard/Dashboard.tsx](../src/components/dashboard/Dashboard.tsx) | Routes on `scoringMode` to either `MacrosDashboard` (existing) or `LongevityDashboard` |
| [src/components/dashboard/LongevityDashboard.tsx](../src/components/dashboard/LongevityDashboard.tsx) | Main longevity view: score card, subscores, tip, day list |
| [src/components/dashboard/LongevityDayCard.tsx](../src/components/dashboard/LongevityDayCard.tsx) | Per-day card with score ring + subscore bars + meals |
| [src/components/dashboard/LongevityScoreRing.tsx](../src/components/dashboard/LongevityScoreRing.tsx) | Reusable 0-100 ring (used in header + day cards) |
| [src/components/dashboard/LongevitySubscoreBar.tsx](../src/components/dashboard/LongevitySubscoreBar.tsx) | Horizontal filled bar for subscore display |
| [src/components/dashboard/LongevityHelpSheet.tsx](../src/components/dashboard/LongevityHelpSheet.tsx) | In-app explainer reachable via `?` button |
| [src/components/dashboard/CategoryChips.tsx](../src/components/dashboard/CategoryChips.tsx) | Shared chip rendering for item categories |
| [src/components/dashboard/MealRow.tsx](../src/components/dashboard/MealRow.tsx) | Mode-aware: macros shows efficiency, longevity shows category chips |
| [scripts/backfill-longevity.mjs](../scripts/backfill-longevity.mjs) | One-off re-classifier (see [BACKFILL.md](./BACKFILL.md)) |

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

### Protective (10 pts, rolling 7-day)

| Component | Max pts | Target |
|---|---|---|
| Fish / Omega-3 | 10 | 2 servings of fatty fish over the previous 7 days (rolling window) |

### Harm reduction (30 pts, reverse-scored, absolute per day)

| Component | Max pts | Full score | Zero score |
|---|---|---|---|
| Sugary drinks | 10 | 0 svg/day | ≥2 svg/day |
| Red / processed meat | 10 | 0 svg/day | ≥1.5 combined/day (processed counts 2×) |
| Ultra-processed foods | 10 | ≤10% of kcal | ≥50% of kcal |

### Subscores

- **Plants** (0-50): vegetables + fruit + legumes + whole grains + nuts/seeds — half the whole score, the strongest longevity lever.
- **Fat Quality** (0-10): healthy fat servings
- **Protein Quality** (0-10): fatty fish (rolling 7-day)
- **Harm Reduction** (0-30): sugary drinks + red meat + UPF penalty

## Categories

Stored on each `FoodItem` under the `categories` field. An item can belong to multiple (e.g. salad with olive oil and walnuts → `vegetable` + `healthy_fat` + `nut_seed`).

| Category | Notes |
|---|---|
| `vegetable` | Non-starchy. Potatoes do NOT qualify. |
| `leafy_crucifer` | Leafy greens or crucifers. Also includes `vegetable`. |
| `fruit` | Whole fruit only. Juice is `sugary_drink`. |
| `legume_soy` | Beans, lentils, chickpeas, tofu, tempeh, edamame. |
| `whole_grain` | Oats, brown rice, quinoa, farro, 100% whole-wheat. Refined grains do NOT qualify. |
| `nut_seed` | Nuts, seeds, nut butters. |
| `healthy_fat` | EVOO, avocado, olives, fatty fish, nuts/seeds. Butter/coconut oil do NOT qualify. |
| `fish_omega3` | Fatty fish (salmon, sardines, trout, herring, mackerel, anchovies). Lean white fish does NOT qualify. |
| `red_meat` | Unprocessed beef, pork, lamb, bison, venison, goat. **Poultry is NOT red meat** — chicken/turkey/duck belong to no positive category. |
| `processed_meat` | Bacon, sausage, hot dog, deli meat, salami, jerky. Chicken sausage and turkey bacon still count. |
| `sugary_drink` | Soda, sweetened coffee, sports drinks, fruit juice, sweet tea. |
| `ultra_processed` | NOVA group 4: chips, candy, cookies, packaged snacks, fast food, frozen ready meals, sweetened cereals. Includes breaded/fried takeout (orange chicken, nuggets, tempura) and sugary-sauced dishes. |

See [src/lib/openai.ts](../src/lib/openai.ts) `PARSE_MEAL_PROMPT` for the full classification rules.

### Neutral items

Items that the classifier evaluated but don't fit any scoring category (white rice, plain chicken, eggs, plain dairy) are returned with `categories: []`. The UI renders a gray `Neutral` chip on those so users know it was processed, not forgotten. Items with `categories === undefined` (pre-backfill legacy) render nothing.

### Processing level

Each item also has a `processingLevel`: `'whole' | 'minimal' | 'processed' | 'ultra_processed'`. Currently only `ultra_processed` affects scoring (via the UPF share-of-kcal penalty) but we store all four for future use. Items marked `ultra_processed` via `processingLevel` show the UPF chip even if the `ultra_processed` category wasn't explicitly set.

## Helpers

### `buildLongevityReport(meals: Meal[], today: Date)`

Takes all meals from the last 14 days and returns a `LongevityReport`:

- `rollingScore` — **primary metric.** Pure 7-day window score (0-100), computed in one shot from all items in the window — not an average of daily scores.
- `rollingHasData` — true if any items in the 7-day window
- `subscoresRolling` — the four subscores of the current window
- `componentsRolling` — full 10-component breakdown of the current window (used by `getNextMealTip`)
- `lastWeekAvg` / `weeklyDelta` — the prior 7-day window score (days 8-14 back) and the current-vs-prior delta
- `dailyScores[]` — per-day breakdown for the last 7 days (for day cards)
- `todayScore` — alias for `dailyScores[0]`; the single-day score for today, useful in the per-day view but **not** the headline metric

### `scoreWindow(items, windowDays=7)`

Scores an arbitrary rolling window of items. Positive components are density-normalized per 1,000 kcal (scale-free); harm thresholds scale with `windowDays`; fish target is `2 × (windowDays / 7)`.

### `scoreDay(date, agg, fishServingsLast7Days)`

Scores a single day (for day-card display only). Internally delegates to the same core computation as `scoreWindow` with `windowDays=1` and an externally-supplied 7-day fish count.

### `getNextMealTip(report: LongevityReport)`

Identifies the single scoring component with the largest current gap between the rolling 7-day average and its max. Returns a concrete food suggestion (e.g. "Add a 1-cup salad or ½ cup roasted broccoli to your next meal"). Tie-breaker prefers components with higher max points (more upside). Returns `component: 'none'` if no meals are logged yet.

The UI hides the tip when `gapPoints < 0.5` (the user is effectively optimized).

## Implementation notes

- **Pure rolling window**: the headline `rollingScore` is computed in one shot from all items in the last 7 days. There is no daily reset and no averaging of daily scores — logging any single item nudges the score by exactly its contribution to the weekly totals.
- **Density normalization**: positive components are per-1,000 kcal so the score doesn't penalize smaller eaters or reward volume. Works identically on a 1-day or 7-day aggregate.
- **Harm thresholds scale with the window**: `≥2 sugary drinks/day` becomes `≥14 over 7 days`. UPF is a ratio (% of kcal) so it's already scale-free.
- **Fish is a weekly target**: `2 servings per 7 days`. Same over the rolling window as it was per-day (since the target always referred to a week).
- **Per-day cards still use `scoreDay`**: the day-by-day breakdown is useful for pattern-spotting but isn't the headline metric. Today's per-day score will look low early in the day (partial data) — that's why we moved the headline to the window score.
- **Leafy/crucifer items double-count** as `vegetable` (they belong to both categories). The prompt instructs the model to include both.
- **Alcohol is not scored** (per user preference).
- **Poultry is deliberately excluded from red_meat** — the prompt is explicit that chicken/turkey/duck belong to no positive category. They score as `Neutral`.

## Supabase schema

Run this once in the Supabase SQL editor if you haven't already:

```sql
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS scoring_mode TEXT NOT NULL DEFAULT 'longevity'
  CHECK (scoring_mode IN ('macros', 'longevity'));
```

No schema changes are needed on `meals` — category/serving/processing fields live inside the existing `items` jsonb column.

## Mode switching

The dashboard routes on `settings.scoringMode`:
- `'longevity'` (default) → `LongevityDashboard`
- `'macros'` → existing three-metric view (calories/protein/fiber), unchanged

Toggle in Settings → Scoring Mode. Both modes read the same `meals` table; the data model is a superset.

In longevity mode, `MealRow` swaps the protein/fiber efficiency badges for category chips. In macros mode, everything behaves as it always did. The goal input fields and BMR calculator in settings are hidden in longevity mode (they don't apply).

## Related

- [BACKFILL.md](./BACKFILL.md) — one-off re-classifier script for existing meals.
