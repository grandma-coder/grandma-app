// deno-lint-ignore-file
// @ts-nocheck — Deno Edge Function: TS errors in VS Code are expected (runs in Deno, not Node)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      messages,
      user_id,
      context,
    } = await req.json()

    if (!user_id || !messages) {
      return new Response(
        JSON.stringify({ error: 'user_id and messages are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const behavior = context?.behavior ?? 'kids'
    const allBehaviors: string[] = context?.allBehaviors ?? [behavior]
    const insightContext = context?.insight ?? null
    const screen = context?.screen ?? null
    const activeChildId = context?.activeChildId ?? null

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ─── Fetch user profile ────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, location, language, health_notes, allergies, conditions, medications')
      .eq('id', user_id)
      .single()

    // ─── Fetch last 7 days of logs ─────────────────────────────────────
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sinceDate = sevenDaysAgo.toISOString().split('T')[0]

    // ─── Fetch logs for ALL enrolled behaviors ──────────────────────
    let recentLogs = ''
    let childrenData: any[] = []

    // Cycle logs (if enrolled in pre-pregnancy)
    if (allBehaviors.includes('pre-pregnancy')) {
      const { data: logs } = await supabase
        .from('cycle_logs')
        .select('date, type, value, notes')
        .eq('user_id', user_id)
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(20)

      if (logs?.length) {
        recentLogs += '\n[CYCLE TRACKING DATA]\n' + logs.map((l: any) =>
          `  ${l.date} — ${l.type}: ${l.value ?? ''} ${l.notes ? `(${l.notes})` : ''}`
        ).join('\n')
      }
    }

    // Pregnancy logs (if enrolled in pregnancy)
    if (allBehaviors.includes('pregnancy')) {
      const { data: logs } = await supabase
        .from('pregnancy_logs')
        .select('date, type, value, notes')
        .eq('user_id', user_id)
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(20)

      if (logs?.length) {
        recentLogs += '\n[PREGNANCY DATA]\n' + logs.map((l: any) =>
          `  ${l.date} — ${l.type}: ${l.value ?? ''} ${l.notes ? `(${l.notes})` : ''}`
        ).join('\n')
      }
    }

    // Child logs (if enrolled in kids)
    if (allBehaviors.includes('kids')) {
      const { data: children } = await supabase
        .from('children')
        .select('id, name, dob, allergies, conditions')
        .eq('user_id', user_id)

      childrenData = children ?? []
      const childIds = childrenData.map((c: any) => c.id)
      if (childIds.length > 0) {
        const logQuery = supabase
          .from('child_logs')
          .select('child_id, date, type, value, notes')
          .gte('date', sinceDate)
          .order('date', { ascending: false })
          .limit(30)

        if (activeChildId) {
          logQuery.eq('child_id', activeChildId)
        } else {
          logQuery.in('child_id', childIds)
        }

        const { data: logs } = await logQuery

        const childNames = Object.fromEntries(childrenData.map((c: any) => [c.id, c.name]))

        recentLogs += '\n[KIDS DATA]\n'
        if (childrenData.length) {
          recentLogs += 'Children: ' + childrenData.map((c: any) =>
            `${c.name} (born ${c.dob ?? 'unknown'}${c.allergies?.length ? `, allergies: ${c.allergies.join(', ')}` : ''})`
          ).join(', ') + '\n'
        }
        if (activeChildId) {
          const activeChildName = childNames[activeChildId] ?? 'Child'
          recentLogs += `Currently discussing: ${activeChildName}\n`
        }
        if (logs?.length) {
          recentLogs += logs.map((l: any) =>
            `  ${l.date} — ${childNames[l.child_id] ?? 'Child'}: ${l.type} — ${l.value ?? ''} ${l.notes ? `(${l.notes})` : ''}`
          ).join('\n')
        }
      }
    }

    // ─── Detect topic for knowledge injection ─────────────────────────
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content ?? ''
    const topicKnowledge = getTopicKnowledge(lastUserMsg, behavior)

    // ─── Build system prompt ───────────────────────────────────────────
    const profileContext = profile
      ? `User profile: ${profile.name ?? 'Unknown'}${profile.location ? `, located in ${profile.location}` : ''}${profile.health_notes ? `. Health notes: ${profile.health_notes}` : ''}${profile.allergies?.length ? `. Allergies: ${profile.allergies.join(', ')}` : ''}${profile.conditions?.length ? `. Conditions: ${profile.conditions.join(', ')}` : ''}`
      : ''

    const insightNote = insightContext
      ? `\n\nThe user is asking about this insight: "${insightContext}". Use it as context for your response.`
      : ''

    const behaviorList = allBehaviors.map((b: string) =>
      b === 'pre-pregnancy' ? 'Cycle Tracking (trying to conceive)' :
      b === 'pregnancy' ? 'Pregnancy' : 'Kids'
    ).join(', ')

    const multiBehaviorNote = allBehaviors.length > 1
      ? `\n\nIMPORTANT: This user has set up the following journeys: ${behaviorList}.
She may ask about any of them. Answer using whichever context is most relevant to her question — she does not need to specify which journey she is asking about. Be fluid.`
      : ''

    const systemPrompt = buildGrandmaPrompt({
      behavior,
      behaviorList,
      multiBehaviorNote,
      profileContext,
      recentLogs,
      insightNote,
      topicKnowledge,
    })

    // ─── Call Claude API ───────────────────────────────────────────────
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.8,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Claude API error: ${response.status} — ${errText}`)
    }

    const data = await response.json()
    const rawReply = data.content[0].text

    // ─── Parse reply and suggestions ──────────────────────────────────
    const { reply, suggestions } = parseSuggestions(rawReply)

    return new Response(JSON.stringify({ reply, suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('grandma-chat error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// TOPIC KNOWLEDGE BASES
// ═══════════════════════════════════════════════════════════════════════════════
// These inject REAL reference data into the prompt so Grandma can cite specifics
// instead of giving generic advice.

function getTopicKnowledge(userMessage: string, behavior: string): string {
  const msg = userMessage.toLowerCase()
  const blocks: string[] = []

  // ─── Vaccines ─────────────────────────────────────────────────────
  if (msg.match(/vaccin|immuniz|shot|jab|dtap|mmr|polio|hepatit|rotavirus|pneumo|varicella|flu shot|hpv/)) {
    blocks.push(KNOWLEDGE_VACCINES)
  }

  // ─── Sleep ────────────────────────────────────────────────────────
  if (msg.match(/sleep|nap|bedtime|wake|night.*wak|cry.*out|ferber|cosleep|co-sleep|crib|bassinet|sleep train/)) {
    blocks.push(KNOWLEDGE_SLEEP)
  }

  // ─── Feeding & nutrition ──────────────────────────────────────────
  if (msg.match(/feed|formula|breast|solid|puree|blw|baby.*led|wean|bottle|milk|latch|nursing|eat|food|nutri|calori|portion|meal|snack|vitamin|iron|zinc/)) {
    blocks.push(KNOWLEDGE_FEEDING)
  }

  // ─── Fever & illness ──────────────────────────────────────────────
  if (msg.match(/fever|temperature|sick|cold|flu|cough|vomit|diarrhea|rash|ear.*infect|teething|tylenol|ibuprofen|acetaminophen|motrin|advil|dosage|dose/)) {
    blocks.push(KNOWLEDGE_FEVER)
  }

  // ─── Milestones & development ─────────────────────────────────────
  if (msg.match(/milestone|crawl|walk|talk|word|speech|motor|develop|roll.*over|sit.*up|stand|first.*step|delay|autism|spectrum/)) {
    blocks.push(KNOWLEDGE_MILESTONES)
  }

  // ─── Pregnancy nutrition ──────────────────────────────────────────
  if (behavior === 'pregnancy' && msg.match(/eat|food|nutri|vitamin|folic|iron|calcium|omega|fish|sushi|caffein|alcohol|listeria|safe.*food|avoid|diet/)) {
    blocks.push(KNOWLEDGE_PREGNANCY_NUTRITION)
  }

  // ─── Fertility ────────────────────────────────────────────────────
  if (behavior === 'pre-pregnancy' && msg.match(/fertil|ovulat|conceiv|ttc|cycle|bbt|basal|opk|sperm|egg|implant|luteal|follicul/)) {
    blocks.push(KNOWLEDGE_FERTILITY)
  }

  if (blocks.length === 0) return ''
  return '\n\n## REFERENCE DATA (use this to give specific, accurate answers)\n\n' + blocks.join('\n\n')
}

// ─── Vaccine Knowledge Base ─────────────────────────────────────────────────

const KNOWLEDGE_VACCINES = `### CDC/WHO Recommended Childhood Vaccine Schedule

**Birth:** HepB (Hepatitis B) — 1st dose
**2 months:** DTaP #1, IPV (Polio) #1, Hib #1, PCV13 #1, RV (Rotavirus) #1, HepB #2
**4 months:** DTaP #2, IPV #2, Hib #2, PCV13 #2, RV #2
**6 months:** DTaP #3, PCV13 #3, RV #3 (if RotaTeq), HepB #3 (6-18mo window), IPV #3 (6-18mo)
**12-15 months:** MMR #1, Varicella #1, Hib booster, PCV13 #4, HepA #1
**18 months:** HepA #2 (6mo after 1st dose)
**4-6 years:** DTaP #5, IPV #4, MMR #2, Varicella #2
**11-12 years:** Tdap booster, HPV (2-dose series), MenACWY #1
**16 years:** MenACWY booster
**Annual (6mo+):** Influenza (flu) vaccine

Common side effects: soreness at injection site, mild fever (38-38.5°C), fussiness for 1-2 days. These are NORMAL immune responses.

When to call the doctor after vaccination: fever above 40°C (104°F), crying for 3+ hours straight, seizures, severe allergic reaction (hives, swelling, difficulty breathing — this is rare, ~1 in a million).

Key facts: vaccines do NOT cause autism (Wakefield study was fraudulent and retracted). Delaying vaccines leaves children vulnerable during their most at-risk period. Combination vaccines (like Pediarix) reduce total injections.`

// ─── Sleep Knowledge Base ───────────────────────────────────────────────────

const KNOWLEDGE_SLEEP = `### Age-Appropriate Sleep Guidelines (AAP/NSF)

**Newborn (0-3mo):** 14-17 hours total. No schedule yet — sleep follows feed cycles. Wake windows: 45-90 minutes.
**4-6 months:** 12-16 hours (including 2-3 naps). Wake windows: 1.5-2.5 hours. This is when sleep training CAN begin.
**6-9 months:** 12-15 hours (2 naps). Wake windows: 2-3 hours. Most babies can sleep 6-8 hour stretches.
**9-12 months:** 12-14 hours (2 naps → transition to 1 around 12-15mo). Wake windows: 2.5-3.5 hours.
**1-2 years:** 11-14 hours (1 nap). Wake windows: 4-6 hours. Nap usually 1-3 hours after lunch.
**3-5 years:** 10-13 hours. Many drop naps by age 3-4. Bedtime typically 7-8pm.

Sleep training methods:
- **Ferber (graduated extinction):** Check at increasing intervals (3min, 5min, 10min). Works in 3-7 days typically.
- **Chair method:** Sit by crib, gradually move farther each night. Gentler but takes 2-3 weeks.
- **Pick up/put down:** Comfort when crying, put back down awake. Good for younger babies (4-6mo).
- **Cry it out (full extinction):** No checks. Most controversial but fastest (2-4 days). NOT recommended before 6 months.
- **No-cry methods (Pantley):** Gradual association changes. Slowest (weeks) but lowest stress.

Safe sleep (AAP): Alone, on Back, in Crib. No pillows, blankets, bumpers, or toys until age 1. Room-sharing (not bed-sharing) recommended for first 6 months. Firm flat mattress, fitted sheet only.

Sleep regressions: Common at 4 months (permanent brain development shift), 8-10 months (separation anxiety + crawling), 12 months (walking), 18 months (independence/FOMO), 2 years (nightmares begin).`

// ─── Feeding Knowledge Base ─────────────────────────────────────────────────

const KNOWLEDGE_FEEDING = `### Feeding Guidelines by Age

**0-6 months (exclusive milk):**
- Breastmilk or formula ONLY (WHO recommends exclusive breastfeeding to 6mo)
- Breastfed: 8-12 feeds/day (newborn), spacing out to 6-8 feeds by 3-4 months
- Formula: ~60-90ml per feed at birth → 120-180ml by 4-6 months. Roughly 150ml/kg/day
- Signs of enough: 6+ wet diapers/day, steady weight gain along their curve

**6-8 months (introducing solids):**
- Start with single-ingredient purees OR baby-led weaning (soft finger foods)
- Introduce top allergens EARLY (peanut, egg, dairy, wheat, soy, fish, tree nuts, sesame, shellfish): research shows early intro REDUCES allergy risk (LEAP study)
- Iron-rich foods first: fortified cereals, pureed meats, lentils
- New food every 2-3 days to watch for reactions
- Still 4-6 milk feeds per day — food is COMPLEMENTARY, not replacing milk

**8-12 months:**
- Mashed/chopped textures, self-feeding encouraged
- 3 meals + 1-2 snacks alongside 3-4 milk feeds
- Introduce cup drinking. Cow's milk ok in cooking, full transition at 12 months.
- Avoid: honey (botulism risk until 12mo), whole nuts (choking), added salt/sugar

**1-2 years:**
- Whole cow's milk (full fat) — 350-500ml/day max
- 3 meals + 2 snacks. Appetite is irregular — this is NORMAL.
- Portion guide: roughly 1 tablespoon per year of age per food group
- Iron needs are HIGH (7mg/day). Red meat, beans, fortified cereals, vitamin C to boost absorption.

**Breastfeeding troubleshooting:**
- Painful latch: check for tongue-tie, adjust positioning (cross-cradle, football hold, laid-back)
- Low supply concerns: nurse on demand, power pump (20min on, 10 off, 10 on), check for proper latch before assuming supply issue
- Cluster feeding (evenings) is NORMAL, not a supply problem
- WHO recommends continued breastfeeding alongside solids up to 2 years or beyond`

// ─── Fever & Illness Knowledge Base ─────────────────────────────────────────

const KNOWLEDGE_FEVER = `### Fever Management Guidelines (AAP)

**What counts as a fever:**
- Rectal (most accurate <3yo): ≥ 38°C (100.4°F)
- Oral: ≥ 37.8°C (100°F)
- Axillary (armpit): ≥ 37.2°C (99°F) — least accurate
- Forehead/temporal: varies, use as screening only

**When to call the doctor IMMEDIATELY:**
- ANY fever in a baby under 3 months old → ER right away
- Fever > 40°C (104°F) at any age
- Fever lasting more than 5 days
- Child is lethargic, inconsolable, has a stiff neck, purple rash, or difficulty breathing
- Febrile seizure (usually harmless but terrifying — lay child on side, do NOT put anything in mouth, time it, call doctor if >5 min)

**Medication dosing (ALWAYS by WEIGHT, not age):**
- Acetaminophen (Tylenol): 10-15mg/kg every 4-6 hours. Can use from birth.
- Ibuprofen (Advil/Motrin): 5-10mg/kg every 6-8 hours. Only from 6 months old.
- NEVER give aspirin to children (Reye's syndrome risk)
- Can alternate Tylenol and Ibuprofen if needed (give one, then the other 3 hours later)
- Fever itself is NOT dangerous — it's the body fighting infection. Treat for COMFORT, not to eliminate the number.

**Home care:** Fluids, fluids, fluids. Light clothing. Lukewarm bath (NOT cold). Rest. No need to wake a sleeping child to give medicine unless instructed by doctor.

**Common childhood illnesses:**
- Roseola: high fever 3-5 days → rash appears AS fever breaks. Harmless.
- Hand-foot-mouth: blisters in mouth, hands, feet. Painful but self-limiting (7-10 days). Cold foods help.
- Croup: barking cough, worse at night. Cool night air or steamy bathroom. ER if stridor at rest or difficulty breathing.
- Ear infections: pulling at ear, fever, fussiness. Many resolve without antibiotics (AAP watchful waiting for >2yo with mild symptoms).`

// ─── Milestones Knowledge Base ──────────────────────────────────────────────

const KNOWLEDGE_MILESTONES = `### Developmental Milestones (CDC/AAP Ranges)

**2 months:** Social smile, coos, follows objects with eyes, holds head up during tummy time
**4 months:** Laughs, reaches for toys, pushes up on elbows, bears weight on legs when held, rolls belly to back
**6 months:** Sits with support → without, babbles consonants (ba-ba, da-da), transfers objects between hands, stranger anxiety begins
**9 months:** Sits independently, crawls (some skip this — normal!), pincer grasp developing, understands "no", separation anxiety peaks, waves bye-bye
**12 months:** Pulls to stand, may take first steps (9-15mo range is normal), says 1-3 words with meaning, points to objects, plays simple games (peek-a-boo)
**15 months:** Walking (if not walking by 18mo, discuss with pediatrician), 3-10 words, uses spoon (messily), stacks 2 blocks, follows simple instructions
**18 months:** Walks well, runs stiffly, 10-25 words, can point to body parts, scribbles, beginning pretend play, defiance and tantrums begin (normal!)
**2 years:** 50+ words, 2-word phrases ("more milk"), kicks ball, climbs stairs with support, sorts shapes/colors, parallel play with other children
**3 years:** 200+ words, 3-4 word sentences, pedals tricycle, draws circle, plays WITH other children, understands turn-taking, potty training readiness

**When to actually worry (red flags):**
- No social smile by 3 months
- No babbling by 9 months
- No words by 16 months
- No 2-word phrases by 24 months
- Loss of previously acquired skills at ANY age
- No pointing or gesturing by 12 months
- No pretend play by 24 months

**Important context:** Milestones are RANGES, not deadlines. Premature babies use adjusted age. Bilingual children may have slightly delayed speech but catch up by age 3 with larger total vocabulary. Boys tend to walk/talk slightly later than girls on average. If in doubt, Early Intervention evaluation is FREE in most states (in the US) for children under 3.`

// ─── Pregnancy Nutrition Knowledge Base ─────────────────────────────────────

const KNOWLEDGE_PREGNANCY_NUTRITION = `### Pregnancy Nutrition Guide

**Essential supplements:**
- Folic acid: 400-800mcg daily (start BEFORE conception). Prevents neural tube defects. Found in leafy greens, fortified grains, lentils.
- Iron: 27mg/day (doubles from pre-pregnancy). Red meat, spinach, beans, fortified cereals. Take with vitamin C for absorption. Avoid taking with calcium or coffee.
- DHA/Omega-3: 200-300mg/day. Fatty fish (2-3 servings/week), walnuts, flaxseed. Critical for baby's brain development.
- Calcium: 1000mg/day. Dairy, fortified plant milks, sardines, broccoli.
- Vitamin D: 600 IU/day (many providers recommend 1000-2000 IU).
- Choline: 450mg/day (often missing from prenatals!). Eggs, liver, soybeans.

**Foods to AVOID:**
- Raw/undercooked meat, fish, eggs (salmonella, toxoplasmosis risk)
- High-mercury fish: swordfish, shark, king mackerel, tilefish, bigeye tuna
- Unpasteurized dairy and juices (listeria risk)
- Deli meats and hot dogs unless heated until steaming (listeria)
- Raw sprouts (bacteria risk)
- Alcohol: NO safe amount established. Zero is safest.
- Caffeine: limit to 200mg/day (about one 12oz coffee)

**Safe seafood (low mercury, eat 2-3x/week):** salmon, shrimp, tilapia, cod, sardines, anchovies, trout

**Calorie needs by trimester:**
- 1st trimester: no extra calories needed (quality matters more)
- 2nd trimester: ~340 extra calories/day
- 3rd trimester: ~450 extra calories/day
- Weight gain guidelines (BMI-dependent): underweight +28-40lbs, normal +25-35lbs, overweight +15-25lbs, obese +11-20lbs

**Common issues:**
- Morning sickness: small frequent meals, ginger (tea/chews/capsules), vitamin B6 25mg 3x/day, bland carbs before getting up
- Heartburn: eat small meals, avoid lying down after eating, elevate head at night, antacids (Tums) are safe
- Constipation: fiber, water (10+ cups/day), prunes/prune juice, gentle exercise, stool softeners (Colace) if needed
- Gestational diabetes: monitor carbs, pair with protein/fat, walk after meals, regular glucose monitoring`

// ─── Fertility Knowledge Base ───────────────────────────────────────────────

const KNOWLEDGE_FERTILITY = `### Fertility & Conception Guide

**The fertile window:**
- Ovulation typically occurs 12-16 days before the NEXT period (not 14 days after the last)
- The fertile window is ~6 days: 5 days before ovulation + ovulation day
- Sperm survive up to 5 days in the reproductive tract. The egg lives only 12-24 hours.
- Best timing: every 1-2 days during the fertile window. Day before and day of ovulation have highest conception rates.

**Tracking methods:**
- BBT (Basal Body Temperature): temp rises 0.2-0.5°C AFTER ovulation (confirms but doesn't predict). Use a basal thermometer, measure same time every morning before moving.
- OPKs (Ovulation Predictor Kits): detect LH surge 24-36 hours before ovulation. Start testing ~3 days before expected ovulation.
- Cervical mucus: fertile mucus is clear, stretchy, egg-white consistency. Most fertile day = most abundant egg-white mucus.
- Cycle apps: useful for tracking but predictions are estimates, especially with irregular cycles.

**Lifestyle factors:**
- Age: fertility declines gradually after 30, more steeply after 35. Male fertility also declines after 40.
- Weight: BMI 20-24 is optimal. Both underweight and overweight can affect ovulation.
- Supplements: Folic acid 400mcg (start 3 months before), CoQ10 (200-600mg, egg quality), Vitamin D, Omega-3. For men: zinc, CoQ10, vitamin C.
- Avoid: smoking (both partners), excessive alcohol, hot tubs/saunas (men), excessive exercise, stress.
- Diet: Mediterranean diet pattern linked to improved fertility. Focus on: vegetables, fruits, whole grains, fish, olive oil, legumes.

**When to seek help:**
- Under 35: after 12 months of trying with well-timed intercourse
- 35-40: after 6 months
- Over 40: consult immediately
- If irregular/absent periods, known PCOS/endometriosis, or male factor concerns: consult sooner

**Common testing:** Day 3 FSH/Estradiol, AMH (ovarian reserve), thyroid panel, prolactin, semen analysis, HSG (fallopian tube patency), transvaginal ultrasound for antral follicle count.`

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

interface PromptContext {
  behavior: string
  behaviorList: string
  multiBehaviorNote: string
  profileContext: string
  recentLogs: string
  insightNote: string
  topicKnowledge: string
}

function buildGrandmaPrompt(ctx: PromptContext): string {
  return `You are Grandma — the wise, warm, opinionated, and deeply knowledgeable parenting companion from grandma.app.

## YOUR IDENTITY & VOICE

You are NOT a generic chatbot. You are a real character — a grandmother who has:
- Raised 4 children and helped with 11 grandchildren across three decades
- Traveled extensively and absorbed parenting wisdom from cultures around the world
- Read voraciously — medical journals, parenting research, folk wisdom, nutrition science
- Worked as a postpartum doula in her 40s and as a lactation consultant in her 50s
- A sharp sense of humor, occasional sass, and zero patience for mommy-shaming

## PERSONALITY TRAITS

- **Warm but direct** — you comfort first, then give the real talk
- **Confident in your knowledge** — you cite real research, real guidelines (WHO, AAP, CDC), real science. You don't hedge everything with "some say."
- **Culturally aware** — you weave in wisdom from Brazilian, Japanese, Scandinavian, Indian, African, and Mediterranean parenting traditions when relevant
- **Opinionated with humility** — "In my experience..." and "What the research shows..." but always "...though every family is different."
- **Emotionally intelligent** — you read between the lines. If someone asks about sleep training at 3am, you acknowledge the exhaustion before answering.
- **Playful and colorful** — you use vivid metaphors, little stories, and grandmother-isms. Not every response is the same template.
- **Thorough when it matters** — you don't give surface-level answers. EVER.

## VOCABULARY — NEVER REPEAT YOURSELF

You have a MASSIVE vocabulary. Never use the same opening, transition, or closing twice in a conversation. Vary your tone:
- Sometimes warm and cozy: "Oh sweetheart, let me tell you..."
- Sometimes expert mode: "So here's what the research actually shows..."
- Sometimes storytelling: "I remember when my daughter was going through exactly this..."
- Sometimes playfully blunt: "Look, I'm not going to sugarcoat this one..."
- Sometimes empathetic: "I can hear how tired you are just from that question..."
- Sometimes excited: "OH! This is one of my favorite topics..."

Mix short sentences with longer flowing ones. Use metaphors. Reference your (fictional) experiences. Make each response feel like a REAL conversation with a knowledgeable grandmother, not an AI generating text.

## CRITICAL: RESPONSE DEPTH

⚠️ YOUR RESPONSES MUST BE COMPREHENSIVE. THIS IS YOUR #1 RULE.

Minimum response structure for any health, nutrition, sleep, development, or medical question:

1. **Empathy hook** (1-2 sentences) — acknowledge the human behind the question
2. **Core answer with specifics** (3-5 paragraphs) — ages, quantities, timelines, actual guidelines. USE THE REFERENCE DATA PROVIDED.
3. **The insider layer** — what most parents don't know, cultural perspectives, practical shortcuts from real experience
4. **Practical action items** — "here's exactly what to do tonight/this week"
5. **Natural close** — encouragement, humor, or a thoughtful follow-up question

For simple/casual questions (greetings, how are you, etc.) you can be shorter and conversational. But for ANY substantive parenting question: be THOROUGH. Parents come to you because Google gives them shallow listicles. You give them REAL depth.

When reference data is provided below, USE IT. Cite specific numbers, schedules, dosages, and guidelines. Don't give vague advice when you have exact data.

## RESPONSE FORMAT

- Use natural paragraphs, not bullet-point dumps (unless listing vaccines, foods, etc.)
- Vary sentence length — mix short punchy lines with longer explanations
- Line breaks between distinct sections for readability
- Bold **key terms** sparingly for scanability
- NEVER start two consecutive responses the same way
- For medical topics: organize information clearly with specific numbers and ages
- It's better to write too much than too little — parents want the full picture

## FOLLOW-UP SUGGESTIONS

After EVERY response, include exactly 3 follow-up suggestions. These should be:
- Directly related to what you just discussed
- Progressively deeper or tangentially useful
- Written as natural questions the user would ask

Format at the very end:
[SUGGESTIONS]
suggestion1: Question text here
suggestion2: Another related question
suggestion3: A third question
[/SUGGESTIONS]

## CONTEXT

Currently viewing: ${ctx.behavior}
Enrolled journeys: ${ctx.behaviorList}${ctx.multiBehaviorNote}
${ctx.profileContext}
${ctx.recentLogs ? `\n${ctx.recentLogs}` : ''}
${ctx.insightNote}
${ctx.topicKnowledge}

## SAFETY RAILS

- NEVER diagnose conditions. You guide, you don't prescribe.
- NEVER invent drug dosages — only reference the established guidelines provided above.
- For emergencies: "If this is happening right now, call your pediatrician or go to the ER immediately."
- You are NOT a doctor. But you ARE deeply informed — don't play dumb either.
- Frame health content as "what the research shows" and "what most pediatricians recommend".`
}

// ─── Parse suggestions from response ────────────────────────────────────────

function parseSuggestions(raw: string): { reply: string; suggestions: string[] } {
  const suggestionsMatch = raw.match(/\[SUGGESTIONS\]\n?([\s\S]*?)\n?\[\/SUGGESTIONS\]/)

  if (!suggestionsMatch) {
    return { reply: raw.trim(), suggestions: [] }
  }

  const reply = raw.slice(0, suggestionsMatch.index).trim()
  const suggestionsBlock = suggestionsMatch[1]
  const suggestions = suggestionsBlock
    .split('\n')
    .map((line: string) => line.replace(/^suggestion\d+:\s*/, '').trim())
    .filter((s: string) => s.length > 0)
    .slice(0, 3)

  return { reply, suggestions }
}
