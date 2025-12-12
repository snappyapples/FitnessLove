# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Architecture Overview

FitnessLove is a Next.js 16 nutrition tracking app with AI-powered meal logging. Users can describe meals in natural language, and GPT-4o-mini parses them into individual food items with estimated nutritional values.

### Tech Stack
- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Supabase (database + auth)
- OpenAI API (gpt-4o-mini for meal parsing)
- shadcn/ui components

### Key Data Flow

1. **Meal Logging**: User describes meal → `POST /api/parse-meal` → OpenAI parses text → returns structured `FoodItem[]` → User confirms → `POST /api/meals` → Supabase
2. **Authentication**: Magic Link via Supabase Auth → `/auth/callback` (client-side page) handles token from URL hash → AuthProvider manages session state
3. **Data Fetching**: Dashboard calls `GET /api/meals?days=7` → Server gets user from session → queries Supabase → aggregates into `DayData[]`

### Auth Architecture

- **Middleware** (`src/middleware.ts`): Runs on every request, syncs auth cookies between client and server
- **AuthProvider** (`src/components/auth/AuthProvider.tsx`): Client-side context for user state, uses `@supabase/ssr` browser client
- **AuthGuard**: Wraps protected pages, redirects to `/login` if not authenticated
- **Callback**: `/auth/callback` is a **client-side page** (not API route) because Supabase magic links put tokens in URL hash, which servers can't see

### Scoring System

The app tracks three metrics (defined in `src/types/index.ts`):
- **Calories**: Score 100% if under goal, degrades as you exceed (0 at 120% of goal)
- **Protein**: Linear score 0-100% as you approach goal
- **Fiber**: Linear score 0-100% as you approach goal

Overall daily score = equal weight (33.3% each) of the three metrics. Color coding uses efficiency index: `(nutrientPercent / caloriePercent) * 100` — green ≥100%, yellow ≥67%, red <67%.

### Mindful Eating Report

The app tracks emotional eating patterns via `src/lib/mindfulness.ts`:
- **Calm Level** (stored as `stressLevel` in DB): 1-5 scale where 5 = very calm. Threshold for "eating when calm" is 4-5.
- **Hunger Level**: 1-5 scale where 5 = starving. Sweet spot for "eating when hungry" is 3-4 (not starving, not bored).
- Report shows weekly percentages, day-by-day trends, and breakdown by meal type.

### File Organization

```
src/
├── app/
│   ├── api/
│   │   ├── meals/route.ts      # CRUD for meals (Supabase)
│   │   ├── settings/route.ts   # User settings (Supabase)
│   │   └── parse-meal/route.ts # OpenAI meal parsing
│   ├── auth/callback/page.tsx  # Magic Link callback (client-side)
│   └── login/page.tsx          # Login page
├── components/
│   ├── auth/                   # AuthProvider, AuthGuard
│   ├── dashboard/              # DayCard, MealRow, Dashboard, MindfulnessReport
│   ├── logging/                # LogMealSheet
│   ├── settings/               # SettingsSheet
│   └── ui/                     # shadcn components
├── lib/
│   ├── supabase.ts             # Client-side Supabase (uses @supabase/ssr browser client)
│   ├── supabase-server.ts      # Server-side Supabase (uses cookies)
│   ├── openai.ts               # OpenAI client + prompt
│   └── mindfulness.ts          # Mindful eating calculations and thresholds
├── middleware.ts               # Auth session sync on every request
└── types/index.ts              # All TypeScript types + scoring logic
```

### API Authentication

All API routes use `getServerUser()` from `lib/supabase-server.ts` to get the authenticated user. Returns 401 if no session. The `user.id` is used for all database queries.

### Environment Variables

Required in `.env.local`:
- `OPENAI_API_KEY` - For meal parsing
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

### Supabase Tables

- `meals`: id, user_id, type, date, items (jsonb), total_calories, total_protein, total_fiber, context (jsonb), created_at
- `settings`: user_id (PK), age, sex, height_feet, height_inches, weight, activity_level, calorie_goal, protein_goal, fiber_goal, updated_at
