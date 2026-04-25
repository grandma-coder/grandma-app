/**
 * Dev-only seed data for the pre-pregnancy cycle tracking screens.
 * Wipes the current user's cycle_logs and inserts ~6 cycles of realistic data.
 *
 * Gated by __DEV__ at the UI call site; this module has no runtime gate itself
 * so tests/scripts can call it directly.
 */

import { supabase } from './supabase'

const SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Fatigue', 'Nausea',
  'Back pain', 'Breast tenderness', 'Acne', 'Insomnia', 'Cravings',
]
const MOODS = ['great', 'good', 'okay', 'low', 'energetic'] as const

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatSupabaseError(err: unknown): string {
  if (!err) return 'Unknown error'
  if (typeof err === 'string') return err
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as { message?: string; code?: string; details?: string; hint?: string }
    const parts = [anyErr.message, anyErr.details, anyErr.hint, anyErr.code].filter(Boolean)
    if (parts.length > 0) return parts.join(' · ')
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }
  return String(err)
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function randFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function bbtFor(cycleDay: number, cycleLength: number): string {
  const ovulation = cycleLength - 14
  const base = 36.4
  const postOvBump = cycleDay > ovulation ? 0.35 : 0
  const noise = (Math.random() - 0.5) * 0.15
  return (base + postOvBump + noise).toFixed(2)
}

export async function seedCycleData(): Promise<{ inserted: number }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  // Wipe existing
  const { error: delError } = await supabase.from('cycle_logs').delete().eq('user_id', userId)
  if (delError) throw new Error(`Delete failed: ${formatSupabaseError(delError)}`)

  const rows: Array<{ user_id: string; date: string; type: string; value: string | null; notes: string | null }> = []
  const today = new Date()

  // 6 cycles — start the most recent one ~10 days ago, walk backwards
  // cycle lengths jitter 27-29 days
  const cycleLengths = [28, 29, 28, 30, 27, 28] // index 0 = most recent
  const mostRecentStart = addDays(today, -10)

  // Build cycle start dates
  const cycleStarts: Date[] = []
  let cursor = new Date(mostRecentStart)
  for (let i = 0; i < cycleLengths.length; i++) {
    cycleStarts.push(new Date(cursor))
    cursor = addDays(cursor, -cycleLengths[i])
  }
  // cycleStarts[0] = most recent, [5] = oldest. Reverse for chronological.
  cycleStarts.reverse()
  const orderedLengths = [...cycleLengths].reverse()

  for (let c = 0; c < cycleStarts.length; c++) {
    const start = cycleStarts[c]
    const length = orderedLengths[c]
    const isLast = c === cycleStarts.length - 1

    // period_start
    rows.push({ user_id: userId, date: dateStr(start), type: 'period_start', value: null, notes: null })

    // period_end (5 days later) — skip for the last cycle (treat as open)
    if (!isLast) {
      rows.push({ user_id: userId, date: dateStr(addDays(start, 4)), type: 'period_end', value: null, notes: null })
    }

    // BBT entries — 1 every ~2 days across the cycle
    for (let day = 1; day <= length; day += 2) {
      rows.push({
        user_id: userId,
        date: dateStr(addDays(start, day - 1)),
        type: 'basal_temp',
        value: bbtFor(day, length),
        notes: null,
      })
    }

    // Symptoms — 3-4 entries in the last 7 days of cycle (luteal/PMS)
    const pmsDays = 3 + Math.floor(Math.random() * 2)
    for (let i = 0; i < pmsDays; i++) {
      const offset = length - 6 + i
      const count = 1 + Math.floor(Math.random() * 2)
      const picked: string[] = []
      for (let k = 0; k < count; k++) picked.push(randFrom(SYMPTOMS))
      rows.push({
        user_id: userId,
        date: dateStr(addDays(start, offset)),
        type: 'symptom',
        value: [...new Set(picked)].join(', '),
        notes: null,
      })
    }

    // Mood — ~5 per cycle spread out
    for (let i = 0; i < 5; i++) {
      const offset = Math.floor((length / 5) * i + Math.random() * 2)
      if (offset >= length) continue
      rows.push({
        user_id: userId,
        date: dateStr(addDays(start, offset)),
        type: 'mood',
        value: randFrom(MOODS),
        notes: null,
      })
    }

    // Intercourse — 1-2 entries in the fertile window
    const ovDay = length - 14
    const fertileOffsets = [ovDay - 3, ovDay - 1, ovDay]
    const picks = 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < picks; i++) {
      rows.push({
        user_id: userId,
        date: dateStr(addDays(start, fertileOffsets[i] - 1)),
        type: 'intercourse',
        value: 'yes',
        notes: null,
      })
    }
  }

  // Insert in batches of 100
  console.log('[seedCycleData] inserting', rows.length, 'rows for user', userId)
  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error: insError } = await supabase.from('cycle_logs').insert(chunk)
    if (insError) {
      console.error('[seedCycleData] insert failed', insError)
      throw new Error(`Insert failed: ${formatSupabaseError(insError)}`)
    }
  }
  console.log('[seedCycleData] done, inserted', rows.length, 'rows')

  return { inserted: rows.length }
}

