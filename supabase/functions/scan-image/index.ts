// @ts-nocheck — Deno Edge Function: TS errors in VS Code are expected (runs in Deno, not Node)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  imageBase64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
  scanType: string
  childContext?: {
    name: string
    ageMonths: number
    weightKg: number
    allergies: string[]
    medications: string[]
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, mediaType, scanType, childContext }: RequestBody = await req.json()

    if (!imageBase64) {
      throw new Error('No image provided')
    }

    const systemPrompt = buildScanPrompt(scanType, childContext)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: getScanQuestion(scanType),
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Claude API error')
    }

    const reply = data.content[0].text

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function buildScanPrompt(scanType: string, child?: RequestBody['childContext']): string {
  const childInfo = child
    ? `Child: ${child.name}, ${child.ageMonths} months old, ${child.weightKg}kg.`
      + (child.allergies?.length ? ` Allergies: ${child.allergies.join(', ')}.` : '')
      + (child.medications?.length ? ` Medications: ${child.medications.join(', ')}.` : '')
    : 'No child profile provided.'

  return `You are Guru Grandma — a warm, wise, knowledgeable parenting guide powered by grandma.app who can read product labels, medicine boxes, and food packaging.

${childInfo}

Rules:
- Analyze the image carefully and give a clear, warm summary
- If it's medicine: identify the product, active ingredients, and provide weight-based dosage guidance for the child's weight
- If it's food: check ingredients for allergens matching the child's profile, flag anything concerning
- Use plain everyday language, never medical jargon without explanation
- NEVER diagnose. Frame all health content as guidance, not diagnosis.
- NEVER invent drug dosages — only reference what is visible on the packaging or established guidelines
- Always end with a gentle note to consult their pediatrician if uncertain
- Structure your response with clear sections using line breaks`
}

function getScanQuestion(scanType: string): string {
  const questions: Record<string, string> = {
    medicine: 'What medicine is this? Is it safe for my child? What is the correct dose based on their weight?',
    food: 'What food product is this? Are any ingredients unsafe or allergenic for my child?',
    nutrition: 'What are the nutritional facts? Is this appropriate for my child\'s age?',
    general: 'What is this product? Tell me anything relevant for my child.',
  }
  return questions[scanType] ?? questions.general
}
