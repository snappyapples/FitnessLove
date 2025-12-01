'use client'

import { useState, useEffect } from 'react'
import { Settings, Calculator } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  activityLevel: 1.55, // Moderate
  calorieGoal: 2000,
  proteinGoal: 150,
  fiberGoal: 30,
}

const activityLevels = [
  { value: 1.2, label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 1.375, label: 'Light', desc: 'Exercise 1-3 days/week' },
  { value: 1.55, label: 'Moderate', desc: 'Exercise 3-5 days/week' },
  { value: 1.725, label: 'Active', desc: 'Exercise 6-7 days/week' },
  { value: 1.9, label: 'Very Active', desc: 'Hard exercise daily' },
]

// Mifflin-St Jeor Equation
function calculateBMR(weight: number, heightInches: number, age: number, sex: 'male' | 'female'): number {
  // Convert to metric: weight in kg, height in cm
  const weightKg = weight * 0.453592
  const heightCm = heightInches * 2.54

  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  }
}

export function SettingsSheet() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [showCalculator, setShowCalculator] = useState(false)

  // Load settings from API on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(console.error)
  }, [])

  // Save settings to API
  const saveSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      // Dispatch event so other components can react
      window.dispatchEvent(new Event('settingsUpdated'))
      setOpen(false)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  // Calculate BMR and TDEE
  const totalHeightInches = settings.heightFeet * 12 + settings.heightInches
  const bmr = calculateBMR(settings.weight, totalHeightInches, settings.age, settings.sex)
  const tdee = bmr * settings.activityLevel

  // Protein recommendation: 0.7-0.9g per lb (1.6-2.0g/kg per ISSN for active adults)
  const weightKg = settings.weight * 0.453592
  const proteinBase = Math.round(weightKg * 1.6) // 1.6g/kg ≈ 0.7g/lb
  const proteinHigh = Math.round(weightKg * 2.0) // 2.0g/kg ≈ 0.9g/lb

  // Fiber recommendation: 14g per 1000 calories
  const fiberForCalories = (cal: number) => Math.round((cal / 1000) * 14)

  // Suggested goals for different objectives
  const suggestions = {
    lose2: {
      calories: Math.round(tdee - 1000),
      protein: proteinHigh, // Higher protein when cutting to preserve muscle
      fiber: fiberForCalories(tdee - 1000),
    },
    lose1: {
      calories: Math.round(tdee - 500),
      protein: proteinHigh,
      fiber: fiberForCalories(tdee - 500),
    },
    maintain: {
      calories: Math.round(tdee),
      protein: proteinBase,
      fiber: fiberForCalories(tdee),
    },
    gain1: {
      calories: Math.round(tdee + 500),
      protein: proteinHigh, // Higher protein when bulking for muscle growth
      fiber: fiberForCalories(tdee + 500),
    },
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <Settings className="w-5 h-5 text-white" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col max-w-lg mx-auto">
        <SheetHeader className="px-4">
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 px-4">
          {/* Daily Goals Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Daily Goals</h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Calories</label>
                <Input
                  type="number"
                  value={settings.calorieGoal || ''}
                  onChange={(e) => setSettings({ ...settings, calorieGoal: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Protein (g)</label>
                <Input
                  type="number"
                  value={settings.proteinGoal || ''}
                  onChange={(e) => setSettings({ ...settings, proteinGoal: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fiber (g)</label>
                <Input
                  type="number"
                  value={settings.fiberGoal || ''}
                  onChange={(e) => setSettings({ ...settings, fiberGoal: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Goal Calculator Toggle */}
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="flex items-center gap-2 text-sm text-primary font-medium"
          >
            <Calculator className="w-4 h-4" />
            {showCalculator ? 'Hide' : 'Show'} Goal Calculator
          </button>

          {/* BMR Calculator Section */}
          {showCalculator && (
            <div className="space-y-3 p-3 bg-secondary rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Age</label>
                  <Input
                    type="number"
                    value={settings.age || ''}
                    onChange={(e) => setSettings({ ...settings, age: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Sex</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSettings({ ...settings, sex: 'male' })}
                      className={`flex-1 py-1.5 text-sm rounded-md border ${
                        settings.sex === 'male' ? 'bg-primary text-primary-foreground' : ''
                      }`}
                    >
                      Male
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, sex: 'female' })}
                      className={`flex-1 py-1.5 text-sm rounded-md border ${
                        settings.sex === 'female' ? 'bg-primary text-primary-foreground' : ''
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Height (ft)</label>
                  <Input
                    type="number"
                    value={settings.heightFeet || ''}
                    onChange={(e) => setSettings({ ...settings, heightFeet: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Height (in)</label>
                  <Input
                    type="number"
                    value={settings.heightInches || ''}
                    onChange={(e) => setSettings({ ...settings, heightInches: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Weight (lbs)</label>
                  <Input
                    type="number"
                    value={settings.weight || ''}
                    onChange={(e) => setSettings({ ...settings, weight: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="h-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Activity Level</label>
                <div className="space-y-1 mt-1">
                  {activityLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setSettings({ ...settings, activityLevel: level.value })}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                        settings.activityLevel === level.value
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-secondary border'
                      }`}
                    >
                      <span className="font-medium">{level.label}</span>
                      <span className="text-xs opacity-70 ml-2">{level.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">BMR:</span>
                  <span className="font-medium">{Math.round(bmr)} cal/day</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TDEE (maintenance):</span>
                  <span className="font-medium">{suggestions.maintain.calories} cal/day</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Protein (1.6-2g/kg):</span>
                  <span className="font-medium">{proteinBase}-{proteinHigh}g/day</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fiber (14g/1000cal):</span>
                  <span className="font-medium">{suggestions.maintain.fiber}g/day</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Sources: BMR via Mifflin-St Jeor equation. Protein per ISSN position stand (1.4-2g/kg for active adults). Fiber per USDA Dietary Guidelines (14g/1000 cal).
                </p>
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Suggested Goals (tap to apply all)</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      calorieGoal: suggestions.lose2.calories,
                      proteinGoal: suggestions.lose2.protein,
                      fiberGoal: suggestions.lose2.fiber
                    })}
                    className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-left"
                  >
                    <span className="font-medium">Lose 2 lb/wk:</span> {suggestions.lose2.calories} cal · {suggestions.lose2.protein}g protein · {suggestions.lose2.fiber}g fiber
                  </button>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      calorieGoal: suggestions.lose1.calories,
                      proteinGoal: suggestions.lose1.protein,
                      fiberGoal: suggestions.lose1.fiber
                    })}
                    className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 text-left"
                  >
                    <span className="font-medium">Lose 1 lb/wk:</span> {suggestions.lose1.calories} cal · {suggestions.lose1.protein}g protein · {suggestions.lose1.fiber}g fiber
                  </button>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      calorieGoal: suggestions.maintain.calories,
                      proteinGoal: suggestions.maintain.protein,
                      fiberGoal: suggestions.maintain.fiber
                    })}
                    className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-left"
                  >
                    <span className="font-medium">Maintain:</span> {suggestions.maintain.calories} cal · {suggestions.maintain.protein}g protein · {suggestions.maintain.fiber}g fiber
                  </button>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      calorieGoal: suggestions.gain1.calories,
                      proteinGoal: suggestions.gain1.protein,
                      fiberGoal: suggestions.gain1.fiber
                    })}
                    className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-left"
                  >
                    <span className="font-medium">Gain 1 lb/wk:</span> {suggestions.gain1.calories} cal · {suggestions.gain1.protein}g protein · {suggestions.gain1.fiber}g fiber
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="pt-2 border-t px-4 pb-3">
          <Button onClick={saveSettings} className="w-full">
            Save Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Hook to get current settings
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)

  useEffect(() => {
    const loadSettings = () => {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => setSettings(data))
        .catch(console.error)
    }

    loadSettings()
    window.addEventListener('settingsUpdated', loadSettings)
    return () => window.removeEventListener('settingsUpdated', loadSettings)
  }, [])

  return settings
}
