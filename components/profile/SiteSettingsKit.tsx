/**
 * Site-look pieces shared by Settings + Profile screens (light branch only — every Diffuse path
 * keeps its own code and never renders these).
 *
 * - SiteHeader: InkBackButton + optional sticker + uppercase hand-lettered title (+ muted subtitle).
 * - SiteEyebrow: Space Mono group label.
 * - SiteRow: card-less row — sticker, label (+ desc), value / chevron, hairline divider.
 * - SiteToggle: Switch with an ink track when on.
 * - QuietPill: ink-outlined pill, warm peach tone — for sign out / delete (never solid red).
 * - useSiteInput: white field, 1.5px ink outline, radius 16, Hanken 16.
 */

import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { InkBackButton } from '../ui/InkBackButton'

const MONO = 'SpaceMono_400Regular'

export function SiteHeader({
  title,
  sticker,
  subtitle,
  right,
  onBack,
}: {
  title?: string
  sticker?: SiteStickerName
  subtitle?: string
  right?: ReactNode
  onBack?: () => void
}) {
  const { colors, font } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 6 }}>
      <View style={styles.headerRow}>
        <InkBackButton ink={colors.text} paper={colors.surface} onPress={onBack} style={{ marginBottom: 0 }} />
        {sticker ? <SiteSticker name={sticker} size={30} cut /> : null}
        <Text
          style={{ flex: 1, fontFamily: font.display, fontSize: 26, letterSpacing: 0.3, textTransform: 'uppercase', color: colors.text }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          allowFontScaling={false}
        >
          {title ?? ''}
        </Text>
        {right}
      </View>
      {subtitle ? (
        <Text style={{ marginTop: 10, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary }}>{subtitle}</Text>
      ) : null}
    </View>
  )
}

export function SiteEyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme()
  return (
    <Text
      style={[{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textMuted, marginTop: 24, marginBottom: 2 }, style]}
    >
      {children}
    </Text>
  )
}

export function SiteRow({
  sticker,
  label,
  desc,
  value,
  onPress,
  chevron,
  right,
  last,
  loading,
  style,
}: {
  sticker?: SiteStickerName
  label: string
  desc?: string
  value?: string
  onPress?: () => void
  /** Defaults to true when the row is pressable and has no `right` node. */
  chevron?: boolean
  right?: ReactNode
  last?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const { colors, font } = useTheme()
  const showChevron = (chevron ?? (!!onPress && !right)) && !loading
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
        pressed && onPress ? { opacity: 0.6 } : null,
        loading ? { opacity: 0.5 } : null,
        style,
      ]}
    >
      {sticker ? <SiteSticker name={sticker} size={30} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.bodySemiBold, fontSize: 15, color: colors.text }}>{label}</Text>
        {desc ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: 2 }}>{desc}</Text> : null}
      </View>
      {value ? (
        <Text style={{ fontFamily: font.body, fontSize: 13, color: colors.textMuted, maxWidth: '40%' }} numberOfLines={1}>{value}</Text>
      ) : null}
      {right}
      {loading ? <ActivityIndicator size="small" color={colors.text} /> : null}
      {showChevron ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </Pressable>
  )
}

export function SiteToggle({
  value,
  onValueChange,
  label,
}: {
  value: boolean
  onValueChange: (v: boolean) => void
  label?: string
}) {
  const { colors, isDark } = useTheme()
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.borderStrong, true: colors.text }}
      thumbColor={isDark ? colors.bg : '#FFFFFF'}
      ios_backgroundColor={colors.borderStrong}
      accessibilityLabel={label}
    />
  )
}

/** Quiet ink-outlined pill with a warm peach tone — sign out, delete. Never solid red. */
export function QuietPill({
  label,
  onPress,
  sticker,
  disabled,
  style,
}: {
  label: string
  onPress: () => void
  sticker?: SiteStickerName
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const { colors, font, stickers } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.quietPill,
        { backgroundColor: stickers.peachSoft, borderColor: colors.text, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {sticker ? <SiteSticker name={sticker} size={24} /> : null}
      <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: colors.text }}>{label}</Text>
    </Pressable>
  )
}

/** White field, 1.5px ink outline, radius 16, Hanken 16 — spread onto a TextInput (or a View wrapping an icon + input). */
export function useSiteInput() {
  const { colors, font } = useTheme()
  const box: ViewStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.text,
    borderRadius: 16,
  }
  const text: TextStyle = { fontFamily: font.body, fontSize: 16, color: colors.text }
  return { box, text, placeholder: colors.textMuted }
}

/** Space Mono label above a field. */
export function SiteFieldLabel({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  return (
    <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textMuted }}>{children}</Text>
  )
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  quietPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
  },
})
