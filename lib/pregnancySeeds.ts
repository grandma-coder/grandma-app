// lib/pregnancySeeds.ts
// Populate pregnancy_logs with 14 days of realistic data
// Only runs if the user has zero existing logs (never overwrites real data)

import { supabase } from './supabase'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export async function seedPregnancyData(
  userId: string,
  weekNumber: number,
  _dueDate: string
): Promise<void> {
  // Check if user already has logs — never overwrite real data
  const { count } = await supabase
    .from('pregnancy_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (count && count > 0) return

  const logs: Array<{
    user_id: string
    log_date: string
    log_type: string
    value: string | null
    notes: string | null
  }> = []

  const moods = ['happy', 'radiant', 'okay', 'anxious', 'happy', 'radiant', 'tired',
                  'happy', 'happy', 'okay', 'radiant', 'happy', 'tired', 'happy']

  const weights = [63.2, 63.5, 63.8, 64.1, 64.2, 64.5, 64.8,
                   65.0, 65.1, 65.2, 65.3, 65.3, 65.4, 65.5]

  const waterCounts = ['6', '7', '5', '8', '6', '7', '8', '6', '7', '5', '6', '8', '7', '6']

  const symptomsByDay: Record<number, string[]> = {
    2: ['back pain', 'heartburn'],
    5: ['back pain'],
    8: ['fatigue', 'back pain'],
    11: ['swelling', 'heartburn'],
    13: ['back pain'],
  }

  for (let daysBack = 13; daysBack >= 0; daysBack--) {
    const log_date = daysAgo(daysBack)
    const idx = 13 - daysBack

    // Vitamins (daily)
    logs.push({ user_id: userId, log_date, log_type: 'vitamins', value: 'true', notes: null })

    // Mood (daily)
    logs.push({ user_id: userId, log_date, log_type: 'mood', value: moods[idx], notes: null })

    // Weight (every 2–3 days)
    if (idx % 2 === 0) {
      logs.push({ user_id: userId, log_date, log_type: 'weight', value: String(weights[idx]), notes: null })
    }

    // Water
    logs.push({ user_id: userId, log_date, log_type: 'water', value: waterCounts[idx], notes: null })

    // Sleep (most days)
    if (idx % 3 !== 0) {
      const hours = (6 + Math.floor(Math.random() * 3)).toFixed(1)
      logs.push({ user_id: userId, log_date, log_type: 'sleep', value: hours, notes: null })
    }

    // Exercise (every 3 days)
    if (idx % 3 === 0) {
      logs.push({ user_id: userId, log_date, log_type: 'exercise', value: '20', notes: 'prenatal yoga' })
    }

    // Symptoms on specific days
    if (symptomsByDay[daysBack]) {
      for (const symptom of symptomsByDay[daysBack]) {
        logs.push({ user_id: userId, log_date, log_type: 'symptom', value: symptom, notes: 'mild' })
      }
    }

    // Kick counts (every 2 days, only if week >= 28)
    if (weekNumber >= 28 && idx % 2 === 0) {
      const kicks = 8 + Math.floor(Math.random() * 8)
      logs.push({ user_id: userId, log_date, log_type: 'kick_count', value: String(kicks), notes: null })
    }
  }

  // Seed standard appointments
  const { STANDARD_APPOINTMENTS } = await import('./pregnancyAppointments')
  for (const appt of STANDARD_APPOINTMENTS) {
    if (appt.week < weekNumber) {
      logs.push({
        user_id: userId,
        log_date: daysAgo((weekNumber - appt.week) * 7),
        log_type: 'appointment',
        value: appt.name,
        notes: JSON.stringify({ appointmentId: appt.id, status: 'done', result: 'normal' }),
      })
    }
  }

  // Insert in batches of 50
  for (let i = 0; i < logs.length; i += 50) {
    const batch = logs.slice(i, i + 50)
    const { error } = await supabase.from('pregnancy_logs').insert(batch)
    if (error) console.warn('Seed insert error:', error.message)
  }
}
