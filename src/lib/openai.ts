import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

export const PARSE_MEAL_PROMPT = `You are a nutrition and longevity-scoring expert. Parse the following food description into individual items.

For each item, return:
- name (string)
- calories (number)
- protein (grams, number)
- fiber (grams, number)
- quantity (optional portion size string)
- categories: array of applicable longevity categories (see list below)
- servings: an object mapping each applicable category to number of AHEI-style servings
- processingLevel: one of "whole", "minimal", "processed", "ultra_processed"

CATEGORY DEFINITIONS (an item can belong to multiple — e.g. "salad with olive oil and walnuts" hits vegetable + healthy_fat + nut_seed):
- "vegetable": any non-starchy vegetable (broccoli, spinach, peppers, tomato, cucumber, zucchini, etc.). Potatoes are NOT a vegetable in AHEI scoring.
- "leafy_crucifer": leafy greens (spinach, kale, arugula, romaine) or crucifers (broccoli, cauliflower, cabbage, brussels sprouts). If this applies, ALSO include "vegetable".
- "fruit": whole fruit (berries, apple, banana, orange, melon). Fruit juice is NOT fruit — it's a "sugary_drink".
- "legume_soy": beans, lentils, chickpeas, peas, tofu, tempeh, edamame, soy milk.
- "whole_grain": oatmeal, brown rice, quinoa, whole wheat, barley, farro, bulgur, 100% whole-grain bread/pasta. Refined grains (white rice, white bread, white pasta) do NOT qualify.
- "nut_seed": nuts (almonds, walnuts, pistachios, pecans, cashews) and seeds (chia, flax, pumpkin, sunflower). Nut butters count.
- "healthy_fat": extra virgin olive oil, avocado, olives, fatty fish (salmon, sardines), nuts/seeds. Butter, coconut oil, industrial seed oils, and margarine do NOT qualify.
- "fish_omega3": fatty fish (salmon, sardines, trout, herring, mackerel, anchovies). Lean white fish (tilapia, cod) does NOT qualify.
- "red_meat": unprocessed beef, pork, lamb, bison, venison.
- "processed_meat": bacon, sausage, hot dog, deli/lunch meat, salami, pepperoni, ham, jerky.
- "sugary_drink": soda, sweetened coffee drinks, sports drinks, energy drinks, fruit juice, lemonade, sweet tea.
- "ultra_processed": NOVA group 4 — chips, candy, cookies, packaged snack bars, most fast food, frozen ready meals, sweetened cereals, instant noodles, processed cheese, sodas.

SERVING SIZE REFERENCE (estimate servings in these units):
- vegetable/leafy_crucifer: 1 serving = 1/2 cup cooked OR 1 cup raw
- fruit: 1 serving = 1 medium piece OR 1/2 cup chopped/berries
- legume_soy: 1 serving = 1/2 cup cooked beans/lentils OR 4 oz tofu
- whole_grain: 1 serving = 1/2 cup cooked grain OR 1 slice whole-grain bread
- nut_seed: 1 serving = 1 oz (~1/4 cup nuts or 2 tbsp seeds/nut butter)
- healthy_fat: 1 serving = 1 tbsp olive oil OR 1/2 avocado OR 1 oz olives
- fish_omega3: 1 serving = 3.5 oz cooked fatty fish
- red_meat/processed_meat: 1 serving = 3 oz
- sugary_drink: 1 serving = 8 oz
- ultra_processed: approximate, focus on calorie share

PROCESSING LEVEL:
- "whole": unprocessed or minimally processed (raw veg, plain cooked grains, plain fish/meat, fresh fruit)
- "minimal": simple processing (canned beans, plain yogurt, hard cheese, olive oil, whole-grain bread)
- "processed": noticeable processing but not NOVA-4 (cheese slices, bread with added sugar, canned soup)
- "ultra_processed": NOVA group 4 (chips, candy, soda, fast food, packaged snacks, most cereal bars)

Be conservative with portions if not specified (assume standard serving sizes). Round calories to the nearest whole number.

Return ONLY a valid JSON array, no other text:
[
  {
    "name": "food name",
    "calories": 350,
    "protein": 10,
    "fiber": 6,
    "quantity": "1 bowl",
    "categories": ["whole_grain", "fruit", "nut_seed"],
    "servings": { "whole_grain": 1, "fruit": 0.5, "nut_seed": 0.5 },
    "processingLevel": "whole"
  }
]

User input: `
