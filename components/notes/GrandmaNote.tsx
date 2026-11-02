/**
 * GrandmaNote — the calm "note from grandma" that opens the Notes tab (light
 * look only). Date-range eyebrow → "Dear {{name}}," → one warm line → up to
 * three card-less note rows (sticker + bold title + one-line body, hairline
 * dividers) → "For this week" + one suggestion and an optional peach pill.
 *
 * Content comes from the pure builders in lib/grandmaNotes/*. No cards, no
 * coloured boxes, no wobble, no tilt. First load shows Skeleton shapes.
 */
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { ChevronRight } from 'lucide-react-native'

import { useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { useProfile } from '../../lib/useProfile'
import { useJourneyStore } from '../../store/useJourneyStore'
import { SiteSticker } from '../stickers/SiteSticker'
import { QuietPill } from '../profile/SiteSettingsKit'
import { Skeleton, SkeletonLines, SkeletonRow } from '../ui/Skeleton'
import type { GrandmaLetter, GrandmaNoteItem } from '../../lib/grandmaNotes/types'

const MONO = 'SpaceMono_400Regular'
const HAIR = StyleSheet.hairlineWidth * 2

/** First name of the parent: onboarding name first, then the profile name. */
export function useParentFirstName(): string | null {
  const journeyName = useJourneyStore((s) => s.parentName)
  const { data: profile } = useProfile()
  const raw = (journeyName ?? profile?.name ?? '').trim()
  return raw ? raw.split(/\s+/)[0] : null
}

function shortDate(iso: string, language: string): string {
  const d = new Date(iso + 'T12:00:00')
  try {
    return d.toLocaleDateString(language, { month: 'short', day: 'numeric' })
  } catch {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The last 7 days ending today, as YYYY-MM-DD. */
export function lastSevenDays(today = new Date()): { from: string; to: string } {
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
  return { from: isoDay(from), to: isoDay(today) }
}

/** "Grandma's notes" page title (font.display uppercase) with an optional right slot. */
export function GrandmaNotesTitle({ right }: { right?: React.ReactNode }) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  return (
    <View style={styles.titleRow}>
      <Text
        style={{ flex: 1, fontFamily: font.display, fontSize: 30, lineHeight: 34, letterSpacing: 0.3, textTransform: 'uppercase', color: colors.text }}
        accessibilityRole="header"
      >
        {t('gn_title')}
      </Text>
      {right ? <View style={styles.titleRight}>{right}</View> : null}
    </View>
  )
}

/** Quiet "The details" eyebrow above the existing charts and sections. */
export function NotesDetailsEyebrow({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  return (
    <View style={[styles.detailsWrap, { borderTopColor: colors.border }, style]}>
      <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{t('gn_details')}</Text>
    </View>
  )
}

interface GrandmaNoteProps {
  letter: GrandmaLetter | null
  /** First load only — show the skeleton, never provisional copy. */
  loading?: boolean
  /** Date range for the eyebrow (YYYY-MM-DD). Default: the last 7 days. */
  range?: { from: string; to: string }
  /** Override the greeting name (default: the parent's first name). */
  name?: string | null
  /** Called with a note's `area` when a row is tapped. Rows without an area aren't tappable. */
  onNotePress?: (area: string) => void
  /** Called when the suggestion pill is tapped (shown only when the suggestion has an action label). */
  onAction?: () => void
  style?: StyleProp<ViewStyle>
}

export function GrandmaNote({ letter, loading, range, name, onNotePress, onAction, style }: GrandmaNoteProps) {
  const { colors, font } = useTheme()
  const { t, language } = useTranslation()
  const parentName = useParentFirstName()
  const who = name !== undefined ? name : parentName
  const r = range ?? lastSevenDays()
  const eyebrow = `${shortDate(r.from, language)} – ${shortDate(r.to, language)}`

  if (loading || !letter) {
    return (
      <View style={[styles.wrap, style]}>
        <Skeleton height={10} width={110} radius={5} />
        <Skeleton height={26} width="50%" radius={8} style={{ marginTop: 12 }} />
        <SkeletonLines lines={1} style={{ marginTop: 12, width: '75%' }} />
        <View style={{ marginTop: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
        <Skeleton height={10} width={90} radius={5} style={{ marginTop: 18 }} />
        <SkeletonLines lines={2} style={{ marginTop: 10 }} />
      </View>
    )
  }

  const suggestion = letter.suggestion

  return (
    <View style={[styles.wrap, style]}>
      <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{eyebrow}</Text>
      <Text style={{ marginTop: 8, fontFamily: font.display, fontSize: 26, lineHeight: 32, color: colors.text }}>
        {who ? t('gn_dear', { name: who }) : t('gn_dear_you')}
      </Text>
      <Text style={{ marginTop: 6, fontFamily: font.body, fontSize: 15, lineHeight: 22, color: colors.text }}>
        {letter.intro}
      </Text>

      <View style={{ marginTop: 10 }}>
        {letter.notes.map((n, i) => (
          <NoteRow key={n.id} note={n} first={i === 0} onPress={n.area && onNotePress ? () => onNotePress(n.area as string) : undefined} />
        ))}
      </View>

      {suggestion ? (
        <View style={{ marginTop: 18 }}>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{t('gn_for_week')}</Text>
          <Text style={{ marginTop: 6, fontFamily: font.body, fontSize: 16, lineHeight: 23, color: colors.text }}>
            {suggestion.text}
          </Text>
          {suggestion.actionLabel && onAction ? (
            <QuietPill
              label={suggestion.actionLabel}
              onPress={onAction}
              sticker={suggestion.actionSticker ?? 'pencil'}
              style={{ alignSelf: 'flex-start', marginTop: 12 }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function NoteRow({ note, first, onPress }: { note: GrandmaNoteItem; first: boolean; onPress?: () => void }) {
  const { colors, font } = useTheme()
  const content = (
    <>
      <SiteSticker name={note.sticker} size={34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: font.bodyBold, fontSize: 15, lineHeight: 20, color: colors.text }}>{note.title}</Text>
        <Text style={{ marginTop: 2, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary }}>{note.body}</Text>
      </View>
      {onPress ? <ChevronRight size={16} color={colors.text} strokeWidth={2} /> : null}
    </>
  )
  const rowStyle = [styles.row, { borderTopWidth: first ? 0 : HAIR, borderTopColor: colors.border }]
  if (!onPress) return <View style={rowStyle}>{content}</View>
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${note.title}. ${note.body}`}
      style={({ pressed }) => [...rowStyle, { opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 6, gap: 12 },
  titleRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
  eyebrow: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  detailsWrap: { marginHorizontal: 24, marginTop: 22, marginBottom: 4, paddingTop: 14, borderTopWidth: HAIR },
})