// ─── Kids seed ────────────────────────────────────────────────────────────

export async function seedKidsData(): Promise<{ childId: string; inserted: number }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  // Ensure a demo child exists — if any child belongs to this user, reuse the first one.
  const { data: existingChildren, error: childQueryError } = await supabase
    .from('children')
    .select('id')
    .eq('parent_id', userId)
    .limit(1)
  if (childQueryError) throw new Error(`Child query failed: ${formatSupabaseError(childQueryError)}`)

  let childId: string
  if (existingChildren && existingChildren.length > 0) {
    childId = existingChildren[0].id
  } else {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const { data: newChild, error: childInsertError } = await supabase
      .from('children')
      .insert({
        parent_id: userId,
        name: 'Demo Kid',
        birth_date: dateStr(twoYearsAgo),
        sex: 'other',
      })
      .select('id')
      .single()
    if (childInsertError) throw new Error(`Child insert failed: ${formatSupabaseError(childInsertError)}`)
    childId = newChild.id
  }

  // Wipe existing logs for this child
  const { error: delError } = await supabase.from('child_logs').delete().eq('child_id', childId)
  if (delError) throw new Error(`Delete failed: ${formatSupabaseError(delError)}`)

  // Insert 30 days of activity
  const rows: Array<{
    user_id: string; child_id: string; date: string; type: string; value: string | null; notes: string | null
  }> = []
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const date = dateStr(addDays(today, -i))
    // Feeding — 4 per day
    for (let f = 0; f < 4; f++) {
      rows.push({
        user_id: userId, child_id: childId, date, type: 'feeding',
        value: JSON.stringify({ amount: 120 + Math.floor(Math.random() * 60), kind: 'bottle' }),
        notes: null,
      })
    }
    // Sleep — 2 per day
    rows.push({ user_id: userId, child_id: childId, date, type: 'sleep', value: JSON.stringify({ hours: 10 + Math.random() * 2 }), notes: null })
    // Diaper — 5 per day
    for (let d = 0; d < 5; d++) {
      rows.push({
        user_id: userId, child_id: childId, date, type: 'diaper',
        value: randFrom(['pee', 'poop', 'mixed']), notes: null,
      })
    }
    // Mood — every other day
    if (i % 2 === 0) {
      rows.push({
        user_id: userId, child_id: childId, date, type: 'mood',
        value: randFrom(['happy', 'calm', 'fussy']), notes: null,
      })
    }
  }

  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error: insError } = await supabase.from('child_logs').insert(rows.slice(i, i + BATCH))
    if (insError) throw new Error(`Insert failed: ${formatSupabaseError(insError)}`)
  }

  return { childId, inserted: rows.length }
}

// ─── Pregnancy seed ───────────────────────────────────────────────────────

