// @ts-nocheck — Deno Edge Function
// food-ai: identify foods + estimate calories from text OR a plate photo.
// Returns structured JSON so the caller (FeedingForm) can auto-populate tags.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fast model for text, vision-capable model for images
const TEXT_MODEL = 'claude-haiku-4-5-20251001'
const VISION_MODEL = 'claude-sonnet-4-20250514'

interface RequestBody {
  mode: 'text' | 'image'
  text?: string
  imageBase64?: string
  mediaType?: 'image/jpeg' | 'image/png' | 'image/webp'
  childAgeMonths?: number
  meal?: 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'night_snack'
}

interface FoodItem {
  name: string              // canonical, lowercase ("grilled chicken")
  cals: number              // integer kcal for the estimated portion
  category: 'fruit' | 'vegetable' | 'grain' | 'protein' | 'dairy' | 'drink' | 'snack' | 'mixed'
  portionG?: number         // grams (optional)
  confidence: 'high' | 'medium' | 'low'
}

interface AiResponse {
  foods: FoodItem[]
  totalCals: number
  notes?: string
}

const SYSTEM_PROMPT = `You are a pediatric nutrition helper inside the grandma.app parenting app.

Your ONLY job is to identify foods and estimate calories for a young child's portion
(default 1–5 years old; adjust portion size for the age when provided).

STRICT OUTPUT — JSON only, no prose, no markdown, matching this schema:
{
  "foods": [
    {
      "name": "lowercase canonical food name (e.g. 'grilled chicken', 'mashed potato', 'strawberry yogurt')",
      "cals": <integer kcal for the CHILD portion, not an adult portion>,
      "category": "fruit" | "vegetable" | "grain" | "protein" | "dairy" | "drink" | "snack" | "mixed",
      "portionG": <integer grams, optional>,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "totalCals": <sum of food.cals>,
  "notes": "optional one-line note for the caregiver — only if something important (allergen hint, portion seems large for age, etc.)"
}

Rules:
- ALWAYS return valid JSON. No commentary before or after.
- Portion reference (toddler): fruit 40–80g, veg 30–60g, grain 30–60g cooked,
  protein 30–50g cooked, dairy 80–150g, snack 10–30g. Adjust up for older kids.
- If multiple items are on a plate, return each separately (don't merge).
- If the input is ambiguous or not food at all, return { "foods": [], "totalCals": 0, "notes": "..." }.
- Category "mixed" is for composite dishes (sandwiches, pizza, casseroles, stews).
- Use English names. Map localized inputs (banana/banane/plátano) to English.
- Never exceed ~800 kcal total for a single toddler meal; if you compute more,
  lower portionG to realistic values.
- Calories are integers. Round to the nearest kcal.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body: RequestBody = await req.json()
    if (body.mode !== 'text' && body.mode !== 'image') throw new Error('mode must be "text" or "image"')
    if (body.mode === 'text' && !body.text?.trim()) throw new Error('text required')
    if (body.mode === 'image' && !body.imageBase64) throw new Error('imageBase64 required')

    const ageLine = body.childAgeMonths
      ? `Child age: ${body.childAgeMonths} months.`
      : 'Child age: toddler (assume 2 years old).'
    const mealLine = body.meal ? `Meal context: ${body.meal}.` : ''

    const userText =
      body.mode === 'text'
        ? `${ageLine}\n${mealLine}\nCaregiver wrote: "${body.text}"\n\nIdentify each food they listed and estimate calories for the child's portion. Respond with JSON only.`
        : `${ageLine}\n${mealLine}\nHere is a photo of what the child is eating. Identify each distinct food item visible on the plate/bowl/bottle/cup and estimate calories for what appears to be the child's portion. If the image is not food, return empty foods array. Respond with JSON only.`

    const content: unknown[] = []
    if (body.mode === 'image') {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: body.mediaType ?? 'image/jpeg', data: body.imageBase64 },
      })
    }
    content.push({ type: 'text', text: userText })

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.mode === 'image' ? VISION_MODEL : TEXT_MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    })

    const raw = await resp.json()
    if (!resp.ok) throw new Error(raw.error?.message || 'Claude API error')

    const reply: string = raw.content?.[0]?.text ?? ''
    const parsed = extractJson(reply)

    // Validate + sanitize
    const foods: FoodItem[] = Array.isArray(parsed?.foods)
      ? parsed.foods
          .filter((f: any) => f && typeof f.name === 'string')
          .map((f: any) => ({
            name: String(f.name).toLowerCase().trim(),
            cals: Math.max(0, Math.round(Number(f.cals) || 0)),
            category: normalizeCategory(f.category),
            portionG: f.portionG ? Math.max(1, Math.round(Number(f.portionG))) : undefined,
            confidence: ['high', 'medium', 'low'].includes(f.confidence) ? f.confidence : 'medium',
          }))
      : []

    const totalCals = foods.reduce((s, f) => s + f.cals, 0)
    const result: AiResponse = {
      foods,
      totalCals,
      notes: typeof parsed?.notes === 'string' ? parsed.notes : undefined,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message, foods: [], totalCals: 0 }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/** Claude occasionally wraps JSON in a ```json fence despite instructions — strip it. */
function extractJson(text: string): any {
  if (!text) return null
  // Try direct parse first
  try { return JSON.parse(text) } catch {}
  // Strip code fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fence) { try { return JSON.parse(fence[1]) } catch {} }
  // Find first {...} block
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }
  return null
}

function normalizeCategory(c: unknown): FoodItem['category'] {
  const allowed = ['fruit', 'vegetable', 'grain', 'protein', 'dairy', 'drink', 'snack', 'mixed']
  const s = typeof c === 'string' ? c.toLowerCase() : ''
  return (allowed.includes(s) ? s : 'mixed') as FoodItem['category']
}
