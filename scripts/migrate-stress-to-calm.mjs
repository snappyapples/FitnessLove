/**
 * One-time migration script to flip stressLevel values from old scale to new scale.
 *
 * Old scale: 1 = low stress (calm), 5 = high stress
 * New scale: 1 = not calm, 5 = very calm
 *
 * Transformation: newValue = 6 - oldValue
 *   1 -> 5 (was calm, now "very calm")
 *   2 -> 4 (was slightly stressed, now "quite calm")
 *   3 -> 3 (stays same - middle)
 *   4 -> 2 (was quite stressed, now "slightly calm")
 *   5 -> 1 (was very stressed, now "not calm")
 *
 * Run with: node scripts/migrate-stress-to-calm.mjs
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
  console.log('Starting stress level migration...\n')

  // Fetch all meals with context containing stressLevel
  const { data: meals, error: fetchError } = await supabase
    .from('meals')
    .select('id, context')
    .not('context', 'is', null)

  if (fetchError) {
    console.error('Error fetching meals:', fetchError)
    process.exit(1)
  }

  // Filter meals that have a stressLevel in their context
  const mealsToUpdate = meals.filter(meal =>
    meal.context && typeof meal.context.stressLevel === 'number'
  )

  console.log(`Found ${mealsToUpdate.length} meals with stressLevel to migrate\n`)

  if (mealsToUpdate.length === 0) {
    console.log('No meals to migrate. Done!')
    return
  }

  let updated = 0
  let errors = 0

  for (const meal of mealsToUpdate) {
    const oldValue = meal.context.stressLevel
    const newValue = 6 - oldValue

    const updatedContext = {
      ...meal.context,
      stressLevel: newValue
    }

    const { error: updateError } = await supabase
      .from('meals')
      .update({ context: updatedContext })
      .eq('id', meal.id)

    if (updateError) {
      console.error(`Error updating meal ${meal.id}:`, updateError)
      errors++
    } else {
      console.log(`Meal ${meal.id}: stressLevel ${oldValue} -> ${newValue}`)
      updated++
    }
  }

  console.log(`\nMigration complete!`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Errors: ${errors}`)
}

migrate().catch(console.error)
