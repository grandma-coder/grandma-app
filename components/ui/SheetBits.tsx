/**
 * SheetBits — reusable building blocks for detail sheets (Nutrition / Mood /
 * Health / Sleep etc.) following the redesign handoff.
 *
 *   SheetBannerRow  — full-width pastel banner with icon + MONO-CAPS label +
 *                     Fraunces value and optional trailing right-aligned text
 *   SheetStatTile   — single tile in a 3-col grid
 *   SheetCategoryRow— colored dot + label + right-aligned value
 */

import { ReactNode } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MonoCaps, Display, Body } from './Typography'
import { font, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'

// ─── Banner row ─────────────────────────────────────────────────────────────

interface SheetBannerRowProps {
  icon?: ReactNode
  label: string
  value: string | number
  bg?: string
  borderColor?: string
  iconBg?: string
  rightText?: string
  rightColor?: string
  valueColor?: string
  labelColor?: string
}

export function SheetBannerRow(props: SheetBannerRowProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffuseSheetBannerRow {...props} /> : <CurrentSheetBannerRow {...props} />
}

function CurrentSheetBannerRow({
  icon,
  label,
  value,
  bg = 'rgba(238,123,109,0.12)',
  borderColor = 'rgba(238,123,109,0.28)',
  iconBg,
  rightText,
  rightColor,
  valueColor,
  labelColor,
}: SheetBannerRowProps) {
  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor }]}>
      {icon ? (
        <View style={[styles.bannerIcon, iconBg ? { backgroundColor: iconBg } : null]}>
          {icon}
        </View>
      ) : null}

      <View style={styles.bannerBody}>
        <MonoCaps color={labelColor}>{label}</MonoCaps>
        <Display size={18} color={valueColor} style={{ marginTop: 2 }}>
          {value}
        </Display>
      </View>

      {rightText ? (
        <Body size={12} color={rightColor} style={styles.bannerRight}>
          {rightText}
        </Body>
      ) : null}
    </View>
  )
}

function DiffuseSheetBannerRow({ icon, label, value, rightText }: SheetBannerRowProps) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {icon ? <View style={styles.bannerIcon}>{icon}</View> : null}
      <View style={styles.bannerBody}>
        <Text style={[dText.mono, { color: colors.ink3 }]}>{label}</Text>
        <Text style={[dText.serif, { color: colors.ink, fontSize: 18, marginTop: 2 }]}>{value}</Text>
      </View>
      {rightText ? <Text style={[dText.mono, { color: colors.ink3 }]}>{rightText}</Text> : null}
    </View>
  )
}

// ─── Stat tile ──────────────────────────────────────────────────────────────

interface SheetStatTileProps {
  icon?: ReactNode
  value: string | number
  label: string
  bg?: string
  borderColor?: string
  highlighted?: boolean
}

export function SheetStatTile(props: SheetStatTileProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffuseSheetStatTile {...props} /> : <CurrentSheetStatTile {...props} />
}

function CurrentSheetStatTile({
  icon,
  value,
  label,
  bg = '#F7F0DF',
  borderColor = 'rgba(20,19,19,0.08)',
  highlighted = false,
}: SheetStatTileProps) {
  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: highlighted ? 1.5 : 1,
        },
      ]}
    >
      {icon ? <View style={styles.tileIcon}>{icon}</View> : null}
      <Display size={22} align="center">
        {value}
      </Display>
      <MonoCaps align="center" style={{ marginTop: 2 }}>
        {label}
      </MonoCaps>
    </View>
  )
}

function DiffuseSheetStatTile({ icon, value, label, highlighted = false }: SheetStatTileProps) {
  const { colors } = useDiffuseTheme()
  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: highlighted ? colors.hairline : colors.line,
          borderWidth: 1,
        },
      ]}
    >
      {icon ? <View style={styles.tileIcon}>{icon}</View> : null}
      {/* the ONE focal number per tile → serif */}
      <Text style={[dText.serif, { color: colors.ink, fontSize: 24, textAlign: 'center' }]}>{value}</Text>
      <Text style={[dText.mono, { color: colors.ink3, textAlign: 'center', marginTop: 3 }]}>{label}</Text>
    </View>
  )
}

// ─── Category list row ──────────────────────────────────────────────────────

interface SheetCategoryRowProps {
  dotColor: string
  label: string
  value: string
  sub?: string
}

export function SheetCategoryRow(props: SheetCategoryRowProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffuseSheetCategoryRow {...props} /> : <CurrentSheetCategoryRow {...props} />
}

function CurrentSheetCategoryRow({ dotColor, label, value, sub }: SheetCategoryRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <Body size={14} style={{ fontFamily: font.bodyMedium }}>
          {label}
        </Body>
        {sub ? (
          <Body size={11} style={{ opacity: 0.55 }}>
            {sub}
          </Body>
        ) : null}
      </View>
      <Body size={14} style={{ fontFamily: font.bodySemiBold }}>
        {value}
      </Body>
    </View>
  )
}

function DiffuseSheetCategoryRow({ dotColor, label, value, sub }: SheetCategoryRowProps) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }]}>
      {/* hairline ring node instead of a filled dot */}
      <View style={[styles.dot, { backgroundColor: dotColor, opacity: 0.9 }]} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, color: colors.ink }}>{label}</Text>
        {sub ? <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.ink3, marginTop: 3 }}>{sub}</Text> : null}
      </View>
      {/* data value → mono */}
      <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 13, color: colors.ink }}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBody: { flex: 1 },
  bannerRight: {
    fontFamily: font.bodySemiBold,
  },

  tile: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    gap: 2,
  },
  tileIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})

// Diffuse role-type helpers shared by the SheetBits variants above.
const dText = StyleSheet.create({
  mono: {
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  serif: {
    fontFamily: diffuseFont.display,
    letterSpacing: -0.2,
  },
})
