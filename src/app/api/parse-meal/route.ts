import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, PARSE_MEAL_PROMPT } from '@/lib/openai'
import { FoodItem, FoodCategory } from '@/types'
import { randomUUID } from 'crypto'

const CATEGORY_ENUM: FoodCategory[] = [
  'vegetable',
  'leafy_crucifer',
  'fruit',
  'legume_soy',
  'whole_grain',
  'nut_seed',
  'healthy_fat',
  'fish_omega3',
  'red_meat',
  'processed_meat',
  'sugary_drink',
  'ultra_processed',
]

// All categories must be present as nullable props in strict-mode schemas
const SERVINGS_PROPS = Object.fromEntries(
  CATEGORY_ENUM.map((c) => [c, { type: ['number', 'null'] }]),
)

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          calories: { type: 'number' },
          protein: { type: 'number' },
          fiber: { type: 'number' },
          quantity: { type: ['string', 'null'] },
          categories: {
            type: 'array',
            items: { type: 'string', enum: CATEGORY_ENUM },
          },
          servings: {
            type: 'object',
            properties: SERVINGS_PROPS,
            required: CATEGORY_ENUM,
            additionalProperties: false,
          },
          processingLevel: {
            type: 'string',
            enum: ['whole', 'minimal', 'processed', 'ultra_processed'],
          },
        },
        required: [
          'name',
          'calories',
          'protein',
          'fiber',
          'quantity',
          'categories',
          'servings',
          'processingLevel',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

type ParsedItem = Omit<FoodItem, 'id'>

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid text field' },
        { status: 400 }
      )
    }

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'user',
          content: PARSE_MEAL_PROMPT + text,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'parsed_meal',
          schema: RESPONSE_SCHEMA,
          strict: true,
        },
      },
    })

    const content = completion.choices[0]?.message?.content || '{"items":[]}'

    let parsed: { items: ParsedItem[] }
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error('Failed to parse OpenAI response:', content)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // Strip null-valued serving entries so the client sees a clean sparse map
    const items: FoodItem[] = (parsed.items || []).map((item) => {
      const cleanServings = item.servings
        ? Object.fromEntries(
            Object.entries(item.servings).filter(
              ([, v]) => v !== null && v !== undefined,
            ),
          )
        : undefined
      return {
        id: randomUUID(),
        name: item.name || 'Unknown food',
        calories: Math.round(item.calories || 0),
        protein: Math.round(item.protein || 0),
        fiber: Math.round(item.fiber || 0),
        quantity: item.quantity || undefined,
        categories: Array.isArray(item.categories) ? item.categories : undefined,
        servings: cleanServings && Object.keys(cleanServings).length > 0 ? cleanServings : undefined,
        processingLevel: item.processingLevel,
      }
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Parse meal error:', error)
    return NextResponse.json(
      { error: 'Failed to parse meal' },
      { status: 500 }
    )
  }
}
