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
import { View, StyleSheet } from 'react-native'
import { MonoCaps, Display, Body } from './Typography'

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

export function SheetBannerRow({
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

// ─── Stat tile ──────────────────────────────────────────────────────────────

interface SheetStatTileProps {
  icon?: ReactNode
  value: string | number
  label: string
  bg?: string
  borderColor?: string
  highlighted?: boolean
}

export function SheetStatTile({
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

// ─── Category list row ──────────────────────────────────────────────────────

interface SheetCategoryRowProps {
  dotColor: string
  label: string
  value: string
  sub?: string
}

export function SheetCategoryRow({ dotColor, label, value, sub }: SheetCategoryRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <Body size={14} style={{ fontFamily: 'DMSans_500Medium' }}>
          {label}
        </Body>
        {sub ? (
          <Body size={11} style={{ opacity: 0.55 }}>
            {sub}
          </Body>
        ) : null}
      </View>
      <Body size={14} style={{ fontFamily: 'DMSans_600SemiBold' }}>
        {value}
      </Body>
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
    fontFamily: 'DMSans_600SemiBold',
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
