import { useMemo } from 'react'
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { X, Check } from 'lucide-react-native'
import { useChildStore } from '../store/useChildStore'
import type { ChildWithRole } from '../types'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent, getModeColorSoft } from '../constants/theme'
import { useTranslation } from '../lib/i18n'
import { useModeStore } from '../store/useModeStore'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { InkBackButton } from '../components/ui/InkBackButton'
import { SiteSticker } from '../components/stickers/SiteSticker'

export default function ChildPicker() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = getDiffuseAccent(mode, dt.isDark)
  const { t } = useTranslation()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  const ROLE_COLORS: Record<string, string> = {
    parent: colors.primaryTint,
    nanny: stickers.lilacSoft,
    family: stickers.peachSoft,
  }

  // Diffuse: each role gets a small color dot (accent hues) instead of a filled
  // badge fill — hairline pill + dot reads as the v4 data voice.
  const DIFFUSE_ROLE_DOT: Record<string, string> = {
    parent: getDiffuseAccent('kids', dt.isDark),
    nanny: getDiffuseAccent('pregnancy', dt.isDark),
    family: getDiffuseAccent('pre-pregnancy', dt.isDark),
  }

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, paddingTop: 60 },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 24, marginBottom: 20,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    closeButton: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
      justifyContent: 'center', alignItems: 'center',
    },
    list: { paddingHorizontal: 24, gap: diffuse ? 10 : 0 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: colors.surface, borderRadius: 16, padding: 16,
      borderWidth: 1.5, borderColor: colors.border,
    },
    cardActive: { borderColor: colors.accent },
    avatar: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryTint,
      justifyContent: 'center', alignItems: 'center',
    },
    childName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
    roleBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
    roleText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
    siteTitle: { fontSize: 22, color: colors.text, fontFamily: font.display, textTransform: 'uppercase', letterSpacing: 0.3 },
    siteRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    siteName: { fontSize: 17, color: colors.text, fontFamily: font.bodyBold, marginBottom: 4 },
    siteTag: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, borderWidth: 1.5, borderColor: colors.text, alignSelf: 'flex-start' },
    siteTagText: { fontSize: 11, color: colors.text, fontFamily: font.bodyBold, textTransform: 'capitalize' },
  }), [colors, font, diffuse])

  function handleSelect(child: ChildWithRole) {
    setActiveChild(child)
    router.back()
  }

  return (
    <View style={[styles.container, diffuse && { backgroundColor: dt.colors.bg }]}>
      {diffuse ? (
        <View style={styles.header}>
          <Text style={[
            styles.title,
            { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' },
          ]}>{t('childPicker_title')}</Text>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.closeButton,
              { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2 },
            ]}
          >
            <X size={20} color={dt.colors.ink} strokeWidth={1.6} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.header, { justifyContent: 'flex-start', gap: 12 }]}>
          <InkBackButton ink={colors.text} paper={colors.surface} style={{ marginBottom: 0 }} />
          <SiteSticker name="baby2" size={30} cut />
          <Text style={styles.siteTitle}>{t('childPicker_title')}</Text>
        </View>
      )}

      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isActive = item.id === activeChild?.id
          if (!diffuse) {
            return (
              <Pressable
                onPress={() => handleSelect(item)}
                style={[styles.siteRow, isActive && { backgroundColor: getModeColorSoft(mode), marginHorizontal: -12, paddingHorizontal: 12, borderRadius: 14 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <SiteSticker name="baby" size={42} cut />
                <View style={{ flex: 1 }}>
                  <Text style={styles.siteName} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.siteTag, { backgroundColor: ROLE_COLORS[item.caregiverRole] ?? colors.surfaceRaised }]}>
                    <Text style={styles.siteTagText}>{item.caregiverRole}</Text>
                  </View>
                </View>
                {isActive ? <Ionicons name="checkmark" size={24} color={colors.text} /> : <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
              </Pressable>
            )
          }
          return (
            <Pressable
              onPress={() => handleSelect(item)}
              style={[
                styles.card,
                isActive && styles.cardActive,
                diffuse && {
                  backgroundColor: dt.colors.surface,
                  borderColor: isActive ? dt.colors.hairline : dt.colors.line,
                },
              ]}
            >
              <View style={[
                styles.avatar,
                diffuse && { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2 },
              ]}>
                <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 24 }}>{t('childPicker_avatarIcon')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.childName,
                  diffuse && { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400', fontSize: 18 },
                ]}>{item.name}</Text>
                {diffuse ? (
                  <View style={[styles.roleBadge, {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'transparent',
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: dt.colors.line2,
                  }]}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: DIFFUSE_ROLE_DOT[item.caregiverRole] ?? dt.colors.ink3 }} />
                    <Text style={[styles.roleText, { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.8 }]}>{item.caregiverRole}</Text>
                  </View>
                ) : (
                  <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[item.caregiverRole] ?? colors.surfaceRaised }]}>
                    <Text style={styles.roleText}>{item.caregiverRole}</Text>
                  </View>
                )}
              </View>
              {isActive && (
                diffuse ? (
                  <Check size={22} color={accent} strokeWidth={1.8} />
                ) : (
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                )
              )}
            </Pressable>
          )
        }}
      />
    </View>
  )
}
