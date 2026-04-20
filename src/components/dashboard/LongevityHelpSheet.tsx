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
      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      aria-label="How the score works"
    >
      <HelpCircle className="w-4 h-4" />
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

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 text-sm">
          {/* Intro */}
          <section className="space-y-2">
            <p>
              The Longevity Score is a 0–100 measure of diet quality based on the{' '}
              <span className="font-medium">Alternative Healthy Eating Index (AHEI-2010)</span>, the pattern
              most strongly associated with healthy aging in long-term nutrition studies.
            </p>
            <p>
              The <span className="font-medium">7-day rolling average</span> is the number that matters most —
              diet quality is noisy day to day, and the research is about patterns over time, not Tuesday dinner.
            </p>
          </section>

          {/* How to score 100 */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base">How to score 100 in a day (at ~2000 kcal)</h3>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium">Pts</th>
                    <th className="text-left px-3 py-2 text-xs font-medium">Component</th>
                    <th className="text-left px-3 py-2 text-xs font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {TARGETS.map((row) => (
                    <tr key={row.label} className="border-t">
                      <td className="px-3 py-2 text-xs font-bold tabular-nums">{row.pts}</td>
                      <td className="px-3 py-2 text-xs font-medium whitespace-nowrap">{row.label}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{row.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Positive-food targets scale with calories — if you eat less, you need proportionally less to hit the
              target (the score is density-normalized per 1,000 kcal).
            </p>
          </section>

          {/* Subscores */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base">What the subscores mean</h3>
            <dl className="space-y-2">
              <div>
                <dt className="font-medium">
                  Plants <span className="text-muted-foreground font-normal">(0–50)</span>
                </dt>
                <dd className="text-xs text-muted-foreground">
                  Vegetables + fruit + legumes + whole grains + nuts/seeds. A perfect 50 means you hit all five
                  targets in the same day. This is half the entire daily score — the strongest longevity lever.
                </dd>
              </div>
              <div>
                <dt className="font-medium">
                  Fat Quality <span className="text-muted-foreground font-normal">(0–10)</span>
                </dt>
                <dd className="text-xs text-muted-foreground">
                  Servings of EVOO, avocado, olives, fatty fish, nuts/seeds. Emphasizes fat{' '}
                  <em>quality</em> over avoiding fat.
                </dd>
              </div>
              <div>
                <dt className="font-medium">
                  Protein Quality <span className="text-muted-foreground font-normal">(0–10)</span>
                </dt>
                <dd className="text-xs text-muted-foreground">
                  Fatty fish servings over the past 7 days. 2 servings/week hits the full target (salmon,
                  sardines, mackerel, trout, herring, anchovies).
                </dd>
              </div>
              <div>
                <dt className="font-medium">
                  Harm Reduction <span className="text-muted-foreground font-normal">(0–30)</span>
                </dt>
                <dd className="text-xs text-muted-foreground">
                  Reverse-scored: starts at 30 and drops for sugary drinks, red/processed meat, and
                  ultra-processed foods. Processed meat counts 2× red meat.
                </dd>
              </div>
            </dl>
          </section>

          {/* Next best bite */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base">&ldquo;Next best bite&rdquo; tip</h3>
            <p className="text-xs text-muted-foreground">
              The tip under your score card points at the scoring component with the biggest gap between your
              7-day rolling average and the max. Acting on it gives you the most points for the least effort —
              usually a plants gap early on, then fish or fat quality as you dial things in.
            </p>
          </section>

          {/* What doesn't count */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base">What counts as neutral</h3>
            <p className="text-xs text-muted-foreground">
              Some foods don&apos;t move the score either way — white rice, plain chicken/turkey, eggs, most dairy.
              They&apos;ll show a gray <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium">Neutral</span>{' '}
              chip in the meal view, meaning the classifier evaluated them but they don&apos;t hit any scoring category.
            </p>
          </section>

          {/* Source */}
          <section className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Based on the AHEI-2010 dietary pattern (Harvard Chan School) with an added ultra-processed-food
              penalty reflecting newer NOVA-based research. Alcohol is not scored.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
