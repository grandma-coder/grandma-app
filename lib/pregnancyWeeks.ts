/**
 * Pregnancy week data — baby size comparisons and development notes.
 * Shared across PregnancyHome and PregnancyCalendar.
 */

export interface WeekInfo {
  size: string
  note: string
}

export const PREGNANCY_WEEKS: Record<number, WeekInfo> = {
  4: { size: 'a poppy seed', note: 'The neural tube is forming' },
  5: { size: 'a sesame seed', note: 'The heart begins to beat' },
  6: { size: 'a lentil', note: 'Nose, mouth, and ears are taking shape' },
  7: { size: 'a blueberry', note: 'Brain is growing rapidly' },
  8: { size: 'a raspberry', note: 'Fingers and toes are forming' },
  9: { size: 'a grape', note: 'All essential organs have begun' },
  10: { size: 'a kumquat', note: 'Tiny teeth buds are forming under gums' },
  11: { size: 'a fig', note: 'Baby can open and close fists' },
  12: { size: 'a lime', note: 'Reflexes are developing' },
  13: { size: 'a peach', note: 'Fingerprints are forming' },
  14: { size: 'a lemon', note: 'Baby can squint, frown, and grimace' },
  15: { size: 'an apple', note: 'Baby can sense light' },
  16: { size: 'an avocado', note: 'Baby can hear your voice' },
  17: { size: 'a pear', note: 'Skeleton is hardening from cartilage to bone' },
  18: { size: 'a bell pepper', note: 'Baby is yawning and hiccuping' },
  19: { size: 'a mango', note: 'Senses are developing rapidly' },
  20: { size: 'a banana', note: 'Halfway there! Baby can swallow' },
  21: { size: 'a carrot', note: 'Baby movements feel stronger' },
  22: { size: 'a papaya', note: 'Eyes are formed but iris lacks color' },
  23: { size: 'a grapefruit', note: 'Baby can hear sounds outside the womb' },
  24: { size: 'a corn cob', note: 'Lungs are developing surfactant' },
  25: { size: 'a cauliflower', note: 'Baby responds to your voice' },
  26: { size: 'a lettuce head', note: 'Eyes begin to open' },
  27: { size: 'a cabbage', note: 'Baby sleeps and wakes regularly' },
  28: { size: 'an eggplant', note: 'Baby can blink and dream' },
  29: { size: 'a butternut squash', note: 'Bones are fully developed' },
  30: { size: 'a cucumber', note: 'Baby is gaining weight rapidly' },
  31: { size: 'a coconut', note: 'Brain connections are forming fast' },
  32: { size: 'a jicama', note: 'Toenails are visible' },
  33: { size: 'a pineapple', note: 'Bones are hardening' },
  34: { size: 'a cantaloupe', note: 'Central nervous system is maturing' },
  35: { size: 'a honeydew melon', note: 'Kidneys are fully developed' },
  36: { size: 'a head of romaine', note: 'Baby is dropping lower into pelvis' },
  37: { size: 'a bunch of Swiss chard', note: 'Baby is considered early term' },
  38: { size: 'a leek', note: 'Organs are ready for life outside' },
  39: { size: 'a watermelon', note: 'Baby is full term!' },
  40: { size: 'a small pumpkin', note: 'Ready to meet the world!' },
}

export function getWeekInfo(week: number): WeekInfo {
  const clamped = Math.max(4, Math.min(40, week))
  return PREGNANCY_WEEKS[clamped] ?? { size: 'a little miracle', note: 'Growing beautifully' }
}

export function getTrimester(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1
  if (week <= 26) return 2
  return 3
}

export function weekForDate(dueDate: string, dateStr: string): number {
  const due = new Date(dueDate + 'T00:00:00')
  const d = new Date(dateStr + 'T00:00:00')
  const diffMs = due.getTime() - d.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.min(42, 40 - Math.floor(daysLeft / 7)))
}
