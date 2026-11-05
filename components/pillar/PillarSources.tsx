/**
 * PillarSources — where a pillar's health claims come from (site look).
 *
 *  - <SourceLine>: the small muted "Source: CDC · NHS" line under a tip (or the intro). Each org
 *    name opens its page in the browser.
 *  - <SourcesSection>: the "Sources" list at the end of a pillar screen — one tappable row per
 *    source (org — title, year) — followed by a short "doesn't replace your doctor" note.
 *
 * Org names and titles stay in their original language (lib/medicalSources.ts); only the labels
 * are localized.
 */

import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import type { MedicalSource } from '../../lib/medicalSources'

function openSource(url: string) {
  Linking.openURL(url).catch(() => {})
}

/** One entry per org (first source of that org wins), so "Cleveland Clinic" never repeats. */
function byOrg(sources: readonly MedicalSource[]): MedicalSource[] {
  const seen = new Set<string>()
  return sources.filter((s) => (seen.has(s.org) ? false : (seen.add(s.org), true)))
}

export function SourceLine({ sources, style }: { sources: readonly MedicalSource[]; style?: object }) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  if (!sources.length) return null
  const muted = { color: colors.textMuted, fontFamily: font.body }
  return (
    <View style={[styles.line, style]}>
      <Text style={[styles.lineText, muted]}>{t('pillarSources_source')}:</Text>
      {byOrg(sources).map((s, i) => (
        <View key={s.id} style={styles.lineItem}>
          {i > 0 && <Text style={[styles.lineText, muted]}>·</Text>}
          <Pressable
            onPress={() => openSource(s.url)}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={`${t('pillarSources_source')}: ${s.org}`}
            accessibilityHint={t('pillarSources_openHint')}
          >
            {({ pressed }) => (
              <Text style={[styles.lineText, styles.lineOrg, { color: colors.textMuted, fontFamily: font.bodyMedium, opacity: pressed ? 0.55 : 1 }]}>
                {s.org}
              </Text>
            )}
          </Pressable>
        </View>
      ))}
    </View>
  )
}

export function SourcesSection({ sources }: { sources: readonly MedicalSource[] }) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  if (!sources.length) return null
  return (
    <View style={styles.section}>
      {sources.map((s, i) => (
        <Pressable
          key={s.id}
          onPress={() => openSource(s.url)}
          accessibilityRole="link"
          accessibilityLabel={`${s.org}, ${s.title}${s.year ? `, ${s.year}` : ''}`}
          accessibilityHint={t('pillarSources_openHint')}
          style={({ pressed }) => [
            styles.row,
            i < sources.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.rowText, { color: colors.textSecondary, fontFamily: font.body }]}>
            <Text style={{ color: colors.text, fontFamily: font.bodyMedium }}>{s.org}</Text>
            {` — ${s.title}${s.year ? `, ${s.year}` : ''}`}
          </Text>
          <Ionicons name="open-outline" size={14} color={colors.textMuted} style={styles.rowIcon} />
        </Pressable>
      ))}
      <Text style={[styles.disclaimer, { color: colors.textMuted, fontFamily: font.body }]}>
        {t('pillarSources_disclaimer')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 5, rowGap: 2 },
  lineItem: { flexDirection: 'row', alignItems: 'center', columnGap: 5 },
  lineText: { fontSize: 12, lineHeight: 17 },
  lineOrg: { textDecorationLine: 'underline' },
  section: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  rowText: { flex: 1, fontSize: 13, lineHeight: 19 },
  rowIcon: { marginTop: 3 },
  disclaimer: { fontSize: 12, lineHeight: 18, marginTop: 14 },
})