export async function seedPregnancyData(): Promise<{ inserted: number }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  // Wipe existing
  const { error: delError } = await supabase.from('pregnancy_logs').delete().eq('user_id', userId)
  if (delError) throw new Error(`Delete failed: ${formatSupabaseError(delError)}`)

  const rows: Array<{ user_id: string; log_date: string; log_type: string; value: string | null; notes: string | null }> = []
  const today = new Date()
  const startWeight = 62

  // 60 days of logs: weight weekly, symptoms daily-ish, kicks near term, mood sporadic
  for (let i = 0; i < 60; i++) {
    const d = addDays(today, -i)
    const log_date = dateStr(d)

    // Weight — every 7 days, gradual gain
    if (i % 7 === 0) {
      const weeksAgo = Math.floor(i / 7)
      rows.push({
        user_id: userId, log_date, log_type: 'weight',
        value: (startWeight - weeksAgo * 0.3 + (Math.random() - 0.5) * 0.4).toFixed(1),
        notes: null,
      })
    }

    // Symptoms — 3 per week-ish
    if (i % 2 === 0) {
      rows.push({
        user_id: userId, log_date, log_type: 'symptom',
        value: randFrom(['Nausea', 'Fatigue', 'Back pain', 'Heartburn', 'Swelling']),
        notes: null,
      })
    }

    // Mood — 2 per week
    if (i % 3 === 0) {
      rows.push({
        user_id: userId, log_date, log_type: 'mood',
        value: randFrom(['great', 'good', 'okay', 'low']),
        notes: null,
      })
    }

    // Kicks — last 14 days, a couple per day
    if (i < 14) {
      rows.push({
        user_id: userId, log_date, log_type: 'kick_count',
        value: String(8 + Math.floor(Math.random() * 6)),
        notes: null,
      })
    }
  }

  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error: insError } = await supabase.from('pregnancy_logs').insert(rows.slice(i, i + BATCH))
    if (insError) throw new Error(`Insert failed: ${formatSupabaseError(insError)}`)
  }

  return { inserted: rows.length }
}

// ─── Repair behaviors from data ───────────────────────────────────────────

import { useBehaviorStore } from '../store/useBehaviorStore'

/**
 * Infers which behaviors the user should be enrolled in based on actual data:
 *  - children exist → kids
 *  - pregnancy_logs exist → pregnancy
 *  - cycle_logs exist → pre-pregnancy
 *
 * Adds any missing enrollments (doesn't remove existing ones). Writes to both
 * the behaviors table and the useBehaviorStore.
 *
 * Note: the behaviors table has no unique constraint on (user_id, type), so we
 * check for an existing row before inserting to avoid duplicates.
 */
