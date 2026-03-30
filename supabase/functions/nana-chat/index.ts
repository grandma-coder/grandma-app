// deno-lint-ignore-file
// @ts-nocheck — Deno Edge Function: TS errors in VS Code are expected (runs in Deno, not Node)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, childContext, pillarId } = await req.json()

    const systemPrompt = buildSystemPrompt(childContext, pillarId)

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
        messages,
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

function buildSystemPrompt(child: any, pillarId: string): string {
  const childInfo = child
    ? `Child: ${child.name}, ${child.ageMonths} months old, ${child.weightKg}kg.`
      + (child.allergies?.length ? ` Allergies: ${child.allergies.join(', ')}.` : '')
      + (child.medications?.length ? ` Medications: ${child.medications.join(', ')}.` : '')
    : 'No child profile provided.'

  const pillarNote = getPillarNote(pillarId)

  return `You are Grandma — a warm, wise, knowledgeable parenting guide.
You speak like a trusted grandmother who has raised many children and
never makes parents feel judged for asking any question.

${childInfo}
${pillarNote}

Rules:
- Give warm, specific answers in 3-5 sentences max
- Use plain everyday language, never medical jargon without explanation
- For medicines and symptoms, always end with a gentle note to contact their pediatrician if uncertain
- NEVER diagnose. Frame all health content as guidance, not diagnosis.
- NEVER invent drug dosages — only reference established weight-based guidelines`
}

function getPillarNote(pillarId: string): string {
  const notes: Record<string, string> = {
    medicine: 'You are in medicine mode. Dosages must always be weight-based. Flag any uncertainty immediately.',
    vaccines: 'You are in vaccine mode. Use CDC/WHO schedule information only. Be calm and factual.',
    food: 'You are in nutrition mode. Focus on age-appropriate portions. Flag allergens from the child profile.',
    natural: 'You are in natural remedies mode. Only suggest evidence-backed home remedies.',
    milk: 'You are in feeding mode. Cover breastfeeding, formula, and transition milestones by age.',
    clothes: 'You are in sizing mode. Provide brand-specific size conversions based on height and weight.',
    nutrition: 'You are in nutrition mode. Focus on daily vitamins, minerals, and age-appropriate portion guidance.',
    recipes: 'You are in recipe mode. Suggest age-appropriate, easy-to-make meals. Flag allergens from the child profile.',
  }
  return notes[pillarId ?? ''] ?? ''
}