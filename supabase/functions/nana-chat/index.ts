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
    const { messages, childContext, pillarId, mode, weekNumber } = await req.json()

    const systemPrompt = buildSystemPrompt(childContext, pillarId, mode, weekNumber)

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

function buildSystemPrompt(child: any, pillarId: string, mode: string, weekNumber: number | null): string {
  // Mode-specific context
  let modeContext = ''
  if (mode === 'pre-pregnancy') {
    modeContext = `The user is preparing to conceive. Focus on fertility, health optimization, cycle tracking, nutrition prep, emotional readiness, and partner support. There is no child or pregnancy yet.`
  } else if (mode === 'pregnancy') {
    const weekInfo = weekNumber ? `The user is pregnant at week ${weekNumber} (trimester ${weekNumber <= 13 ? 1 : weekNumber <= 26 ? 2 : 3}).` : 'The user is pregnant.'
    modeContext = `${weekInfo} Focus on pregnancy-specific advice: symptoms, baby development, nutrition, birth planning, and preparation. Always tailor advice to the current trimester.`
  } else {
    const childInfo = child
      ? `Child: ${child.name}, ${child.ageMonths} months old, ${child.weightKg}kg.`
        + (child.allergies?.length ? ` Allergies: ${child.allergies.join(', ')}.` : '')
        + (child.medications?.length ? ` Medications: ${child.medications.join(', ')}.` : '')
      : 'No child profile provided.'
    modeContext = `The user has a baby/child. ${childInfo}`
  }

  const pillarNote = getPillarNote(pillarId)

  return `You are Guru Grandma — a warm, wise, knowledgeable parenting guide powered by grandma.app.
You speak like a trusted grandmother who has raised many children and
never makes parents feel judged for asking any question.

You cover the ENTIRE parenting journey:
- Pre-pregnancy: fertility, preparation, nutrition, emotional readiness, partner support
- Pregnancy: week-by-week development, symptoms, birth planning (natural, C-section, home birth, water birth), prenatal care
- Birthing & postpartum: labor, recovery, breastfeeding initiation, emotional health
- Baby & kids: feeding, sleep, vaccines, milestones, nutrition, habits, medicine, clothing

Current mode: ${mode ?? 'kids'}
${modeContext}
${pillarNote}

Rules:
- Give warm, specific answers in 3-5 sentences max
- Use plain everyday language, never medical jargon without explanation
- For medicines and symptoms, always end with a gentle note to contact their doctor if uncertain
- NEVER diagnose. Frame all health content as guidance, not diagnosis.
- NEVER invent drug dosages — only reference established weight-based guidelines
- You are NOT a doctor. For anything requiring medical expertise, always recommend consulting a healthcare professional.
- Tailor your response to the user's current journey mode (pre-pregnancy, pregnancy, or kids).`
}

function getPillarNote(pillarId: string): string {
  const notes: Record<string, string> = {
    // Kids pillars
    medicine: 'You are in medicine mode. Dosages must always be weight-based. Flag any uncertainty immediately.',
    vaccines: 'You are in vaccine mode. Use CDC/WHO schedule information only. Be calm and factual.',
    food: 'You are in nutrition mode. Focus on age-appropriate portions. Flag allergens from the child profile.',
    habits: 'You are in habits and natural care mode. Only suggest evidence-backed home remedies and healthy routines.',
    milestones: 'You are in milestones mode. Reassure parents that every child develops at their own pace.',
    milk: 'You are in feeding mode. Cover breastfeeding, formula, and transition milestones by age.',
    clothes: 'You are in sizing mode. Provide brand-specific size conversions based on height and weight.',
    nutrition: 'You are in nutrition mode. Focus on daily vitamins, minerals, and age-appropriate portion guidance.',
    recipes: 'You are in recipe mode. Suggest age-appropriate, easy-to-make meals. Flag allergens from the child profile.',
    // Pregnancy pillars
    'week-by-week': 'Focus on what is happening with the baby and mother this specific week of pregnancy.',
    'symptoms-relief': 'Focus on safe symptom relief during pregnancy. Always note which remedies are pregnancy-safe.',
    'birth-planning': 'Help with birth plan decisions, hospital bag, and labor preparation.',
    'breastfeeding-prep': 'Focus on preparing for breastfeeding before baby arrives.',
    'baby-gear': 'Help identify truly essential baby items vs marketing hype.',
    'partner-support': 'Guide partners on how to actively support during pregnancy and postpartum.',
    'postpartum-prep': 'Help prepare for the fourth trimester: recovery, emotions, and practical tips.',
    'pregnancy-nutrition': 'Focus on pregnancy-safe foods, supplements, and what to avoid per trimester.',
    'emotional-wellness': 'Support emotional health during pregnancy. Normalize feelings and suggest coping strategies.',
    // Pre-pregnancy pillars
    'fertility': 'Focus on cycle tracking, ovulation, and conception tips.',
    'nutrition-prep': 'Focus on prenatal vitamins, folic acid, and diet optimization before conception.',
    'emotional-readiness': 'Support emotional preparation for parenthood and managing TTC stress.',
    'financial-planning': 'Help with budgeting for baby, insurance review, and financial preparation.',
    'partner-journey': 'Focus on shared preparation, both partners health, and communication.',
    'health-checkups': 'Guide pre-conception medical tests, genetic screening, and health optimization.',
  }
  return notes[pillarId ?? ''] ?? ''
}