export async function repairBehaviorsFromData(): Promise<{ enrolled: string[] }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  const inferred: Array<'pre-pregnancy' | 'pregnancy' | 'kids'> = []

  // Kids — does the user own any children row?
  const { count: kidsCount, error: kidsErr } = await supabase
    .from('children')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', userId)
  if (kidsErr) throw new Error(`children query failed: ${formatSupabaseError(kidsErr)}`)
  if ((kidsCount ?? 0) > 0) inferred.push('kids')

  // Pregnancy
  const { count: pregCount, error: pregErr } = await supabase
    .from('pregnancy_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (pregErr) throw new Error(`pregnancy_logs query failed: ${formatSupabaseError(pregErr)}`)
  if ((pregCount ?? 0) > 0) inferred.push('pregnancy')

  // Pre-pregnancy
  const { count: cycleCount, error: cycleErr } = await supabase
    .from('cycle_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (cycleErr) throw new Error(`cycle_logs query failed: ${formatSupabaseError(cycleErr)}`)
  if ((cycleCount ?? 0) > 0) inferred.push('pre-pregnancy')

  if (inferred.length === 0) return { enrolled: [] }

  // Map store names → DB type values
  const DB_MAP: Record<'pre-pregnancy' | 'pregnancy' | 'kids', string> = {
    'pre-pregnancy': 'cycle',
    'pregnancy': 'pregnancy',
    'kids': 'kids',
  }

  // Fetch existing behavior rows to avoid duplicate inserts (no unique constraint on user_id,type)
  const { data: existingRows } = await supabase
    .from('behaviors')
    .select('type')
    .eq('user_id', userId)
  const existingTypes = new Set((existingRows ?? []).map((r: { type: string }) => r.type))

  for (const b of inferred) {
    const dbType = DB_MAP[b]
    if (existingTypes.has(dbType)) continue
    const { error: insErr } = await supabase
      .from('behaviors')
      .insert({ user_id: userId, type: dbType, active: true })
    // Don't fail the whole repair if one row fails.
    if (insErr) console.warn('[repairBehaviors] insert failed', dbType, insErr)
  }

  // Update local store — enroll every inferred behavior that isn't already enrolled.
  const store = useBehaviorStore.getState()
  for (const b of inferred) {
    if (!store.enrolledBehaviors.includes(b)) {
      store.enroll(b)
    }
  }

  return { enrolled: inferred }
}

// ─── Exams seed ───────────────────────────────────────────────────────────

interface ExamSeed {
  behavior: 'pre-pregnancy' | 'pregnancy' | 'kids'
  title: string
  result: string
  notes: string | null
  provider: string
  daysAgo: number
  flagged: string[]
  referenceRange: string | null
}

const PRE_PREG_EXAMS: ExamSeed[] = [
  {
    behavior: 'pre-pregnancy',
    title: 'AMH (anti-Müllerian hormone)',
    result: '2.4 ng/mL — within normal range for age 32.',
    notes: 'Ovarian reserve looks healthy. Repeat in 12 months.',
    provider: 'Stork Fertility Clinic',
    daysAgo: 412,
    flagged: [],
    referenceRange: '1.0–4.0 ng/mL',
  },
  {
    behavior: 'pre-pregnancy',
    title: 'Thyroid panel (TSH, T3, T4)',
    result: 'TSH 3.8 mIU/L — slightly elevated, retest in 6 weeks.',
    notes: null,
    provider: 'Dr. Patel — Endocrinology',
    daysAgo: 380,
    flagged: ['TSH 3.8 mIU/L (target <2.5 for conception)'],
    referenceRange: 'TSH 0.4–2.5 mIU/L (preconception)',
  },
  {
    behavior: 'pre-pregnancy',
    title: 'Comprehensive metabolic panel',
    result: 'All values within normal limits.',
    notes: 'Glucose 88, kidney + liver markers normal.',
    provider: 'LabCorp',
    daysAgo: 360,
    flagged: [],
    referenceRange: null,
  },
]

const PREG_EXAMS: ExamSeed[] = [
  {
    behavior: 'pregnancy',
    title: 'NIPT (non-invasive prenatal test)',
    result: 'Low risk for trisomy 13, 18, 21. Predicted sex: female.',
    notes: 'Drawn at 11w3d.',
    provider: 'Natera',
    daysAgo: 95,
    flagged: [],
    referenceRange: null,
  },
  {
    behavior: 'pregnancy',
    title: '12-week dating ultrasound',
    result: 'CRL 56mm — consistent with 12w1d. NT 1.6mm.',
    notes: 'All anatomy markers visible. Strong heartbeat 162bpm.',
    provider: 'St. Mary Maternal Imaging',
    daysAgo: 92,
    flagged: [],
    referenceRange: 'NT < 3.0mm',
  },
  {
    behavior: 'pregnancy',
    title: '20-week anatomy scan',
    result: 'No structural anomalies detected. Placenta posterior, fundal.',
    notes: 'Cervix 38mm. AFI normal.',
    provider: 'St. Mary Maternal Imaging',
    daysAgo: 38,
    flagged: [],
    referenceRange: null,
  },
  {
    behavior: 'pregnancy',
    title: 'Glucose tolerance test (1-hour)',
    result: '142 mg/dL — above 1-hour threshold, 3-hour follow-up scheduled.',
    notes: 'Fasting since 8pm. Drank 50g glucose.',
    provider: 'Dr. Reyes — OB',
    daysAgo: 14,
    flagged: ['1-hr glucose 142 mg/dL (cutoff 140)'],
    referenceRange: '< 140 mg/dL at 1 hour',
  },
  {
    behavior: 'pregnancy',
    title: 'CBC + iron panel',
    result: 'Hemoglobin 10.8 g/dL — mild iron-deficiency anemia.',
    notes: 'Started iron supplement 65mg/day.',
    provider: 'LabCorp',
    daysAgo: 9,
    flagged: ['Hemoglobin 10.8 g/dL (target ≥11.0 in T2)'],
    referenceRange: 'Hgb ≥ 11.0 g/dL (pregnancy T2)',
  },
]

const KIDS_EXAMS: ExamSeed[] = [
  {
    behavior: 'kids',
    title: '12-month well-child visit',
    result: 'Growth 60th %ile weight, 70th %ile height. Development on track.',
    notes: 'Walking, 4 words, social smile.',
    provider: 'Dr. Lima — Pediatrics',
    daysAgo: 240,
    flagged: [],
    referenceRange: null,
  },
  {
    behavior: 'kids',
    title: 'Lead screening',
    result: '< 1 µg/dL — undetectable.',
    notes: null,
    provider: 'Quest Diagnostics',
    daysAgo: 230,
    flagged: [],
    referenceRange: '< 3.5 µg/dL',
  },
  {
    behavior: 'kids',
    title: 'Hearing screen (OAE)',
    result: 'Pass — both ears.',
    notes: null,
    provider: 'Audi-Care Pediatric',
    daysAgo: 200,
    flagged: [],
    referenceRange: null,
  },
  {
    behavior: 'kids',
    title: 'Vitamin D (25-OH)',
    result: '22 ng/mL — insufficient.',
    notes: 'Recommended 600 IU/day supplement.',
    provider: 'LabCorp',
    daysAgo: 120,
    flagged: ['25-OH Vit D 22 ng/mL (target ≥30)'],
    referenceRange: '30–100 ng/mL',
  },
  {
    behavior: 'kids',
    title: 'Allergy panel — common foods',
    result: 'IgE elevated for peanut (Class 3).',
    notes: 'Avoid peanut. Allergist follow-up scheduled.',
    provider: 'Dr. Cohen — Allergy & Immunology',
    daysAgo: 60,
    flagged: ['Peanut sIgE 17.4 kU/L (Class 3)'],
    referenceRange: '< 0.35 kU/L = negative',
  },
  {
    behavior: 'kids',
    title: 'CBC — routine',
    result: 'All values normal.',
    notes: null,
    provider: 'Dr. Lima — Pediatrics',
    daysAgo: 30,
    flagged: [],
    referenceRange: null,
  },
]

/**
 * Seeds a realistic mix of exams across all three behaviors. Wipes existing
 * exams for the user first. Distributes kids exams round-robin across the
 * user's children (skipping kids exams if no children exist).
 */
export async function seedExamData(): Promise<{ inserted: number }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  // Wipe existing exams for this user
  const { error: delError } = await supabase.from('exams').delete().eq('user_id', userId)
  if (delError) throw new Error(`Delete failed: ${formatSupabaseError(delError)}`)

  // Resolve children for kids-behavior exams
  const { data: kids, error: kidErr } = await supabase
    .from('children')
    .select('id')
    .eq('parent_id', userId)
  if (kidErr) throw new Error(`children query failed: ${formatSupabaseError(kidErr)}`)
  const childIds = (kids ?? []).map((k: { id: string }) => k.id)

  const today = new Date()
  const toRow = (e: ExamSeed, childId: string | null) => ({
    user_id: userId,
    child_id: childId,
    behavior: e.behavior,
    title: e.title,
    result: e.result,
    notes: e.notes,
    exam_date: dateStr(addDays(today, -e.daysAgo)),
    photos: [] as string[],
    provider: e.provider,
    extracted: {
      title: e.title,
      result: e.result,
      examDate: dateStr(addDays(today, -e.daysAgo)),
      provider: e.provider,
      referenceRange: e.referenceRange,
      flagged: e.flagged,
      notes: e.notes,
    },
  })

  const rows: Array<ReturnType<typeof toRow>> = []

  for (const e of PRE_PREG_EXAMS) rows.push(toRow(e, null))
  for (const e of PREG_EXAMS) rows.push(toRow(e, null))

  // Distribute kids exams round-robin across children (if any exist)
  if (childIds.length > 0) {
    KIDS_EXAMS.forEach((e, i) => rows.push(toRow(e, childIds[i % childIds.length])))
  }

  if (rows.length === 0) return { inserted: 0 }

  const BATCH = 50
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error: insError } = await supabase.from('exams').insert(rows.slice(i, i + BATCH))
    if (insError) throw new Error(`Insert failed: ${formatSupabaseError(insError)}`)
  }

  return { inserted: rows.length }
}

// ─── Wipe all dev data ────────────────────────────────────────────────────

export async function wipeAllDemoData(): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  // cycle_logs
  const { error: cErr } = await supabase.from('cycle_logs').delete().eq('user_id', userId)
  if (cErr) throw new Error(`cycle_logs delete failed: ${formatSupabaseError(cErr)}`)

  // pregnancy_logs
  const { error: pErr } = await supabase.from('pregnancy_logs').delete().eq('user_id', userId)
  if (pErr) throw new Error(`pregnancy_logs delete failed: ${formatSupabaseError(pErr)}`)

  // exams
  const { error: exErr } = await supabase.from('exams').delete().eq('user_id', userId)
  if (exErr) throw new Error(`exams delete failed: ${formatSupabaseError(exErr)}`)

  // child_logs (per-child cascade via children delete)
  const { data: kids, error: kidErr } = await supabase.from('children').select('id').eq('parent_id', userId)
  if (kidErr) throw new Error(`children query failed: ${formatSupabaseError(kidErr)}`)
  for (const kid of kids ?? []) {
    const { error: clErr } = await supabase.from('child_logs').delete().eq('child_id', kid.id)
    if (clErr) throw new Error(`child_logs delete failed: ${formatSupabaseError(clErr)}`)
  }
}
