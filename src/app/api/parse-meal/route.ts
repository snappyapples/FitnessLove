import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, PARSE_MEAL_PROMPT } from '@/lib/openai'
import { FoodItem } from '@/types'
import { randomUUID } from 'crypto'

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
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: PARSE_MEAL_PROMPT + text,
        },
      ],
      temperature: 0.3,
    })

    const content = completion.choices[0]?.message?.content || '[]'

    // Parse the JSON response
    let parsed: Array<Omit<FoodItem, 'id'>>
    try {
      // Handle potential markdown code blocks in response
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse OpenAI response:', content)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // Add IDs to each item
    const items: FoodItem[] = parsed.map((item) => ({
      id: randomUUID(),
      name: item.name || 'Unknown food',
      calories: Math.round(item.calories || 0),
      protein: Math.round(item.protein || 0),
      fiber: Math.round(item.fiber || 0),
      quantity: item.quantity,
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Parse meal error:', error)
    return NextResponse.json(
      { error: 'Failed to parse meal' },
      { status: 500 }
    )
  }
}
