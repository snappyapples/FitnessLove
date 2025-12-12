'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { DayData, MealType } from '@/types'
import { calculateMindfulnessReport, getPercentColor, findWeakestMealType, calculateDailyTimeSeries, DailyMindfulnessPoint } from '@/lib/mindfulness'

function TrendArrow({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-muted-foreground text-xs">--</span>

  if (delta > 0) {
    return (
      <span className="text-green-600 text-xs flex items-center gap-0.5">
        <TrendingUp className="w-3 h-3" />
        +{delta}%
      </span>
    )
  } else if (delta < 0) {
    return (
      <span className="text-red-500 text-xs flex items-center gap-0.5">
        <TrendingDown className="w-3 h-3" />
        {delta}%
      </span>
    )
  } else {
    return (
      <span className="text-muted-foreground text-xs flex items-center gap-0.5">
        <Minus className="w-3 h-3" />
        0%
      </span>
    )
  }
}

function MetricCard({
  label,
  percent,
  delta,
  description
}: {
  label: string
  percent: number
  delta: number | null
  description: string
}) {
  const color = getPercentColor(percent)
  const colorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-500',
  }

  return (
    <div className="bg-secondary rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-3xl font-bold ${colorClasses[color]}`}>{percent}%</p>
        </div>
        <TrendArrow delta={delta} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  indulgence: 'Indulgence',
}

function DailyChart({ data, metric, label }: { data: DailyMindfulnessPoint[]; metric: 'calm' | 'hungry'; label: string }) {
  // Only show last 7 days
  const last7Days = data.slice(-7)

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
      <div className="flex items-end gap-1 h-20">
        {last7Days.map((day) => {
          const value = metric === 'calm' ? day.calmPercent : day.hungryPercent
          const hasData = value !== null

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-secondary rounded-t relative h-16 flex items-end">
                {hasData ? (
                  <div
                    className={`w-full rounded-t transition-all ${
                      value! >= 70 ? 'bg-green-500' :
                      value! >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                    }`}
                    style={{ height: `${value}%` }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">--</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{day.dayLabel}</span>
              {hasData && (
                <span className="text-[10px] font-medium">{value}%</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MindfulnessReport() {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState<DayData[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch 14 days of data when sheet opens
  useEffect(() => {
    if (!open) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const today = format(new Date(), 'yyyy-MM-dd')
        const res = await fetch(`/api/meals?days=14&today=${today}`)
        if (res.ok) {
          const data = await res.json()
          setDays(data.days || [])
        }
      } catch (err) {
        console.error('Failed to fetch mindfulness data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [open])

  const report = calculateMindfulnessReport(days)
  const weakest = findWeakestMealType(report.byMealType)
  const displayMealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
  const timeSeries = calculateDailyTimeSeries(days.slice(0, 7)) // This week only

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <BarChart3 className="w-5 h-5 text-white" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col max-w-lg mx-auto">
        <SheetHeader className="px-4">
          <SheetTitle>Mindful Eating Report</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 px-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : report.thisWeek.totalMeals === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No meals logged this week.</p>
              <p className="text-sm mt-1">Log some meals to see your mindful eating stats!</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-3">
                <MetricCard
                  label="Eating When Calm"
                  percent={report.thisWeek.calmPercent}
                  delta={report.trends.calmDelta}
                  description={`${report.thisWeek.calmMeals} of ${report.thisWeek.totalMeals} meals at calm level 4-5`}
                />
                <MetricCard
                  label="Eating When Hungry"
                  percent={report.thisWeek.hungryPercent}
                  delta={report.trends.hungryDelta}
                  description={`${report.thisWeek.hungryMeals} of ${report.thisWeek.totalMeals} meals at hunger level 3-4`}
                />
              </div>

              {/* Daily Trend Charts */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Daily Trends (This Week)</h3>
                <div className="grid grid-cols-1 gap-4">
                  <DailyChart data={timeSeries} metric="calm" label="Eating When Calm" />
                  <DailyChart data={timeSeries} metric="hungry" label="Eating When Hungry" />
                </div>
              </div>

              {/* Focus Area */}
              {weakest && weakest.percent < 70 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800">
                    Focus Area: {mealTypeLabels[weakest.type]}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Only {weakest.percent}% {weakest.metric === 'calm' ? 'calm' : 'actually hungry'} - your opportunity for improvement
                  </p>
                </div>
              )}

              {/* Meal Type Breakdown */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">By Meal Type</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium">Meal</th>
                        <th className="text-center py-2 px-3 font-medium">Calm</th>
                        <th className="text-center py-2 px-3 font-medium">Hungry</th>
                        <th className="text-center py-2 px-3 font-medium">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayMealTypes.map((type) => {
                        const metrics = report.byMealType[type]
                        if (metrics.totalMeals === 0) return null

                        const calmColor = getPercentColor(metrics.calmPercent)
                        const hungryColor = getPercentColor(metrics.hungryPercent)

                        return (
                          <tr key={type} className="border-t">
                            <td className="py-2 px-3">{mealTypeLabels[type]}</td>
                            <td className={`py-2 px-3 text-center font-medium ${
                              calmColor === 'green' ? 'text-green-600' :
                              calmColor === 'yellow' ? 'text-yellow-600' : 'text-red-500'
                            }`}>
                              {metrics.calmPercent}%
                            </td>
                            <td className={`py-2 px-3 text-center font-medium ${
                              hungryColor === 'green' ? 'text-green-600' :
                              hungryColor === 'yellow' ? 'text-yellow-600' : 'text-red-500'
                            }`}>
                              {metrics.hungryPercent}%
                            </td>
                            <td className="py-2 px-3 text-center text-muted-foreground">
                              {metrics.totalMeals}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* What the metrics mean */}
              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-medium">What This Means</h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Eating When Calm (4-5):</strong> Meals eaten when you felt quite calm or very calm. Higher is better - reduces stress eating.</p>
                  <p><strong>Eating When Hungry (3-4):</strong> Meals eaten at moderate hunger (not starving, not bored). The sweet spot for mindful eating.</p>
                </div>
              </div>

              {/* Color Legend */}
              <div className="flex gap-4 text-xs pt-2 border-t">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  70%+ Great
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  50-69% OK
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  &lt;50% Needs work
                </span>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
