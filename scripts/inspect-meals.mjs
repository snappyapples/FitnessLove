/**
 * Quick script to inspect meals in Supabase and see their context values
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspect() {
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, date, type, context, total_calories')
    .order('date', { ascending: false })
    .limit(30)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${meals.length} meals:\n`)

  for (const meal of meals) {
    const hunger = meal.context?.hungerLevel ?? '-'
    const stress = meal.context?.stressLevel ?? '-'
    console.log(`${meal.date} | ${meal.type.padEnd(10)} | hunger: ${hunger} | calm: ${stress} | ${meal.total_calories} cal`)
  }

  // Summary
  const withContext = meals.filter(m => m.context?.stressLevel !== undefined)
  const calmMeals = meals.filter(m => (m.context?.stressLevel ?? 0) >= 4)
  const hungryMeals = meals.filter(m => {
    const h = m.context?.hungerLevel ?? 0
    return h >= 3 && h <= 4
  })

  console.log(`\n--- Summary ---`)
  console.log(`Total meals: ${meals.length}`)
  console.log(`Meals with stressLevel: ${withContext.length}`)
  console.log(`Calm meals (level 4-5): ${calmMeals.length}`)
  console.log(`Hungry meals (level 3-4): ${hungryMeals.length}`)
}

inspect().catch(console.error)
