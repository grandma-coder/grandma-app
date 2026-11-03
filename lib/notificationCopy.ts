/**
 * Notifications are stored with their text. Wellness rows written before the neutral-wording fix
 * (docs/compliance/2026-11-02-regras-saude.md) still say "needs attention" / "score is 3.2/10".
 * Rewrite those at display time so old rows read like new ones: no grades, no verdicts.
 */
export interface NotificationText {
  type: string
  title: string
  body: string | null
}

const SCORE_RE = /\d+(\.\d+)?\s*\/\s*10|\bscore\b|needs attention/i

export function displayNotificationText(n: NotificationText): { title: string; body: string | null } {
  const isWellness = n.type === 'wellness_drop' || n.type === 'wellness_improve'
  if (!isWellness || !(SCORE_RE.test(n.title) || SCORE_RE.test(n.body ?? ''))) {
    return { title: n.title, body: n.body }
  }
  // Old titles: "Kenji's Nutrition needs attention" / "Kenji's Sleep is improving!"
  const m = n.title.match(/^(.+?)['’]s\s+(\w+)/)
  const child = m?.[1]?.trim()
  const pillar = m?.[2]?.toLowerCase()
  if (!child || !pillar) {
    return { title: n.title.replace(SCORE_RE, '').trim(), body: null }
  }
  if (n.type === 'wellness_improve') {
    return {
      title: `${child}'s ${pillar}: steadier this week`,
      body: `${pillar[0].toUpperCase()}${pillar.slice(1)} logs look steadier than last week. Tap to see the counts.`,
    }
  }
  return {
    title: `A look at ${child}'s ${pillar}`,
    body: `Grandma noticed a pattern in ${child}'s ${pillar} logs this week. Tap to see the counts.`,
  }
}
