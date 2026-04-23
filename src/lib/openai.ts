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

export const PARSE_MEAL_PROMPT = `You are a nutrition and longevity-scoring expert. Parse the following food description into individual ingredients. Decompose composite dishes into their components.

For each ingredient, return:
- name (string)
- calories (number)
- protein (grams, number)
- fiber (grams, number)
- quantity (optional portion size string)
- categories: array of applicable longevity categories (see list below)
- servings: an object mapping each applicable category to number of AHEI-style servings
- processingLevel: one of "whole", "minimal", "processed", "ultra_processed"

DECOMPOSITION RULE (critical): Composite meals — salads, bowls, sandwiches, wraps, plates, platters, stir-fries, burritos, casseroles — MUST be decomposed into constituent ingredients, one item per ingredient. A single meal description often produces 3–6 items. DO NOT collapse a composite dish into one neutral item; that erases the scoring signal (the whole point of scoring is component-level accuracy).

When the user names a well-known composite (e.g. "Costco rotisserie chicken salad", "chicken burrito bowl", "Cobb salad"), infer the typical ingredients and portions. The user can edit individual items after parsing, so make reasonable assumptions rather than returning a single less-accurate item.

Example — "rotisserie chicken Costco green salad" decomposes into roughly:
  1. "mixed greens" (~2 cups) → categories: ["vegetable", "leafy_crucifer"]
  2. "grape tomatoes & cucumbers" (~1/2 cup) → categories: ["vegetable"]
  3. "rotisserie chicken" (~4 oz) → categories: [] (poultry is neutral)
  4. "bottled dressing" (~2 tbsp) → categories: ["ultra_processed"]
  5. "parmesan / shredded cheese" (~1 tbsp) → categories: [] (processed, no scoring category)
  6. "croutons" (~1/4 cup) → categories: [] (processed, no scoring category)

When the description truly IS a single homogeneous item ("an apple", "bowl of oatmeal", "2 eggs", "a handful of walnuts"), return one item. Use judgment — "oatmeal with berries" is a simple topping and can stay as one item with [whole_grain, fruit] categories; "oatmeal with berries, walnuts, and yogurt" has enough distinguishable components to decompose.

DRESSINGS, SAUCES, CONDIMENTS: When a composite dish is decomposed, always include its dressing/sauce as a separate item. Commercial sweetened/creamy/emulsified dressings and sauces (ranch, Caesar, thousand island, bottled sweet vinaigrettes, BBQ, teriyaki, sweet-and-sour, mayo-based sauces, ketchup) default to ultra_processed. Pure olive oil or oil-and-vinegar is healthy_fat (EVOO) or minimal. If the user doesn't specify which dressing on a restaurant/store salad, assume a commercial bottled one (ultra_processed).

EXCEPTIONS (NOT ultra_processed — these are NOVA-3 "processed" foods, not NOVA-4 "ultra-processed"): salsa, pico de gallo, hot sauce, simple marinara, guacamole, hummus, and plain yogurt-based dips. They have short, recognizable ingredient lists (mostly whole-food components) and no added sugar/emulsifiers/stabilizers. Classify them by their dominant ingredient:
- Salsa, pico de gallo, hot sauce, simple marinara → categories: ["vegetable"], processingLevel: "processed"
- Guacamole → categories: ["healthy_fat"], processingLevel: "minimal"
- Hummus → categories: ["legume_soy"], processingLevel: "minimal"
- Plain Greek yogurt dip (no added sugar) → categories: [], processingLevel: "minimal"

CATEGORY DEFINITIONS (an ingredient can belong to multiple — e.g. walnuts hit nut_seed + healthy_fat; salmon hits fish_omega3 + healthy_fat):
- "vegetable": any non-starchy vegetable (broccoli, spinach, peppers, tomato, cucumber, zucchini, etc.). Potatoes are NOT a vegetable in AHEI scoring.
- "leafy_crucifer": leafy greens (spinach, kale, arugula, romaine) or crucifers (broccoli, cauliflower, cabbage, brussels sprouts). If this applies, ALSO include "vegetable".
- "fruit": whole fruit (berries, apple, banana, orange, melon). Fruit juice is NOT fruit — it's a "sugary_drink".
- "legume_soy": beans, lentils, chickpeas, peas, tofu, tempeh, edamame, soy milk.
- "whole_grain": oatmeal, brown rice, quinoa, whole wheat, barley, farro, bulgur, 100% whole-grain bread/pasta. Refined grains (white rice, white bread, white pasta) do NOT qualify.
- "nut_seed": nuts (almonds, walnuts, pistachios, pecans, cashews) and seeds (chia, flax, pumpkin, sunflower). Nut butters count.
- "healthy_fat": extra virgin olive oil, avocado, olives, fatty fish (salmon, sardines), nuts/seeds. Butter, coconut oil, industrial seed oils, and margarine do NOT qualify.
- "fish_omega3": fatty fish (salmon, sardines, trout, herring, mackerel, anchovies). Lean white fish (tilapia, cod) does NOT qualify.
- "red_meat": unprocessed BEEF, PORK, LAMB, BISON, VENISON, GOAT only. POULTRY IS NOT RED MEAT — chicken, turkey, duck, and goose belong to NO positive category in this scoring system (they are neutral, not counted). Meatballs/meatloaf default to red_meat UNLESS the name specifies poultry ("turkey meatballs", "chicken meatballs") in which case they are NOT red_meat.
- "processed_meat": bacon, sausage, hot dog, deli/lunch meat, salami, pepperoni, ham, jerky, cured meats. Chicken sausage and turkey bacon still count as processed_meat.
- "sugary_drink": soda, sweetened coffee drinks, sports drinks, energy drinks, fruit juice, lemonade, sweet tea.
- "ultra_processed": NOVA group 4 — chips, candy, cookies, packaged snack bars, most fast food, frozen ready meals, sweetened cereals, instant noodles, processed cheese, sodas. IMPORTANT: restaurant/takeout dishes that are BREADED AND FRIED (orange chicken, sesame chicken, general tso's, chicken nuggets, chicken tenders, popcorn chicken, tempura, fried fish sandwich, mozzarella sticks) ARE ultra_processed. Dishes with SWEETENED/SUGARY sauces as a primary flavor (orange chicken, sweet & sour, teriyaki glaze, BBQ sauce pulled-pork) ARE ultra_processed. White rice that accompanies these dishes is still just white rice (processed, not ultra_processed) — score each named item on its own merits.

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
