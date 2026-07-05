import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useTheme, borderRadius } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'

interface PartnerViewProps {
  partnerConnected?: boolean
  onInvite?: () => void
}

export function PartnerView({ partnerConnected = false, onInvite }: PartnerViewProps) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  if (partnerConnected) {
    return (
      <PaperCard radius={28} padding={20}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryTint }]}>
            <Ionicons name="heart" size={22} color={colors.accent} />
          </View>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{t('prepreg_partnerView_connected')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('prepreg_partnerView_connectedSub')}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>
      </PaperCard>
    )
  }

  return (
    <PaperCard radius={28} padding={20}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryTint }]}>
          <Text style={{ fontSize: 22 }}>{t('prepreg_partnerView_emoji')}</Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{t('prepreg_partnerView_invite')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('prepreg_partnerView_inviteSub')}
          </Text>
        </View>
      </View>
      <Pressable onPress={onInvite} style={[styles.inviteBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderStrong }]}>
        <Ionicons name="person-add-outline" size={16} color={colors.accent} />
        <Text style={[styles.inviteText, { color: colors.accent }]}>{t('prepreg_partnerView_sendInvite')}</Text>
      </Pressable>
    </PaperCard>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  inviteText: {
    fontSize: 13,
    fontWeight: '600',
  },
})
