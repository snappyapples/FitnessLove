'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface Row {
  pts: number
  label: string
  what: string
}

const TARGETS: Row[] = [
  { pts: 15, label: 'Vegetables', what: '5 servings (½ cup cooked or 1 cup raw each)' },
  { pts: 10, label: 'Fruit', what: '2 servings (1 piece or ½ cup)' },
  { pts: 10, label: 'Legumes / Soy', what: '1 serving (½ cup beans/lentils or 4 oz tofu)' },
  { pts: 10, label: 'Whole grains', what: '3 servings (½ cup oats / quinoa / brown rice or 1 slice whole-wheat bread)' },
  { pts: 5, label: 'Nuts / Seeds', what: '1 serving (1 oz — about ¼ cup nuts or 2 tbsp seeds/nut butter)' },
  { pts: 10, label: 'Healthy fat', what: '2 servings (EVOO, avocado, olives, fatty fish, nuts/seeds)' },
  { pts: 10, label: 'Fish (weekly)', what: '2 servings of fatty fish over the past 7 days (rolling — not required today)' },
  { pts: 10, label: 'No sugary drinks', what: 'Zero soda, fruit juice, sweetened coffee / tea' },
  { pts: 10, label: 'No red / processed meat', what: 'Zero beef, pork, lamb, bacon, sausage, deli meat' },
  { pts: 10, label: 'UPF under control', what: 'Ultra-processed food < 10% of daily calories (< 200 kcal at 2000 kcal)' },
]

function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      aria-label="How the score works"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  )
}

export function LongevityHelpSheet() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <span>
          <HelpButton onClick={() => setOpen(true)} />
        </span>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col max-w-lg mx-auto">
        <SheetHeader className="px-4">
          <SheetTitle>How the Longevity Score works</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 text-base leading-relaxed">
          {/* Intro */}
          <section className="space-y-2">
            <p>
              The Longevity Score is a 0–100 measure of diet quality based on the{' '}
              <span className="font-medium">Alternative Healthy Eating Index (AHEI-2010)</span>, the pattern
              most strongly associated with healthy aging in long-term nutrition studies.
            </p>
            <p>
              It&apos;s a <span className="font-medium">rolling 7-day score</span> — every meal you log is
              added to the previous 7 days&apos; window, and the score updates continuously. There&apos;s no
              daily reset, no &ldquo;today&rdquo; anchor. Diet quality is about patterns over time, and the
              score reflects that directly.
            </p>
          </section>

          {/* How to score 100 */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base">What a 100 looks like (per day at ~2,000 kcal)</h3>
            <p className="text-sm text-muted-foreground">
              The targets below are the <em>daily average</em> you&apos;d need to hit over 7 days for a perfect
              score. E.g., 5 servings of veg/day on average = 35 servings/week.
            </p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-sm font-semibold">Pts</th>
                    <th className="text-left px-3 py-2 text-sm font-semibold">Component</th>
                    <th className="text-left px-3 py-2 text-sm font-semibold">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {TARGETS.map((row) => (
                    <tr key={row.label} className="border-t">
                      <td className="px-3 py-2.5 text-sm font-bold tabular-nums">{row.pts}</td>
                      <td className="px-3 py-2.5 text-sm font-medium whitespace-nowrap">{row.label}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">{row.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">
              Positive-food targets scale with calories — if you eat less, you need proportionally less to hit the
              target (the score is density-normalized per 1,000 kcal).
            </p>
          </section>

          {/* What to eat next */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base">&ldquo;What to eat next&rdquo; list</h3>
            <p className="text-sm text-muted-foreground">
              Below the score ring, every component is ranked by its current gap (max − current), biggest gap
              first. Each row shows the component&apos;s points, a bar, and a concrete food suggestion. A{' '}
              <span className="text-primary font-semibold">Top gap</span> tag highlights the #1 lever — the
              single thing that&apos;ll earn you the most points per bite. Components within 0.5 points of max
              collapse into a &ldquo;dialed in&rdquo; footer so the list stays focused on what still matters.
            </p>
            <p className="text-sm text-muted-foreground">
              Green <span className="font-medium">+</span> icons are &ldquo;add more&rdquo; components (veg,
              fruit, legumes, whole grains, nuts/seeds, healthy fat, fish). Red{' '}
              <span className="font-medium">−</span> icons are &ldquo;cut back&rdquo; components (sugary
              drinks, red/processed meat, ultra-processed foods).
            </p>
          </section>

          {/* Subscores (still shown in per-day cards) */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base">Day cards: 4 subscores</h3>
            <p className="text-sm text-muted-foreground">
              On each per-day card you&apos;ll still see four grouped subscores — Plants (0–50; veg + fruit +
              legumes + whole grains + nuts), Fat Quality (0–10; EVOO / avocado / olives / fatty fish), Protein
              Quality (0–10; fatty fish rolling-7-day), and Harm Reduction (0–30; reverse-scored drinks / red
              meat / UPF). These are useful for spotting patterns across the week but aren&apos;t the headline
              metric anymore.
            </p>
          </section>

          {/* What doesn't count */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base">What counts as neutral</h3>
            <p className="text-sm text-muted-foreground">
              Some foods don&apos;t move the score either way — white rice, plain chicken/turkey, eggs, most dairy.
              They&apos;ll show a gray <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs font-medium">Neutral</span>{' '}
              chip in the meal view, meaning the classifier evaluated them but they don&apos;t hit any scoring category.
            </p>
          </section>

          {/* Source */}
          <section className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Based on the AHEI-2010 dietary pattern (Harvard Chan School) with an added ultra-processed-food
              penalty reflecting newer NOVA-based research. Alcohol is not scored.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
