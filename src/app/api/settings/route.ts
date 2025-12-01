import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'

interface UserSettings {
  age: number
  sex: 'male' | 'female'
  heightFeet: number
  heightInches: number
  weight: number
  activityLevel: number
  calorieGoal: number
  proteinGoal: number
  fiberGoal: number
}

const defaultSettings: UserSettings = {
  age: 30,
  sex: 'male',
  heightFeet: 5,
  heightInches: 10,
  weight: 180,
  activityLevel: 1.55,
  calorieGoal: 2000,
  proteinGoal: 150,
  fiberGoal: 30,
}

// Helper to transform database row to settings
function dbRowToSettings(row: any): UserSettings {
  return {
    age: row.age,
    sex: row.sex,
    heightFeet: row.height_feet,
    heightInches: row.height_inches,
    weight: row.weight,
    activityLevel: row.activity_level,
    calorieGoal: row.calorie_goal,
    proteinGoal: row.protein_goal,
    fiberGoal: row.fiber_goal,
  }
}

export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If no settings exist, return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json(defaultSettings)
      }
      throw error
    }

    return NextResponse.json(dbRowToSettings(data))
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(defaultSettings)
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()
    const settings: UserSettings = await request.json()

    const { data, error } = await supabase
      .from('settings')
      .upsert({
        user_id: user.id,
        age: settings.age,
        sex: settings.sex,
        height_feet: settings.heightFeet,
        height_inches: settings.heightInches,
        weight: settings.weight,
        activity_level: settings.activityLevel,
        calorie_goal: settings.calorieGoal,
        protein_goal: settings.proteinGoal,
        fiber_goal: settings.fiberGoal,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(dbRowToSettings(data))
  } catch (error) {
    console.error('Save settings error:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
