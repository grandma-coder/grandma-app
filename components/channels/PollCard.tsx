/**
 * Poll card (Phase 3). Renders a poll's question + options with live vote
 * percentages. Before voting: tappable option rows. After voting (or when
 * closed): each row shows a filled bar + %; the user's choice is highlighted.
 *
 * Cream + diffuse. Self-loads the poll by pollId and re-fetches after a vote.
 */

import { useState, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { Check } from 'lucide-react-native'
import { useFocusEffect } from 'expo-router'
import { useTheme, useDiffuseTheme, diffuseFont, brand } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { getPollForPost, castVote, type Poll } from '../../lib/polls'

export function PollCard({ postId }: { postId: string }) {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  const [poll, setPoll] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)

  const load = useCallback(() => {
    getPollForPost(postId)
      .then(setPoll)
      .catch(() => setPoll(null))
      .finally(() => setLoading(false))
  }, [postId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const closed = poll?.closes_at ? new Date(poll.closes_at).getTime() < Date.now() : false
  const hasVoted = poll?.my_option_id != null
  const showResults = hasVoted || closed

  async function vote(optionId: string) {
    if (!poll || voting || closed) return
    setVoting(true)
    try {
      await castVote(poll.id, optionId)
      load()
    } finally {
      setVoting(false)
    }
  }

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.border
  const accent = diffuse ? dt.stickers.lilac : brand.primary
  const barBg = diffuse ? dt.colors.surfaceRaised : colors.bgWarm

  if (loading) {
    return <View style={[styles.card, { borderColor: line, borderRadius: radius.lg }]}><ActivityIndicator size="small" color={inkMuted} /></View>
  }
  if (!poll) return null

  return (
    <View style={[styles.card, { backgroundColor: diffuse ? 'transparent' : colors.surface, borderColor: line, borderRadius: radius.lg }]}>
      <Text style={[styles.question, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
        {poll.question}
      </Text>

      <View style={{ gap: 8, marginTop: 10 }}>
        {poll.options.map((opt) => {
          const pct = poll.total_votes > 0 ? Math.round((opt.votes / poll.total_votes) * 100) : 0
          const mine = poll.my_option_id === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => vote(opt.id)}
              disabled={voting || closed}
              style={({ pressed }) => [
                styles.option,
                { borderColor: mine ? accent : line, borderRadius: radius.md },
                pressed && !showResults && { opacity: 0.7 },
              ]}
            >
              {/* Results bar fill */}
              {showResults && (
                <View style={[styles.bar, { width: `${pct}%`, backgroundColor: mine ? (diffuse ? dt.stickers.lilacSoft : stickers.lilacSoft) : barBg, borderRadius: radius.md }]} />
              )}
              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  {mine && <Check size={14} color={accent} strokeWidth={2.5} />}
                  <Text style={[styles.optionLabel, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]} numberOfLines={2}>
                    {opt.label}
                  </Text>
                </View>
                {showResults && (
                  <Text style={[styles.pct, { color: mine ? accent : inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>
                    {pct}%
                  </Text>
                )}
              </View>
            </Pressable>
          )
        })}
      </View>

      <Text style={[styles.footer, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.body }]}>
        {poll.total_votes === 1
          ? t('poll_votesOne', { count: poll.total_votes })
          : t('poll_votesMany', { count: poll.total_votes })}
        {closed ? ` · ${t('poll_closed')}` : ''}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { padding: 14, marginTop: 8, borderWidth: 1 },
  question: { fontSize: 15, lineHeight: 20 },
  option: { borderWidth: 1, overflow: 'hidden', justifyContent: 'center', minHeight: 44 },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  optionLabel: { fontSize: 14, flex: 1 },
  pct: { fontSize: 13 },
  footer: { fontSize: 11, marginTop: 10 },
})
