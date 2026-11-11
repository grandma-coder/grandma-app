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
import { useTheme, useDiffuseTheme, diffuseFont, brand, getModeColorSoft } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { SiteChoice } from '../ui/SiteChoice'
import { useModeStore } from '../../store/useModeStore'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { getPollForPost, castVote, type Poll } from '../../lib/polls'

export function PollCard({ postId }: { postId: string }) {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const mode = useModeStore((st) => st.mode)
  const tone = getModeColorSoft(mode)

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
    } catch {
      // Closed meanwhile / network — the reload below shows the real state.
    } finally {
      load()
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
    <View style={[styles.card, diffuse
      ? { backgroundColor: 'transparent', borderColor: line, borderRadius: radius.lg }
      : { backgroundColor: 'transparent', borderWidth: 0, padding: 0, paddingVertical: 4 }]}>
      <Text style={[styles.question, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodyBold }]}>
        {poll.question}
      </Text>

      <View style={{ gap: 8, marginTop: 10 }}>
        {poll.options.map((opt) => {
          const pct = poll.total_votes > 0 ? Math.round((opt.votes / poll.total_votes) * 100) : 0
          const mine = poll.my_option_id === opt.id
          if (!diffuse) {
            if (!showResults) {
              return (
                <SiteChoice
                  key={opt.id}
                  label={opt.label}
                  selected={false}
                  onPress={() => vote(opt.id)}
                  tone={tone}
                  align="start"
                  tick={false}
                  radius={14}
                  style={voting || closed ? { opacity: 0.6 } : undefined}
                />
              )
            }
            return (
              <View key={opt.id} style={styles.siteResult}>
                <View style={styles.siteResultTop}>
                  <View style={styles.optionLeft}>
                    {mine && <Check size={14} color={colors.text} strokeWidth={2.5} />}
                    <Text style={[styles.optionLabel, { color: colors.text, fontFamily: mine ? font.bodyBold : font.body }]} numberOfLines={2}>{opt.label}</Text>
                  </View>
                  <Text style={[styles.pct, { color: colors.text, fontFamily: 'SpaceMono_400Regular' }]}>
                    {opt.votes} · {pct}%
                  </Text>
                </View>
                <View style={[styles.siteTrack, { borderColor: colors.text, backgroundColor: colors.surface }]}>
                  <View style={[styles.siteFill, { width: `${pct}%`, backgroundColor: mine ? tone : colors.borderLight, borderRightWidth: pct > 0 && pct < 100 ? 1.5 : 0, borderRightColor: colors.text }]} />
                </View>
              </View>
            )
          }
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

      <Text style={[styles.footer, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : 'SpaceMono_400Regular' }, !diffuse && { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.4 }]}>
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
  siteResult: { gap: 6 },
  siteResultTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  siteTrack: { height: 10, borderRadius: 5, borderWidth: 1.5, overflow: 'hidden' },
  siteFill: { height: '100%' },
  footer: { fontSize: 11, marginTop: 10 },
})
