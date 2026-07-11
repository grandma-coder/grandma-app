export const DAILY_TAGS = [
  'body', 'emotion', 'fear', 'joy', 'tired', 'overwhelmed', 'reassurance',
  'calm', 'partner', 'connection', 'strength', 'gratitude', 'birth',
  'identity', 'wonder',
] as const

export type DailyTag = typeof DAILY_TAGS[number]
