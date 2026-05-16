// @ts-nocheck — Deno Edge Function: TS errors in VS Code are expected (runs in Deno, not Node)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

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
  /** Pregnancy context (caller passes this when behavior=pregnancy and there's no child). */
  pregnancyContext?: {
    weekNumber: number | null
    dueDate: string | null
    allergies?: string[]
    conditions?: string[]
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Fail fast and clearly if the Anthropic key was never set on the
  // project. Previously the non-null assertion at module load did
  // nothing useful and the missing key surfaced as an obscure
  // 'authentication_error' from the Anthropic call.
  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured on this Supabase project.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { imageBase64, mediaType, scanType, childContext, pregnancyContext }: RequestBody = await req.json()

    if (!imageBase64) {
      throw new Error('No image provided')
    }

    const systemPrompt = buildScanPrompt(scanType, childContext, pregnancyContext)

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

function buildScanPrompt(
  scanType: string,
  child?: RequestBody['childContext'],
  pregnancy?: RequestBody['pregnancyContext'],
): string {
  if (scanType === 'insurance_card') {
    return `You are a precise OCR assistant for grandma.app. Extract insurance card information from the image.

Rules:
- Read every piece of text visible on the card carefully
- Return ONLY a valid JSON object — no markdown, no explanation, no backticks
- Use null for any field you cannot find or read
- For plan_type: determine if this is "health", "dental", or "vision" based on the card content. Default to "health" if unclear.
- Normalize phone numbers to include area code when visible
- The JSON schema MUST be exactly:
{
  "provider_name": string | null,
  "plan_name": string | null,
  "plan_type": "health" | "dental" | "vision",
  "policy_number": string | null,
  "group_number": string | null,
  "member_id": string | null,
  "phone": string | null
}`
  }

  if (scanType === 'exam') {
    return `You are a precise OCR assistant for grandma.app. Extract medical lab / exam / test result information from this image of a medical document.

Rules:
- Read every piece of text visible (headers, table rows, footers)
- Return ONLY a valid JSON object — no markdown, no explanation, no backticks
- Use null for any field you cannot find or read confidently
- "title" should be the best human name for the exam (e.g. "Complete Blood Count", "Glucose Tolerance Test", "Thyroid Panel")
- "result" should be a concise summary of key findings (e.g. "Normal", "120/80 mmHg", "HbA1c 5.4%")
- "examDate" should be ISO format YYYY-MM-DD if visible; otherwise null
- "provider" is the doctor, clinic, or lab that ordered/ran the test
- "referenceRange" is the normal/healthy range if printed on the document
- "flagged" is an array of abnormal or out-of-range findings (each a short phrase)
- "notes" is a 1–2 sentence plain-language summary a parent can understand; explain what this exam measures without diagnosing
- NEVER invent values. If unsure, use null.
- The JSON schema MUST be exactly:
{
  "title": string | null,
  "result": string | null,
  "examDate": string | null,
  "provider": string | null,
  "referenceRange": string | null,
  "flagged": string[],
  "notes": string | null
}`
  }

  // Pregnancy persona — used when the caller is in pregnancy mode and has
  // no child yet (most pregnancy users). Falls back to the child branch
  // when child context is provided, since some pregnancy users also have
  // older kids.
  if (!child && pregnancy) {
    const trimester = pregnancy.weekNumber
      ? pregnancy.weekNumber <= 13 ? 'first' : pregnancy.weekNumber <= 26 ? 'second' : 'third'
      : 'unknown'
    const weekInfo = pregnancy.weekNumber
      ? `User is pregnant at week ${pregnancy.weekNumber} (${trimester} trimester).`
      : 'User is pregnant; week number not provided.'
    const dueLine = pregnancy.dueDate ? ` Due date: ${pregnancy.dueDate}.` : ''
    const allergyLine = pregnancy.allergies?.length ? ` Allergies: ${pregnancy.allergies.join(', ')}.` : ''
    const conditionLine = pregnancy.conditions?.length ? ` Conditions: ${pregnancy.conditions.join(', ')}.` : ''

    return `You are Guru Grandma — a warm, wise, knowledgeable pregnancy companion powered by grandma.app who can read product labels, medicine boxes, supplement bottles, and food packaging.

${weekInfo}${dueLine}${allergyLine}${conditionLine}

Rules:
- Analyze the image carefully and give a clear, warm summary tailored to pregnancy
- If it's medicine: identify the product and active ingredients, and call out pregnancy safety categories where relevant (e.g. acetaminophen generally safe; NSAIDs avoid in 3rd trimester). If the user's trimester is known, weight your guidance for that trimester.
- If it's a prenatal vitamin / supplement: list the key vitamins + doses (folate, iron, DHA, calcium, vitamin D, iodine) and flag if any are below standard prenatal recommendations
- If it's food: flag pregnancy-specific concerns — listeria risk (soft cheese, deli meats, cold smoked fish), high-mercury fish, raw/undercooked items, unpasteurized dairy, alcohol, excessive caffeine, raw sprouts. Cross-reference any allergies above.
- Use plain everyday language, never medical jargon without explanation
- NEVER diagnose. Frame all health content as guidance, not diagnosis.
- NEVER invent drug dosages — only reference what is visible on the packaging or established guidelines (ACOG, WHO)
- Always end with a gentle note to consult their OB/GYN or midwife if uncertain
- Structure your response with clear sections using line breaks`
  }

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
    insurance_card: 'Extract all insurance information from this card. Return ONLY the JSON object, nothing else.',
    exam: 'Extract the medical exam / lab result information from this document. Return ONLY the JSON object, nothing else.',
    general: 'What is this product? Tell me anything relevant for my child.',
  }
  return questions[scanType] ?? questions.general
}
