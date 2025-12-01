import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

export const PARSE_MEAL_PROMPT = `You are a nutrition expert. Parse the following food description into individual items.
For each item, estimate: calories, protein (grams), and fiber (grams).
Be conservative with portions if not specified (assume standard serving sizes).
Return ONLY a valid JSON array with this exact format, no other text:
[
  {
    "name": "food name",
    "calories": number,
    "protein": number,
    "fiber": number,
    "quantity": "optional portion size"
  }
]

User input: `
