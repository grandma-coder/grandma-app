/**
 * Cycle settings (Phase 2 / cycle completeness). Lets the user override the
 * cycle parameters the fertility engine uses: average cycle length, period
 * length, and luteal-phase length. Persisted in useCycleSettingsStore; read by
 * CycleHome + CycleCalendar (override the measured average + old hardcoded 5/14).
 *
 * Cream + diffuse. Stepper rows (− value +) — simple, dual-themed, no slider dep.
 */

import { View, Text, Pressable, ScrollView, Switch, StyleSheet } from 'react-native'
import { Minus, Plus } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps } from '../../components/ui/Typography'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import {
  useCycleSettingsStore,
  CYCLE_LENGTH_RANGE, PERIOD_LENGTH_RANGE, LUTEAL_RANGE,
} from '../../store/useCycleSettingsStore'

export default function CycleSettingsScreen() {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const s = useCycleSettingsStore()

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.borderLight
  const accent = diffuse ? dt.stickers.pink : stickers.pink
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border

  const autoCycle = s.cycleLength === null

  function Stepper({
    label, desc, value, unit, min, max, onChange, disabled,
  }: {
    label: string; desc?: string; value: number; unit: string
    min: number; max: number; onChange: (n: number) => void; disabled?: boolean
  }) {
    const dec = () => onChange(Math.max(min, value - 1))
    const inc = () => onChange(Math.min(max, value + 1))
    const btn = (active: boolean, onPress: () => void, icon: React.ReactNode) => (
      <Pressable
        onPress={active ? onPress : undefined}
        style={({ pressed }) => [
          styles.stepBtn,
          { borderColor: line, backgroundColor: diffuse ? 'transparent' : colors.bg, opacity: active ? (pressed ? 0.6 : 1) : 0.35 },
        ]}
      >
        {icon}
      </Pressable>
    )
    return (
      <View style={[styles.row, disabled && { opacity: 0.4 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{label}</Text>
          {desc ? <Text style={[styles.rowDesc, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{desc}</Text> : null}
        </View>
        <View style={styles.stepper}>
          {btn(!disabled && value > min, dec, <Minus size={16} color={ink} strokeWidth={2} />)}
          <Text style={[styles.stepValue, { color: ink, fontFamily: diffuse ? diffuseFont.mono : font.display }]}>
            {disabled ? '—' : `${value}`}<Text style={[styles.stepUnit, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}> {unit}</Text>
          </Text>
          {btn(!disabled && value < max, inc, <Plus size={16} color={ink} strokeWidth={2} />)}
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}><ScreenHeader title="" /></View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Display size={32} color={ink}>{t('cycleSettings_title')}</Display>
          <DisplayItalic size={17} color={diffuse ? dt.colors.ink : stickers.coral} style={{ marginTop: 6 }}>
            {t('cycleSettings_subtitle')}
          </DisplayItalic>
        </View>

        <Text style={[styles.intro, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('cycleSettings_intro')}
        </Text>

        {/* Cycle length */}
        <View style={{ marginTop: 16 }}>
          <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t('cycleSettings_sectionCycle')}</MonoCaps>
        </View>
        <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{t('cycleSettings_autoLabel')}</Text>
              <Text style={[styles.rowDesc, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{t('cycleSettings_autoDesc')}</Text>
            </View>
            <Switch
              value={autoCycle}
              onValueChange={(on) => s.setCycleLength(on ? null : 28)}
              trackColor={{ false: diffuse ? dt.colors.line2 : colors.borderStrong, true: accent }}
              thumbColor={diffuse ? dt.colors.surface : '#FFFFFF'}
              ios_backgroundColor={diffuse ? dt.colors.line2 : colors.borderStrong}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: line }]} />
          <Stepper
            label={t('cycleSettings_cycleLength')}
            value={s.cycleLength ?? 28}
            unit={t('cycleSettings_days')}
            min={CYCLE_LENGTH_RANGE.min}
            max={CYCLE_LENGTH_RANGE.max}
            onChange={s.setCycleLength}
            disabled={autoCycle}
          />
        </View>

        {/* Period + luteal */}
        <View style={{ marginTop: 18 }}>
          <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t('cycleSettings_sectionPhases')}</MonoCaps>
        </View>
        <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>
          <Stepper
            label={t('cycleSettings_periodLength')}
            desc={t('cycleSettings_periodDesc')}
            value={s.periodLength}
            unit={t('cycleSettings_days')}
            min={PERIOD_LENGTH_RANGE.min}
            max={PERIOD_LENGTH_RANGE.max}
            onChange={s.setPeriodLength}
          />
          <View style={[styles.divider, { backgroundColor: line }]} />
          <Stepper
            label={t('cycleSettings_lutealLength')}
            desc={t('cycleSettings_lutealDesc')}
            value={s.lutealPhase}
            unit={t('cycleSettings_days')}
            min={LUTEAL_RANGE.min}
            max={LUTEAL_RANGE.max}
            onChange={s.setLutealPhase}
          />
        </View>

        <Text style={[styles.footer, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('cycleSettings_footer')}
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  titleBlock: { marginTop: 4, marginBottom: 12, paddingHorizontal: 4 },
  intro: { fontSize: 14, lineHeight: 21, paddingHorizontal: 4 },
  card: {
    padding: 4, marginTop: 8, borderWidth: 1,
    shadowColor: '#141313', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardFlat: { shadowOpacity: 0, elevation: 0 },
  divider: { height: 1, marginHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, gap: 12 },
  rowLabel: { fontSize: 15 },
  rowDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 19, minWidth: 58, textAlign: 'center' },
  stepUnit: { fontSize: 12 },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 22, lineHeight: 18, paddingHorizontal: 20 },
})
